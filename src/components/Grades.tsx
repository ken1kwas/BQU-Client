import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Check, X } from "lucide-react";
import { getStudentGrades, toArray } from "../api";

type ClassSession = {
  date: string;
  type: "Lecture" | "Seminar";
  attendance: "present" | "absent";
  grade?: number; // 0-10 for seminars
};
interface GradeCourse {
  id: string;
  course: string;
  code: string;
  instructor: string;
  percentage: number;
  credits: number;
  weeklyHours: number;
  classType: "Lecture" | "Seminar" | string;
  colloquium: (number | null)[];
  assignmentScores: number[];
  classSessions: ClassSession[];
}

function toLectureType(value: any): "Lecture" | "Seminar" {
  const normalised = String(value || "").toLowerCase();
  if (["seminar", "s", "seminar-based"].includes(normalised)) return "Seminar";
  return "Lecture";
}

function toAttendance(value: any): "present" | "absent" {
  const normalised = String(value ?? "present").toLowerCase();
  return normalised === "absent" || normalised === "a" ? "absent" : "present";
}

function formatDisplayDate(input: any): string {
  if (!input) return "";
  const date = new Date(input);
  if (!Number.isNaN(date.getTime())) {
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  }
  return String(input);
}

function normalizeSessions(source: any): ClassSession[] {
  const candidates = [
    source?.classSessions,
    source?.sessions,
    source?.lessons,
    source?.entries,
    source,
  ];
  for (const candidate of candidates) {
    const list = toArray(candidate);
    if (list.length > 0) {
      return list.map((item: any, idx: number) => {
        const gradeValue = item?.grade ?? item?.score ?? item?.value ?? null;
        const grade =
          gradeValue === null || gradeValue === undefined
            ? undefined
            : Number(gradeValue);
        return {
          date: formatDisplayDate(
            item?.date ?? item?.sessionDate ?? item?.heldOn ?? item?.start,
          ),
          type: toLectureType(item?.type ?? item?.sessionType ?? item?.kind),
          attendance: toAttendance(item?.attendance ?? item?.status),
          grade:
            grade !== undefined && !Number.isNaN(grade) ? grade : undefined,
        };
      });
    }
  }
  return [];
}

function normalizeBinaryScores(values: any): number[] {
  const list = toArray(values);
  if (list.length === 0) return [];
  return list.map((value: any) => (Number(value) > 0 ? 1 : 0));
}

function normalizeColloquium(values: any): (number | null)[] {
  const list = toArray(values);
  if (list.length === 0) return [];
  return list.map((value: any) => {
    if (value === null || value === undefined) return null;
    const num = Number(value);
    return Number.isNaN(num) ? null : num;
  });
}

function normalizeGradeCourse(raw: any, index: number): GradeCourse {
  const classSessions = normalizeSessions(raw);
  return {
    id: String(
      raw?.id ??
        raw?.courseId ??
        raw?.taughtSubjectId ??
        raw?.code ??
        `course-${index}`,
    ),
    course:
      raw?.course ??
      raw?.title ??
      raw?.name ??
      raw?.courseName ??
      raw?.subjectTitle ??
      "",
    code: raw?.code ?? raw?.courseCode ?? raw?.subjectCode ?? "",
    instructor:
      raw?.instructor ??
      raw?.teacher ??
      raw?.teacherName ??
      raw?.lecturer ??
      "",
    percentage: Number(raw?.percentage ?? raw?.score ?? raw?.average ?? 0) || 0,
    credits: Number(raw?.credits ?? raw?.creditHours ?? 0) || 0,
    weeklyHours:
      Number(raw?.weeklyHours ?? raw?.hoursPerWeek ?? raw?.hours ?? 0) || 0,
    classType: toLectureType(
      raw?.classType ?? raw?.type ?? classSessions[0]?.type,
    ),
    colloquium: normalizeColloquium(
      raw?.colloquium ?? raw?.colloquiumScores ?? raw?.colloquiums,
    ),
    assignmentScores: normalizeBinaryScores(
      raw?.assignmentScores ?? raw?.assignments ?? raw?.tasks,
    ),
    classSessions,
  };
}

function normalizeGradesResponse(raw: any): GradeCourse[] {
  if (!raw) return [];
  const payload = raw.data !== undefined ? raw.data : raw;
  if (Array.isArray(payload)) return payload.map(normalizeGradeCourse);
  if (Array.isArray(payload?.courses)) {
    return payload.courses.map((item: any, idx: number) =>
      normalizeGradeCourse(item, idx),
    );
  }
  const list = toArray(payload);
  return list.map((item: any, idx: number) => normalizeGradeCourse(item, idx));
}

function getSessionBadgeVariant(session: ClassSession) {
  if (session.attendance === "absent") return "destructive" as const;
  return session.type === "Lecture" ? "secondary" : "default";
}

function getSessionLabel(session: ClassSession) {
  if (session.attendance === "absent") return "Absent";
  if (session.type === "Lecture") return "Present";
  return session.grade !== undefined ? `${session.grade}` : "Present";
}

