import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
import {
  Clock,
  MapPin,
  Users2,
  User,
} from "lucide-react";
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

// Import API helpers to retrieve rooms, groups and taught subjects
import { listRooms, listGroups, listTaughtSubjects, getGroupSchedule, toArray } from "../api";

interface ScheduleEntry {
  id: number;
  courseId: number;
  courseName: string;
  courseCode: string;
  teacherName: string;
  roomId: number;
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


export function DeanSchedule() {
  // Schedule entries remain local until backend endpoints exist.
  const [scheduleEntries, setScheduleEntries] = useState<ScheduleEntry[]>([]);

  // Dynamic lists for courses, rooms and groups loaded from the API.
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

        const roomItems = toArray(roomsResp).map(
          (r: any) => ({
            id: r.id,
            name: r.roomName ?? r.name ?? "",
          }),
        );
        const groupItems = toArray(groupsResp)
          .map((g: any) => {
            // Используем ту же логику, что и в DeanManagement
            const groupCode = g.groupCode ?? g.code ?? "";
            return {
              id: g.id ?? g.groupId ?? g.groupID ?? g.Id ?? `group-${groupCode}`,
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
        console.log("Loaded groups:", groupItems);
        // Set initial selected group to first group
        if (groupItems.length > 0 && groupItems[0].code) {
          setSelectedGroup(groupItems[0].code);
          console.log("Set initial group to:", groupItems[0].code);
        } else {
          console.warn("No groups loaded or first group has no code");
        }
      } catch (err) {
        console.error("Error fetching lists:", err);
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
        const group = groups.find((g) => (g.code || g.groupCode) === selectedGroup);
        if (!group || !group.id) {
          console.warn("Group not found or has no ID:", selectedGroup);
          setScheduleEntries([]);
          return;
        }

        console.log("Fetching schedule for group:", group.id, selectedGroup);
        const scheduleResp = await getGroupSchedule(group.id.toString());
        console.log("Schedule response:", scheduleResp);

        let scheduleArray: any[] = [];
        if (scheduleResp?.groupSchedule?.classes) {
          scheduleArray = Array.isArray(scheduleResp.groupSchedule.classes) 
            ? scheduleResp.groupSchedule.classes 
            : [];
        } else if (scheduleResp?.classes) {
          scheduleArray = Array.isArray(scheduleResp.classes) ? scheduleResp.classes : [];
        } else {
          scheduleArray = toArray(scheduleResp);
        }

        console.log("Extracted schedule array:", scheduleArray);

        const entries: ScheduleEntry[] = scheduleArray.map((item: any, index: number) => {
          const courseName = item.name ?? item.courseName ?? item.title ?? item.course?.title ?? item.course?.name ?? "";
          const courseCode = item.code ?? item.courseCode ?? item.course?.code ?? "";

          let teacherName = item.professor ?? item.teacherName ?? "";
          if (!teacherName && item.teacher) {
            const teacherFullName = `${item.teacher.name ?? ""} ${item.teacher.surname ?? ""}`.trim();
            teacherName = teacherFullName || "";
          }

          const room = item.room ?? {};
          const roomName = item.roomName ?? item.room?.name ?? item.room?.roomName ?? "";
          const roomId = item.roomId ?? item.room?.id ?? 0;

          let startTime = "";
          let endTime = "";
          let dayOfWeek = "Monday";
          
          if (item.period) {
            try {
              const periodDate = new Date(item.period);
              if (!isNaN(periodDate.getTime())) {
                const dayNum = periodDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
                const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
                dayOfWeek = dayNames[dayNum] ?? "Monday";

                const hours = periodDate.getHours().toString().padStart(2, "0");
                const minutes = periodDate.getMinutes().toString().padStart(2, "0");
                const seconds = periodDate.getSeconds().toString().padStart(2, "0");
                startTime = `${hours}:${minutes}:${seconds}`;

                const endDate = new Date(periodDate);
                endDate.setMinutes(endDate.getMinutes() + 90);
                const endHours = endDate.getHours().toString().padStart(2, "0");
                const endMinutes = endDate.getMinutes().toString().padStart(2, "0");
                const endSeconds = endDate.getSeconds().toString().padStart(2, "0");
                endTime = `${endHours}:${endMinutes}:${endSeconds}`;
              }
            } catch (e) {
              console.warn("Error parsing period:", item.period, e);
            }
          }

          if (!startTime) {
            startTime = item.start ?? item.startTime ?? item.classStartTime ?? item.sessionStartTime ?? "";
          }
          if (!endTime) {
            endTime = item.end ?? item.endTime ?? item.classEndTime ?? item.sessionEndTime ?? "";
          }
          if (dayOfWeek === "Monday" && !item.period) {
            const dayNum = item.day ?? item.dayOfWeek ?? item.dayNumber ?? 0;
            const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
            dayOfWeek = typeof dayNum === "number" && dayNum >= 0 && dayNum <= 6 
              ? dayNames[dayNum] 
              : item.dayOfWeek ?? item.dayName ?? "Monday";
          }

          // Тип занятия
          const type = item.classType ?? item.type ?? item.course?.type ?? "lecture";

          return {
            id: item.id ?? item.classId ?? item.scheduleId ?? index,
            courseId: item.courseId ?? item.taughtSubjectId ?? item.course?.id ?? 0,
            courseName,
            courseCode,
            teacherName,
            roomId,
            roomName,
            groupCode: selectedGroup,
            dayOfWeek,
            startTime: typeof startTime === "string" ? startTime : "",
            endTime: typeof endTime === "string" ? endTime : "",
            type: type.toLowerCase(),
            topic: item.topic ?? item.title ?? undefined,
          };
        });

        console.log("Mapped schedule entries:", entries);
        setScheduleEntries(entries);
      } catch (err) {
        console.error("Error fetching schedule:", err);
        setScheduleEntries([]);
      }
    };

    fetchSchedule();
  }, [selectedGroup, groups]);

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
                  <CardTitle>Weekly Schedule for {selectedGroup || "..."}</CardTitle>
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
                      console.log("Group selected:", value);
                      setSelectedGroup(value);
                    }}
                    disabled={groups.length === 0}
                  >
                    <SelectTrigger id="group-select" className="w-[180px]">
                      <SelectValue placeholder={groups.length === 0 ? "Loading groups..." : "Select group"} />
                    </SelectTrigger>
                    <SelectContent>
                      {groups.length === 0 ? (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">
                          No groups available
                        </div>
                      ) : (
                        groups
                          .filter((group) => group.code && group.code.trim() !== "")
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
                                {entry.type === "lecture"
                                  ? "Lecture"
                                  : entry.type === "seminar"
                                    ? "Seminar"
                                    : "Lab"}
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
