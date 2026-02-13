import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import {
  ArrowLeft,
  Check,
  X,
  Users,
  Calendar,
  Send,
  Minus,
  Loader2,
} from "lucide-react";
import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import {
  toArray,
  getTaughtSubject,
  listTaughtSubjectStudents,
  listTaughtSubjectColloquiums,
  listTaughtSubjectClasses,
  listTaughtSubjectIndependentWorks,
  createColloquium,
  deleteColloquium,
  updateColloquiumGrade,
  createSeminar,
  updateSeminarGrade,
  markStudentAbsence,
  getIndependentWorkByStudentAndSubject,
  getGroup,
  filterStudents,
  markIndependentWorkGrade,
} from "../api";

interface Student {
  id: string | number;
  name: string;
  activityAttendance: Array<{
    attendance: "present" | "absent";
    grade: number | null;
  }>;
  colloquium: (number | null)[];
  assignments: (0 | 1 | null)[];
  colloquiumIds?: (string | null)[];
  seminarIds?: (string | null)[];
  assignmentIds?: (string | null)[];
  userId?: string | null;
}

interface CourseSession {
  id: string;
  date: string;
  time: string;
  type: "L" | "S";
  seminarId?: string | null;
}

const formatSessionDate = (value: any): string => {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) {
    return date.toLocaleDateString(undefined, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }
  return String(value);
};

const formatSessionTime = (start: any, end: any): string => {
  const toHHMM = (value: any) => {
    if (!value) return "";
    const parts = String(value).split(":");
    if (parts.length >= 2) {
      return `${parts[0].padStart(2, "0")}:${parts[1].padStart(2, "0")}`;
    }
    return String(value);
  };

  const formattedStart = toHHMM(start);
  const formattedEnd = toHHMM(end);
  if (formattedStart && formattedEnd)
    return `${formattedStart} - ${formattedEnd}`;
  return formattedStart || formattedEnd || "";
};

const mapSessionsFromApi = (source: any): CourseSession[] => {
  const candidates = [
    source?.sessions,
    source?.classSessions,
    source?.schedule,
    source?.lessons,
    source?.classTimes,
    source?.entries,
  ];

  for (const candidate of candidates) {
    const list = toArray(candidate);
    if (list.length > 0) {
      return list.map((item: any, index: number) => {
        const start = item?.startTime ?? item?.start ?? item?.beginTime;
        const end = item?.endTime ?? item?.end ?? item?.finishTime;
        const typeRaw = String(
          item?.type ?? item?.sessionType ?? item?.kind ?? item?.format ?? "L",
        ).toLowerCase();
        const type = typeRaw.startsWith("s") ? "S" : "L";
        return {
          id: String(
            item?.id ?? item?.sessionId ?? item?.scheduleId ?? index + 1,
          ),
          date: formatSessionDate(
            item?.date ?? item?.sessionDate ?? item?.heldOn ?? item?.startDate,
          ),
          time: formatSessionTime(start, end),
          type,
        };
      });
    }
  }

  return [];
};

function unwrap<T = any>(resp: any): T {
  if (!resp || typeof resp !== "object") return resp as T;
  if (resp.data !== undefined) return resp.data as T;
  if (resp.result !== undefined) return resp.result as T;
  if (resp.item !== undefined) return resp.item as T;
  return resp as T;
}

const COLLOQUIUM_COUNT = 3;
const ASSIGNMENTS_COUNT = 10;

