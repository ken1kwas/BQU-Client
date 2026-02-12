import React, { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Badge } from "./ui/badge";
import {
  AlertCircle,
  CheckCircle,
  XCircle,
  FileText,
  CalendarDays,
} from "lucide-react";
import { CourseCard } from "./CourseCard";
import { getStudentDashboard, getStudentProfile, toArray } from "../api";

interface DashboardCourse {
  id: string | number;
  title: string;
  code: string;
  time: string;
  location: string;
  type: string;
  instructor?: string;
}

interface DashboardNotification {
  id: string | number;
  type: string;
  course: string;
  code?: string;
  message: string;
  timestamp: string;
}

function formatTimeValue(value: any): string {
  if (!value) return "";

  const str = String(value).trim();
  if (str.includes("AM") || str.includes("PM")) return str;

  if (str.includes("T")) {
    const date = new Date(str);
    if (!Number.isNaN(date.getTime())) {
      const hours = date.getHours();
      const minutes = date.getMinutes().toString().padStart(2, "0");
      const ampm = hours >= 12 ? "PM" : "AM";
      const displayHour = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
      return `${displayHour}:${minutes} ${ampm}`;
    }
  }

  const parts = str.split(":");
  if (parts.length >= 2) {
    const hour = Number(parts[0]);
    if (Number.isNaN(hour)) return str;
    const minutes = parts[1].split(" ")[0].padStart(2, "0");
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  }

  return str;
}

function toTimeRange(start: any, end: any): string {
  if (!start && !end) return "";
  const from = formatTimeValue(start);
  const to = formatTimeValue(end);
  if (from && to) return `${from} - ${to}`;
  return from || to || "";
}

function pickString(...values: any[]): string {
  for (const value of values) {
    if (value === undefined || value === null) continue;
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
  }
  return "";
}

function normalizeClassType(value: any): string {
  const raw = pickString(value).toLowerCase();
  if (raw === "l" || raw.startsWith("lecture") || raw.startsWith("лекция")) {
    return "lecture";
  }
  if (
    raw === "s" ||
    raw === "1" ||
    raw.startsWith("seminar") ||
    raw.startsWith("семинар")
  ) {
    return "seminar";
  }
  if (raw.startsWith("lab") || raw.startsWith("практика")) {
    return "lab";
  }
  return raw || "lecture";
}

function toDashboardCourse(raw: any, index: number): DashboardCourse {
  let start =
    raw?.startTime ??
    raw?.start ??
    raw?.beginTime ??
    raw?.timeStart ??
    raw?.classStartTime ??
    raw?.sessionStartTime ??
    raw?.periodStart ??
    raw?.startDateTime;
  let end =
    raw?.endTime ??
    raw?.end ??
    raw?.finishTime ??
    raw?.timeEnd ??
    raw?.classEndTime ??
    raw?.sessionEndTime ??
    raw?.periodEnd ??
    raw?.endDateTime;

  if (raw?.period && !start) {
    try {
      const periodDate = new Date(raw.period);
      if (!Number.isNaN(periodDate.getTime())) {
        start = periodDate.toISOString();
        const endDate = new Date(periodDate);
        endDate.setMinutes(endDate.getMinutes() + 90);
        end = endDate.toISOString();
      }
    } catch (e) {}
  }

  const location = pickString(
    raw?.location,
    raw?.room,
    raw?.roomName,
    raw?.roomCode,
    raw?.roomNumber,
    raw?.classroom,
    raw?.roomDto?.roomName,
    raw?.roomDto?.name,
    raw?.roomDto?.room,
    raw?.roomDto?.roomNumber,
    raw?.roomInfo?.name,
    raw?.roomInfo?.roomName,
  );

  const idCandidate =
    raw?.id ??
    raw?.classId ??
    raw?.scheduleId ??
    raw?.entryId ??
    raw?.taughtSubjectId ??
    raw?.code ??
    `course-${index}`;

  const title =
    pickString(
      raw?.name,
      raw?.title,
      raw?.courseName,
      raw?.subjectName,
      raw?.course,
    ) || "Course";

  const code = pickString(
    raw?.code,
    raw?.courseCode,
    raw?.subjectCode,
    raw?.classCode,
  );

  const instructor = pickString(
    raw?.instructor,
    raw?.teacher,
    raw?.teacherName,
    raw?.professor,
    raw?.lecturer,
    raw?.mentor,
  );

  return {
    id:
      typeof idCandidate === "string" || typeof idCandidate === "number"
        ? idCandidate
        : `course-${index}`,
    title,
    code,
    time: pickString(raw?.time, toTimeRange(start, end)),
    location: location || "—",
    type: normalizeClassType(
      raw?.classType ?? raw?.type ?? raw?.lessonType ?? raw?.sessionType,
    ),
    instructor,
  };
}

function deduplicateCourses(entries: DashboardCourse[]): DashboardCourse[] {
  const seenKeys = new Set<string>();
  const seenContent = new Set<string>();

  return entries.filter((entry) => {
    const key = `${entry.id}-${entry.time}-${entry.type}-${entry.title}-${entry.code}-${entry.location}`;
    const contentKey = `${entry.time}-${entry.type}-${entry.title}-${entry.code}-${entry.location}-${entry.instructor}`;

    if (seenKeys.has(key) || seenContent.has(contentKey)) return false;

    seenKeys.add(key);
    seenContent.add(contentKey);
    return true;
  });
}

