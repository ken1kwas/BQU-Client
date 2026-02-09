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
import { Check, Loader2, X } from "lucide-react";
import { getStudentGrades, toArray } from "../api";

type ClassSession = {
  date: string;
  type: "Lecture" | "Seminar";
  attendance: "present" | "absent";
  grade?: number;
};

interface GradeCourse {
  id: string;
  course: string;
  code: string;
  instructor: string;
  percentage: number;
  scoreOutOf50: number;
  credits: number;
  weeklyHours: number;
  classType: "Lecture" | "Seminar" | string;
  colloquium: (number | null)[];
  seminarGrades: number[];
  assignmentScores: number[];
  assignmentsPassed: number;
  assignmentTotal: number;
  classSessions: ClassSession[];
  attendancePresent: number;
  attendanceTotal: number;
}

type SessionBundle = {
  key: string;
  name: string;
  sessions: ClassSession[];
};

function normalizeKey(value: any): string {
  if (typeof value === "string") return value.trim().toLowerCase();
  if (typeof value === "number") return String(value).trim().toLowerCase();
  return "";
}

function getProp(obj: any, ...keys: string[]): any {
  if (!obj) return undefined;
  for (const key of keys) {
    if (key in obj) return obj[key];
    const lower = key.length > 0 ? key[0].toLowerCase() + key.slice(1) : key;
    if (lower in obj) return obj[lower];
  }
  return undefined;
}

function toNumber(value: any): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function clampPercentage(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return value;
}

function toLectureType(value: any): "Lecture" | "Seminar" {
  if (typeof value === "number") return value === 1 ? "Seminar" : "Lecture";
  const normalized = String(value ?? "Lecture").toLowerCase();
  if (["1", "seminar", "s", "семинар"].includes(normalized)) {
    return "Seminar";
  }
  return "Lecture";
}

