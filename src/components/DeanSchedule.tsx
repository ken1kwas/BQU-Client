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
import type { ScheduleEntry } from "../types/deanSchedule";

const dayKeys = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

const dayLabel: Record<(typeof dayKeys)[number], string> = {
  Monday: "Bazar ertəsi",
  Tuesday: "Çərşənbə axşamı",
  Wednesday: "Çərşənbə",
  Thursday: "Cümə axşamı",
  Friday: "Cümə",
  Saturday: "Şənbə",
};

const englishDateLabelMap: Record<string, string> = {
  Monday: "Bazar ertəsi",
  Tuesday: "Çərşənbə axşamı",
  Wednesday: "Çərşənbə",
  Thursday: "Cümə axşamı",
  Friday: "Cümə",
  Saturday: "Şənbə",
  Sunday: "Bazar",
  Mon: "B.e.",
  Tue: "Ç.a.",
  Wed: "Ç.",
  Thu: "C.a.",
  Fri: "C.",
  Sat: "Ş.",
  Sun: "B.",
  January: "Yanvar",
  February: "Fevral",
  March: "Mart",
  April: "Aprel",
  May: "May",
  June: "İyun",
  July: "İyul",
  August: "Avqust",
  September: "Sentyabr",
  October: "Oktyabr",
  November: "Noyabr",
  December: "Dekabr",
  Jan: "Yan",
  Feb: "Fev",
  Mar: "Mar",
  Apr: "Apr",
  Jun: "İyn",
  Jul: "İyl",
  Aug: "Avq",
  Sep: "Sen",
  Sept: "Sen",
  Oct: "Okt",
  Nov: "Noy",
  Dec: "Dek",
};

const translateScheduleDateLabel = (value: string): string => {
  if (!value) return "";

  return value.replace(
    /\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|Mon|Tue|Wed|Thu|Fri|Sat|Sun|January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\b/g,
    (match) => englishDateLabelMap[match] ?? match,
  );
};