export function Grades() {
  const [grades, setGrades] = useState<GradeCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const data = await getStudentGrades("current");
        if (!mounted) return;
        setGrades(normalizeGradesResponse(data));
      } catch (err: any) {
        if (mounted) setError(err.message || "Не удалось загрузить оценки");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1>Grades & Performance</h1>
        <p className="text-muted-foreground">
          Track your academic progress and performance
        </p>
      </div>

      {error && <p className="text-destructive">{error}</p>}

      <Tabs defaultValue="current" className="w-full">
        <TabsList>
          <TabsTrigger value="current">Current Courses</TabsTrigger>
          <TabsTrigger value="sessions">Class Sessions</TabsTrigger>
        </TabsList>

        <TabsContent value="current" className="space-y-4">
          {loading ? (
            <p>Loading…</p>
          ) : grades.length === 0 ? (
            <Card className="p-6 text-sm text-muted-foreground">
              Нет данных об оценках. Попробуйте обновить страницу позже.
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {grades.map((course) => (
                <Card
                  key={course.id}
                  className="hover:shadow-md transition-shadow relative"
                >
                  <Badge
                    variant="outline"
                    className="absolute top-4 right-4 z-10"
                  >
                    {course.code}
                  </Badge>
                  <CardHeader className="pb-1">
                    <div className="flex items-start justify-between">
                      <div className="pr-20 space-y-1">
                        <CardTitle>{course.course || "Course"}</CardTitle>
                        {course.instructor && (
                          <CardDescription>{course.instructor}</CardDescription>
                        )}
                        <CardDescription>
                          {[
                            course.credits ? `${course.credits} credits` : null,
                            course.weeklyHours
                              ? `${course.weeklyHours} hours`
                              : null,
                          ]
                            .filter(Boolean)
                            .join(" • ") || ""}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2 -mt-4">
                      <div className="flex items-center justify-between text-sm">
                        <span>Overall Score</span>
                        <span>
                          {Math.round((course.percentage / 100) * 50)}/50
                        </span>
                      </div>
                      <Progress value={course.percentage} />
                    </div>

                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-6 text-sm">
                        <div>
                          <p className="text-muted-foreground mb-2">
                            Seminar Grades
                          </p>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {course.classSessions
                              .filter(
                                (s: ClassSession) =>
                                  s.type === "Seminar" && s.grade !== undefined,
                              )
                              .map((session: ClassSession, idx: number) => (
                                <Badge
                                  key={idx}
                                  variant="secondary"
                                  className="text-sm px-2.5 py-0.5"
                                >
                                  {session.grade}
                                </Badge>
                              ))}
                            {course.classSessions.filter(
                              (s: ClassSession) =>
                                s.type === "Seminar" && s.grade !== undefined,
                            ).length === 0 && (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-muted-foreground mb-2">
                            Colloquium
                          </p>
                          <div className="flex items-center gap-2 justify-end">
                            {course.colloquium.length === 0 ? (
                              <span className="text-muted-foreground">-</span>
                            ) : (
                              course.colloquium.map(
                                (score: number | null, idx: number) => (
                                  <Badge
                                    key={idx}
                                    variant={
                                      score === null ? "outline" : "secondary"
                                    }
                                    className="px-5 py-2.5 text-base"
                                  >
                                    {score === null ? "-" : `${score}`}
                                  </Badge>
                                ),
                              )
                            )}
                          </div>
                        </div>
                      </div>
 
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-muted-foreground text-sm">
                            Assignments
                          </span>
                          <span className="text-muted-foreground text-sm">
                            {
                              course.assignmentScores.filter((s) => s > 0)
                                .length
                            }
                            /{course.assignmentScores.length}
                          </span>
                        </div>
                        {course.assignmentScores.length === 0 ? (
                          <span className="text-muted-foreground">-</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {course.assignmentScores.map((score, idx) => (
                              <Badge
                                key={idx}
                                variant={score === 1 ? "default" : "outline"}
                                className="text-xs flex items-center gap-1"
                              >
                                {score === 1 ? (
                                  <Check className="h-3 w-3" />
                                ) : (
                                  <X className="h-3 w-3" />
                                )}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-muted-foreground text-sm">
                            Attendance
                          </span>
                          <span className="text-muted-foreground text-sm">
                            {
                              course.classSessions.filter(
                                (s: ClassSession) => s.attendance === "present",
                              ).length
                            }
                            /{course.classSessions.length}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {course.classSessions.length === 0 ? (
                            <span className="text-muted-foreground">-</span>
                          ) : (
                            course.classSessions.map(
                              (session: ClassSession, idx: number) => (
                                <Badge
                                  key={idx}
                                  variant={
                                    session.attendance === "absent"
                                      ? "destructive"
                                      : "default"
                                  }
                                  className="text-xs"
                                >
                                  {session.attendance === "absent" ? "a" : "p"}
                                </Badge>
                              ),
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="sessions" className="space-y-4">
          {loading ? (
            <p>Loading…</p>
          ) : grades.length === 0 ? (
            <Card className="p-6 text-sm text-muted-foreground">
              Нет информации по занятиям. Попробуйте позже.
            </Card>
          ) : (
            <div className="space-y-6">
              {grades.map((course) => (
                <Card key={course.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xl">{course.course}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="overflow-hidden">
                    <div className="overflow-x-auto -mx-6 px-6">
                      <div className="flex gap-3 pb-4 w-max min-w-full">
                        {course.classSessions.length === 0 ? (
                          <div className="text-sm text-muted-foreground">
                            Нет данных о посещаемости.
                          </div>
                        ) : (
                          course.classSessions.map(
                            (session: ClassSession, idx: number) => (
                              <div
                                key={idx}
                                className="space-y-1.5 flex-shrink-0 w-24"
                              >
                                <div className="text-sm text-center">
                                  {session.date}
                                </div>
                                <div className="text-xs text-muted-foreground text-center">
                                  {session.type === "Lecture"
                                    ? "Lecture"
                                    : "Seminar"}
                                </div>
                                <Badge
                                  variant={getSessionBadgeVariant(session)}
                                  className="w-full justify-center"
                                >
                                  {getSessionLabel(session)}
                                </Badge>
                              </div>
                            ),
                          )
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
