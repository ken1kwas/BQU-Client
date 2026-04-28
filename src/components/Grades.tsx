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
import { Tabs, TabsContent } from "./ui/tabs";
import { Loader2 } from "lucide-react";
import { getStudentGrades, toArray } from "../api/index";
import type { GradeCourse } from "../types/grades";

const COLLOQUIUM_COUNT = 3;
const ASSIGNMENTS_COUNT = 5;
const FAILED_GRADE = -1;
const OVERALL_SCORE_MAX = 100;

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

function toAttendance(value: any): "present" | "absent" {
  if (typeof value === "boolean") return value ? "present" : "absent";
  if (typeof value === "number") return value > 0 ? "present" : "absent";
  const normalized = String(value ?? "present").toLowerCase();
  return ["present", "p", "true", "1"].includes(normalized)
    ? "present"
    : "absent";
}

function isFailedGrade(value: number | null | undefined): boolean {
  return value === FAILED_GRADE;
}

function formatGradeValue(value: number | null | undefined): string {
  if (value === null || value === undefined) return "-";
  if (isFailedGrade(value)) return "İmtahana buraxılmır";
  return String(value);
}

function formatOverallScore(score: number): string {
  if (isFailedGrade(score)) return "İmtahana buraxılmır";
  return `${Math.round(score)}/${OVERALL_SCORE_MAX}`;
}

function normalizeColloquiumGrades(value: any): (number | null)[] {
  const entries = toArray(value);
  if (entries.length === 0) return [];

  const hasObjectEntries = entries.some(
    (entry) => entry && typeof entry === "object" && !Array.isArray(entry),
  );

  if (!hasObjectEntries) {
    return entries.map((entry: any) => {
      if (entry === null || entry === undefined) return null;
      const num = Number(entry);
      return Number.isFinite(num) ? num : null;
    });
  }

  const ordered = Array(COLLOQUIUM_COUNT).fill(null) as (number | null)[];
  const overflow: (number | null)[] = [];

  for (const entry of entries) {
    const gradeRaw = getProp(entry, "Grade", "grade", "Value", "value");
    const parsedGrade =
      gradeRaw === null || gradeRaw === undefined ? null : Number(gradeRaw);
    const grade =
      parsedGrade !== null && Number.isFinite(parsedGrade) ? parsedGrade : null;

    const rawSlot = getProp(
      entry,
      "OrderNumber",
      "orderNumber",
      "ColloquiumNumber",
      "colloquiumNumber",
      "Number",
      "number",
      "Index",
      "index",
      "Slot",
      "slot",
      "Sequence",
      "sequence",
      "Order",
      "order",
      "ColloquiumIndex",
      "colloquiumIndex",
    );

    const slotNum = Number(rawSlot);
    const isOneBased =
      Number.isInteger(slotNum) && slotNum >= 1 && slotNum <= COLLOQUIUM_COUNT;
    const isZeroBased =
      Number.isInteger(slotNum) && slotNum >= 0 && slotNum < COLLOQUIUM_COUNT;
    const slot = isOneBased ? slotNum - 1 : isZeroBased ? slotNum : -1;

    if (slot >= 0 && slot < COLLOQUIUM_COUNT && ordered[slot] === null) {
      ordered[slot] = grade;
    } else {
      overflow.push(grade);
    }
  }

  for (const grade of overflow) {
    const emptySlot = ordered.findIndex((entry) => entry === null);
    if (emptySlot === -1) {
      ordered.push(grade);
    } else {
      ordered[emptySlot] = grade;
    }
  }

  return ordered;
}