export function TeacherCourseDetail({
  courseId,
  onBack,
  initialStudentCount,
  initialHours,
}: {
  courseId: string | number;
  onBack: () => void;
  initialStudentCount?: number;
  initialHours?: number;
}) {
  const pendingAssignmentChanges = useRef<
    Map<
      string,
      {
        studentId: string;
        assignmentIndex: number;
        independentWorkId: string | null;
        isPassed: boolean | null;
      }
    >
  >(new Map());
  const taughtSubjectId = String(courseId);

  const [students, setStudents] = useState<Student[]>([]);
  const [courseTitle, setCourseTitle] = useState<string>("");
  const [courseHours, setCourseHours] = useState<number | undefined>(
    initialHours,
  );
  const [sessions, setSessions] = useState<CourseSession[]>([]);
  const [selectedColumn, setSelectedColumn] = useState<number | null>(null);
  const [bulkValue, setBulkValue] = useState<string>(""); // Контролируемое значение для bulk select
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSendingAttendance, setIsSendingAttendance] =
    useState<boolean>(false);
  const [isSendingAssignments, setIsSendingAssignments] =
    useState<boolean>(false);
  const [isBulkUpdating, setIsBulkUpdating] = useState<boolean>(false); // Flag to prevent infinite loops during bulk update
  const attendanceSnapshotRef = useRef<Map<string, ("present" | "absent")[]>>(
    new Map(),
  );
  const assignmentsSnapshotRef = useRef<Map<string, (0 | 1 | null)[]>>(
    new Map(),
  );

  const applyColloquiumsToStudents = (
    baseStudents: Student[],
    colloquiumsRaw: any[],
  ): Student[] => {
    const byStudent = new Map<string, any[]>();
    const normalize = (v: any) =>
      String(v ?? "")
        .toLowerCase()
        .trim();
    const normalizeNoSpaces = (v: any) => normalize(v).replace(/\s+/g, "");

    for (const c of colloquiumsRaw || []) {
      const nameKey = normalize(
        c.studentFullName ?? c.student?.fullName ?? c.student?.name ?? "",
      );
      const nameKeyNoSpaces = normalizeNoSpaces(
        c.studentFullName ?? c.student?.fullName ?? "",
      );
      if (!nameKey && !nameKeyNoSpaces) continue;
      const list =
        byStudent.get(nameKey) ?? byStudent.get(nameKeyNoSpaces) ?? [];
      list.push(c);
      if (nameKey) byStudent.set(nameKey, list);
      if (nameKeyNoSpaces && nameKeyNoSpaces !== nameKey)
        byStudent.set(nameKeyNoSpaces, list);
    }
    for (const c of colloquiumsRaw || []) {
      const studentId = String(
        c.studentId ?? c.student?.id ?? c.student?.studentId ?? "",
      );
      if (!studentId) continue;
      const existing = byStudent.get(studentId) ?? [];
      if (!existing.includes(c)) existing.push(c);
      byStudent.set(studentId, existing);
    }

    for (const list of byStudent.values()) {
      list.sort((a, b) => {
        const ad =
          Date.parse(
            a.date ?? a.dateTime ?? a.createdAt ?? a.createdOn ?? "",
          ) || 0;
        const bd =
          Date.parse(
            b.date ?? b.dateTime ?? b.createdAt ?? b.createdOn ?? "",
          ) || 0;
        return ad - bd;
      });
    }

    return baseStudents.map((s) => {
      const np = (s as any)._nameParts;
      const nameSurnameOnly = [np?.name, np?.surname].filter(Boolean).join(" ");
      const list =
        byStudent.get(String(s.id)) ??
        byStudent.get(normalize(s.name)) ??
        byStudent.get(normalizeNoSpaces(s.name)) ??
        byStudent.get(normalize(nameSurnameOnly)) ??
        byStudent.get(normalizeNoSpaces(nameSurnameOnly)) ??
        [];
      const prevColloquium = s.colloquium ?? Array(COLLOQUIUM_COUNT).fill(null);
      const prevIds = s.colloquiumIds ?? Array(COLLOQUIUM_COUNT).fill(null);
      const colloquium = [...prevColloquium] as (number | null)[];
      const colloquiumIds = [...prevIds] as (string | null)[];

      for (let i = 0; i < Math.min(COLLOQUIUM_COUNT, list.length); i++) {
        const item = list[i];
        const grade = item.grade ?? item.value ?? null;
        // Treat -1 as null (not graded yet)
        colloquium[i] = grade === -1 ? null : grade; 
        colloquiumIds[i] = item.id ?? item.colloquiumId ?? null;
      }
      for (let i = 0; i < COLLOQUIUM_COUNT; i++) {
        if (colloquium[i] === null && prevColloquium[i] != null)
          colloquium[i] = prevColloquium[i];
        if (colloquiumIds[i] === null && prevIds[i] != null)
          colloquiumIds[i] = prevIds[i];
      }

      return { ...s, colloquium, colloquiumIds };
    });
  };

  const applyIndependentWorksToStudents = (
    baseStudents: Student[],
    independentWorksRaw: any[],
  ): Student[] => {
    const byStudent = new Map<string, any[]>();

    for (const iw of independentWorksRaw || []) {
      const studentId = String(
        iw.studentId ?? iw.student?.id ?? iw.student?.studentId ?? "",
      );
      if (!studentId) continue;
      const existing = byStudent.get(studentId) ?? [];
      if (!existing.includes(iw)) existing.push(iw);
      byStudent.set(studentId, existing);
    }

    return baseStudents.map((s) => {
      const studentIdStr = String(s.id);
      const list = byStudent.get(studentIdStr) ?? [];

      const prevAssignments =
        s.assignments ?? Array(ASSIGNMENTS_COUNT).fill(null);
      const prevIds = s.assignmentIds ?? Array(ASSIGNMENTS_COUNT).fill(null);
      const assignments = [...prevAssignments] as (0 | 1 | null)[];
      const assignmentIds = [...prevIds] as (string | null)[];

      for (const item of list) {
        const number = item.number ?? item.Number;
        const independentWorkId =
          item.id ?? item.Id ?? item.independentWorkId ?? null;

        if (number !== null && number !== undefined && independentWorkId) {
          const index = Number(number) - 1;

          if (index >= 0 && index < ASSIGNMENTS_COUNT) {
            assignmentIds[index] = independentWorkId;
            const isPassed = item.isPassed ?? item.IsPassed;

            if (isPassed === true) {
              assignments[index] = 1;
            } else if (isPassed === false) {
              assignments[index] = 0;
            } else {
              assignments[index] = null;
            }
          }
        }
      }

      return { ...s, assignments, assignmentIds };
    });
  };
  const loadCourseData = async () => {
    setIsLoading(true);
    try {
      let classesData: any[] = [];
      let sessionItems: CourseSession[] = [];

      try {
        const classesResp = await listTaughtSubjectClasses(taughtSubjectId);
        const classesDataWrapped = unwrap<any>(classesResp);
        const attendancesArray = toArray(
          classesDataWrapped?.activityAndAttendances ??
            classesDataWrapped?.ActivityAndAttendances ??
            classesDataWrapped?.data?.activityAndAttendances ??
            classesDataWrapped?.data?.ActivityAndAttendances ??
            [],
        );

        if (attendancesArray.length > 0) {
          const firstStudent = attendancesArray[0];
          const classesFromFirst = toArray(
            firstStudent?.classes ?? firstStudent?.Classes ?? [],
          );

          sessionItems = classesFromFirst.map((cls: any, index: number) => ({
            id: String(cls?.classId ?? cls?.ClassId ?? index + 1),
            date: formatSessionDate(cls?.classDate ?? cls?.ClassDate),
            time: cls?.formattedClassHours ?? cls?.FormattedClassHours ?? "",
            type: String(
              cls?.classType ?? cls?.ClassType ?? "L",
            )[0].toUpperCase() as "L" | "S",
            seminarId: cls?.seminarId ?? cls?.SeminarId ?? null,
          }));

          classesData = attendancesArray;
        }
      } catch (e) {
        console.error("Failed to load classes:", e);
        classesData = [];
        sessionItems = [];
      }

      if (sessionItems.length === 0) {
        try {
          const taughtSubjectResp = await getTaughtSubject(taughtSubjectId);
          const taughtSubject = unwrap<any>(taughtSubjectResp);
          sessionItems = mapSessionsFromApi(taughtSubject);
        } catch (e) {
          // Endpoint requires Dean role, but we're Teacher - this is expected
          console.warn(
            "Could not fetch taught subject for sessions (non-fatal):",
            e,
          );
          // Keep empty sessionItems - will be handled by other logic
        }
      }

      setSessions(sessionItems);
      setSelectedColumn((prev) =>
        prev !== null && (prev < 0 || prev >= sessionItems.length)
          ? null
          : prev,
      );
      setBulkValue(""); // Сбрасываем bulk value при загрузке данных

      let taughtSubject: any = {};
      try {
        const taughtSubjectResp = await getTaughtSubject(taughtSubjectId);
        taughtSubject = unwrap<any>(taughtSubjectResp);
      } catch (e) {
        // Endpoint requires Dean role, but we're Teacher - this is expected
        // Try to get data from GetStudentsAndAttendances response instead
        console.warn("Could not fetch taught subject details (non-fatal):", e);

        // Extract taught subject info from classesData if available
        if (classesData.length > 0) {
          // Try to get subject info from first student's data
          const firstStudent = classesData[0];
          if (firstStudent) {
            taughtSubject = {
              subjectTitle:
                firstStudent?.subjectTitle ?? firstStudent?.SubjectTitle,
              title: firstStudent?.subjectTitle ?? firstStudent?.SubjectTitle,
              hours: firstStudent?.hours ?? firstStudent?.Hours,
              groupId: firstStudent?.groupId ?? firstStudent?.GroupId,
            };
          }
        }
      }

      const nextTitle =
        taughtSubject?.title ??
        taughtSubject?.name ??
        taughtSubject?.subjectTitle ??
        taughtSubject?.taughtSubjectTitle ??
        "";

      const rawHours = taughtSubject?.hours ?? taughtSubject?.totalHours;

      setCourseTitle(nextTitle ? String(nextTitle) : "");
      if (rawHours !== undefined && rawHours !== null) {
        const nextHours = Number(rawHours);
        if (Number.isFinite(nextHours)) setCourseHours(nextHours);
      }

      const groupId =
        taughtSubject?.groupId ??
        taughtSubject?.group?.id ??
        taughtSubject?.group?.groupId ??
        null;
      let year = taughtSubject?.year ?? taughtSubject?.group?.year ?? null;

      if (!year && groupId) {
        try {
          const groupResp = await getGroup(String(groupId));
          const group = unwrap<any>(groupResp);
          year = group?.year ?? null;
        } catch {}
      }

      let apiStudents: any[] = [];
      try {
        const taughtStudentsResp =
          await listTaughtSubjectStudents(taughtSubjectId);
        const rawStudents = unwrap<any>(taughtStudentsResp);
        apiStudents = toArray(
          rawStudents?.student ?? rawStudents?.Student ?? rawStudents ?? [],
        );
      } catch {
        apiStudents = [];
      }

      if (apiStudents.length === 0 && groupId) {
        try {
          const fallback = await filterStudents(
            String(groupId),
            year !== null && year !== undefined ? Number(year) : undefined,
          );
          const rawFilter = unwrap<any>(fallback);
          apiStudents = toArray(
            rawFilter?.students ?? rawFilter?.Students ?? rawFilter ?? [],
          );
        } catch {
          apiStudents = [];
        }
      }

      const mappedStudents: Student[] = apiStudents.map(
        (s: any, idx: number) => {
          const id =
            s.studentId ??
            s.id ??
            s.userId ??
            s.user?.id ??
            s.userName ??
            String(idx + 1);

          const idStr = String(id ?? "");
          const isGuidLike = idStr.length > 30 && idStr.includes("-");
          const userId = s.userId ?? s.user?.id ?? (isGuidLike ? id : null);
          const nameFromParts = [s.surname, s.name, s.middleName]
            .filter(Boolean)
            .join(" ")
            .trim();
          const fullName =
            s.fullName ??
            (nameFromParts ? nameFromParts : undefined) ??
            s.userName ??
            `Student ${idx + 1}`;

          const sessionAttendance = (() => {
            if (sessionItems.length === 0)
              return [] as Student["activityAttendance"];

            const records = toArray(
              s.activityAttendance ??
                s.attendance ??
                s.sessions ??
                s.sessionAttendance,
            );

            const byId = new Map<string, any>();
            for (const record of records) {
              const key = record?.sessionId ?? record?.id ?? record?.session;
              if (key !== undefined && key !== null) {
                byId.set(String(key), record);
              }
            }

            return sessionItems.map((session, sessionIndex) => {
              const direct = records[sessionIndex];
              const fallback = byId.get(session.id);
              const source = direct ?? fallback ?? {};
              const defaultAttendance = "absent";
              const attendanceValue = String(
                source?.attendance ??
                  source?.status ??
                  source?.present ??
                  defaultAttendance,
              ).toLowerCase();
              let attendance: "present" | "absent" = [
                "absent",
                "a",
                "false",
                "0",
              ].includes(attendanceValue)
                ? "absent"
                : "present";
              const gradeValue =
                source?.grade ?? source?.score ?? source?.value;
              const grade =
                gradeValue === null || gradeValue === undefined
                  ? null
                  : Number(gradeValue);
              if (
                session.type === "S" &&
                grade !== null &&
                !Number.isNaN(grade)
              ) {
                attendance = "present";
              }
              return {
                attendance,
                grade: grade !== null && !Number.isNaN(grade) ? grade : null,
              };
            });
          })();

          return {
            id,
            name: String(fullName).trim(),
            activityAttendance:
              sessionAttendance.length > 0
                ? sessionAttendance
                : Array.from({ length: sessionItems.length }, (_, idx) => ({
                    attendance: "absent",
                    grade: null as number | null,
                  })),
            colloquium: Array(COLLOQUIUM_COUNT).fill(null),
            assignments: Array(ASSIGNMENTS_COUNT).fill(null),
            colloquiumIds: Array(COLLOQUIUM_COUNT).fill(null),
            seminarIds: Array.from({ length: sessionItems.length }, () => null),
            _nameParts: {
              name: s.name,
              surname: s.surname,
              middleName: s.middleName,
            },
            userId: userId,
          } as Student & {
            _nameParts?: {
              name?: string;
              surname?: string;
              middleName?: string;
            };
            userId?: string | null;
          };
        },
      );

      let colloquiums: any[] = [];
      try {
        const colloquiumsResp =
          await listTaughtSubjectColloquiums(taughtSubjectId);
        const rawColl = unwrap<any>(colloquiumsResp);
        colloquiums = toArray(
          rawColl?.colloquiums ?? rawColl?.Colloquiums ?? rawColl ?? [],
        );
      } catch {
        colloquiums = [];
      }

      let independentWorks: any[] = [];
      try {
        const independentWorksResp =
          await listTaughtSubjectIndependentWorks(taughtSubjectId);
        const rawWorks = unwrap<any>(independentWorksResp);

        const worksArray = toArray(
          rawWorks?.independentWorks ??
            rawWorks?.IndependentWorks ??
            rawWorks?.getIndependentWorkDto ??
            rawWorks ??
            [],
        );

        // Just use the raw works directly!
        independentWorks = worksArray;
      } catch (e) {
        console.warn("Failed to load independent works:", e);
        independentWorks = [];
      }

      let enhancedStudents = mappedStudents;
      if (classesData.length > 0) {
        const byKey = new Map<string, any>();

        const normalize = (v: any) =>
          String(v ?? "")
            .toLowerCase()
            .trim();
        const normalizeNoSpaces = (v: any) => normalize(v).replace(/\s+/g, "");

        for (const data of classesData) {
          const idKey = normalize(
            data?.studentId ?? data?.StudentId ?? data?.student?.id,
          );
          const nameKey = normalize(
            data?.studentFullName ??
              data?.StudentFullName ??
              data?.student?.fullName ??
              data?.student?.name,
          );
          if (idKey) byKey.set(idKey, data);
          if (nameKey) byKey.set(nameKey, data);
          const fullName =
            data?.studentFullName ??
            data?.StudentFullName ??
            data?.student?.fullName ??
            "";
          if (nameKey) byKey.set(normalizeNoSpaces(fullName), data);
        }

        enhancedStudents = mappedStudents.map((student) => {
          const np = (student as any)._nameParts;
          const nameSurnameOnly = [np?.name, np?.surname]
            .filter(Boolean)
            .join(" ");
          const candidateKeys = [
            normalize(student.id),
            normalize((student as any).studentId),
            normalize((student as any).userId),
            normalize((student as any).user?.id),
            normalize(student.name),
            normalize(nameSurnameOnly),
            normalizeNoSpaces(student.name),
            normalizeNoSpaces(nameSurnameOnly),
          ].filter(Boolean);

          let classesForStudent: any = null;
          for (const k of candidateKeys) {
            if (byKey.has(k)) {
              classesForStudent = byKey.get(k);
              break;
            }
          }

          if (!classesForStudent) {
            return student;
          }

          const classes = toArray(
            classesForStudent.classes ??
              classesForStudent?.Classes ??
              classesForStudent?.classesList ??
              [],
          );

          const attendanceAligned = sessionItems.map((session, i) => {
            const cls = classes[i];

            if (cls) {
              const absentRaw = cls.isAbsent ?? cls.IsAbsent;
              const presentRaw = cls.isPresent ?? cls.IsPresent;
              const gradeVal = cls.grade ?? cls.Grade;

              let attendanceState: "present" | "absent" = "absent";

              if (typeof absentRaw === "boolean") {
                attendanceState = absentRaw ? "absent" : "present";
              } else if (typeof absentRaw === "number") {
                attendanceState = absentRaw > 0 ? "absent" : "present";
              } else if (typeof absentRaw === "string") {
                const normalized = absentRaw.trim().toLowerCase();
                if (["true", "1", "absent", "a"].includes(normalized)) {
                  attendanceState = "absent";
                } else if (
                  ["false", "0", "present", "p"].includes(normalized)
                ) {
                  attendanceState = "present";
                }
              } else if (typeof presentRaw === "boolean") {
                attendanceState = presentRaw ? "present" : "absent";
              } else if (typeof presentRaw === "number") {
                attendanceState = presentRaw > 0 ? "present" : "absent";
              } else if (typeof presentRaw === "string") {
                const normalized = presentRaw.trim().toLowerCase();
                if (["true", "1", "present", "p"].includes(normalized)) {
                  attendanceState = "present";
                } else if (["false", "0", "absent", "a"].includes(normalized)) {
                  attendanceState = "absent";
                }
              }

              const result: {
                attendance: "present" | "absent";
                grade: number | null;
              } = {
                attendance: attendanceState,
                grade:
                  gradeVal !== undefined && gradeVal !== null
                    ? Number(gradeVal)
                    : null,
              };

              // If there's a grade > 0 (1-10), student must be present
              // Grade 0 with null isPresent should remain absent
              if (
                session.type === "S" &&
                result.grade !== null &&
                !Number.isNaN(result.grade) &&
                result.grade > 0
              ) {
                result.attendance = "present";
              }
              return result;
            }

            const existing = student.activityAttendance?.[i];
            if (
              existing &&
              (existing.attendance === "present" ||
                existing.attendance === "absent")
            ) {
              return existing;
            }

            const fallback: {
              attendance: "present" | "absent";
              grade: number | null;
            } = {
              attendance: "absent",
              grade: null,
            };
            return fallback;
          });

          const seminarIdsAligned = sessionItems.map(
            (_, i) => classes[i]?.seminarId ?? classes[i]?.SeminarId ?? null,
          );

          return {
            ...student,
            activityAttendance: attendanceAligned,
            seminarIds: seminarIdsAligned,
          };
        });
      }

      const mergedWithColloquiums = applyColloquiumsToStudents(
        enhancedStudents,
        colloquiums,
      );
      const merged = applyIndependentWorksToStudents(
        mergedWithColloquiums,
        independentWorks,
      );

      attendanceSnapshotRef.current = new Map(
        merged.map((student) => [
          String(student.id),
          student.activityAttendance.map((entry) => entry.attendance),
        ]),
      );
      assignmentsSnapshotRef.current = new Map(
        merged.map((student) => [String(student.id), [...student.assignments]]),
      );
      setStudents(merged);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? "Failed to load course data");
      setStudents([]);
      setCourseTitle("");
      setSessions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshColloquiums = async () => {
    try {
      const colloquiumsResp =
        await listTaughtSubjectColloquiums(taughtSubjectId);
      const rawColl = unwrap<any>(colloquiumsResp);
      const colloquiums = toArray(
        rawColl?.colloquiums ?? rawColl?.Colloquiums ?? rawColl ?? [],
      );
      setStudents((prev) => applyColloquiumsToStudents(prev, colloquiums));
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadCourseData();
  }, [taughtSubjectId]);

  const updateActivityAttendance = async (
    studentId: string | number,
    sessionIndex: number,
    value: string,
    skipStateUpdate: boolean = false, // Flag to skip state update when called from bulk update
  ) => {
    const studentIdStr = String(studentId);
    const session = sessions[sessionIndex];
    const isSeminarGrade =
      session?.type === "S" &&
      value !== "present" &&
      value !== "absent" &&
      !Number.isNaN(parseInt(value, 10));

    const commitSnapshot = (nextAttendance: "present" | "absent") => {
      const current = attendanceSnapshotRef.current.get(studentIdStr);
      const base = current ? [...current] : [];
      while (base.length < sessions.length) {
        const defaultValue = "absent";
        base.push(defaultValue);
      }
      base[sessionIndex] = nextAttendance;
      attendanceSnapshotRef.current.set(studentIdStr, base);
    };

    const newAttendance = (student: Student) => {
      const newData = [...student.activityAttendance];
      if (value === "absent") {
        newData[sessionIndex] = { attendance: "absent", grade: null };
      } else if (value === "present") {
        newData[sessionIndex] = { attendance: "present", grade: null };
      } else {
        const grade = parseInt(value, 10);
        newData[sessionIndex] = { attendance: "present", grade };
      }
      return newData;
    };

    let originalAttendance:
      | { attendance: "present" | "absent"; grade: number | null }
      | undefined;
    const currentStudentBeforeUpdate = students.find(
      (s) => String(s.id) === studentIdStr,
    );
    if (currentStudentBeforeUpdate) {
      originalAttendance =
        currentStudentBeforeUpdate.activityAttendance[sessionIndex];
    }

    const revertAttendance = () => {
      if (!originalAttendance) return;
      const snapshot = originalAttendance;
      setStudents((prev) =>
        prev.map((s) => {
          if (String(s.id) !== studentIdStr) return s;
          const newData = [...s.activityAttendance];
          newData[sessionIndex] = snapshot;
          return { ...s, activityAttendance: newData };
        }),
      );
    };

    if (!skipStateUpdate && !isBulkUpdating) {
      setStudents((prev) =>
        prev.map((s) =>
          String(s.id) === studentIdStr
            ? { ...s, activityAttendance: newAttendance(s) }
            : s,
        ),
      );
    }

    // Handle attendance updates (present/absent) - not just seminar grades
    if (value === "present" || value === "absent") {
      const currentStudent = students.find(
        (s) => String(s.id) === studentIdStr,
      );
      if (!currentStudent) {
        console.error("Student not found for attendance update");
        return;
      }

      const currentAttendance =
        currentStudentBeforeUpdate?.activityAttendance[sessionIndex];
      const needsToggle =
        (value === "absent" && currentAttendance?.attendance !== "absent") ||
        (value === "present" && currentAttendance?.attendance === "absent");

      if (needsToggle && session?.id) {
        try {
          let actualStudentId: string = String(currentStudent.id);

          if (looksLikeStudentGuid(actualStudentId)) {
          } else if (
            currentStudent.userId &&
            looksLikeStudentGuid(currentStudent.userId)
          ) {
            actualStudentId = currentStudent.userId;
          } else if (
            (currentStudent as any).user?.id &&
            looksLikeStudentGuid((currentStudent as any).user.id)
          ) {
            actualStudentId = (currentStudent as any).user.id;
          } else {
            console.warn(
              "Cannot update attendance: Student ID format is invalid",
            );
            return;
          }

          if (looksLikeStudentGuid(actualStudentId)) {
            await markStudentAbsence(actualStudentId, session.id);
            commitSnapshot(value === "absent" ? "absent" : "present");
          }
        } catch (e: any) {
          console.error("Error updating attendance:", e);
          const errorMessage =
            e?.message ??
            e?.response?.data?.message ??
            "Failed to update attendance";
          toast.error(errorMessage);
          revertAttendance();
        }
      }
      return; // Don't proceed to seminar grade logic for present/absent
    }

    if (!isSeminarGrade) return;

    const grade = parseInt(value, 10);
    if (grade < 0 || grade > 10) return;

    let seminarId: string | null = null;

    setStudents((prev) => {
      const found = prev.find((s) => String(s.id) === studentIdStr);
      if (found) {
        seminarId = found.seminarIds?.[sessionIndex] ?? null;
      }
      return prev;
    });

    try {
      if (!studentIdStr || studentIdStr.trim() === "") {
        throw new Error("Student ID is required");
      }
      if (!taughtSubjectId || taughtSubjectId.trim() === "") {
        throw new Error("Taught Subject ID is required");
      }

      const currentStudent = students.find(
        (s) => String(s.id) === studentIdStr,
      );
      if (!currentStudent) {
        throw new Error("Student not found");
      }

      let actualStudentId: string = String(currentStudent.id);

      if (looksLikeStudentGuid(actualStudentId)) {
      } else if (
        currentStudent.userId &&
        looksLikeStudentGuid(currentStudent.userId)
      ) {
        actualStudentId = currentStudent.userId;
      } else if (
        (currentStudent as any).user?.id &&
        looksLikeStudentGuid((currentStudent as any).user.id)
      ) {
        actualStudentId = (currentStudent as any).user.id;
      } else {
        toast.error(
          "Cannot save seminar grade: Student ID format is invalid. Please contact your administrator.",
        );
        return;
      }

      if (!looksLikeStudentGuid(actualStudentId)) {
        toast.error(
          "Cannot save seminar grade: Student ID format is invalid. Please contact your administrator.",
        );
        return;
      }

      if (originalAttendance?.attendance === "absent" && session?.id) {
        try {
          await markStudentAbsence(actualStudentId, session.id);
          commitSnapshot("present");
        } catch (toggleError: any) {
          console.error(
            "Error updating attendance before seminar grade:",
            toggleError,
          );
          const errorMessage =
            toggleError?.message ??
            toggleError?.response?.data?.message ??
            "Failed to update attendance";
          toast.error(errorMessage);
          revertAttendance();
          return;
        }
      }

      if (seminarId) {
        await updateSeminarGrade(actualStudentId, seminarId, grade);
        // Update snapshot to reflect that attendance is now "present" due to grade
        commitSnapshot("present");
      } else {
        const seminarData = {
          studentId: actualStudentId.trim(),
          taughtSubjectId: taughtSubjectId.trim(),
        };

        const createRes = await createSeminar(seminarData);
        const createdId =
          (createRes as any)?.id ??
          (createRes as any)?.data?.id ??
          (createRes as any)?.data ??
          (createRes as any)?.Id ??
          (createRes as any)?.seminarId;
        if (typeof createdId === "string" && createdId) {
          seminarId = createdId;
          await updateSeminarGrade(actualStudentId, seminarId, grade);
          // Update snapshot to reflect that attendance is now "present" due to grade
          commitSnapshot("present");
          setStudents((prev) =>
            prev.map((s) => {
              if (String(s.id) !== studentIdStr) return s;
              const ids = [
                ...(s.seminarIds ?? Array(sessions.length).fill(null)),
              ];
              ids[sessionIndex] = seminarId;
              return { ...s, seminarIds: ids };
            }),
          );
        } else {
          throw new Error(
            "Failed to create seminar: no ID returned from server",
          );
        }
      }
    } catch (e: any) {
      console.error("Error saving seminar grade:", e);
      const errorMessage =
        e?.message ??
        e?.response?.data?.message ??
        "Failed to save seminar grade";
      toast.error(errorMessage);
      revertAttendance();
    }
  };

  const updateColloquium = async (
    studentId: string | number,
    colloquiumIndex: number,
    grade: number | null,
  ) => {
    const studentIdStr = String(studentId);
    const currentStudent = students.find((s) => String(s.id) === studentIdStr);
    const currentColloquiumId =
      currentStudent?.colloquiumIds?.[colloquiumIndex] ?? null;

    setStudents((prev) =>
      prev.map((student) => {
        if (String(student.id) === studentIdStr) {
          const newColloquium = [...student.colloquium];
          newColloquium[colloquiumIndex] = grade;
          const newIds = [
            ...(student.colloquiumIds ?? Array(COLLOQUIUM_COUNT).fill(null)),
          ];
          newIds[colloquiumIndex] =
            grade === null ? null : newIds[colloquiumIndex];
          return {
            ...student,
            colloquium: newColloquium,
            colloquiumIds: newIds,
          };
        }
        return student;
      }),
    );

    try {
      if (grade === null) {
        if (currentColloquiumId) {
          await deleteColloquium(String(currentColloquiumId));
        }
      } else if (currentColloquiumId) {
        await updateColloquiumGrade(
          studentIdStr,
          String(currentColloquiumId),
          grade,
        );
      } else {
        await createColloquium({
          taughtSubjectId,
          studentId: studentIdStr,
          date: new Date().toISOString(),
          grade,
        });
      }

      await refreshColloquiums();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? "Failed to update colloquium");
      await refreshColloquiums();
    }
  };

  const toggleAssignment = (
    studentId: string | number,
    assignmentIndex: number,
  ) => {
    setStudents((prevStudents) =>
      prevStudents.map((student) => {
        if (String(student.id) === String(studentId)) {
          const newAssignments = [...student.assignments];
          const current = newAssignments[assignmentIndex];

          // Cycle through: null -> 1 -> 0 -> null
          let newValue: 0 | 1 | null;
          if (current === null) {
            newValue = 1;
          } else if (current === 1) {
            newValue = 0;
          } else {
            newValue = null;
          }

          newAssignments[assignmentIndex] = newValue;

          // Track this change
          const independentWorkId = student.assignmentIds?.[assignmentIndex];
          const isPassed =
            newValue === 1 ? true : newValue === 0 ? false : null;

          // Create a unique key for tracking this change
          // Format: "studentId:assignmentIndex" or use the independentWorkId if it exists
          const changeKey =
            independentWorkId || `${student.id}:${assignmentIndex}`;

          pendingAssignmentChanges.current.set(changeKey, {
            studentId: String(student.id),
            assignmentIndex,
            independentWorkId: independentWorkId || null,
            isPassed,
          });

          return { ...student, assignments: newAssignments };
        }
        return student;
      }),
    );
  };

  const applyBulkValue = useCallback(
    async (value: string) => {
      if (selectedColumn === null || !value) return;

      const session = sessions[selectedColumn];
      const isSeminarGrade =
        session?.type === "S" &&
        value !== "present" &&
        value !== "absent" &&
        !Number.isNaN(parseInt(value, 10));

      // Update UI state immediately for better UX
      // Use functional update to get current students state
      let studentsToUpdate: Student[] = [];
      setStudents((prevStudents) => {
        const updated = prevStudents.map((student) => {
          const newData = [...student.activityAttendance];
          if (value === "absent") {
            newData[selectedColumn] = { attendance: "absent", grade: null };
          } else if (value === "present") {
            newData[selectedColumn] = { attendance: "present", grade: null };
          } else {
            const grade = parseInt(value);
            newData[selectedColumn] = { attendance: "present", grade };
          }
          return { ...student, activityAttendance: newData };
        });

        // For seminar grades, collect students that need API updates
        if (isSeminarGrade) {
          const grade = parseInt(value, 10);
          if (grade >= 0 && grade <= 10) {
            studentsToUpdate = prevStudents.filter((s) => {
              // Only update students that don't already have this grade
              const currentValue = s.activityAttendance[selectedColumn];
              return (
                !currentValue ||
                currentValue.grade !== grade ||
                currentValue.attendance !== "present"
              );
            });
          }
        }

        return updated;
      });

      setBulkValue("");

      // For seminar grades, call updateActivityAttendance for each student sequentially
      // This prevents infinite loops by ensuring each API call completes before the next one
      // Use a flag to prevent Select components from triggering onValueChange during bulk update
      if (isSeminarGrade && studentsToUpdate.length > 0) {
        const grade = parseInt(value, 10);
        if (grade >= 0 && grade <= 10) {
          setIsBulkUpdating(true); // Set flag to prevent state updates from triggering Select onValueChange
          try {
            // Update each student sequentially to prevent race conditions and infinite loops
            for (const student of studentsToUpdate) {
              try {
                // Skip state update since we already updated it above
                await updateActivityAttendance(
                  student.id,
                  selectedColumn,
                  value,
                  true,
                );
              } catch (error) {
                console.error(
                  `Failed to update grade for student ${student.id}:`,
                  error,
                );
                // Continue with next student even if one fails
              }
            }
          } finally {
            setIsBulkUpdating(false); // Reset flag after all updates complete
          }
        }
      }
    },
    [selectedColumn, sessions],
  );

  const getActivityValue = (
    data:
      | {
          attendance: "present" | "absent";
          grade: number | null;
        }
      | undefined,
    session?: CourseSession,
  ) => {
    if (!data) return "absent";
    if (data.attendance === "absent") return "absent";
    if (data.grade !== null && data.grade !== undefined) {
      // If grade is 0, show attendance state instead of "0"
      if (data.grade === 0) {
        return data.attendance;
      }
      return data.grade.toString();
    }
    return "present";
  };

  const looksLikeStudentGuid = (id: string | number): boolean => {
    const s = String(id ?? "");
    return s.length > 30 && s.includes("-");
  };

  const sendActivityAttendance = async () => {
    if (sessions.length === 0 || students.length === 0) {
      toast.info("No sessions or students to save");
      return;
    }
    const withGuid = students.some((s) => looksLikeStudentGuid(s.id));
    if (!withGuid) {
      toast.error(
        "Saving attendance is not available: the server expects a student ID that is not provided by the current API. Please contact your administrator.",
      );
      return;
    }
    setIsSendingAttendance(true);
    let ok = 0;
    let err = 0;
    try {
      const pending: Array<{
        student: Student;
        sessionIndex: number;
        desired: "present" | "absent";
      }> = [];

      for (const student of students) {
        if (!looksLikeStudentGuid(student.id)) continue;
        const snapshot =
          attendanceSnapshotRef.current.get(String(student.id)) ?? [];
        for (let idx = 0; idx < student.activityAttendance.length; idx++) {
          const cell = student.activityAttendance[idx];
          const desired = cell?.attendance ?? "absent";
          const previous = snapshot[idx] ?? "absent";
          if (desired !== previous) {
            pending.push({ student, sessionIndex: idx, desired });
          }
        }
      }

      if (pending.length === 0) {
        toast.info("No attendance changes to send");
        return;
      }

      for (const item of pending) {
        const { student, sessionIndex, desired } = item;
        const session = sessions[sessionIndex];
        if (!session?.id) continue;
        let actualStudentId: string = String(student.id);
        if (!looksLikeStudentGuid(actualStudentId)) {
          if (student.userId && looksLikeStudentGuid(student.userId)) {
            actualStudentId = student.userId;
          } else if (
            (student as any).user?.id &&
            looksLikeStudentGuid((student as any).user.id)
          ) {
            actualStudentId = (student as any).user.id;
          } else {
            continue;
          }
        }

        try {
          await markStudentAbsence(actualStudentId, String(session.id));
          ok += 1;
          const snapshot =
            attendanceSnapshotRef.current.get(String(student.id)) ?? [];
          const updated = [...snapshot];
          while (updated.length < sessions.length) {
            const defaultValue = "absent";
            updated.push(defaultValue);
          }
          updated[sessionIndex] = desired;
          attendanceSnapshotRef.current.set(String(student.id), updated);
        } catch {
          err += 1;
        }
      }
      if (ok > 0) toast.success(`Saved ${ok} change(s)`);
      if (err > 0) toast.error(`Failed to save ${err} change(s)`);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to save attendance");
    } finally {
      setIsSendingAttendance(false);
    }
  };

  const sendAssignments = async () => {
    setIsSendingAssignments(true);

    const changes = Array.from(pendingAssignmentChanges.current.values());

    if (changes.length === 0) {
      toast.info("No changes to save");
      setIsSendingAssignments(false);
      return;
    }

    try {
      // Filter out only changes that have independentWorkId
      const changesWithIds = changes
        .filter((change) => change.independentWorkId !== null)
        .map((change) => ({
          independentWorkId: change.independentWorkId!,
          isPassed: change.isPassed,
        }));

      if (changesWithIds.length === 0) {
        toast.error("No independent work IDs found. Please refresh the page.");
        setIsSendingAssignments(false);
        return;
      }

      await markIndependentWorkGrade(changesWithIds);

      toast.success(
        `Successfully saved ${changesWithIds.length} assignment(s)`,
      );

      // Clear pending changes after successful save
      pendingAssignmentChanges.current.clear();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to save assignments");
    } finally {
      setIsSendingAssignments(false);
    }
  };

  const loadingSpinner = (
    <div className="py-16">
      <span className="text-sm text-muted-foreground relative inline-flex items-center gap-1">
        Loading
        <span className="flex gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/80 animate-bounce [animation-delay:0ms]" />
          <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/80 animate-bounce [animation-delay:150ms]" />
          <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/80 animate-bounce [animation-delay:300ms]" />
        </span>
      </span>
    </div>
  );

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Courses
        </Button>
      </div>

      <div>
        <h1>{courseTitle || "Course"}</h1>
        <p className="text-muted-foreground">
          Manage student grades and attendance
        </p>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-muted-foreground" />
          <div className="flex flex-col">
            <span className="text-sm text-muted-foreground">Students</span>
            <span className="font-medium">
              {students.length || initialStudentCount || 0}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-muted-foreground" />
          <div className="flex flex-col">
            <span className="text-sm text-muted-foreground">Hours</span>
            <span className="font-medium">
              {courseHours !== undefined ? courseHours : "—"}
            </span>
          </div>
        </div>
      </div>

      <Tabs defaultValue="activity" className="w-full min-w-0 overflow-hidden">
        <TabsList>
          <TabsTrigger value="activity">Activity/Attendance</TabsTrigger>
          <TabsTrigger value="colloquium">Colloquium</TabsTrigger>
          <TabsTrigger value="assignments">Assignments</TabsTrigger>
        </TabsList>

        <TabsContent value="activity" className="space-y-4">
          <Card className="w-full min-w-0 overflow-hidden">
            <CardHeader className="flex-shrink-0 space-y-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <CardTitle>Activity & Attendance Tracking</CardTitle>
                  <CardDescription>
                    Mark attendance and grades for each session. Grades save
                    automatically.
                  </CardDescription>
                </div>
                <div className="flex flex-shrink-0 flex-wrap items-center gap-2">
                  <Select
                    value={selectedColumn?.toString() || ""}
                    onValueChange={(v: string) =>
                      setSelectedColumn(v ? parseInt(v, 10) : null)
                    }
                  >
                    <SelectTrigger className="w-full min-w-[140px] sm:w-[180px]">
                      <SelectValue placeholder="Select a class" />
                    </SelectTrigger>
                    <SelectContent>
                      {sessions.map((session, idx) => (
                        <SelectItem key={session.id} value={idx.toString()}>
                          {session.date} ({session.type})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={bulkValue}
                    onValueChange={(value: string) => {
                      setBulkValue(value);
                      applyBulkValue(value);
                    }}
                    disabled={selectedColumn === null}
                  >
                    <SelectTrigger className="w-full min-w-[120px] sm:w-[140px]">
                      <SelectValue placeholder="Bulk value" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="present">Present</SelectItem>
                      <SelectItem value="absent">Absent</SelectItem>
                      {Array.from({ length: 11 }, (_, i) => i).map((grade) => (
                        <SelectItem key={grade} value={grade.toString()}>
                          {grade}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="default"
                    size="sm"
                    className="shrink-0"
                    onClick={sendActivityAttendance}
                    disabled={
                      isSendingAttendance ||
                      students.length === 0 ||
                      sessions.length === 0 ||
                      !students.some((s) => looksLikeStudentGuid(s.id))
                    }
                    title={
                      !students.some((s) => looksLikeStudentGuid(s.id))
                        ? "Server requires student ID (GUID); not provided by current API."
                        : "Save attendance changes (grades are saved automatically)"
                    }
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {isSendingAttendance ? "Saving…" : "Save Attendance"}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="min-w-0 p-0">
              {isLoading ? (
                loadingSpinner
              ) : (
                <div className="relative overflow-x-auto border rounded-md">
                  <div className="inline-block min-w-full align-middle">
                    <div className="overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="sticky left-0 bg-background z-30 min-w-[200px] border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                              Student Name
                            </TableHead>
                            {sessions.map((session, idx) => (
                              <TableHead
                                key={session.id}
                                className={`text-center min-w-[120px] ${selectedColumn === idx ? "bg-accent" : ""}`}
                              >
                                <div className="text-xs">
                                  <div>{session.date}</div>
                                  <div className="text-muted-foreground">
                                    ({session.type}) {session.time}
                                  </div>
                                </div>
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {students.map((student) => {
                            return (
                              <TableRow key={student.id}>
                                <TableCell className="sticky left-0 bg-background z-30 font-medium border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                  {student.name}
                                </TableCell>
                                {sessions.map((session, idx) => (
                                  <TableCell
                                    key={session.id}
                                    className={`text-center ${selectedColumn === idx ? "bg-accent/50" : ""}`}
                                  >
                                    <Select
                                      value={getActivityValue(
                                        student.activityAttendance[idx],
                                        session,
                                      )}
                                      onValueChange={(value: string) =>
                                        updateActivityAttendance(
                                          student.id,
                                          idx,
                                          value,
                                        )
                                      }
                                      disabled={isLoading}
                                    >
                                      <SelectTrigger className="w-[100px] mx-auto">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="present">
                                          Present
                                        </SelectItem>
                                        <SelectItem value="absent">
                                          Absent
                                        </SelectItem>
                                        {session.type === "S" &&
                                          Array.from(
                                            { length: 11 },
                                            (_, i) => i,
                                          ).map((grade) => (
                                            <SelectItem
                                              key={grade}
                                              value={grade.toString()}
                                            >
                                              {grade}
                                            </SelectItem>
                                          ))}
                                      </SelectContent>
                                    </Select>
                                  </TableCell>
                                ))}
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="colloquium" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Colloquium Scores</CardTitle>
                  <CardDescription>
                    Mini exams scored 0-10 (3 per semester). Changes save when
                    you select a grade. Each colloquium must be completed before
                    the next can be graded.
                  </CardDescription>
                </div>
                <Button
                  variant="default"
                  size="sm"
                  onClick={async () => {
                    await refreshColloquiums();
                    toast.success("Colloquium data refreshed");
                  }}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                loadingSpinner
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student Name</TableHead>
                      <TableHead className="text-center">
                        Colloquium 1
                      </TableHead>
                      <TableHead className="text-center">
                        Colloquium 2
                      </TableHead>
                      <TableHead className="text-center">
                        Colloquium 3
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map((student) => (
                      <TableRow key={student.id}>
                        <TableCell className="font-medium">
                          {student.name}
                        </TableCell>
                        {[0, 1, 2].map((collIndex) => {
                          // Check if previous colloquium has a valid grade (0-10)
                          const isPreviousFilled =
                            collIndex === 0 ||
                            (student.colloquium[collIndex - 1] !== null &&
                              student.colloquium[collIndex - 1] !== undefined &&
                              student.colloquium[collIndex - 1] !== -1 && 
                              student.colloquium[collIndex - 1]! >= 0 && 
                              student.colloquium[collIndex - 1]! <= 10); 

                          const isDisabled = isLoading || !isPreviousFilled;

                          return (
                            <TableCell key={collIndex} className="text-center">
                              <Select
                                value={
                                  student.colloquium[collIndex]?.toString() ||
                                  "none"
                                }
                                onValueChange={(value: string) =>
                                  updateColloquium(
                                    student.id,
                                    collIndex,
                                    value === "none"
                                      ? null
                                      : parseInt(value, 10),
                                  )
                                }
                                disabled={isDisabled}
                              >
                                <SelectTrigger
                                  className={`w-[100px] mx-auto ${!isPreviousFilled ? "opacity-50 cursor-not-allowed" : ""}`}
                                  title={
                                    !isPreviousFilled
                                      ? "Complete previous colloquium first"
                                      : ""
                                  }
                                >
                                  <SelectValue placeholder="-" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">-</SelectItem>
                                  {Array.from({ length: 11 }, (_, i) => i).map(
                                    (grade) => (
                                      <SelectItem
                                        key={grade}
                                        value={grade.toString()}
                                      >
                                        {grade}
                                      </SelectItem>
                                    ),
                                  )}
                                </SelectContent>
                              </Select>
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assignments" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Assignments</CardTitle>
                  <CardDescription>
                    10 assignments per semester (click to toggle: ✓ / ✗ / -).
                  </CardDescription>
                </div>
                <Button
                  variant="default"
                  size="sm"
                  onClick={sendAssignments}
                  disabled={isSendingAssignments}
                >
                  <Send className="h-4 w-4 mr-2" />
                  {isSendingAssignments ? "Saving…" : "Send"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                loadingSpinner
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student Name</TableHead>
                      {Array.from({ length: 10 }, (_, i) => i + 1).map(
                        (num) => (
                          <TableHead key={num} className="text-center">
                            #{num}
                          </TableHead>
                        ),
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map((student) => (
                      <TableRow key={student.id}>
                        <TableCell className="font-medium">
                          {student.name}
                        </TableCell>
                        {student.assignments.map((assignment, idx) => (
                          <TableCell key={idx} className="text-center">
                            <Button
                              variant={
                                assignment === 1
                                  ? "default"
                                  : assignment === 0
                                    ? "destructive"
                                    : "outline"
                              }
                              size="sm"
                              onClick={() => toggleAssignment(student.id, idx)}
                              className="w-10 h-10 p-0"
                              disabled={isLoading}
                            >
                              {assignment === 1 ? (
                                <Check className="h-4 w-4" />
                              ) : assignment === 0 ? (
                                <X className="h-4 w-4" />
                              ) : (
                                <Minus className="h-4 w-4" />
                              )}
                            </Button>
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
