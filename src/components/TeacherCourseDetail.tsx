import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import {
  ArrowLeft,
  Check,
  X,
  Users,
  Calendar,
  Send,
  Minus,
} from "lucide-react";
import { useEffect, useState } from "react";
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
  createColloquium,
  deleteColloquium,
  updateColloquiumGrade,
  createSeminar,
  updateSeminarGrade,
  getGroup,
  filterStudents,
  markStudentAbsence,
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
  const taughtSubjectId = String(courseId);

  const [students, setStudents] = useState<Student[]>([]);
  const [courseTitle, setCourseTitle] = useState<string>("");
  const [courseHours, setCourseHours] = useState<number | undefined>(
    initialHours,
  );
  const [sessions, setSessions] = useState<CourseSession[]>([]);
  const [selectedColumn, setSelectedColumn] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSendingAttendance, setIsSendingAttendance] = useState<boolean>(false);

  const applyColloquiumsToStudents = (
    baseStudents: Student[],
    colloquiumsRaw: any[],
  ): Student[] => {
    const byStudent = new Map<string, any[]>();
    const normalize = (v: any) =>
      String(v ?? "")
        .toLowerCase()
        .trim();
    const normalizeNoSpaces = (v: any) =>
      normalize(v).replace(/\s+/g, "");

    for (const c of colloquiumsRaw || []) {
      const nameKey = normalize(c.studentFullName ?? c.student?.fullName ?? c.student?.name ?? "");
      const nameKeyNoSpaces = normalizeNoSpaces(c.studentFullName ?? c.student?.fullName ?? "");
      if (!nameKey && !nameKeyNoSpaces) continue;
      const list = byStudent.get(nameKey) ?? byStudent.get(nameKeyNoSpaces) ?? [];
      list.push(c);
      if (nameKey) byStudent.set(nameKey, list);
      if (nameKeyNoSpaces && nameKeyNoSpaces !== nameKey) byStudent.set(nameKeyNoSpaces, list);
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
        const ad = Date.parse(a.date ?? a.dateTime ?? a.createdAt ?? a.createdOn ?? "") || 0;
        const bd = Date.parse(b.date ?? b.dateTime ?? b.createdAt ?? b.createdOn ?? "") || 0;
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
        colloquium[i] = item.grade ?? item.value ?? null;
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
            type: String(cls?.classType ?? cls?.ClassType ?? "L")[0].toUpperCase() as "L" | "S",
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
        const taughtSubjectResp = await getTaughtSubject(taughtSubjectId);
        const taughtSubject = unwrap<any>(taughtSubjectResp);
        sessionItems = mapSessionsFromApi(taughtSubject);
      }

      setSessions(sessionItems);
      setSelectedColumn((prev) =>
        prev !== null && (prev < 0 || prev >= sessionItems.length)
          ? null
          : prev,
      );

      let taughtSubject: any = {};
      try {
        const taughtSubjectResp = await getTaughtSubject(taughtSubjectId);
        taughtSubject = unwrap<any>(taughtSubjectResp);
      } catch (e) {
        console.warn("Could not fetch taught subject details (non-fatal):", e);
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
            s.id ??
            s.studentId ??
            s.userName ??
            s.userId ??
            s.user?.id ??
            String(idx + 1);
          const nameFromParts = [s.name, s.middleName, s.surname]
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
              const attendanceValue = String(
                source?.attendance ??
                  source?.status ??
                  source?.present ??
                  "present",
              ).toLowerCase();
              const attendance: "present" | "absent" = [
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
                : Array.from({ length: sessionItems.length }, () => ({
                    attendance: "present" as const,
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
          } as Student & { _nameParts?: { name?: string; surname?: string; middleName?: string } };
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

      let enhancedStudents = mappedStudents;
      if (classesData.length > 0) {
        const byKey = new Map<string, any>();

        const normalize = (v: any) =>
          String(v ?? "")
            .toLowerCase()
            .trim();
        const normalizeNoSpaces = (v: any) =>
          normalize(v).replace(/\s+/g, "");

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
            data?.studentFullName ?? data?.StudentFullName ?? data?.student?.fullName ?? "";
          if (nameKey) byKey.set(normalizeNoSpaces(fullName), data);
        }

        enhancedStudents = mappedStudents.map((student) => {
          const np = (student as any)._nameParts;
          const nameSurnameOnly = [np?.name, np?.surname].filter(Boolean).join(" ");
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
              const isPresent = cls.isPresent ?? cls.IsPresent;
              const gradeVal = cls.grade ?? cls.Grade;
              const result: {
                attendance: "present" | "absent";
                grade: number | null;
              } = {
                attendance: isPresent === false ? "present" : "absent",
                grade: gradeVal !== undefined && gradeVal !== null ? Number(gradeVal) : null,
              };
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
            } = { attendance: "present", grade: null };
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

      const merged = applyColloquiumsToStudents(enhancedStudents, colloquiums);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taughtSubjectId]);

  const updateActivityAttendance = async (
    studentId: string | number,
    sessionIndex: number,
    value: string,
  ) => {
    const studentIdStr = String(studentId);
    const session = sessions[sessionIndex];
    const isSeminarGrade =
      session?.type === "S" &&
      value !== "present" &&
      value !== "absent" &&
      !Number.isNaN(parseInt(value, 10));

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

    setStudents((prev) =>
      prev.map((s) =>
        String(s.id) === studentIdStr
          ? { ...s, activityAttendance: newAttendance(s) }
          : s,
      ),
    );

    if (!isSeminarGrade) return;

    const grade = parseInt(value, 10);
    if (grade < 0 || grade > 10) return;

    const currentStudent = students.find((s) => String(s.id) === studentIdStr);
    let seminarId: string | null =
      currentStudent?.seminarIds?.[sessionIndex] ?? null;

    try {
      if (seminarId) {
        await updateSeminarGrade(studentIdStr, seminarId, grade);
      } else {
        const createRes = await createSeminar({
          studentId: studentIdStr,
          taughtSubjectId,
        });
        const createdId =
          (createRes as any)?.id ??
          (createRes as any)?.data ??
          (createRes as any)?.Id ??
          (createRes as any)?.seminarId;
        if (typeof createdId === "string" && createdId) {
          seminarId = createdId;
          await updateSeminarGrade(studentIdStr, seminarId, grade);
          setStudents((prev) =>
            prev.map((s) => {
              if (String(s.id) !== studentIdStr) return s;
              const ids = [...(s.seminarIds ?? Array(sessions.length).fill(null))];
              ids[sessionIndex] = seminarId;
              return { ...s, seminarIds: ids };
            }),
          );
        }
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to save seminar grade");
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
    setStudents(
      students.map((student) => {
        if (String(student.id) === String(studentId)) {
          const newAssignments = [...student.assignments];
          const current = newAssignments[assignmentIndex];
          if (current === null) {
            newAssignments[assignmentIndex] = 1;
          } else if (current === 1) {
            newAssignments[assignmentIndex] = 0;
          } else {
            newAssignments[assignmentIndex] = null;
          }
          return { ...student, assignments: newAssignments };
        }
        return student;
      }),
    );
  };

  const applyBulkValue = (value: string) => {
    if (selectedColumn === null || !value) return;

    setStudents(
      students.map((student) => {
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
      }),
    );
  };

  const getActivityValue = (data: {
    attendance: "present" | "absent";
    grade: number | null;
  }) => {
    if (!data) return "present";
    if (data.attendance === "absent") return "absent";
    if (data.grade !== null && data.grade !== undefined)
      return data.grade.toString();
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
      for (const student of students) {
        if (!looksLikeStudentGuid(student.id)) continue;
        for (let idx = 0; idx < student.activityAttendance.length; idx++) {
          const cell = student.activityAttendance[idx];
          if (cell?.attendance !== "absent") continue;
          const session = sessions[idx];
          if (!session?.id) continue;
          try {
            await markStudentAbsence(
              String(student.id),
              String(session.id),
              taughtSubjectId,
            );
            ok += 1;
          } catch {
            err += 1;
          }
        }
      }
      if (ok > 0) toast.success(`Saved ${ok} absence(s)`);
      if (err > 0) toast.error(`Failed to save ${err} absence(s)`);
      if (ok === 0 && err === 0) toast.info("No absences to save");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to save attendance");
    } finally {
      setIsSendingAttendance(false);
    }
  };

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
                    Mark attendance and grades for each session
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
                    value=""
                    onValueChange={(value: string) => applyBulkValue(value)}
                    disabled={selectedColumn === null}
                  >
                    <SelectTrigger className="w-full min-w-[120px] sm:w-[140px]">
                      <SelectValue placeholder="Bulk value" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="present">Present</SelectItem>
                      <SelectItem value="absent">Absent</SelectItem>
                      {Array.from({ length: 10 }, (_, i) => i + 1).map(
                        (grade) => (
                          <SelectItem key={grade} value={grade.toString()}>
                            {grade}
                          </SelectItem>
                        ),
                      )}
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
                        : undefined
                    }
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {isSendingAttendance ? "Saving…" : "Send"}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="min-w-0 p-0">
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
                        {students.map((student) => (
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
                                  )}
                                  onValueChange={(value: string) =>
                                    updateActivityAttendance(
                                      student.id,
                                      idx,
                                      value,
                                    )
                                  }
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
                                        { length: 10 },
                                        (_, i) => i + 1,
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
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
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
                    Mini exams scored 0-10 (3 per semester). Changes save when you select a grade.
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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student Name</TableHead>
                    <TableHead className="text-center">Colloquium 1</TableHead>
                    <TableHead className="text-center">Colloquium 2</TableHead>
                    <TableHead className="text-center">Colloquium 3</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell className="font-medium">
                        {student.name}
                      </TableCell>
                      {[0, 1, 2].map((collIndex) => (
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
                                value === "none" ? null : parseInt(value, 10),
                              )
                            }
                          >
                            <SelectTrigger className="w-[100px] mx-auto">
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
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
                    10 assignments per semester (click to toggle: ✓ / ✗ / -). Saved locally only.
                  </CardDescription>
                </div>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => toast.info("Assignments are saved locally only")}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Send
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student Name</TableHead>
                    {Array.from({ length: 10 }, (_, i) => i + 1).map((num) => (
                      <TableHead key={num} className="text-center">
                        #{num}
                      </TableHead>
                    ))}
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
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