export function normalizeCourseList(raw: any): GradeCourse[] {
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
    const percentage = clampPercentage(
      (overallScore / OVERALL_SCORE_MAX) * 100,
    );

    const seminarGrades = toArray(
      getProp(item, "SeminarGrades", "seminarGrades"),
    )
      .map((value: any) => Number(value))
      .filter((num: number) => Number.isFinite(num));

    const colloquium = normalizeColloquiumGrades(
      getProp(item, "Colloquium", "colloquium", "Colloquiums", "colloquiums"),
    );

    const independentWorksRaw = toArray(
      getProp(item, "IndependentWorks", "independentWorks"),
    );

    const sortedWorks = independentWorksRaw
      .map((work: any) => ({
        number: toNumber(getProp(work, "Number", "number")),
        grade: getProp(work, "Grade", "grade"),
        legacyIsPassed: getProp(work, "IsPassed", "isPassed"),
      }))
      .sort((a, b) => a.number - b.number);

    const assignmentScores = Array(ASSIGNMENTS_COUNT).fill(null) as (
      | number
      | null
    )[];
    let assignmentsPassed = 0;

    sortedWorks.forEach((work) => {
      const assignmentIndex = work.number - 1;
      if (assignmentIndex >= 0 && assignmentIndex < ASSIGNMENTS_COUNT) {
        const parsedGrade =
          work.grade === null || work.grade === undefined
            ? null
            : Number(work.grade);
        const normalizedGrade =
          parsedGrade !== null && Number.isFinite(parsedGrade)
            ? parsedGrade === FAILED_GRADE
              ? null
              : parsedGrade
            : work.legacyIsPassed === true
              ? 1
              : work.legacyIsPassed === false
                ? 0
                : null;

        assignmentScores[assignmentIndex] = normalizedGrade;
        if (normalizedGrade !== null && !isFailedGrade(normalizedGrade)) {
          assignmentsPassed++;
        }
      }
    });

    const assignmentTotal = ASSIGNMENTS_COUNT;
    const classCount = Math.max(
      0,
      Math.round(toNumber(getProp(item, "ClassCount", "classCount"))),
    );
    const attendanceEntries = toArray(
      getProp(item, "Attendances", "attendances"),
    ).map((value: any) => ({
      type: "Lecture" as const,
      attendance: toAttendance(value),
    }));
    const attendancePresent = attendanceEntries.filter(
      (entry) => entry.attendance === "present",
    ).length;
    const attendanceTotal = attendanceEntries.length || classCount;

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
      classSessions: attendanceEntries,
      attendancePresent,
      attendanceTotal,
    };
  });
}

