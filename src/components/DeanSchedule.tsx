import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Plus, Pencil, Trash2, Calendar, Clock, MapPin, Search, Users2, User } from "lucide-react";
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { toast } from "sonner";
import { Badge } from "./ui/badge";

// Import API helpers to retrieve rooms, groups and taught subjects
import {listRooms, listGroups, listTaughtSubjects, toArray} from "../api";

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

// Remove mock data.  Course, room and group lists will be fetched
// dynamically from the backend.  See useEffect below for the
// loading logic.

const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const mockScheduleEntries: ScheduleEntry[] = [
  {
    id: 1,
    courseId: 1,
    courseName: "Introduction to Programming",
    courseCode: "CS-101",
    teacherName: "Dr. John Smith",
    roomId: 1,
    roomName: "A-101",
    groupCode: "TK-101",
    dayOfWeek: "Monday",
    startTime: "09:00",
    endTime: "10:30",
    type: "lecture"
  },
  {
    id: 2,
    courseId: 1,
    courseName: "Introduction to Programming",
    courseCode: "CS-101",
    teacherName: "Dr. John Smith",
    roomId: 1,
    roomName: "A-101",
    groupCode: "TK-101",
    dayOfWeek: "Wednesday",
    startTime: "09:00",
    endTime: "10:30",
    type: "lecture"
  },
  {
    id: 3,
    courseId: 2,
    courseName: "Data Structures",
    courseCode: "CS-201",
    teacherName: "Dr. Michael Brown",
    roomId: 2,
    roomName: "B-205",
    groupCode: "TK-102",
    dayOfWeek: "Tuesday",
    startTime: "11:00",
    endTime: "12:30",
    type: "lecture"
  },
  {
    id: 4,
    courseId: 3,
    courseName: "Calculus I",
    courseCode: "MATH-101",
    teacherName: "Prof. Sarah Johnson",
    roomId: 3,
    roomName: "C-301",
    groupCode: "TK-103",
    dayOfWeek: "Monday",
    startTime: "14:00",
    endTime: "15:30",
    type: "lecture"
  },
  {
    id: 5,
    courseId: 2,
    courseName: "Data Structures",
    courseCode: "CS-201",
    teacherName: "Dr. Michael Brown",
    roomId: 2,
    roomName: "B-205",
    groupCode: "TK-102",
    dayOfWeek: "Thursday",
    startTime: "11:00",
    endTime: "12:30",
    type: "lecture"
  },
];

