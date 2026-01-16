import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { ArrowLeft, Check, X, Users, Calendar, Send, Minus } from "lucide-react";
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

interface Student {
  id: string | number;
  name: string;
  activityAttendance: Array<{ attendance: "present" | "absent"; grade: number | null }>;
  colloquium: (number | null)[];
  assignments: (0 | 1 | null)[];
  // IDs of colloquium records from backend (aligned by index with colloquium[])
  colloquiumIds?: (string | null)[];
}

const sessions = [
  { id: 1, date: "04-09-2025", time: "15:35 - 17:10", type: "L" as const },
  { id: 2, date: "06-09-2025", time: "15:35 - 17:10", type: "S" as const },
  { id: 3, date: "11-09-2025", time: "15:35 - 17:10", type: "L" as const },
  { id: 4, date: "13-09-2025", time: "15:35 - 17:10", type: "S" as const },
  { id: 5, date: "18-09-2025", time: "15:35 - 17:10", type: "L" as const },
  { id: 6, date: "20-09-2025", time: "15:35 - 17:10", type: "S" as const },
  { id: 7, date: "25-09-2025", time: "15:35 - 17:10", type: "L" as const },
  { id: 8, date: "27-09-2025", time: "15:35 - 17:10", type: "S" as const },
  { id: 9, date: "02-10-2025", time: "15:35 - 17:10", type: "L" as const },
  { id: 10, date: "04-10-2025", time: "15:35 - 17:10", type: "S" as const },
  { id: 11, date: "09-10-2025", time: "15:35 - 17:10", type: "L" as const },
  { id: 12, date: "11-10-2025", time: "15:35 - 17:10", type: "S" as const },
  { id: 13, date: "16-10-2025", time: "15:35 - 17:10", type: "L" as const },
  { id: 14, date: "18-10-2025", time: "15:35 - 17:10", type: "S" as const },
  { id: 15, date: "23-10-2025", time: "15:35 - 17:10", type: "L" as const },
];

type ApiList<T = any> = T[] | { items?: T[]; data?: T[]; result?: T[]; value?: T[] } | any;

const API_BASE_URL =
    (import.meta as any)?.env?.VITE_API_BASE_URL ??
    (import.meta as any)?.env?.VITE_API_URL ??
    "";

function getAuthToken(): string | null {
  return (
      localStorage.getItem("token") ||
      localStorage.getItem("accessToken") ||
      localStorage.getItem("access_token") ||
      localStorage.getItem("jwt") ||
      null
  );
}

function toArray<T = any>(resp: ApiList<T>): T[] {
  if (Array.isArray(resp)) return resp;
  if (!resp || typeof resp !== "object") return [];
  return (
      (resp as any).items ||
      (resp as any).data ||
      (resp as any).result ||
      (resp as any).value ||
      []
  );
}

function unwrap<T = any>(resp: any): T {
  if (!resp || typeof resp !== "object") return resp as T;
  return ((resp as any).data ?? (resp as any).result ?? (resp as any).item ?? resp) as T;
}