function toAttendance(value: any): "present" | "absent" {
  if (typeof value === "boolean") return value ? "absent" : "present";
  if (typeof value === "number") return value > 0 ? "absent" : "present";
  const normalized = String(value ?? "present").toLowerCase();
  return ["absent", "a", "true", "1"].includes(normalized)
    ? "absent"
    : "present";
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

function normalizeCourseList(raw: any): GradeCourse[] {
  if (!raw) return [];

  let payload = raw;
  if (payload && typeof payload === "object") {
    if (payload.data !== undefined) payload = payload.data;
    if (payload.items !== undefined) payload = payload.items;
  }

  const academicPerformance =
    getProp(payload, "AcademicPerformance", "academicPerformance") ?? payload;

  const list = toArray(academicPerformance);

  return list.map((item: any, index: number): GradeCourse => {
    const courseName =
      getProp(item, "ClassName", "className", "Course", "course") ??
      `Course ${index + 1}`;

    const code =
      getProp(item, "Code", "code", "CourseCode", "courseCode") ??
      getProp(item, "GroupName", "groupName") ??
      "";

    const overallScore = toNumber(
      getProp(item, "OverallScore", "overallScore"),
    );
    const percentage = clampPercentage((overallScore / 50) * 100);

    const seminarGrades = toArray(
      getProp(item, "SeminarGrades", "seminarGrades"),
    )
      .map((value: any) => Number(value))
      .filter((num: number) => Number.isFinite(num));

    const colloquium = toArray(getProp(item, "Colloquium", "colloquium")).map(
      (value: any) => {
        if (value === null || value === undefined) return null;
        const num = Number(value);
        return Number.isFinite(num) ? num : null;
      },
    );

    const assignmentsPassed = Math.max(
      0,
      Math.round(
        toNumber(getProp(item, "IndependentWorks", "independentWorks")),
      ),
    );
    const assignmentTotalRaw = getProp(
      item,
      "TotalIndependentWorks",
      "totalIndependentWorks",
    );
    const assignmentTotal = Math.max(
      assignmentsPassed,
      assignmentTotalRaw !== undefined
        ? Math.round(toNumber(assignmentTotalRaw))
        : assignmentsPassed,
    );

    const assignmentScores = assignmentTotal
      ? Array.from({ length: assignmentTotal }, (_, idx) =>
          idx < assignmentsPassed ? 1 : 0,
        )
      : [];

    const classCount = Math.max(
      0,
      Math.round(toNumber(getProp(item, "ClassCount", "classCount"))),
    );
    const absencesRaw = getProp(item, "Absences", "absences");
    const absences =
      absencesRaw !== undefined
        ? Math.max(0, Math.round(toNumber(absencesRaw)))
        : 0;
    const attendancePresent = Math.max(0, classCount - absences);

    return {
      id:
        String(
          getProp(
            item,
            "Id",
            "id",
            "TaughtSubjectId",
            "taughtSubjectId",
            "Code",
            "code",
          ) ?? `${courseName}-${index}`,
        ) || `${courseName}-${index}`,
      course: String(courseName || "Course"),
      code: String(code || ""),
      instructor: getProp(
        item,
        "ProfessorName",
        "professorName",
        "Teacher",
        "teacher",
      )
        ? String(
            getProp(
              item,
              "ProfessorName",
              "professorName",
              "Teacher",
              "teacher",
            ),
          )
        : "",
      percentage,
      scoreOutOf50: overallScore,
      credits: Math.max(
        0,
        Math.round(toNumber(getProp(item, "Credits", "credits"))),
      ),
      weeklyHours: Math.max(
        0,
        Math.round(toNumber(getProp(item, "Hours", "hours"))),
      ),
      classType: "Lecture",
      colloquium,
      seminarGrades,
      assignmentScores,
      assignmentsPassed,
      assignmentTotal,
      classSessions: [],
      attendancePresent,
      attendanceTotal: classCount,
    };
  });
}

function normalizeSessionsList(raw: any): SessionBundle[] {
  if (!raw) return [];

  let payload = raw;
  if (payload && typeof payload === "object") {
    if (payload.data !== undefined) payload = payload.data;
    if (payload.sessions !== undefined) payload = payload.sessions;
  }

  const list = toArray(payload);

  return list.map((entry: any, index: number) => {
    const name =
      getProp(entry, "ClassName", "className", "Course", "course") ??
      `Course ${index + 1}`;
    const infos = toArray(
      getProp(entry, "ClassInfos", "classInfos", "Sessions", "sessions"),
    );

    const sessions = infos.map((info: any) => {
      const gradeValue = getProp(info, "Grade", "grade", "Score", "score");
      const gradeNumber = Number(gradeValue);
      return {
        date: formatDisplayDate(
          getProp(
            info,
            "Date",
            "date",
            "ClassDate",
            "classDate",
            "SessionDate",
            "sessionDate",
          ),
        ),
        type: toLectureType(
          getProp(info, "ClassType", "classType", "Type", "type"),
        ),
        attendance: toAttendance(
          getProp(info, "IsAbsent", "isAbsent", "Attendance", "attendance"),
        ),
        grade: Number.isFinite(gradeNumber) ? gradeNumber : undefined,
      };
    });

    return {
      key: normalizeKey(name),
      name: String(name),
      sessions,
    };
  });
}

function mergeCourseData(
  courses: GradeCourse[],
  sessionBundles: SessionBundle[],
): GradeCourse[] {
  const sessionMap = new Map(
    sessionBundles.map((bundle) => [bundle.key, bundle]),
  );

  const merged = courses.map((course) => {
    const key = normalizeKey(course.course || course.code || course.id);
    const bundle = sessionMap.get(key);
    const sessions = bundle?.sessions ?? [];
    if (bundle) sessionMap.delete(key);

    const attendancePresent = sessions.length
      ? sessions.filter((session) => session.attendance === "present").length
      : course.attendancePresent;
    const attendanceTotal = sessions.length
      ? sessions.length
      : course.attendanceTotal;
    const classType =
      sessions.find((session) => session.type)?.type ?? course.classType;

    return {
      ...course,
      classSessions: sessions,
      attendancePresent,
      attendanceTotal,
      classType,
    };
  });

  sessionMap.forEach((bundle, key) => {
    const sessions = bundle.sessions;
    merged.push({
      id: `session-${key || merged.length}`,
      course: bundle.name,
      code: "",
      instructor: "",
      percentage: 0,
      scoreOutOf50: 0,
      credits: 0,
      weeklyHours: 0,
      classType: sessions.find((session) => session.type)?.type ?? "Lecture",
      colloquium: [],
      seminarGrades: [],
      assignmentScores: [],
      assignmentsPassed: 0,
      assignmentTotal: 0,
      classSessions: sessions,
      attendancePresent: sessions.filter(
        (session) => session.attendance === "present",
      ).length,
      attendanceTotal: sessions.length,
    });
  });

  return merged;
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
        const currentRaw = await getStudentGrades("current");
        if (!mounted) return;
        const courses = normalizeCourseList(currentRaw);
        let sessionBundles: SessionBundle[] = [];
        try {
          const sessionsRaw = await getStudentGrades("sessions");
          sessionBundles = normalizeSessionsList(sessionsRaw);
        } catch (sessionError) {
          console.warn("Failed to load session grades", sessionError);
        }
        if (!mounted) return;
        setGrades(mergeCourseData(courses, sessionBundles));
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

  const loadingContent = (
    <div className="flex justify- py-12">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );

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
            loadingContent
          ) : grades.length === 0 ? (
            <Card className="p-6 text-sm text-muted-foreground">
              Нет данных об оценках. Попробуйте обновить страницу позже.
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {grades.map((course) => {
                const seminarGradesToShow =
                  course.seminarGrades.length > 0
                    ? course.seminarGrades
                    : course.classSessions
                        .filter(
                          (session) =>
                            session.type === "Seminar" &&
                            session.grade !== undefined,
                        )
                        .map((session) => session.grade as number)
                        .filter((grade) => grade !== undefined);

                const assignmentRatio =
                  course.assignmentTotal > 0
                    ? `${course.assignmentsPassed}/${course.assignmentTotal}`
                    : "-";

                const attendanceRatio =
                  course.attendanceTotal > 0
                    ? `${course.attendancePresent}/${course.attendanceTotal}`
                    : "-";

                return (
                  <Card
                    key={course.id}
                    className="hover:shadow-md transition-shadow relative"
                  >
                    {course.code && (
                      <Badge
                        variant="outline"
                        className="absolute top-4 right-4 z-10"
                      >
                        {course.code}
                      </Badge>
                    )}
                    <CardHeader className="pb-1">
                      <div className="flex items-start justify-between">
                        <div className="pr-20 space-y-1">
                          <CardTitle>{course.course || "Course"}</CardTitle>
                          {course.instructor && (
                            <CardDescription>
                              {course.instructor}
                            </CardDescription>
                          )}
                          <CardDescription>
                            {[
                              course.credits
                                ? `${course.credits} credits`
                                : null,
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
                          <span>{Math.round(course.scoreOutOf50)}/50</span>
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
                              {seminarGradesToShow.length > 0 ? (
                                seminarGradesToShow.map((grade, idx) => (
                                  <Badge
                                    key={idx}
                                    variant="secondary"
                                    className="text-sm px-2.5 py-0.5"
                                  >
                                    {grade}
                                  </Badge>
                                ))
                              ) : (
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
                              {assignmentRatio}
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
                              {attendanceRatio}
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
                                    {session.attendance === "absent"
                                      ? "a"
                                      : "p"}
                                  </Badge>
                                ),
                              )
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="sessions" className="space-y-4">
          {loading ? (
            loadingContent
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
