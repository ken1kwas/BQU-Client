import React, { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { CourseCard } from "./CourseCard";
import { getStudentSchedule, getTeacherSchedule, toArray } from "../api";

// The weekly schedule will be populated from the backend.  Each day
// contains a name, a date string and an array of class entries.
interface ScheduleDay {
  day: string;
  date: string;
  classes: ScheduleEntry[];
}

interface ScheduleEntry {
  id: string | number;
  title: string;
  code: string;
  time: string;
  location: string;
  type: string;
  instructor?: string;
  topic?: string;
  group?: string;
}

const formatTimeValue = (value: any): string => {
  if (!value) return "";

  const str = String(value).trim();

  // If already formatted with AM/PM, return as is
  if (str.includes("AM") || str.includes("PM")) return str;

  // Try to parse as ISO datetime string (e.g., "2025-01-25T14:30:00")
  if (str.includes("T")) {
    try {
      const date = new Date(str);
      if (!isNaN(date.getTime())) {
        const hours = date.getHours();
        const minutes = date.getMinutes().toString().padStart(2, "0");
        const ampm = hours >= 12 ? "PM" : "AM";
        const displayHour = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
        return `${displayHour}:${minutes} ${ampm}`;
      }
    } catch (e) {
      // Fall through to time parsing
    }
  }

  // Parse as time string (HH:MM or HH:MM:SS)
  const parts = str.split(":");
  if (parts.length >= 2) {
    const hour = parseInt(parts[0]);
    if (isNaN(hour)) return str;
    const minutes = parts[1].split(" ")[0].padStart(2, "0"); // Remove AM/PM if present
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  }

  return str;
};

const toTimeRange = (start: any, end: any): string => {
  if (!start && !end) return "";

  const from = formatTimeValue(start);
  const to = formatTimeValue(end);
  if (from && to) return `${from} - ${to}`;
  return from || to || "";
};

const pickString = (...values: any[]): string => {
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
};

const titleCase = (value: string): string => {
  if (!value) return "";
  return value
    .replace(/[_-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

const toScheduleEntry = (raw: any, index: number): ScheduleEntry => {
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
      if (!isNaN(periodDate.getTime())) {
        start = periodDate.toISOString();
        const endDate = new Date(periodDate);
        endDate.setMinutes(endDate.getMinutes() + 90);
        end = endDate.toISOString();
      }
    } catch (e) {}
  }

  let location = pickString(
    raw?.location,
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
    raw?.room?.roomName,
    raw?.room?.name,
  );

  if (!location && raw?.room && typeof raw.room === "string") {
    if (raw.room.length > 10) {
      location = raw.room;
    } else {
      location = raw.room;
    }
  }

  const typeRaw = pickString(
    raw?.type,
    raw?.classType,
    raw?.lessonType,
    raw?.sessionType,
    raw?.format,
  )
    .toLowerCase()
    .trim();

  let normalizedType = "lecture";
  if (
    typeRaw === "l" ||
    typeRaw.startsWith("lecture") ||
    typeRaw.startsWith("лекция")
  ) {
    normalizedType = "lecture";
  } else if (
    typeRaw === "s" ||
    typeRaw.startsWith("seminar") ||
    typeRaw.startsWith("семинар")
  ) {
    normalizedType = "seminar";
  } else if (typeRaw.startsWith("lab") || typeRaw.startsWith("практика")) {
    normalizedType = "lab";
  } else if (typeRaw) {
    normalizedType = typeRaw;
  }

  let id = pickString(
    raw?.id,
    raw?.classId,
    raw?.scheduleId,
    raw?.sessionId,
    raw?.entryId,
  );

  const periodStr = raw?.period ? String(raw.period) : "";
  const nameStr = pickString(raw?.name, raw?.title, raw?.courseName) || "";
  const codeStr = pickString(raw?.code, raw?.courseCode) || "";

  if (!id || (periodStr && id)) {
    id = `${id || `entry-${index}`}-${periodStr}-${normalizedType}-${nameStr}-${codeStr}`;
  } else if (periodStr) {
    id = `${id}-${periodStr}-${normalizedType}`;
  }

  return {
    id: id || `entry-${index}`,
    title: pickString(
      raw?.title,
      raw?.course,
      raw?.courseName,
      raw?.subject,
      raw?.name,
      raw?.taughtSubjectTitle,
    ),
    code: pickString(
      raw?.code,
      raw?.courseCode,
      raw?.subjectCode,
      raw?.classCode,
    ),
    time: pickString(raw?.time, toTimeRange(start, end)) || "",
    location: location || "—",
    type: normalizedType,
    instructor: pickString(
      raw?.instructor,
      raw?.teacher,
      raw?.teacherName,
      raw?.professor,
      raw?.lecturer,
      raw?.mentor,
    ),
    topic: pickString(
      raw?.topic,
      raw?.sessionTopic,
      raw?.lessonTopic,
      raw?.subject,
    ),
    group: pickString(
      raw?.group,
      raw?.groupCode,
      raw?.groupName,
      raw?.groupDto?.groupCode,
      raw?.groupDto?.name,
      raw?.groupInfo?.name,
    ),
  };
};

const toScheduleEntries = (raw: any): ScheduleEntry[] => {
  const entries = toArray(raw)
    .map((item, index) => toScheduleEntry(item, index))
    .filter(
      (entry) =>
        entry.title || entry.code || entry.time || entry.location !== "—",
    );

  const seenKeys = new Set<string>();
  const seenContentKeys = new Set<string>();

  return entries.filter((entry) => {
    const uniqueKey = `${entry.id}-${entry.time}-${entry.type}-${entry.title}-${entry.code}-${entry.location}`;
    const contentKey = `${entry.time}-${entry.type}-${entry.title}-${entry.code}-${entry.location}-${entry.instructor}-${entry.group}`;

    if (seenKeys.has(uniqueKey)) {
      return false;
    }

    if (seenContentKeys.has(contentKey)) {
      return false;
    }

    seenKeys.add(uniqueKey);
    seenContentKeys.add(contentKey);
    return true;
  });
};

const toScheduleDay = (raw: any, index: number): ScheduleDay => {
  const classesRaw =
    raw?.classes ?? raw?.items ?? raw?.schedule ?? raw?.entries ?? raw?.lessons;

  const classes = toScheduleEntries(classesRaw?.length ? classesRaw : raw);

  return {
    day: titleCase(
      pickString(raw?.day, raw?.dayOfWeek, raw?.name, raw?.title) ||
        `Day ${index + 1}`,
    ),
    date: pickString(
      raw?.date,
      raw?.dayDate,
      raw?.displayDate,
      raw?.calendarDate,
    ),
    classes,
  };
};

const toWeekSchedule = (raw: any): ScheduleDay[] => {
  if (raw?.teacherScheduleDto) {
    raw = raw.teacherScheduleDto;
  }

  if (raw?.classes && Array.isArray(raw.classes)) {
    const classesByDay = new Map<string, any[]>();
    const dayNames = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    const dayNamesShort = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    for (const item of raw.classes) {
      if (!item?.period) continue;
      try {
        const classDate = new Date(item.period);
        const dayIndex = classDate.getDay();
        const dayName = dayNames[dayIndex];

        if (!classesByDay.has(dayName)) {
          classesByDay.set(dayName, []);
        }
        classesByDay.get(dayName)!.push(item);
      } catch {
        continue;
      }
    }

    const scheduleDays: ScheduleDay[] = [];
    const today = new Date();
    const currentWeekStart = new Date(today);
    currentWeekStart.setDate(today.getDate() - today.getDay());

    for (let i = 0; i < 7; i++) {
      const dayDate = new Date(currentWeekStart);
      dayDate.setDate(currentWeekStart.getDate() + i);
      const dayName = dayNames[i];
      const dayClasses = classesByDay.get(dayName) || [];

      if (dayClasses.length > 0 || i === today.getDay()) {
        const entries = toScheduleEntries(dayClasses);

        entries.sort((a, b) => {
          if (!a.time || !b.time) return 0;
          return a.time.localeCompare(b.time);
        });

        scheduleDays.push({
          day: dayName,
          date: `${dayNamesShort[i]}, ${months[dayDate.getMonth()]} ${dayDate.getDate()}`,
          classes: entries,
        });
      }
    }

    return scheduleDays.filter((day) => day.classes.length > 0);
  }

  const candidates = [raw?.week, raw?.days, raw?.schedule, raw?.items, raw];

  for (const candidate of candidates) {
    const list = toArray(candidate);
    if (list.length > 0) {
      const mapped = list.map((item, index) => toScheduleDay(item, index));
      if (mapped.some((day) => day.classes.length > 0)) return mapped;
    }
  }

  if (raw && typeof raw === "object") {
    const mapped: ScheduleDay[] = [];
    for (const [key, value] of Object.entries(raw)) {
      const classes = toScheduleEntries((value as any)?.classes ?? value);
      if (classes.length === 0) continue;
      mapped.push({
        day: titleCase(key),
        date: pickString((value as any)?.date, (value as any)?.dayDate),
        classes,
      });
    }
    if (mapped.length > 0) return mapped;
  }

  return [];
};

const toTodaySchedule = (raw: any): ScheduleEntry[] => {
  if (raw?.teacherScheduleDto) {
    raw = raw.teacherScheduleDto;
  }

  let classes = raw?.classes;
  if (!classes && raw?.today) {
    classes = raw;
  }

  if (Array.isArray(classes) && classes.length > 0) {
    const today = new Date();
    const todayYear = today.getFullYear();
    const todayMonth = today.getMonth();
    const todayDate = today.getDate();

    const todayClasses = classes.filter((item: any) => {
      if (!item?.period) return false;
      try {
        const classDate = new Date(item.period);
        const classYear = classDate.getFullYear();
        const classMonth = classDate.getMonth();
        const classDay = classDate.getDate();

        const isToday =
          classYear === todayYear &&
          classMonth === todayMonth &&
          classDay === todayDate;

        return isToday;
      } catch {
        return false;
      }
    });

    const seenPeriods = new Set<string>();
    const uniqueTodayClasses = todayClasses.filter((item: any) => {
      if (!item?.period) return false;
      const periodKey = `${item.period}-${item.name}-${item.code}-${item.classType}`;
      if (seenPeriods.has(periodKey)) {
        return false;
      }
      seenPeriods.add(periodKey);
      return true;
    });

    const entries = toScheduleEntries(uniqueTodayClasses);

    entries.sort((a, b) => {
      if (!a.time || !b.time) return 0;
      return a.time.localeCompare(b.time);
    });

    return entries;
  }

  return [];
};

// const upcomingEvents = [
//   {
//     id: 1,
//     title: "Guest Speaker: Dr. Jane Smith",
//     date: "Oct 22, 2025",
//     time: "3:00 PM - 4:30 PM",
//     location: "Main Auditorium",
//     description: "Join us for an insightful talk on AI Ethics and the Future of Technology. Dr. Smith is a leading researcher in artificial intelligence and will discuss ethical considerations in modern AI development.",
//     type: "speaker"
//   },
//   {
//     id: 2,
//     title: "Career Fair 2025",
//     date: "Oct 25, 2025",
//     time: "10:00 AM - 4:00 PM",
//     location: "Student Center",
//     description: "Meet with top employers from tech, finance, and consulting industries. Bring your resume and be ready to network with recruiters from over 50 companies.",
//     type: "career"
//   },
//   {
//     id: 3,
//     title: "Hackathon: Build for Good",
//     date: "Nov 5-6, 2025",
//     time: "All Day",
//     location: "Engineering Building",
//     description: "24-hour hackathon focused on creating solutions for social impact. Form teams, collaborate with peers, and compete for prizes while making a difference.",
//     type: "workshop"
//   }
// ];

interface ScheduleProps {
  userRole?: "student" | "teacher";
}

const formatTodayDate = (): string => {
  const today = new Date();
  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const dayName = days[today.getDay()];
  const month = months[today.getMonth()];
  const day = today.getDate();
  return `${dayName}, ${month} ${day}`;
};

const unwrapSchedulePayload = (raw: any): any => {
  const visited = new Set<any>();
  let current = raw;

  while (
    current &&
    typeof current === "object" &&
    !Array.isArray(current) &&
    !Array.isArray(current.classes) &&
    !visited.has(current)
  ) {
    visited.add(current);

    const nextCandidate =
      current.teacherScheduleDto ??
      current.teacherSchedule ??
      current.studentSchedule ??
      current.studentScheduleDto ??
      current.data ??
      current.result ??
      current.value ??
      null;

    if (nextCandidate) {
      current = nextCandidate;
      continue;
    }

    break;
  }

  if (Array.isArray(current)) {
    return { classes: current };
  }

  if (current && Array.isArray(current.classes)) {
    return { classes: current.classes };
  }

  return current;
};

export function Schedule({ userRole = "student" }: ScheduleProps = {}) {
  const [todaySchedule, setTodaySchedule] = useState<ScheduleEntry[]>([]);
  const [weekSchedule, setWeekSchedule] = useState<ScheduleDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const [todayRaw, weekRaw] =
          userRole === "teacher"
            ? await Promise.all([
                getTeacherSchedule("today"),
                getTeacherSchedule("week"),
              ])
            : await Promise.all([
                getStudentSchedule("today"),
                getStudentSchedule("week"),
              ]);

        if (!mounted) return;

        const processedToday = unwrapSchedulePayload(todayRaw);

        const todayEntries = toTodaySchedule(processedToday);
        setTodaySchedule(todayEntries);

        const processedWeek = unwrapSchedulePayload(weekRaw);
        const weekEntries = toWeekSchedule(processedWeek);

        setWeekSchedule(weekEntries);
      } catch (err: any) {
        if (mounted) setError(err.message || "Не удалось загрузить расписание");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [userRole]);

  // const getEventTypeColor = (type: string) => {
  //   switch (type) {
  //     case 'speaker': return 'default';
  //     case 'career': return 'secondary';
  //     case 'workshop': return 'outline';
  //     default: return 'outline';
  //   }
  // };

  return (
    <div className="space-y-6">
      <div>
        <h1>Schedule</h1>
        <p className="text-muted-foreground">
          Your classes, events, and upcoming deadlines
        </p>
      </div>

      {error && <p className="text-destructive text-sm">{error}</p>}

      <Tabs defaultValue="today" className="w-full">
        <TabsList>
          <TabsTrigger value="today">Today</TabsTrigger>
          <TabsTrigger value="week">This Week</TabsTrigger>
          {/* <TabsTrigger value="events">Upcoming Events</TabsTrigger> */}
        </TabsList>

        <TabsContent value="today" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Today's Schedule - {formatTodayDate()}</CardTitle>
              <CardDescription>
                Your classes and activities for today
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                <p>Loading…</p>
              ) : todaySchedule.length === 0 ? (
                <p className="text-muted-foreground text-sm">No classes.</p>
              ) : (
                todaySchedule.map((item) => (
                  <CourseCard
                    key={item.id}
                    title={item.title}
                    code={item.code}
                    time={item.time}
                    location={item.location}
                    instructor={item.instructor || "Not specified"}
                    type={item.type}
                    variant="today"
                    topic={item.topic}
                    group={item.group}
                    userRole={userRole}
                  />
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="week" className="space-y-4">
          {loading ? (
            <p>Loading…</p>
          ) : weekSchedule.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No classes for the week.
            </p>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {weekSchedule.map((day) => (
                <Card key={day.day}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      {day.day}
                      <Badge variant="outline">{day.date}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {day.classes.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No classes scheduled
                      </p>
                    ) : (
                      day.classes.map((classItem, idx) => (
                        <CourseCard
                          key={`${day.day}-${classItem.id}-${idx}-${classItem.time}-${classItem.type}`}
                          title={classItem.title}
                          code={classItem.code}
                          time={classItem.time}
                          location={classItem.location}
                          instructor={classItem.instructor || "Not specified"}
                          type={classItem.type}
                          variant="week"
                          topic={classItem.topic}
                          group={classItem.group}
                          userRole={userRole}
                        />
                      ))
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/*
        <TabsContent value="events" className="space-y-4">
          <div className="space-y-4">
            {upcomingEvents.map((event) => (
              <Card key={event.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{event.title}</h3>
                          <Badge variant={getEventTypeColor(event.type)}>{event.type}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{event.description}</p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {event.date}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {event.time}
                          </div>
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {event.location}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
        */}
      </Tabs>
    </div>
  );
}