export function GradesOverview({
  grades,
  loading = false,
  emptyMessage = "No grades available. Please check back later.",
}: {
  grades: GradeCourse[];
  loading?: boolean;
  emptyMessage?: string;
}) {
  const loadingContent = (
    <div className="flex justify-center py-12">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );

  return (
    <Tabs defaultValue="current" className="w-full">
      <TabsContent value="current" className="space-y-4">
        {loading ? (
          loadingContent
        ) : grades.length === 0 ? (
          <Card className="p-6 text-sm text-muted-foreground">
            {emptyMessage}
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {grades.map((course) => {
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
                  className="relative transition-shadow hover:shadow-md"
                >
                  {course.code && (
                    <Badge
                      variant="outline"
                      className="absolute right-4 top-4 z-10"
                    >
                      {course.code}
                    </Badge>
                  )}
                  <CardHeader className="pb-1">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 pr-20">
                        <CardTitle>{course.course || "Course"}</CardTitle>
                        {course.instructor && (
                          <CardDescription>{course.instructor}</CardDescription>
                        )}
                        <CardDescription>
                          {[
                            course.credits ? `${course.credits} kredit` : null,
                            course.weeklyHours
                              ? `${course.weeklyHours} saat`
                              : null,
                          ]
                            .filter(Boolean)
                            .join(" -- ") || ""}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="-mt-4 space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>Ümumi bal</span>
                        <span>{formatOverallScore(course.scoreOutOf50)}</span>
                      </div>
                      <Progress value={course.percentage} />
                    </div>

                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-6 text-sm">
                        <div>
                          <p className="mb-2 text-muted-foreground">
                            Seminar balları
                          </p>
                          <div className="flex flex-wrap items-center gap-1.5">
                            {course.seminarGrades.length > 0 ? (
                              course.seminarGrades.map((grade, idx) => (
                                <Badge
                                  key={idx}
                                  variant={
                                    isFailedGrade(grade)
                                      ? "destructive"
                                      : "secondary"
                                  }
                                  className="px-2.5 py-0.5 text-sm"
                                >
                                  {formatGradeValue(grade)}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="mb-2 text-muted-foreground">
                            Kollokvium
                          </p>
                          <div className="flex items-center justify-end gap-2">
                            {course.colloquium.length === 0 ? (
                              <span className="text-muted-foreground">-</span>
                            ) : (
                              course.colloquium.map((score, idx) => (
                                <Badge
                                  key={idx}
                                  variant={
                                    score === null
                                      ? "outline"
                                      : isFailedGrade(score)
                                        ? "destructive"
                                        : "secondary"
                                  }
                                  className="px-5 py-2.5 text-base"
                                >
                                  {formatGradeValue(score)}
                                </Badge>
                              ))
                            )}
                          </div>
                        </div>
                      </div>

                      <div>
                        <div className="mb-2 flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">
                            Sərbəst işlər
                          </span>
                          <span className="text-sm text-muted-foreground">
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
                                variant={
                                  score === null
                                    ? "outline"
                                    : isFailedGrade(score)
                                      ? "destructive"
                                      : "secondary"
                                }
                                className="text-xs"
                              >
                                {formatGradeValue(score)}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>

                      <div>
                        <div className="mb-2 flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">
                            Davamiyyət
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {attendanceRatio}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {course.classSessions.length === 0 ? (
                            <span className="text-muted-foreground">-</span>
                          ) : (
                            course.classSessions.map((session, idx) => (
                              <Badge
                                key={idx}
                                variant={
                                  session.attendance === "present"
                                    ? "default"
                                    : "destructive"
                                }
                                className="text-xs"
                              >
                                {session.attendance === "present" ? "p" : "a"}
                              </Badge>
                            ))
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
    </Tabs>
  );
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
        setGrades(normalizeCourseList(currentRaw));
      } catch (err: any) {
        if (mounted) setError(err.message || "Failed to load grades");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const loadingContent = (
    <div className="flex justify-center py-12">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1>Qiymətlər & Nəticələr</h1>
        <p className="text-muted-foreground">
          Akademik inkişafınızı və nəticələrinizi izləyin
        </p>
      </div>

      {error && <p className="text-destructive">{error}</p>}

      <Tabs defaultValue="current" className="w-full">
        <TabsContent value="current" className="space-y-4">
          {loading ? (
            loadingContent
          ) : grades.length === 0 ? (
            <Card className="p-6 text-sm text-muted-foreground">
              No grades available. Please check back later.
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {grades.map((course) => {
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
                    className="relative transition-shadow hover:shadow-md"
                  >
                    {course.code && (
                      <Badge
                        variant="outline"
                        className="absolute right-4 top-4 z-10"
                      >
                        {course.code}
                      </Badge>
                    )}
                    <CardHeader className="pb-1">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1 pr-20">
                          <CardTitle>{course.course || "Course"}</CardTitle>
                          {course.instructor && (
                            <CardDescription>
                              {course.instructor}
                            </CardDescription>
                          )}
                          <CardDescription>
                            {[
                              course.credits
                                ? `${course.credits} kredit`
                                : null,
                              course.weeklyHours
                                ? `${course.weeklyHours} saat`
                                : null,
                            ]
                              .filter(Boolean)
                              .join(" • ") || ""}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="-mt-4 space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span>Ümumi bal</span>
                          <span>{formatOverallScore(course.scoreOutOf50)}</span>
                        </div>
                        <Progress value={course.percentage} />
                      </div>

                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-6 text-sm">
                          <div>
                            <p className="mb-2 text-muted-foreground">
                              Seminar balları
                            </p>
                            <div className="flex flex-wrap items-center gap-1.5">
                              {course.seminarGrades.length > 0 ? (
                                course.seminarGrades.map((grade, idx) => (
                                  <Badge
                                    key={idx}
                                    variant={
                                      isFailedGrade(grade)
                                        ? "destructive"
                                        : "secondary"
                                    }
                                    className="px-2.5 py-0.5 text-sm"
                                  >
                                    {formatGradeValue(grade)}
                                  </Badge>
                                ))
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="mb-2 text-muted-foreground">
                              Kollokvium
                            </p>
                            <div className="flex items-center justify-end gap-2">
                              {course.colloquium.length === 0 ? (
                                <span className="text-muted-foreground">-</span>
                              ) : (
                                course.colloquium.map((score, idx) => (
                                  <Badge
                                    key={idx}
                                    variant={
                                      score === null
                                        ? "outline"
                                        : isFailedGrade(score)
                                          ? "destructive"
                                          : "secondary"
                                    }
                                    className="px-5 py-2.5 text-base"
                                  >
                                    {formatGradeValue(score)}
                                  </Badge>
                                ))
                              )}
                            </div>
                          </div>
                        </div>

                        <div>
                          <div className="mb-2 flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">
                              Sərbəst işlər
                            </span>
                            <span className="text-sm text-muted-foreground">
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
                                  variant={
                                    score === null
                                      ? "outline"
                                      : isFailedGrade(score)
                                        ? "destructive"
                                        : "secondary"
                                  }
                                  className="text-xs"
                                >
                                  {formatGradeValue(score)}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>

                        <div>
                          <div className="mb-2 flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">
                              Davamiyyət
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {attendanceRatio}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {course.classSessions.length === 0 ? (
                              <span className="text-muted-foreground">-</span>
                            ) : (
                              course.classSessions.map((session, idx) => (
                                <Badge
                                  key={idx}
                                  variant={
                                    session.attendance === "present"
                                      ? "default"
                                      : "destructive"
                                  }
                                  className="text-xs"
                                >
                                  {session.attendance === "present" ? "p" : "a"}
                                </Badge>
                              ))
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
      </Tabs>
    </div>
  );
}
