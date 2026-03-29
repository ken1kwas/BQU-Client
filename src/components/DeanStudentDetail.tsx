import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  Clock3,
  GraduationCap,
  Mail,
  MapPin,
  UserSquare2,
  Users,
} from "lucide-react";
import { getStudentById } from "../api";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Separator } from "./ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import {
  GradesOverview,
  type GradeCourse,
  normalizeCourseList,
} from "./Grades";

export interface DeanStudentDetailStudent {
  id: string;
}

interface StudentClass {
  id: string;
  taughtSubjectId: string;
  name: string;
  classType: string;
  professor: string;
  start: string;
  end: string;
  period: string;
  room: string;
  code: string;
  isUpperWeek: boolean;
}

interface StudentDetailResponse {
  name?: string;
  groupCode?: string;
  specializationName?: string;
  admissionYear?: string;
  course?: number;
  admissionScore?: number;
  email?: string | null;
  todayClasses?: StudentClass[];
  grades?: StudentGradesDto | null;
}

interface StudentGradesDto {
  academicPerformance?: unknown[];
}

interface DeanStudentDetailProps {
  student: DeanStudentDetailStudent;
  onBack: () => void;
}

const EMPTY_VALUE = "-";

function formatValue(value?: string | number | null) {
  if (value === undefined || value === null || String(value).trim() === "") {
    return EMPTY_VALUE;
  }

  return String(value);
}

function getInitials(name: string) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "ST"
  );
}

function InfoItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string | number | null;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 text-muted-foreground">{icon}</div>
      <div className="flex-1">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-1 font-medium">{formatValue(value)}</p>
      </div>
    </div>
  );
}

export function DeanStudentDetail({
  student,
  onBack,
}: DeanStudentDetailProps) {
  const [details, setDetails] = useState<StudentDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadStudent = async () => {
      try {
        setLoading(true);
        setError(null);
        const resp = await getStudentById(student.id);
        if (!cancelled) {
          setDetails(resp ?? null);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || "Student details could not be loaded.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadStudent();

    return () => {
      cancelled = true;
    };
  }, [student.id]);

  const info = useMemo(() => {
    return {
      name: details?.name || "",
      groupCode: details?.groupCode || EMPTY_VALUE,
      specialization: details?.specializationName || EMPTY_VALUE,
      admissionYear: details?.admissionYear || EMPTY_VALUE,
      course: details?.course ?? 0,
      admissionScore: details?.admissionScore ?? undefined,
      email: details?.email ?? "",
      todayClasses: details?.todayClasses ?? [],
    };
  }, [details]);

  const grades = useMemo<GradeCourse[]>(
    () => normalizeCourseList(details?.grades ?? null),
    [details],
  );

  const fullName = info.name || "Student";
  const courseLabel = info.course ? `${info.course} course` : EMPTY_VALUE;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Button variant="ghost" className="w-fit px-0" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to students
          </Button>
        </div>

      </div>

      {error && (
        <Card className="border-destructive/30">
          <CardContent className="pt-6 text-sm text-destructive">
            {error}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-6">
          <div className="mb-6 flex flex-col gap-6 md:flex-row md:items-center">

            <div className="flex-1">
              <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-center">
                <h2>{fullName}</h2>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{courseLabel}</Badge>
                  <Badge variant="outline">{formatValue(info.groupCode)}</Badge>
                  {loading && <Badge variant="secondary">Loading...</Badge>}
                </div>
              </div>

              <div className="space-y-1 text-muted-foreground">
                <p>Student ID: {formatValue(student.id)}</p>
                <p>{formatValue(info.specialization)}</p>
              </div>
            </div>
          </div>

          <Separator className="my-6" />

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            <InfoItem
              icon={<UserSquare2 className="h-4 w-4" />}
              label="Student ID"
              value={student.id}
            />
            <InfoItem
              icon={<Users className="h-4 w-4" />}
              label="Group"
              value={info.groupCode}
            />
            <InfoItem
              icon={<GraduationCap className="h-4 w-4" />}
              label="Course"
              value={courseLabel}
            />
            <InfoItem
              icon={<BookOpen className="h-4 w-4" />}
              label="Specialization"
              value={info.specialization}
            />
            <InfoItem
              icon={<CalendarDays className="h-4 w-4" />}
              label="Admission Year"
              value={info.admissionYear}
            />
            <InfoItem
              icon={<GraduationCap className="h-4 w-4" />}
              label="Admission Score"
              value={info.admissionScore}
            />
            <InfoItem
              icon={<Mail className="h-4 w-4" />}
              label="Email"
              value={info.email}
            />
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="classes" className="space-y-4">
        <TabsList>
          <TabsTrigger value="classes">
            Today&apos;s Classes
          </TabsTrigger>
          <TabsTrigger value="grades">Grades</TabsTrigger>
        </TabsList>

        <TabsContent value="classes">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>Today&apos;s Classes</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Current daily schedule for this student
                  </p>
                </div>
                <Badge variant="outline">
                  {info.todayClasses.length} classes
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {info.todayClasses.length === 0 ? (
                <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                  No classes scheduled for today.
                </div>
              ) : (
                <div className="space-y-4">
                  {info.todayClasses.map((item) => (
                    <Card key={item.id}>
                      <CardContent className="pt-6">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-lg font-semibold">{item.name}</h3>
                              <Badge variant="secondary">
                                {formatValue(item.classType)}
                              </Badge>
                              {item.code && (
                                <Badge variant="outline">{item.code}</Badge>
                              )}
                              {item.isUpperWeek && (
                                <Badge variant="outline">Upper week</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Professor: {formatValue(item.professor)}
                            </p>
                          </div>

                          <div className="text-sm font-medium text-muted-foreground">
                            {formatValue(item.start)} - {formatValue(item.end)}
                          </div>
                        </div>

                        <Separator className="my-4" />

                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                          <InfoItem
                            icon={<Clock3 className="h-4 w-4" />}
                            label="Start"
                            value={item.start}
                          />
                          <InfoItem
                            icon={<Clock3 className="h-4 w-4" />}
                            label="End"
                            value={item.end}
                          />
                          <InfoItem
                            icon={<MapPin className="h-4 w-4" />}
                            label="Room"
                            value={item.room}
                          />
                          <InfoItem
                            icon={<BookOpen className="h-4 w-4" />}
                            label="Taught Subject ID"
                            value={item.taughtSubjectId}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="grades">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>Grades</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Academic performance for this student
                  </p>
                </div>
                <Badge variant="outline">{grades.length} subjects</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <GradesOverview
                grades={grades}
                loading={loading}
                emptyMessage="No grades available for this student."
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