export function DeanSchedule() {
  // Schedule entries remain local.  They are initialised with a few
  // demo entries.  In a full implementation these would be loaded
  // from the backend when such endpoints exist.
  const [scheduleEntries, setScheduleEntries] = useState<ScheduleEntry[]>(mockScheduleEntries);

  // Dynamic lists for courses, rooms and groups loaded from the API.
  const [courses, setCourses] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [scheduleForm, setScheduleForm] = useState<Partial<ScheduleEntry>>({});
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
  const [editingScheduleId, setEditingScheduleId] = useState<number | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(1);
  const [selectedGroup, setSelectedGroup] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [viewMode, setViewMode] = useState<"list" | "grid">("grid");

  // Get today's day of week
  const today = new Date().getDay(); // 0 = Sunday, 1 = Monday, etc.
  const todayName = daysOfWeek[(today + 6) % 7]; // Adjust so Monday = 0

  // On mount, fetch lists of courses, rooms and groups from the backend.
  useEffect(() => {
    const fetchLists = async () => {
      try {
        const [roomsResp, groupsResp, coursesResp] = await Promise.all([
          listRooms(1, 100),
          listGroups(1, 100),
          listTaughtSubjects(1, 100),
        ]);
        const roomItems = toArray(roomsResp, ["items", "rooms"]).map((r: any) => ({
          id: r.id,
          name: r.roomName ?? r.name ?? "",
        }));
        const groupItems = toArray(groupsResp, ["items", "groups"]).map((g: any) => ({
          id: g.id,
          code: g.groupCode ?? g.code ?? "",
          year: g.year ?? g.yearOfAdmission ?? 0,
        }));
        const courseItems = toArray(coursesResp, ["items", "courses", "subjects", "taughtSubjects"]).map((c: any) => {
          const teacher = c.teacher ?? {};
          const group = c.group ?? {};
          return {
            id: c.id,
            code: c.code ?? c.title ?? "",
            title: c.title ?? c.name ?? "",
            teacherName: c.teacherName ?? `${teacher.name ?? ""} ${teacher.surname ?? ""}`.trim(),
            groupCode: c.groupCode ?? group.groupCode ?? "",
            type: c.type ?? "lecture",
          };
        });
        setRooms(roomItems);
        setGroups(groupItems);
        setCourses(courseItems);
        // Set initial selected group to first group for the selected year
        const initialGroup = groupItems.find((g) => g.year === selectedYear);
        setSelectedGroup(initialGroup ? initialGroup.code : "");
      } catch (err) {
        console.error(err);
      }
    };
    fetchLists();
  }, []);

  const handleAddSchedule = () => {
    setScheduleForm({});
    setEditingScheduleId(null);
    setIsScheduleDialogOpen(true);
  };

  const handleEditSchedule = (entry: ScheduleEntry) => {
    setScheduleForm(entry);
    setEditingScheduleId(entry.id);
    setIsScheduleDialogOpen(true);
  };

  const handleSaveSchedule = () => {
    // Validate form
    if (!scheduleForm.courseId || !scheduleForm.roomId || 
        !scheduleForm.dayOfWeek || !scheduleForm.startTime || !scheduleForm.endTime) {
      toast.error("Please fill in all required fields");
      return;
    }

    // Get course and room details
    const course = courses.find(c => c.id === scheduleForm.courseId);
    const room = rooms.find(r => r.id === scheduleForm.roomId);

    if (!course || !room) {
      toast.error("Invalid selection");
      return;
    }

    // Check for time conflicts
    const conflicts = checkForConflicts(scheduleForm);
    if (conflicts.length > 0) {
      const conflictMessages = conflicts.map(c => c.type).join(", ");
      toast.error(`Scheduling conflict detected: ${conflictMessages}`);
      return;
    }

    const completeEntry: ScheduleEntry = {
      id: editingScheduleId || Math.max(...scheduleEntries.map(s => s.id), 0) + 1,
      courseId: scheduleForm.courseId,
      courseName: course.title,
      courseCode: course.code,
      teacherName: course.teacherName,
      roomId: scheduleForm.roomId,
      roomName: room.name,
      groupCode: course.groupCode,
      dayOfWeek: scheduleForm.dayOfWeek!,
      startTime: scheduleForm.startTime!,
      endTime: scheduleForm.endTime!,
      type: course.type,
    };

    if (editingScheduleId) {
      setScheduleEntries(scheduleEntries.map(s => s.id === editingScheduleId ? completeEntry : s));
      toast.success("Schedule updated successfully");
    } else {
      setScheduleEntries([...scheduleEntries, completeEntry]);
      toast.success("Schedule entry added successfully");
    }
    setIsScheduleDialogOpen(false);
    setScheduleForm({});
  };

  const checkForConflicts = (newEntry: Partial<ScheduleEntry>) => {
    const conflicts: { type: string; entry: ScheduleEntry }[] = [];
    
    // Get existing entries for the same day (excluding the current entry if editing)
    const sameDayEntries = scheduleEntries.filter(
      entry => entry.dayOfWeek === newEntry.dayOfWeek && entry.id !== editingScheduleId
    );

    sameDayEntries.forEach(entry => {
      // Check if times overlap
      if (newEntry.startTime && newEntry.endTime && timesOverlap(
        newEntry.startTime,
        newEntry.endTime,
        entry.startTime,
        entry.endTime
      )) {
        // Check for room conflict
        if (entry.roomId === newEntry.roomId) {
          conflicts.push({ type: "Room already booked", entry });
        }
        // Check for teacher and group conflicts using the dynamic course list
        const newCourse = courses.find(c => c.id === newEntry.courseId);
        if (newCourse && entry.teacherName === newCourse.teacherName) {
          conflicts.push({ type: "Teacher has another class", entry });
        }
        if (newCourse && entry.groupCode === newCourse.groupCode) {
          conflicts.push({ type: "Group has another class", entry });
        }
      }
    });

    return conflicts;
  };

  const timesOverlap = (start1: string, end1: string, start2: string, end2: string) => {
    return start1 < end2 && end1 > start2;
  };

  const handleDeleteSchedule = (id: number) => {
    setScheduleEntries(scheduleEntries.filter(s => s.id !== id));
    toast.success("Schedule entry deleted successfully");
  };

  const getEntriesForDay = (day: string) => {
    return scheduleEntries
      .filter(entry => entry.dayOfWeek === day && entry.groupCode === selectedGroup)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const filteredEntries = scheduleEntries.filter(entry => {
    const matchesSearch = searchQuery === "" || 
      entry.courseName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.courseCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.teacherName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.roomName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.groupCode.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  // Filter groups for the selected year
  const groupsForYear = groups.filter(g => g.year === selectedYear);

  return (
    <div className="space-y-6">
      <div>
        <h1>Schedule Management</h1>
        <p className="text-muted-foreground">Manage academic schedules for all courses and groups</p>
      </div>

      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "list" | "grid")} className="w-full">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="grid">Weekly Grid View</TabsTrigger>
            <TabsTrigger value="list">List View</TabsTrigger>
          </TabsList>
          <Dialog open={isScheduleDialogOpen} onOpenChange={setIsScheduleDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleAddSchedule}>
                <Plus className="h-4 w-4 mr-2" />
                Add Schedule Entry
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingScheduleId ? "Edit Schedule Entry" : "Add New Schedule Entry"}</DialogTitle>
                <DialogDescription>
                  {editingScheduleId ? "Update schedule entry information" : "Enter details for the new schedule entry"}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="schedule-course">Course *</Label>
                    <Select
                      value={scheduleForm.courseId?.toString() || ""}
                      onValueChange={(value) => setScheduleForm({ ...scheduleForm, courseId: parseInt(value) })}
                    >
                      <SelectTrigger id="schedule-course">
                        <SelectValue placeholder="Select course" />
                      </SelectTrigger>
                      <SelectContent>
                        {courses.map((course) => (
                          <SelectItem key={course.id} value={course.id.toString()}>
                            {course.code} - {course.title} ({course.groupCode}, {course.teacherName})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="schedule-room">Room *</Label>
                    <Select
                      value={scheduleForm.roomId?.toString() || ""}
                      onValueChange={(value) => setScheduleForm({ ...scheduleForm, roomId: parseInt(value) })}
                    >
                      <SelectTrigger id="schedule-room">
                        <SelectValue placeholder="Select room" />
                      </SelectTrigger>
                      <SelectContent>
                        {rooms.map((room) => (
                          <SelectItem key={room.id} value={room.id.toString()}>
                            {room.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="schedule-day">Day of Week *</Label>
                    <Select
                      value={scheduleForm.dayOfWeek || ""}
                      onValueChange={(value) => setScheduleForm({ ...scheduleForm, dayOfWeek: value })}
                    >
                      <SelectTrigger id="schedule-day">
                        <SelectValue placeholder="Select day" />
                      </SelectTrigger>
                      <SelectContent>
                        {daysOfWeek.map((day) => (
                          <SelectItem key={day} value={day}>
                            {day}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="schedule-start">Start Time *</Label>
                    <Input
                      id="schedule-start"
                      type="time"
                      value={scheduleForm.startTime || ""}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, startTime: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="schedule-end">End Time *</Label>
                    <Input
                      id="schedule-end"
                      type="time"
                      value={scheduleForm.endTime || ""}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, endTime: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsScheduleDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleSaveSchedule}>Save</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Grid View */}
        <TabsContent value="grid" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Weekly Schedule for {selectedGroup}</CardTitle>
                  <CardDescription>Year {selectedYear} - View schedule organized by day of week</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="year-select" className="text-sm">Year:</Label>
                  <Select
                    value={selectedYear.toString()}
                    onValueChange={(value) => {
                      const year = parseInt(value);
                      setSelectedYear(year);
                      const firstGroupForYear = groups.filter((g) => g.year === year)[0];
                      if (firstGroupForYear) {
                        setSelectedGroup(firstGroupForYear.code);
                      }
                    }}
                  >
                    <SelectTrigger id="year-select" className="w-[100px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Year 1</SelectItem>
                      <SelectItem value="2">Year 2</SelectItem>
                      <SelectItem value="3">Year 3</SelectItem>
                      <SelectItem value="4">Year 4</SelectItem>
                    </SelectContent>
                  </Select>
                  <Label htmlFor="group-select" className="text-sm ml-2">Group:</Label>
                  <Select
                    value={selectedGroup}
                    onValueChange={(value) => setSelectedGroup(value)}
                  >
                    <SelectTrigger id="group-select" className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {groupsForYear.map(group => (
                        <SelectItem key={group.id} value={group.code}>{group.code}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {daysOfWeek.map((day) => (
                  <Card key={day} className={day === todayName ? "border-primary bg-primary/5" : ""}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center justify-between">
                        {day}
                        {day === todayName && <Badge variant="default" className="text-xs">Today</Badge>}
                        {day !== todayName && <Badge variant="secondary">{getEntriesForDay(day).length}</Badge>}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {getEntriesForDay(day).length === 0 ? (
                        <p className="text-sm text-muted-foreground py-4 text-center">No classes scheduled</p>
                      ) : (
                        getEntriesForDay(day).map((entry) => (
                          <div
                            key={entry.id}
                            className="p-3 rounded-lg border relative pb-10"
                          >
                            <div className="space-y-2 pr-20">
                              <div className="flex items-start gap-2">
                                <span className="font-medium overflow-hidden" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{entry.courseName}</span>
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
                                  <span>{formatTime(entry.startTime)} - {formatTime(entry.endTime)}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3 shrink-0" />
                                  <span>{entry.roomName}</span>
                                </div>
                              </div>
                              <Badge variant="secondary" className="absolute top-3 right-3 text-xs">{entry.type === "lecture" ? "Lecture" : entry.type === "seminar" ? "Seminar" : "Lab"}</Badge>
                              <Badge variant="outline" className="absolute bottom-3 left-3 text-xs">{entry.courseCode}</Badge>
                              <div className="absolute bottom-3 right-3 flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditSchedule(entry)}
                                  className="h-7 w-7 p-0"
                                >
                                  <Pencil className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteSchedule(entry.id)}
                                  className="h-7 w-7 p-0"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
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
        </TabsContent>

        {/* List View */}
        <TabsContent value="list" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>All Schedule Entries</CardTitle>
                  <CardDescription>Complete list of all schedule entries</CardDescription>
                </div>
                <div className="relative w-64">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search schedules..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Course</TableHead>
                    <TableHead>Teacher</TableHead>
                    <TableHead>Room</TableHead>
                    <TableHead>Group</TableHead>
                    <TableHead>Day</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEntries
                    .sort((a, b) => {
                      const dayCompare = daysOfWeek.indexOf(a.dayOfWeek) - daysOfWeek.indexOf(b.dayOfWeek);
                      if (dayCompare !== 0) return dayCompare;
                      return a.startTime.localeCompare(b.startTime);
                    })
                    .map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{entry.courseCode}</p>
                            <p className="text-sm text-muted-foreground">{entry.courseName}</p>
                          </div>
                        </TableCell>
                        <TableCell>{entry.teacherName}</TableCell>
                        <TableCell>{entry.roomName}</TableCell>
                        <TableCell>{entry.groupCode}</TableCell>
                        <TableCell>{entry.dayOfWeek}</TableCell>
                        <TableCell>
                          {formatTime(entry.startTime)} - {formatTime(entry.endTime)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm" onClick={() => handleEditSchedule(entry)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDeleteSchedule(entry.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
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