// const daysOfWeek = [
//   "Bazar ertəsi",
//   "Çərşənbə axşamı",
//   "Çərşənbə",
//   "Cümə axşamı",
//   "Cümə",
//   "Şənbə"
// ];

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
  const [currentWeekIsUpper, setCurrentWeekIsUpper] = useState<boolean | null>(
    null,
  );
  const [scheduleTodayLabel, setScheduleTodayLabel] = useState<string>("");

  // Get today's day of week
  const today = new Date().getDay(); // 0..6 (Sun..Sat)
  const todayKey = dayKeys[(today + 6) % 7] || "Monday";

  // On mount, fetch lists of courses, rooms and groups from the backend.
  useEffect(() => {
    const fetchLists = async () => {
      try {
        const [roomsResp, groupsResp, coursesResp] = await Promise.all([
          listRooms(1, 110),
          listGroups(1, 100),
          listTaughtSubjects(1, 100),
        ]);

        const roomItems = toArray(roomsResp).map((r: any) => ({
          id: r.id,
          name: r.roomName ?? r.name ?? "",
        }));
        const groupItems = toArray(groupsResp)
          .map((g: any) => {
            const groupCode = g.groupCode ?? g.code ?? "";
            return {
              id:
                g.id ?? g.groupId ?? g.groupID ?? g.Id ?? `group-${groupCode}`,
              code: groupCode,
              groupCode: groupCode,
              year: g.year ?? g.yearOfAdmission ?? 0,
            };
          })
          .filter((g: any) => g.code && g.code.trim() !== "");
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

  const getEntriesForDay = (dayKey: string) =>
    scheduleEntries
      .filter((e) => e.dayOfWeek === dayKey && e.groupCode === selectedGroup)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));

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
      setCurrentWeekIsUpper(null);
      setScheduleTodayLabel("");
      return;
    }

    const fetchSchedule = async () => {
      try {
        const group = groups.find(
          (g) => (g.code || g.groupCode) === selectedGroup,
        );
        if (!group || !group.id) {
          setScheduleEntries([]);
          return;
        }

        const scheduleResp = await getGroupSchedule(group.id.toString());
        const scheduleRoot = scheduleResp?.groupSchedule ?? scheduleResp ?? {};
        const currentWeekValue = scheduleRoot?.isUpperWeek;

        setCurrentWeekIsUpper(
          typeof currentWeekValue === "boolean" ? currentWeekValue : null,
        );
        setScheduleTodayLabel(
          typeof scheduleRoot?.today === "string"
            ? translateScheduleDateLabel(scheduleRoot.today)
            : "",
        );

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

        if (typeof currentWeekValue === "boolean") {
          scheduleArray = scheduleArray.filter((item: any) => {
            if (typeof item?.isUpperWeek !== "boolean") return true;
            return item.isUpperWeek === currentWeekValue;
          });
        }

        const entries: ScheduleEntry[] = scheduleArray.map(
          (item: any, index: number) => {
            // Course name and code
            const courseName =
              item.name ??
              item.courseName ??
              item.title ??
              item.course?.title ??
              item.course?.name ??
              "";
            const courseCode =
              item.code ?? item.courseCode ?? item.course?.code ?? "";

            // Teacher name
            let teacherName = item.professor ?? item.teacherName ?? "";
            if (!teacherName && item.teacher) {
              const teacherFullName =
                `${item.teacher.name ?? ""} ${item.teacher.surname ?? ""}`.trim();
              teacherName = teacherFullName || "";
            }

            // Room handling - backend returns UUID string in 'room' field
            let roomName = "";
            let roomId = "";

            if (typeof item.room === "string") {
              // Room is a UUID string or a display name
              roomId = item.room;
              // Try to find room name from rooms array
              const foundRoom = rooms.find((r: any) => r.id === item.room);
              roomName = foundRoom
                ? (foundRoom.name ?? foundRoom.roomName ?? "")
                : "";
              if (!roomName) {
                roomName = item.room;
                roomId = "";
              }
            } else if (typeof item.room === "object" && item.room !== null) {
              // Room is an object
              roomId = item.room.id ?? "";
              roomName = item.room.name ?? item.room.roomName ?? "";
            }

            // Fallback to other fields if still empty
            if (!roomName) {
              roomName =
                item.roomName ??
                item.location ??
                item.locationName ??
                item.auditorium ??
                item.auditoriumName ??
                "";
            }
            if (!roomId) {
              roomId = item.roomId ?? "";
            }

            // Time extraction - use start/end from backend
            const startTime =
              item.start ?? item.startTime ?? item.classStartTime ?? "";
            const endTime = item.end ?? item.endTime ?? item.classEndTime ?? "";

            // Day of week extraction - use period for day
            let dayOfWeek = "Monday";

            if (item.period) {
              try {
                const periodDate = new Date(item.period);
                if (!isNaN(periodDate.getTime())) {
                  const dayNames = [
                    "Sunday",
                    "Monday",
                    "Tuesday",
                    "Wednesday",
                    "Thursday",
                    "Friday",
                    "Saturday",
                  ];
                  dayOfWeek = dayNames[periodDate.getDay()] ?? "Monday";
                }
              } catch {
                // Keep default Monday
              }
            }

            // Fallback: try numeric day field
            if (dayOfWeek === "Monday" && !item.period) {
              const dayNum = item.day ?? item.dayOfWeek ?? item.dayNumber;
              if (typeof dayNum === "number" && dayNum >= 0 && dayNum <= 6) {
                const dayNames = [
                  "Sunday",
                  "Monday",
                  "Tuesday",
                  "Wednesday",
                  "Thursday",
                  "Friday",
                  "Saturday",
                ];
                dayOfWeek = dayNames[dayNum];
              } else if (typeof (item.dayOfWeek ?? item.dayName) === "string") {
                dayOfWeek = item.dayOfWeek ?? item.dayName ?? "Monday";
              }
            }

            // Class type normalization
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
              isUpperWeek:
                typeof item.isUpperWeek === "boolean"
                  ? item.isUpperWeek
                  : undefined,
            };
          },
        );

        setScheduleEntries(entries);
      } catch {
        setScheduleEntries([]);
        setCurrentWeekIsUpper(null);
        setScheduleTodayLabel("");
      }
    };

    fetchSchedule();
  }, [selectedGroup, groups, rooms]);

  return (
    <div className="space-y-6">
      <div>
        <h1>Cədvəlin İdarəetməsi</h1>
        <p className="text-muted-foreground">
          Bütün kurslar və qruplar üçün akademik cədvəlləri idarə edin
        </p>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>
                  {selectedGroup || "..."} üçün həftəlik cədvəl
                </CardTitle>
                <CardDescription>
                  Həftənin gününə görə təşkil edilmiş cədvələ baxın
                </CardDescription>
                <div className="mt-2 flex items-center gap-2">
                  <Badge
                    variant={currentWeekIsUpper ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {currentWeekIsUpper === null
                      ? "Həftə: Naməlum"
                      : currentWeekIsUpper
                        ? "Həftə: Yuxarı"
                        : "Həftə: Aşağı"}
                  </Badge>
                  {scheduleTodayLabel ? (
                    <span className="text-xs text-muted-foreground">
                      Bu gün: {scheduleTodayLabel}
                    </span>
                  ) : null}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="group-select" className="text-sm">
                  Qrup:
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
                          if (!groupCode || groupCode.trim() === "") {
                            return null;
                          }
                          return (
                            <SelectItem key={groupId} value={groupCode}>
                              {groupCode}
                            </SelectItem>
                          );
                        })
                        .filter(Boolean)
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {dayKeys.map((dayKey) => (
                <Card
                  key={dayKey}
                  className={
                    dayKey === todayKey ? "border-primary bg-primary/5" : ""
                  }
                >
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center justify-between">
                      {dayLabel[dayKey]}
                      {dayKey === todayKey ? (
                        <Badge variant="default" className="text-xs">
                          Bu gün
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          {getEntriesForDay(dayKey).length}
                        </Badge>
                      )}
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="space-y-2">
                    {getEntriesForDay(dayKey).length === 0 ? (
                      <p className="text-sm text-muted-foreground py-4 text-center">
                        Dərs yoxdur.
                      </p>
                    ) : (
                      getEntriesForDay(dayKey).map((entry) => (
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