function unwrapDashboardBase(raw: any): any {
  let current = raw;
  const visited = new Set<any>();

  while (
    current &&
    typeof current === "object" &&
    !Array.isArray(current) &&
    !visited.has(current)
  ) {
    visited.add(current);
    if (current.items && current.items !== current) {
      current = current.items;
      continue;
    }
    if (current.data && current.data !== current) {
      current = current.data;
      continue;
    }
    if (current.result && current.result !== current) {
      current = current.result;
      continue;
    }
    if (current.value && current.value !== current) {
      current = current.value;
      continue;
    }
    break;
  }

  return current;
}

function firstNonEmptyArray(...candidates: any[]): any[] {
  for (const candidate of candidates) {
    const arr = toArray(candidate);
    if (arr.length > 0) return arr;
  }
  return [];
}

function normalizeDashboardResponse(raw: any): {
  studentName: string;
  courses: DashboardCourse[];
  notifications: DashboardNotification[];
} {
  const base = unwrapDashboardBase(raw) ?? {};

  const courseCandidates = firstNonEmptyArray(
    base.classes,
    base.todayClasses,
    base.todaysClasses,
    base.classesToday,
    base.classes,
  );

  const courseEntries = deduplicateCourses(
    courseCandidates.map((item, index) => toDashboardCourse(item, index)),
  );

  const notificationCandidates = firstNonEmptyArray(
    base.notifications,
    raw?.notifications,
    raw?.data?.notifications,
  );

  const notifications = notificationCandidates.map(
    (item, index): DashboardNotification => ({
      id: (item?.id ?? index) as string | number,
      type: pickString(item?.type, item?.category, item?.kind) || "general",
      course:
        pickString(item?.course, item?.title, item?.subject, item?.className) ||
        "Notification",
      code:
        pickString(item?.code, item?.courseCode, item?.subjectCode) ||
        undefined,
      message:
        pickString(
          item?.message,
          item?.description,
          item?.details,
          item?.text,
        ) || "No details provided.",
      timestamp:
        pickString(
          item?.timestamp,
          item?.time,
          item?.date,
          item?.createdAt,
          item?.updatedAt,
        ) || "",
    }),
  );

  const studentName = pickString(
    base.studentName,
    base.name,
    base.fullName,
    base.student,
  );

  return {
    studentName,
    courses: courseEntries,
    notifications,
  };
}

export function Dashboard() {
  const [courses, setCourses] = useState<DashboardCourse[]>([]);
  const [notifications, setNotifications] = useState<DashboardNotification[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [studentName, setStudentName] = useState<string>("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const profile = await getStudentProfile();
        if (!mounted) return;

        const studentData =
          profile?.studentAcademicInfoDto ||
          profile?.studentProfile ||
          profile?.profile ||
          profile ||
          {};
        const firstName =
          studentData.name ||
          studentData.firstName ||
          studentData.givenName ||
          "";
        const surname =
          studentData.surname ||
          studentData.lastName ||
          studentData.familyName ||
          "";

        const fullName = [firstName, surname].filter(Boolean).join(" ").trim();
        if (fullName) {
          setStudentName(fullName);
        } else {
          const userName = studentData.userName || studentData.username || "";
          if (userName) {
            setStudentName(userName);
          }
        }
      } catch (err: any) {
        console.error("Failed to load student name:", err);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const data = await getStudentDashboard();
        if (!mounted) return;
        const normalized = normalizeDashboardResponse(data);
        setCourses(normalized.courses);
        setNotifications(normalized.notifications);
        setStudentName((prev) => prev || normalized.studentName || prev);
      } catch (err: any) {
        if (!mounted) return;
        setError(err.message || "Не удалось загрузить данные");
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
        <h1>Welcome back{studentName ? `, ${studentName}` : ""}!</h1>
        <p className="text-muted-foreground">
          Here's what's happening with your courses today.
        </p>
      </div>
      {error && <p className="text-destructive">{error}</p>}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Your Courses</CardTitle>
            <CardDescription>Today's schedule</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <p>Loading…</p>
            ) : courses.length === 0 ? (
              <p className="text-muted-foreground text-sm">No classes.</p>
            ) : (
              courses.map((classItem) => (
                <CourseCard
                  key={classItem.id}
                  title={classItem.title}
                  code={classItem.code}
                  time={classItem.time}
                  location={classItem.location}
                  instructor={classItem.instructor ?? ""}
                  type={classItem.type}
                />
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>Recent updates</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <p>Loading…</p>
            ) : notifications.length === 0 ? (
              <p className="text-muted-foreground text-sm">No notifications.</p>
            ) : (
              notifications.map((notification) => {
                let Icon = AlertCircle;
                let color = "text-yellow-500";
                switch (notification.type?.toLowerCase()) {
                  case "absence":
                    Icon = XCircle;
                    color = "text-red-500";
                    break;
                  case "assignment":
                    Icon = CheckCircle;
                    color = "text-green-500";
                    break;
                  case "event":
                    Icon = CalendarDays;
                    color = "text-purple-500";
                    break;
                  case "colloquium":
                    Icon = FileText;
                    color = "text-blue-500";
                    break;
                  case "grade":
                    Icon = AlertCircle;
                    color = "text-yellow-500";
                    break;
                }
                return (
                  <div
                    key={notification.id}
                    className="flex items-start gap-3 p-3 rounded-lg border"
                  >
                    <div className="flex-shrink-0 mt-1">
                      <Icon className={`h-4 w-4 ${color}`} />
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="font-medium">{notification.course}</p>
                        {notification.code && (
                          <Badge variant="outline">{notification.code}</Badge>
                        )}
                      </div>
                      <p className="text-sm">{notification.message}</p>
                      <p className="text-xs text-muted-foreground">
                        {notification.timestamp}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
