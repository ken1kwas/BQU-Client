import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Clock, MapPin, Users2, User } from "lucide-react";
import React, { useState, useEffect } from "react";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Badge } from "./ui/badge";
import {
  listRooms,
  listGroups,
  listTaughtSubjects,
  getGroupSchedule,
  toArray,
} from "../api";

interface ScheduleEntry {
  id: number;
  courseId: number;
  courseName: string;
  courseCode: string;
  teacherName: string;
  roomId: string | number;
  roomName: string;
  groupCode: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  type: string;
  topic?: string;
}

const daysOfWeek = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const normalizeClassType = (value: any): string => {
  if (value === undefined || value === null) return "lecture";
  const raw = String(value).trim().toLowerCase();
  if (!raw) return "lecture";

  if (raw === "l" || raw.startsWith("lecture") || raw.startsWith("лекц")) {
    return "lecture";
  }
  if (raw === "s" || raw.startsWith("seminar") || raw.startsWith("семин")) {
    return "seminar";
  }
  if (
    raw.startsWith("lab") ||
    raw.startsWith("prac") ||
    raw.startsWith("практ") ||
    raw.startsWith("лабо")
  ) {
    return "lab";
  }

  return raw;
};

const getClassTypeLabel = (type: string): string => {
  const normalized = normalizeClassType(type);
  if (normalized === "lecture") return "Lecture";
  if (normalized === "seminar") return "Seminar";
  if (normalized === "lab") return "Lab";
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

export function DeanSchedule() {
  const [scheduleEntries, setScheduleEntries] = useState<ScheduleEntry[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>("");

  // Get today's day of week
  const today = new Date().getDay();
  const todayName = daysOfWeek[(today + 6) % 7] || "Monday";

  // On mount, fetch lists of courses, rooms and groups from the backend.
  useEffect(() => {
    const fetchLists = async () => {
      try {
        const [roomsResp, groupsResp, coursesResp] = await Promise.all([
          listRooms(1, 100),
          listGroups(1, 100),
          listTaughtSubjects(1, 100),
        ]);

        const roomItems = toArray(roomsResp).map((r: any) => ({
          id: r.id,
          name: r.roomName ?? r.name ?? "",
        }));
        const groupItems = toArray(groupsResp)
          .map((g: any) => {
            // Используем ту же логику, что и в DeanManagement
            const groupCode = g.groupCode ?? g.code ?? "";
            return {
              id:
                g.id ?? g.groupId ?? g.groupID ?? g.Id ?? `group-${groupCode}`,
              code: groupCode,
              groupCode: groupCode, // Дублируем для совместимости
              year: g.year ?? g.yearOfAdmission ?? 0,
            };
          })
          .filter((g: any) => g.code && g.code.trim() !== ""); // Фильтруем только группы с кодом
        const courseItems = toArray(coursesResp).map((c: any) => {
          const teacher = c.teacher ?? {};
          const group = c.group ?? {};
          return {
            id: c.id,
            code: c.code ?? c.title ?? "",
            title: c.title ?? c.name ?? "",
            teacherName:
              c.teacherName ??
              `${teacher.name ?? ""} ${teacher.surname ?? ""}`.trim(),
            groupCode: c.groupCode ?? group.groupCode ?? "",
            type: c.type ?? "lecture",
          };
        });
        setRooms(roomItems);
        setGroups(groupItems);
        setCourses(courseItems);
        if (groupItems.length > 0 && groupItems[0].code) {
          setSelectedGroup(groupItems[0].code);
        }
      } catch {
        setRooms([]);
        setGroups([]);
        setCourses([]);
      }
    };
    fetchLists();
  }, []);

  const getEntriesForDay = (day: string) => {
    return scheduleEntries
      .filter(
        (entry) => entry.dayOfWeek === day && entry.groupCode === selectedGroup,
      )
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  // Function to safely get initial group
  useEffect(() => {
    if (groups.length > 0 && selectedGroup === "") {
      const firstGroup = groups.find((g) => g.code);
      if (firstGroup && firstGroup.code) {
        setSelectedGroup(firstGroup.code);
      }
    }
  }, [groups, selectedGroup]);

  // Load schedule when group is selected
  useEffect(() => {
    if (!selectedGroup) {
      setScheduleEntries([]);
      return;
    }

    const fetchSchedule = async () => {
      try {
        // Находим группу по коду, чтобы получить её ID
        const group = groups.find(
          (g) => (g.code || g.groupCode) === selectedGroup,
        );
        if (!group || !group.id) {
          setScheduleEntries([]);
          return;
        }

        const scheduleResp = await getGroupSchedule(group.id.toString());

        let scheduleArray: any[] = [];
        if (scheduleResp?.groupSchedule?.classes) {
          scheduleArray = Array.isArray(scheduleResp.groupSchedule.classes)
            ? scheduleResp.groupSchedule.classes
            : [];
        } else if (scheduleResp?.classes) {
          scheduleArray = Array.isArray(scheduleResp.classes)
            ? scheduleResp.classes
            : [];
        } else {
          scheduleArray = toArray(scheduleResp);
        }

        const entries: ScheduleEntry[] = scheduleArray.map(
          (item: any, index: number) => {
            const courseName =
              item.name ??
              item.courseName ??
              item.title ??
              item.course?.title ??
              item.course?.name ??
              "";
            const courseCode =
              item.code ?? item.courseCode ?? item.course?.code ?? "";

            let teacherName = item.professor ?? item.teacherName ?? "";
            if (!teacherName && item.teacher) {
              const teacherFullName =
                `${item.teacher.name ?? ""} ${item.teacher.surname ?? ""}`.trim();
              teacherName = teacherFullName || "";
            }

            const room = item.room ?? {};
            let roomName =
              item.roomName ?? item.room?.name ?? item.room?.roomName ?? "";
            const rawRoomId =
              item.roomId ??
              (typeof item.room === "number" || typeof item.room === "string"
                ? item.room
                : item.room?.id);
            if (
              (!roomName || roomName.trim() === "") &&
              rawRoomId != null &&
              Array.isArray(rooms) &&
              rooms.length > 0
            ) {
              const found = rooms.find((r: any) => {
                if (
                  r.id != null &&
                  rawRoomId != null &&
                  (r.id === rawRoomId || r.id === Number(rawRoomId))
                )
                  return true;
                const candidateName = (r.name ?? r.roomName ?? "").toString();
                if (
                  candidateName &&
                  (candidateName === rawRoomId ||
                    candidateName === String(rawRoomId))
                )
                  return true;
                return false;
              });
              if (found) roomName = found.name ?? found.roomName ?? "";
            }
            roomName =
              roomName ||
              item.location ||
              item.locationName ||
              item.auditorium ||
              item.auditoriumName ||
              "";
            const roomId = rawRoomId ?? item.room?.id ?? item.roomId ?? "";

            let startTime = "";
            let endTime = "";
            let dayOfWeek = "Monday";

            if (item.period) {
              try {
                const periodDate = new Date(item.period);
                if (!isNaN(periodDate.getTime())) {
                  const dayNum = periodDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
                  const dayNames = [
                    "Sunday",
                    "Monday",
                    "Tuesday",
                    "Wednesday",
                    "Thursday",
                    "Friday",
                    "Saturday",
                  ];
                  dayOfWeek = dayNames[dayNum] ?? "Monday";

                  const hours = periodDate
                    .getHours()
                    .toString()
                    .padStart(2, "0");
                  const minutes = periodDate
                    .getMinutes()
                    .toString()
                    .padStart(2, "0");
                  const seconds = periodDate
                    .getSeconds()
                    .toString()
                    .padStart(2, "0");
                  startTime = `${hours}:${minutes}:${seconds}`;

                  const endDate = new Date(periodDate);
                  endDate.setMinutes(endDate.getMinutes() + 90);
                  const endHours = endDate
                    .getHours()
                    .toString()
                    .padStart(2, "0");
                  const endMinutes = endDate
                    .getMinutes()
                    .toString()
                    .padStart(2, "0");
                  const endSeconds = endDate
                    .getSeconds()
                    .toString()
                    .padStart(2, "0");
                  endTime = `${endHours}:${endMinutes}:${endSeconds}`;
                }
              } catch {}
            }

            if (!startTime) {
              startTime =
                item.start ??
                item.startTime ??
                item.classStartTime ??
                item.sessionStartTime ??
                "";
            }
            if (!endTime) {
              endTime =
                item.end ??
                item.endTime ??
                item.classEndTime ??
                item.sessionEndTime ??
                "";
            }
            if (dayOfWeek === "Monday" && !item.period) {
              const dayNum = item.day ?? item.dayOfWeek ?? item.dayNumber ?? 0;
              const dayNames = [
                "Sunday",
                "Monday",
                "Tuesday",
                "Wednesday",
                "Thursday",
                "Friday",
                "Saturday",
              ];
              dayOfWeek =
                typeof dayNum === "number" && dayNum >= 0 && dayNum <= 6
                  ? dayNames[dayNum]
                  : (item.dayOfWeek ?? item.dayName ?? "Monday");
            }

            // Тип занятия
            const type = normalizeClassType(
              item.classType ?? item.type ?? item.course?.type ?? "lecture",
            );

            return {
              id: item.id ?? item.classId ?? item.scheduleId ?? index,
              courseId:
                item.courseId ?? item.taughtSubjectId ?? item.course?.id ?? 0,
              courseName,
              courseCode,
              teacherName,
              roomId,
              roomName,
              groupCode: selectedGroup,
              dayOfWeek,
              startTime: typeof startTime === "string" ? startTime : "",
              endTime: typeof endTime === "string" ? endTime : "",
              type,
              topic: item.topic ?? item.title ?? undefined,
            };
          },
        );

        setScheduleEntries(entries);
      } catch {
        setScheduleEntries([]);
      }
    };

    fetchSchedule();
  }, [selectedGroup, groups, rooms]);

  return (
    <div className="space-y-6">
      <div>
        <h1>Schedule Management</h1>
        <p className="text-muted-foreground">
          Manage academic schedules for all courses and groups
        </p>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>
                  Weekly Schedule for {selectedGroup || "..."}
                </CardTitle>
                <CardDescription>
                  View schedule organized by day of week
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="group-select" className="text-sm">
                  Group:
                </Label>
                <Select
                  value={selectedGroup}
                  onValueChange={(value: string) => {
                    setSelectedGroup(value);
                  }}
                  disabled={groups.length === 0}
                >
                  <SelectTrigger id="group-select" className="w-[180px]">
                    <SelectValue
                      placeholder={
                        groups.length === 0
                          ? "Loading groups..."
                          : "Select group"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {groups.length === 0 ? (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">
                        No groups available
                      </div>
                    ) : (
                      groups
                        .filter(
                          (group) => group.code && group.code.trim() !== "",
                        )
                        .map((group, index) => {
                          const groupCode = group.code || group.groupCode || "";
                          const groupId = group.id ?? `group-${index}`;
                          // Убеждаемся, что value не пустое
                          if (!groupCode || groupCode.trim() === "") {
                            return null;
                          }
                          return (
                            <SelectItem key={groupId} value={groupCode}>
                              {groupCode}
                            </SelectItem>
                          );
                        })
                        .filter(Boolean) // Убираем null значения
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {daysOfWeek.map((day) => (
                <Card
                  key={day}
                  className={
                    day === todayName ? "border-primary bg-primary/5" : ""
                  }
                >
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center justify-between">
                      {day}
                      {day === todayName && (
                        <Badge variant="default" className="text-xs">
                          Today
                        </Badge>
                      )}
                      {day !== todayName && (
                        <Badge variant="secondary">
                          {getEntriesForDay(day).length}
                        </Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {getEntriesForDay(day).length === 0 ? (
                      <p className="text-sm text-muted-foreground py-4 text-center">
                        No classes scheduled
                      </p>
                    ) : (
                      getEntriesForDay(day).map((entry) => (
                        <div
                          key={entry.id}
                          className="p-3 rounded-lg border relative pb-10"
                        >
                          <div className="space-y-2 pr-20">
                            <div className="flex items-start gap-2">
                              <span
                                className="font-medium overflow-hidden"
                                style={{
                                  display: "-webkit-box",
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: "vertical",
                                }}
                              >
                                {entry.courseName}
                              </span>
                            </div>
                            {entry.topic && (
                              <div className="text-sm text-muted-foreground italic">
                                {entry.topic}
                              </div>
                            )}
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <User className="h-3 w-3 shrink-0" />
                              <span>{entry.teacherName}</span>
                            </div>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Users2 className="h-3 w-3 shrink-0" />
                              <span>{entry.groupCode}</span>
                            </div>
                            <div className="space-y-1 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3 shrink-0" />
                                <span>
                                  {formatTime(entry.startTime)} -{" "}
                                  {formatTime(entry.endTime)}
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <MapPin className="h-3 w-3 shrink-0" />
                                <span>{entry.roomName}</span>
                              </div>
                            </div>
                            <Badge
                              variant="secondary"
                              className="absolute top-3 right-3 text-xs"
                            >
                              {getClassTypeLabel(entry.type)}
                            </Badge>
                            <Badge
                              variant="outline"
                              className="absolute bottom-3 left-3 text-xs"
                            >
                              {entry.courseCode}
                            </Badge>
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