async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = getAuthToken();
  const headers = new Headers(init.headers || {});
  headers.set("Accept", "application/json");
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Request failed: ${res.status}`);
  }
  return res;
}

async function apiJson<T = any>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await apiFetch(path, init);
  const text = await res.text().catch(() => "");
  if (!text) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    return text as unknown as T;
  }
}

const ACTIVITY_SESSIONS = 15;
const COLLOQUIUM_COUNT = 3;
const ASSIGNMENTS_COUNT = 10;

const mockStudents: Student[] = [
  {
    id: 1,
    name: "Alex Johnson",
    activityAttendance: [
      { attendance: "present", grade: null },
      { attendance: "present", grade: 8 },
      { attendance: "present", grade: null },
      { attendance: "present", grade: 9 },
      { attendance: "absent", grade: null },
      { attendance: "present", grade: 7 },
      { attendance: "present", grade: null },
      { attendance: "present", grade: 8 },
      { attendance: "present", grade: null },
      { attendance: "present", grade: 9 },
      { attendance: "present", grade: null },
      { attendance: "present", grade: 8 },
      { attendance: "present", grade: null },
      { attendance: "present", grade: 7 },
      { attendance: "present", grade: null },
    ],
    colloquium: [8, null, null],
    assignments: [1, 1, 1, 1, 1, 1, 0, 1, null, null]
  },
  {
    id: 2,
    name: "Maria Garcia",
    activityAttendance: [
      { attendance: "present", grade: null },
      { attendance: "present", grade: 9 },
      { attendance: "present", grade: null },
      { attendance: "present", grade: 10 },
      { attendance: "present", grade: null },
      { attendance: "present", grade: 9 },
      { attendance: "present", grade: null },
      { attendance: "present", grade: 10 },
      { attendance: "present", grade: null },
      { attendance: "present", grade: 10 },
      { attendance: "present", grade: null },
      { attendance: "present", grade: 9 },
      { attendance: "present", grade: null },
      { attendance: "present", grade: 10 },
      { attendance: "present", grade: null },
    ],
    colloquium: [9, null, null],
    assignments: [1, 1, 1, 1, 1, 1, 1, 1, null, null]
  },
  {
    id: 3,
    name: "James Smith",
    activityAttendance: [
      { attendance: "present", grade: null },
      { attendance: "absent", grade: null },
      { attendance: "present", grade: null },
      { attendance: "present", grade: 6 },
      { attendance: "present", grade: null },
      { attendance: "absent", grade: null },
      { attendance: "present", grade: null },
      { attendance: "present", grade: 7 },
      { attendance: "present", grade: null },
      { attendance: "present", grade: 6 },
      { attendance: "absent", grade: null },
      { attendance: "present", grade: 7 },
      { attendance: "present", grade: null },
      { attendance: "present", grade: 8 },
      { attendance: "present", grade: null },
    ],
    colloquium: [7, null, null],
    assignments: [1, 1, 0, 1, 1, 1, 0, 0, null, null]
  },
  {
    id: 4,
    name: "Emma Wilson",
    activityAttendance: [
      { attendance: "present", grade: null },
      { attendance: "present", grade: 10 },
      { attendance: "present", grade: null },
      { attendance: "present", grade: 10 },
      { attendance: "present", grade: null },
      { attendance: "present", grade: 10 },
      { attendance: "present", grade: null },
      { attendance: "present", grade: 10 },
      { attendance: "present", grade: null },
      { attendance: "present", grade: 10 },
      { attendance: "present", grade: null },
      { attendance: "present", grade: 10 },
      { attendance: "present", grade: null },
      { attendance: "present", grade: 10 },
      { attendance: "present", grade: null },
    ],
    colloquium: [10, null, null],
    assignments: [1, 1, 1, 1, 1, 1, 1, 1, null, null]
  },
  {
    id: 5,
    name: "Oliver Brown",
    activityAttendance: [
      { attendance: "present", grade: null },
      { attendance: "present", grade: 6 },
      { attendance: "absent", grade: null },
      { attendance: "present", grade: 7 },
      { attendance: "present", grade: null },
      { attendance: "present", grade: 8 },
      { attendance: "absent", grade: null },
      { attendance: "present", grade: 7 },
      { attendance: "present", grade: null },
      { attendance: "present", grade: 8 },
      { attendance: "present", grade: null },
      { attendance: "present", grade: 6 },
      { attendance: "absent", grade: null },
      { attendance: "present", grade: 9 },
      { attendance: "present", grade: null },
    ],
    colloquium: [6, null, null],
    assignments: [1, 0, 1, 1, 0, 1, 1, 0, null, null]
  }
];

export function TeacherCourseDetail({ courseId, onBack }: { courseId: string | number; onBack: () => void }) {
  const taughtSubjectId = String(courseId);

  const [students, setStudents] = useState<Student[]>(mockStudents);
  const [courseTitle, setCourseTitle] = useState<string>("Advanced Web Development");
  const [courseHours, setCourseHours] = useState<number>(45);
  const [selectedColumn, setSelectedColumn] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const applyColloquiumsToStudents = (baseStudents: Student[], colloquiumsRaw: any[]): Student[] => {
    const byStudent = new Map<string, any[]>();

    for (const c of colloquiumsRaw || []) {
      const studentId = String(c.studentId ?? c.student?.id ?? c.student?.studentId ?? "");
      if (!studentId) continue;
      const list = byStudent.get(studentId) ?? [];
      list.push(c);
      byStudent.set(studentId, list);
    }

    // Stable ordering by date if present
    for (const list of byStudent.values()) {
      list.sort((a, b) => {
        const ad = Date.parse(a.date ?? a.createdAt ?? a.createdOn ?? "") || 0;
        const bd = Date.parse(b.date ?? b.createdAt ?? b.createdOn ?? "") || 0;
        return ad - bd;
      });
    }

    return baseStudents.map((s) => {
      const list = byStudent.get(String(s.id)) ?? [];
      const colloquium = Array(COLLOQUIUM_COUNT).fill(null) as (number | null)[];
      const colloquiumIds = Array(COLLOQUIUM_COUNT).fill(null) as (string | null)[];

      for (let i = 0; i < Math.min(COLLOQUIUM_COUNT, list.length); i++) {
        const item = list[i];
        colloquium[i] = item.grade ?? item.value ?? null;
        colloquiumIds[i] = item.id ?? item.colloquiumId ?? null;
      }

      return { ...s, colloquium, colloquiumIds };
    });
  };

  const loadCourseData = async () => {
    setIsLoading(true);
    try {
      // 1) Course details
      const taughtSubjectResp = await apiJson(`/api/taught-subjects/${encodeURIComponent(taughtSubjectId)}`);
      const taughtSubject = unwrap<any>(taughtSubjectResp);

      const nextTitle =
          taughtSubject?.title ??
          taughtSubject?.name ??
          taughtSubject?.subjectTitle ??
          taughtSubject?.taughtSubjectTitle ??
          "Advanced Web Development";

      const nextHours = Number(taughtSubject?.hours ?? taughtSubject?.totalHours ?? 45);

      setCourseTitle(String(nextTitle));
      setCourseHours(Number.isFinite(nextHours) ? nextHours : 45);

      // 2) Students for the group/year of this taught subject (best-effort; API schema is not explicit)
      const groupId = taughtSubject?.groupId ?? taughtSubject?.group?.id ?? taughtSubject?.group?.groupId ?? null;
      let year = taughtSubject?.year ?? taughtSubject?.group?.year ?? null;

      if (!year && groupId) {
        try {
          const groupResp = await apiJson(`/api/groups/${encodeURIComponent(String(groupId))}`);
          const group = unwrap<any>(groupResp);
          year = group?.year ?? null;
        } catch {
          // ignore
        }
      }

      let apiStudents: any[] = [];
      if (groupId && year) {
        try {
          const studentsResp = await apiJson(
              `/api/students/filter-by?groupId=${encodeURIComponent(String(groupId))}&year=${encodeURIComponent(String(year))}`
          );
          apiStudents = toArray(unwrap<any>(studentsResp));
        } catch {
          // ignore
        }
      }

      const mappedStudents: Student[] =
          apiStudents.length > 0
              ? apiStudents.map((s: any, idx: number) => {
                const id = s.id ?? s.studentId ?? s.userId ?? s.user?.id ?? String(idx + 1);
                const fullName =
                    s.fullName ??
                    [s.name, s.middleName, s.surname].filter(Boolean).join(" ").trim() ??
                    s.userName ??
                    `Student ${idx + 1}`;

                return {
                  id,
                  name: String(fullName).trim(),
                  activityAttendance: Array.from({ length: ACTIVITY_SESSIONS }, () => ({
                    attendance: "present" as const,
                    grade: null as number | null,
                  })),
                  colloquium: Array(COLLOQUIUM_COUNT).fill(null),
                  assignments: Array(ASSIGNMENTS_COUNT).fill(null),
                  colloquiumIds: Array(COLLOQUIUM_COUNT).fill(null),
                };
              })
              : mockStudents;

      // 3) Colloquiums for this taught subject
      let colloquiums: any[] = [];
      try {
        const colloquiumsResp = await apiJson(
            `/api/taught-subjects/${encodeURIComponent(taughtSubjectId)}/colloquiums`
        );
        colloquiums = toArray(unwrap<any>(colloquiumsResp));
      } catch {
        // ignore
      }

      const merged = apiStudents.length > 0 ? applyColloquiumsToStudents(mappedStudents, colloquiums) : mappedStudents;
      setStudents(merged);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? "Failed to load course data");
      setStudents(mockStudents);
      setCourseTitle("Advanced Web Development");
      setCourseHours(45);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshColloquiums = async () => {
    try {
      const colloquiumsResp = await apiJson(`/api/taught-subjects/${encodeURIComponent(taughtSubjectId)}/colloquiums`);
      const colloquiums = toArray(unwrap<any>(colloquiumsResp));
      setStudents((prev) => applyColloquiumsToStudents(prev, colloquiums));
    } catch (e) {
      // Non-fatal; keep UI working
      console.error(e);
    }
  };

  useEffect(() => {
    loadCourseData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taughtSubjectId]);

  const updateActivityAttendance = (studentId: string | number, sessionIndex: number, value: string) => {
    setStudents(students.map(student => {
      if (String(student.id) === String(studentId)) {
        const newData = [...student.activityAttendance];
        if (value === "absent") {
          newData[sessionIndex] = { attendance: "absent", grade: null };
        } else if (value === "present") {
          newData[sessionIndex] = { attendance: "present", grade: null };
        } else {
          const grade = parseInt(value);
          newData[sessionIndex] = { attendance: "present", grade };
        }
        return { ...student, activityAttendance: newData };
      }
      return student;
    }));
  };

  const updateColloquium = async (
      studentId: string | number,
      colloquiumIndex: number,
      grade: number | null
  ) => {
    const studentIdStr = String(studentId);
    const currentStudent = students.find((s) => String(s.id) === studentIdStr);
    const currentColloquiumId = currentStudent?.colloquiumIds?.[colloquiumIndex] ?? null;

    // Optimistic UI update
    setStudents((prev) =>
        prev.map((student) => {
          if (String(student.id) === studentIdStr) {
            const newColloquium = [...student.colloquium];
            newColloquium[colloquiumIndex] = grade;
            const newIds = [...(student.colloquiumIds ?? Array(COLLOQUIUM_COUNT).fill(null))];
            // keep the old id until refresh (or clear if grade removed)
            newIds[colloquiumIndex] = grade === null ? null : newIds[colloquiumIndex];
            return { ...student, colloquium: newColloquium, colloquiumIds: newIds };
          }
          return student;
        })
    );

    try {
      if (grade === null) {
        if (currentColloquiumId) {
          await apiFetch(`/api/colloquiums/${encodeURIComponent(String(currentColloquiumId))}`, { method: "DELETE" });
        }
      } else if (currentColloquiumId) {
        // Update existing colloquium grade
        await apiFetch(
            `/api/students/${encodeURIComponent(studentIdStr)}/colloquiums/${encodeURIComponent(
                String(currentColloquiumId)
            )}/grade/${encodeURIComponent(String(grade))}`,
            { method: "PUT" }
        );
      } else {
        // Create new colloquium record
        await apiFetch("/api/colloquiums", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            taughtSubjectId,
            studentId: studentIdStr,
            date: new Date().toISOString(),
            grade,
          }),
        });
      }

      await refreshColloquiums();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? "Failed to update colloquium");
      // Best-effort resync
      await refreshColloquiums();
    }
  };

  const toggleAssignment = (studentId: string | number, assignmentIndex: number) => {
    setStudents(students.map(student => {
      if (String(student.id) === String(studentId)) {
        const newAssignments = [...student.assignments];
        const current = newAssignments[assignmentIndex];
        if (current === null) {
          // Cycle: null -> 1 -> 0 -> null
          newAssignments[assignmentIndex] = 1;
        } else if (current === 1) {
          newAssignments[assignmentIndex] = 0;
        } else {
          newAssignments[assignmentIndex] = null;
        }
        return { ...student, assignments: newAssignments };
      }
      return student;
    }));
  };

  const applyBulkValue = (value: string) => {
    if (selectedColumn === null || !value) return;

    setStudents(students.map(student => {
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
    }));
  };

  const getActivityValue = (data: { attendance: "present" | "absent"; grade: number | null }) => {
    if (data.attendance === "absent") return "absent";
    if (data.grade !== null) return data.grade.toString();
    return "present";
  };

  return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Courses
          </Button>
        </div>

        <div>
          <h1>{courseTitle}</h1>
          <p className="text-muted-foreground">Manage student grades and attendance</p>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-muted-foreground" />
            <div className="flex flex-col">
              <span className="text-sm text-muted-foreground">Students</span>
              <span className="font-medium">{students.length}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <div className="flex flex-col">
              <span className="text-sm text-muted-foreground">Hours</span>
              <span className="font-medium">{courseHours}</span>
            </div>
          </div>
        </div>

        <Tabs defaultValue="activity" className="w-full">
          <TabsList>
            <TabsTrigger value="activity">Activity/Attendance</TabsTrigger>
            <TabsTrigger value="colloquium">Colloquium</TabsTrigger>
            <TabsTrigger value="assignments">Assignments</TabsTrigger>
          </TabsList>

          <TabsContent value="activity" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Activity & Attendance Tracking</CardTitle>
                    <CardDescription>Mark attendance and grades for each session</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select value={selectedColumn?.toString() || ""} onValueChange={(v) => setSelectedColumn(v ? parseInt(v) : null)}>
                      <SelectTrigger className="w-[180px]">
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
                    <Select value="" onValueChange={applyBulkValue} disabled={selectedColumn === null}>
                      <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="Bulk value" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="present">Present</SelectItem>
                        <SelectItem value="absent">Absent</SelectItem>
                        {Array.from({ length: 10 }, (_, i) => i + 1).map(grade => (
                            <SelectItem key={grade} value={grade.toString()}>{grade}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button variant="default" size="sm">
                      <Send className="h-4 w-4 mr-2" />
                      Send
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="relative overflow-x-auto border rounded-md">
                  <div className="inline-block min-w-full align-middle">
                    <div className="overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="sticky left-0 bg-background z-30 min-w-[200px] border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Student Name</TableHead>
                            {sessions.map((session, idx) => (
                                <TableHead
                                    key={session.id}
                                    className={`text-center min-w-[120px] ${selectedColumn === idx ? 'bg-accent' : ''}`}
                                >
                                  <div className="text-xs">
                                    <div>{session.date}</div>
                                    <div className="text-muted-foreground">({session.type}) {session.time}</div>
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
                                        className={`text-center ${selectedColumn === idx ? 'bg-accent/50' : ''}`}
                                    >
                                      <Select
                                          value={getActivityValue(student.activityAttendance[idx])}
                                          onValueChange={(value) => updateActivityAttendance(student.id, idx, value)}
                                      >
                                        <SelectTrigger className="w-[100px] mx-auto">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="present">Present</SelectItem>
                                          <SelectItem value="absent">Absent</SelectItem>
                                          {session.type === "S" && Array.from({ length: 10 }, (_, i) => i + 1).map(grade => (
                                              <SelectItem key={grade} value={grade.toString()}>{grade}</SelectItem>
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
                    <CardDescription>Mini exams scored 0-10 (3 per semester)</CardDescription>
                  </div>
                  <Button variant="default" size="sm">
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
                      <TableHead className="text-center">Colloquium 1</TableHead>
                      <TableHead className="text-center">Colloquium 2</TableHead>
                      <TableHead className="text-center">Colloquium 3</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map((student) => (
                        <TableRow key={student.id}>
                          <TableCell className="font-medium">{student.name}</TableCell>
                          {[0, 1, 2].map((collIndex) => (
                              <TableCell key={collIndex} className="text-center">
                                <Select
                                    value={student.colloquium[collIndex]?.toString() || "none"}
                                    onValueChange={(value) => updateColloquium(student.id, collIndex, value === "none" ? null : parseInt(value))}
                                >
                                  <SelectTrigger className="w-[100px] mx-auto">
                                    <SelectValue placeholder="-" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">-</SelectItem>
                                    {Array.from({ length: 11 }, (_, i) => i).map(grade => (
                                        <SelectItem key={grade} value={grade.toString()}>{grade}</SelectItem>
                                    ))}
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
                    <CardDescription>10 assignments per semester (click to toggle: ✓ / ✗ / -)</CardDescription>
                  </div>
                  <Button variant="default" size="sm">
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
                      {Array.from({ length: 10 }, (_, i) => i + 1).map(num => (
                          <TableHead key={num} className="text-center">#{num}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map((student) => (
                        <TableRow key={student.id}>
                          <TableCell className="font-medium">{student.name}</TableCell>
                          {student.assignments.map((assignment, idx) => (
                              <TableCell key={idx} className="text-center">
                                <Button
                                    variant={assignment === 1 ? "default" : assignment === 0 ? "destructive" : "outline"}
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