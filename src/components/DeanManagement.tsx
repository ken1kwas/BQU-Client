import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import {
  Plus,
  Pencil,
  Trash2,
  Building2,
  Users,
  BookOpen,
  Calendar,
  DoorOpen,
  Upload,
  FileSpreadsheet,
  Info,
  ChevronLeft,
  ChevronRight,
  UserCircle,
  Eye,
} from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Textarea } from "./ui/textarea";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { Badge } from "./ui/badge";

// API helpers for interacting with the backend.  These functions
// provide list, CRUD and import operations for rooms, teachers,
// groups, students and courses.  See src/api.ts for details.
import {
  listRooms,
  listTeachers,
  listGroups,
  listStudents,
  listTaughtSubjects,
  listDepartments,
  listSpecializations,
  createRoom,
  updateRoom,
  deleteRoom,
  updateTeacher,
  deleteTeacher,
  importTeachersExcel,
  createGroup,
  updateGroup,
  deleteGroup,
  importStudentsExcel,
  searchStudents,
  filterStudents,
  toArray,
  createTaughtSubject,
  updateTaughtSubject,
  deleteTaughtSubject,
  ensureHHMMSS,
  uploadStudentsExcel,
} from "../api";

interface Room {
  id: number;
  name: string;
  building: string;
  capacity: number;
  type: string;
}

interface Teacher {
  id: number;
  name: string;
  email: string;
  department: string;
  phone: string;
}

interface Course {
  id: number;
  code: string;
  title: string;
  credits: number;
  type: string;
  department: string;
  teacherId?: number;
  teacherName?: string;
  groupId?: number;
  groupCode?: string;
  studentCount?: number;
  hasSyllabus?: boolean;
}

interface Group {
  id: number;
  code: string;
  department: string;
  departmentId?: string;
  year: number;
  studentCount: number;
  specializationId?: string;
  specializationName?: string;
  educationLanguage?: number;
  educationLevel?: number;
}

interface Student {
  id: number;
  studentId: string;
  name: string;
  email: string;
  groupId: number;
  groupCode: string;
  year: number;
  specialization: string;
  dateOfBirth: string;
  phoneNumber: string;
  address: string;
  language: string;
}

// Helpers to map backend DTOs into the UI-friendly shapes defined
// above.  The backend responses contain more fields or different
// property names; these functions normalise the data.  Unknown
// values are defaulted to reasonable fallbacks.
const mapRoomFromApi = (r: any): Room => {
  const typeCode = r.roomType ?? r.type;
  let type: string;
  if (typeof typeCode === "number") {
    // Common mapping: 0 = Lecture Hall, 1 = Classroom, anything else
    // becomes Other.
    type =
      typeCode === 0 ? "Lecture Hall" : typeCode === 1 ? "Classroom" : "Other";
  } else if (typeof typeCode === "string") {
    // Use the provided string directly when available
    type = typeCode;
  } else {
    type = "";
  }
  return {
    id: r.id,
    name: r.roomName ?? r.name ?? "",
    building: r.building ?? "",
    capacity: r.capacity ?? 0,
    type,
  };
};

const mapTeacherFromApi = (t: any): Teacher => {
  const firstName = t.name ?? t.firstName ?? "";
  const surname = t.surname ?? t.lastName ?? "";
  const fullName =
    `${firstName} ${surname}`.trim() || t.fullName || t.userName || "";
  return {
    id: t.id,
    name: fullName,
    email: t.email ?? "",
    department: t.department?.name ?? t.departmentName ?? "",
    phone: t.phone ?? t.phoneNumber ?? "",
  };
};

const mapGroupFromApi = (g: any): Group => {
  const specialization = g.specialization ?? {};
  const specializationId =
    g.specializationId ?? specialization.id ?? specialization.Id;
  const department = g.department ?? {};
  const departmentId = g.departmentId ?? department.id ?? department.Id;
  return {
    id:
      g.id ??
      g.groupId ??
      g.groupID ??
      g.Id ??
      g.code ??
      g.groupCode ??
      `${String(departmentId ?? "dept")}-${String(g.year ?? "year")}`,
    code: g.groupCode ?? g.code ?? "",
    department: department.name ?? g.department?.name ?? g.departmentName ?? "",
    departmentId:
      departmentId !== undefined && departmentId !== null
        ? String(departmentId)
        : undefined,
    year: g.year ?? g.yearOfAdmission ?? 0,
    studentCount: g.studentCount ?? 0,
    specializationId:
      specializationId !== undefined && specializationId !== null
        ? String(specializationId)
        : undefined,
    specializationName: specialization.name ?? specialization.Name ?? "",
    educationLanguage:
      typeof g.educationLanguage === "number" ? g.educationLanguage : undefined,
    educationLevel:
      typeof g.educationLevel === "number" ? g.educationLevel : undefined,
  };
};

const mapStudentFromApi = (s: any): Student => {
  return {
    id: s.id,
    studentId: s.studentId ?? "",
    name: s.fullName ?? "",
    email: s.email ?? "",
    groupId: s.groupId ?? 0,
    groupCode: s.groupName ?? "",
    year: s.year ?? 0,
    specialization: s.speciality ?? "",
    dateOfBirth: s.dateOfBirth ?? "",
    phoneNumber: s.phoneNumber ?? "",
    address: s.address ?? "",
    language: s.language ?? "",
  };
};

const mapCourseFromApi = (c: any): Course => {
  const teacher = c.teacher ?? {};
  const group = c.group ?? {};
  const dept = c.department ?? {};
  return {
    id: c.id,
    code: c.code ?? c.title ?? "",
    title: c.title ?? c.name ?? "",
    credits: c.credits ?? 0,
    type: c.type ?? "Lecture",
    department: dept.name ?? dept.departmentName ?? "",
    teacherId: c.teacherId ?? teacher.id,
    teacherName:
      c.teacherName ?? `${teacher.name ?? ""} ${teacher.surname ?? ""}`.trim(),
    groupId: c.groupId ?? group.id,
    groupCode: c.groupCode ?? group.groupCode ?? "",
    // studentCount may not be provided by the backend; default to 0
    studentCount: c.studentCount ?? 0,
    hasSyllabus: Boolean(c.syllabusId),
  };
};

// The mock data used in the original design has been removed.  Data
// will now be fetched from the backend via the API helpers.  See
// useEffect below for the loading logic.

export function DeanManagement() {
  // Lists are initially empty and populated from the backend.  If
  // requests fail they remain empty arrays.
  const [rooms, setRooms] = useState<Room[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [specializations, setSpecializations] = useState<any[]>([]);

  // Room form state
  const [roomForm, setRoomForm] = useState<Partial<Room>>({});
  const [isRoomDialogOpen, setIsRoomDialogOpen] = useState(false);
  const [editingRoomId, setEditingRoomId] = useState<number | null>(null);

  // Teacher form state
  const [teacherForm, setTeacherForm] = useState<Partial<Teacher>>({});
  const [isTeacherDialogOpen, setIsTeacherDialogOpen] = useState(false);
  const [editingTeacherId, setEditingTeacherId] = useState<number | null>(null);
  const [isTeacherUploadDialogOpen, setIsTeacherUploadDialogOpen] =
    useState(false);
  const [isTeacherFormatInfoOpen, setIsTeacherFormatInfoOpen] = useState(false);

  // Course form state
  const [courseForm, setCourseForm] = useState<
    Partial<
      Course & {
        departmentId?: string;
        hours?: number;
        year?: number;
        semester?: number;
        classTimes?: any[];
      }
    >
  >({});
  const [isCourseDialogOpen, setIsCourseDialogOpen] = useState(false);
  const [editingCourseId, setEditingCourseId] = useState<number | null>(null);

  // Group form state
  const [groupForm, setGroupForm] = useState<Partial<Group>>({});
  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<number | null>(null);

  // Student form state
  const [studentForm, setStudentForm] = useState<Partial<Student>>({});
  const [isStudentDialogOpen, setIsStudentDialogOpen] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState<number | null>(null);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isFormatInfoOpen, setIsFormatInfoOpen] = useState(false);

  // Pagination state for students
  const [currentPage, setCurrentPage] = useState(1);
  const studentsPerPage = 10;

  // Filter and search state for students
  const [studentSearchQuery, setStudentSearchQuery] = useState("");
  const [studentGroupFilter, setStudentGroupFilter] = useState<string>("all");
  const [studentYearFilter, setStudentYearFilter] = useState<string>("all");

  // ---------------------------------------------------------------------------
  // Data loading and filtering
  //
  // On mount we request all necessary data from the backend.  The API
  // returns paginated results; for simplicity we request up to 100
  // items per list.  If any request fails the corresponding list
  // remains empty.
  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [
          roomsResp,
          teachersResp,
          groupsResp,
          studentsResp,
          coursesResp,
          deptsResp,
          specsResp,
        ] = await Promise.all([
          listRooms(1, 100),
          listTeachers(1, 100),
          listGroups(1, 100),
          listStudents(1, 100),
          listTaughtSubjects(1, 100),
          listDepartments(1, 100),
          listSpecializations(1, 100),
        ]);
        setRooms(toArray(roomsResp).map(mapRoomFromApi));
        setTeachers(toArray(teachersResp).map(mapTeacherFromApi));
        setGroups(toArray(groupsResp).map(mapGroupFromApi));
        setStudents(toArray(studentsResp).map(mapStudentFromApi));
        setCourses(toArray(coursesResp).map(mapCourseFromApi));
        setDepartments(toArray(deptsResp));
        setSpecializations(toArray(specsResp));
      } catch (err) {
        console.error(err);
      }
    };
    fetchAll();
  }, []);

  // When the student search or filter options change re-fetch the
  // students list accordingly.  Search takes precedence over filtering.
  useEffect(() => {
    const fetchFilteredStudents = async () => {
      try {
        if (studentSearchQuery) {
          const resp = await searchStudents(studentSearchQuery);
          setStudents(toArray(resp).map(mapStudentFromApi));
        } else if (
          studentGroupFilter !== "all" ||
          studentYearFilter !== "all"
        ) {
          const groupObj = groups.find((g) => g.code === studentGroupFilter);
          const groupId =
            studentGroupFilter !== "all" ? groupObj?.id.toString() : undefined;
          const year =
            studentYearFilter !== "all"
              ? parseInt(studentYearFilter, 10)
              : undefined;
          const resp = await filterStudents(groupId, year);
          setStudents(toArray(resp).map(mapStudentFromApi));
        } else {
          const resp = await listStudents(1, 100);
          setStudents(toArray(resp).map(mapStudentFromApi));
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchFilteredStudents();
    // groups is included as a dependency so that filtering by group
    // updates correctly when the groups list changes.
  }, [studentSearchQuery, studentGroupFilter, studentYearFilter, groups]);

  // Room handlers
  const handleAddRoom = () => {
    setRoomForm({});
    setEditingRoomId(null);
    setIsRoomDialogOpen(true);
  };

  const handleEditRoom = (room: Room) => {
    setRoomForm(room);
    setEditingRoomId(room.id);
    setIsRoomDialogOpen(true);
  };

  const handleSaveRoom = async () => {
    try {
      // Map the UI type back to the numeric code expected by the API.
      const getRoomTypeCode = (type: string | undefined) => {
        if (!type) return 0;
        const t = type.toLowerCase();
        if (t.includes("lecture")) return 0;
        if (t.includes("class")) return 1;
        return 2;
      };
      if (editingRoomId) {
        // Updating an existing room
        await updateRoom(editingRoomId.toString(), {
          name: roomForm.name ?? "",
          capacity: Number(roomForm.capacity ?? 0),
        });
        toast.success("Room updated successfully");
      } else {
        // Creating a new room
        await createRoom({
          roomName: roomForm.name ?? "",
          capacity: Number(roomForm.capacity ?? 0),
        });
        toast.success("Room added successfully");
      }
      // Refresh the list from the backend
      const resp = await listRooms(1, 100);
      setRooms(toArray(resp).map(mapRoomFromApi));
    } catch (error: any) {
      toast.error(error?.message ?? "Failed to save room");
    } finally {
      setIsRoomDialogOpen(false);
      setRoomForm({});
      setEditingRoomId(null);
    }
  };

  const handleDeleteRoom = async (id: number) => {
    try {
      await deleteRoom(id.toString());
      toast.success("Room deleted successfully");
      setRooms((prev) => prev.filter((r) => r.id !== id));
    } catch (error: any) {
      toast.error(error?.message ?? "Failed to delete room");
    }
  };

  // Teacher handlers
  const handleAddTeacher = () => {
    setTeacherForm({});
    setEditingTeacherId(null);
    setIsTeacherDialogOpen(true);
  };

  const handleEditTeacher = (teacher: Teacher) => {
    setTeacherForm(teacher);
    setEditingTeacherId(teacher.id);
    setIsTeacherDialogOpen(true);
  };

  const handleDeleteTeacher = async (id: number) => {
    try {
      await deleteTeacher(id.toString());
      toast.success("Teacher deleted successfully");
      setTeachers((prev) => prev.filter((t) => t.id !== id));
    } catch (error: any) {
      toast.error(error?.message ?? "Failed to delete teacher");
    }
  };

  // Course handlers
  const handleAddCourse = () => {
    setCourseForm({});
    setEditingCourseId(null);
    setIsCourseDialogOpen(true);
  };

  const handleEditCourse = (course: Course) => {
    const dept = departments.find((d) => d.name === course.department);
    setCourseForm({
      ...course,
      departmentId: dept?.id?.toString(),
    });
    setEditingCourseId(course.id);
    setIsCourseDialogOpen(true);
  };

  const handleSaveCourse = async () => {
    try {
      const isEdit = Boolean(editingCourseId);

      if (
        !courseForm.code ||
        !courseForm.title ||
        !courseForm.departmentId ||
        !courseForm.teacherId ||
        !courseForm.groupId
      ) {
        toast.error("Fill in code/title/department/teacher/group");
        return;
      }

      if (isEdit) {
        await updateTaughtSubject(String(editingCourseId), {
          code: courseForm.code,
          title: courseForm.title,
          credits: Number(courseForm.credits ?? 0),
          departmentId: String(courseForm.departmentId),
          teacherId: String(courseForm.teacherId),
          groupId: String(courseForm.groupId),
        });
        toast.success("Course updated successfully");
      } else {
        // CreateTaughtSubjectRequest требует hours/classTimes/year/semester
        await createTaughtSubject({
          code: courseForm.code,
          title: courseForm.title,
          departmentId: String(courseForm.departmentId),
          teacherId: String(courseForm.teacherId),
          groupId: String(courseForm.groupId),
          credits: Number(courseForm.credits ?? 0),
          hours: Number(courseForm.hours ?? 0),
          year: Number(courseForm.year ?? 1),
          semester: Number(courseForm.semester ?? 1),
          classTimes:
            courseForm.classTimes?.map((ct: any) => ({
              start: ensureHHMMSS(ct.start),
              end: ensureHHMMSS(ct.end),
              day: Number(ct.day),
              room: String(ct.room),
              frequency: Number(ct.frequency),
            })) ?? [],
        });
        toast.success("Course added successfully");
      }

      const resp = await listTaughtSubjects(1, 100);
      setCourses(toArray(resp).map(mapCourseFromApi));
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to save course");
    } finally {
      setIsCourseDialogOpen(false);
      setCourseForm({});
      setEditingCourseId(null);
    }
  };

  const handleDeleteCourse = async (id: number) => {
    try {
      await deleteTaughtSubject(String(id));
      toast.success("Course deleted successfully");
      setCourses((prev) => prev.filter((c: Course) => c.id !== id));
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to delete course");
    }
  };

  // Group handlers
  const handleAddGroup = () => {
    setGroupForm({});
    setEditingGroupId(null);
    setIsGroupDialogOpen(true);
  };

  const handleEditGroup = (group: Group) => {
    setGroupForm(group);
    setEditingGroupId(group.id);
    setIsGroupDialogOpen(true);
  };

  const handleSaveGroup = async () => {
    try {
      // When editing an existing group call the API to update it.
      // The backend expects a groupCode, specializationId and year.
      // We need to handle specializationId properly
      if (
        !groupForm.code ||
        !groupForm.specializationId ||
        groupForm.year === undefined
      ) {
        toast.error("Fill in code/specialization/year");
        return;
      }

      const basePayload = {
        groupCode: groupForm.code,
        specializationId: groupForm.specializationId,
        year: Number(groupForm.year),
      };

      if (editingGroupId) {
        await updateGroup(editingGroupId.toString(), basePayload);
        toast.success("Group updated successfully");
      } else {
        if (
          groupForm.educationLanguage === undefined ||
          groupForm.educationLevel === undefined
        ) {
          toast.error("Specify education language and level for new group");
          return;
        }
        await createGroup({
          ...basePayload,
          educationLanguage: Number(groupForm.educationLanguage),
          educationLevel: Number(groupForm.educationLevel),
        });
        toast.success("Group added successfully");
      }
      // refresh groups from backend
      const resp = await listGroups(1, 100);
      setGroups(toArray(resp).map(mapGroupFromApi));
    } catch (error: any) {
      // If the API fails we still update local state so the UI remains responsive
      if (editingGroupId) {
        setGroups(
          groups.map((g) =>
            g.id === editingGroupId ? ({ ...g, ...groupForm } as Group) : g,
          ),
        );
        toast.error(error?.message ?? "Failed to update group");
      } else {
        const maxId =
          groups.length > 0 ? Math.max(...groups.map((g) => g.id)) : 0;
        const newGroup = { ...groupForm, id: maxId + 1 } as Group;
        setGroups([...groups, newGroup]);
        toast.error(error?.message ?? "Failed to create group");
      }
    } finally {
      setIsGroupDialogOpen(false);
      setGroupForm({});
      setEditingGroupId(null);
    }
  };

  const handleDeleteGroup = async (id: number) => {
    try {
      await deleteGroup(id.toString());
      toast.success("Group deleted successfully");
      setGroups((prev) => prev.filter((g) => g.id !== id));
    } catch (error: any) {
      // If API deletion fails we remove locally but show error
      setGroups((prev) => prev.filter((g) => g.id !== id));
      toast.error(error?.message ?? "Failed to delete group");
    }
  };

  // Student handlers
  const handleAddStudent = () => {
    setStudentForm({});
    setEditingStudentId(null);
    setIsStudentDialogOpen(true);
  };

  const handleEditStudent = (student: Student) => {
    setStudentForm(student);
    setEditingStudentId(student.id);
    setIsStudentDialogOpen(true);
  };

  const handleSaveStudent = () => {
    // Get group name if ID is provided
    const group = studentForm.groupId
      ? groups.find((g) => g.id === studentForm.groupId)
      : undefined;

    const completeForm = {
      ...studentForm,
      groupCode: group?.code,
    };

    if (editingStudentId) {
      setStudents(
        students.map((s) =>
          s.id === editingStudentId
            ? ({ ...s, ...completeForm } as Student)
            : s,
        ),
      );
      toast.success("Student updated successfully");
    } else {
      const newStudent = {
        ...completeForm,
        id: Math.max(...students.map((s) => s.id), 0) + 1,
      } as Student;
      setStudents([...students, newStudent]);
      toast.success("Student added successfully");
    }
    setIsStudentDialogOpen(false);
    setStudentForm({});
  };

  const handleDeleteStudent = (id: number) => {
    setStudents(students.filter((s) => s.id !== id));
    toast.success("Student deleted successfully");
  };

  // Excel upload handler
  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const result = await uploadStudentsExcel(file);

      if (result instanceof Blob) {
        const url = URL.createObjectURL(result);
        const link = document.createElement("a");
        link.href = url;
        link.download = `students-import-result-${Date.now()}.xlsx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast.success("Import report downloaded");
      } else {
        toast.success("File uploaded successfully");
      }

      // refresh students
      const resp = await listStudents(1, 100);
      setStudents(toArray(resp).map(mapStudentFromApi));
      setIsUploadDialogOpen(false);
    } catch (error: any) {
      toast.error(error?.message ?? "Error importing file");
    }
  };

  const handleTeacherFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const result = await importTeachersExcel(file);
      if (result instanceof Blob) {
        const url = URL.createObjectURL(result);
        const link = document.createElement("a");
        link.href = url;
        link.download = `teachers-import-result-${Date.now()}.xlsx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast.success("Import report downloaded");
      } else {
        toast.success("File uploaded successfully");
      }
      const resp = await listTeachers(1, 100);
      setTeachers(toArray(resp).map(mapTeacherFromApi));
      setIsTeacherUploadDialogOpen(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to import teachers");
    }
  };

  const downloadTeacherTemplate = async () => {
    try {
      const resp = await fetch("/teacher-template.xlsx");
      if (!resp.ok) {
        throw new Error("Template file not found");
      }
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "teacher-template.xlsx";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Template downloaded successfully");
    } catch (error: any) {
      toast.error(error?.message ?? "Error downloading template");
    }
  };

  // Download template
  const downloadTemplate = async () => {
    try {
      const resp = await fetch("/students-template.xlsx");
      if (!resp.ok) {
        throw new Error("Template file not found");
      }
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "students-template.xlsx";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Template downloaded successfully");
    } catch (error: any) {
      toast.error(error?.message ?? "Error downloading template");
    }
  };

  // Students are already filtered by the backend based on the search
  // query and selected filters.  We simply return the list as is for
  // pagination below.
  const filteredStudents = students;

  // Calculate pagination values
  const totalPages = Math.ceil(filteredStudents.length / studentsPerPage);
  const startIndex = (currentPage - 1) * studentsPerPage;
  const endIndex = Math.min(
    currentPage * studentsPerPage,
    filteredStudents.length,
  );

  return (
    <div className="space-y-6">
      <div>
        <h1>System Management</h1>
        <p className="text-muted-foreground">
          Manage all system entities and resources
        </p>
      </div>

      <Tabs defaultValue="rooms" className="w-full">
        <TabsList>
          <TabsTrigger value="rooms">
            <DoorOpen className="h-4 w-4 mr-2" />
            Rooms
          </TabsTrigger>
          <TabsTrigger value="teachers">
            <Users className="h-4 w-4 mr-2" />
            Teachers
          </TabsTrigger>
          <TabsTrigger value="courses">
            <BookOpen className="h-4 w-4 mr-2" />
            Courses
          </TabsTrigger>
          <TabsTrigger value="groups">
            <Users className="h-4 w-4 mr-2" />
            Groups
          </TabsTrigger>
          <TabsTrigger value="students">
            <UserCircle className="h-4 w-4 mr-2" />
            Students
          </TabsTrigger>
        </TabsList>

        {/* Rooms Tab */}
        <TabsContent value="rooms" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Room Management</CardTitle>
                  <CardDescription>
                    Add, edit, or remove classroom and lecture hall information
                  </CardDescription>
                </div>
                <Dialog
                  open={isRoomDialogOpen}
                  onOpenChange={setIsRoomDialogOpen}
                >
                  <DialogTrigger asChild>
                    <Button onClick={handleAddRoom}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Room
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>
                        {editingRoomId ? "Edit Room" : "Add New Room"}
                      </DialogTitle>
                      <DialogDescription>
                        {editingRoomId
                          ? "Update room information"
                          : "Enter details for the new room"}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="room-name">Room Name</Label>
                        <Input
                          id="room-name"
                          placeholder="e.g., A-101"
                          value={roomForm.name || ""}
                          onChange={(e) =>
                            setRoomForm({ ...roomForm, name: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="room-building">Building</Label>
                        <Input
                          id="room-building"
                          placeholder="e.g., Building A"
                          value={roomForm.building || ""}
                          onChange={(e) =>
                            setRoomForm({
                              ...roomForm,
                              building: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="room-capacity">Capacity</Label>
                        <Input
                          id="room-capacity"
                          type="number"
                          placeholder="e.g., 30"
                          value={roomForm.capacity || ""}
                          onChange={(e) =>
                            setRoomForm({
                              ...roomForm,
                              capacity: parseInt(e.target.value) || 0,
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="room-type">Room Type</Label>
                        <Select
                          value={roomForm.type || ""}
                          onValueChange={(value: string) =>
                            setRoomForm({ ...roomForm, type: value })
                          }
                        >
                          <SelectTrigger id="room-type">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Lecture Hall">
                              Lecture Hall
                            </SelectItem>
                            <SelectItem value="Classroom">Classroom</SelectItem>
                            <SelectItem value="Laboratory">
                              Laboratory
                            </SelectItem>
                            <SelectItem value="Seminar Room">
                              Seminar Room
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setIsRoomDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button onClick={handleSaveRoom}>Save</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Room Name</TableHead>
                    <TableHead>Building</TableHead>
                    <TableHead>Capacity</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rooms.map((room) => (
                    <TableRow key={room.id}>
                      <TableCell className="font-medium">{room.name}</TableCell>
                      <TableCell>{room.building}</TableCell>
                      <TableCell>{room.capacity}</TableCell>
                      <TableCell>{room.type}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditRoom(room)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteRoom(room.id)}
                          >
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

        {/* Teachers Tab */}
        <TabsContent value="teachers" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Teacher Management</CardTitle>
                  <CardDescription>
                    Add, edit, or remove teacher information
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Dialog
                    open={isTeacherFormatInfoOpen}
                    onOpenChange={setIsTeacherFormatInfoOpen}
                  >
                    <DialogTrigger asChild>
                      <Button variant="outline">
                        <Info className="h-4 w-4 mr-2" />
                        Excel Format
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Teacher Excel Format</DialogTitle>
                        <DialogDescription>
                          Required columns for bulk teacher import
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <Alert>
                          <FileSpreadsheet className="h-4 w-4" />
                          <AlertTitle>Required Columns</AlertTitle>
                          <AlertDescription>
                            Provide the columns below in this exact order.
                          </AlertDescription>
                        </Alert>
                        <div className="space-y-2">
                          <div className="grid grid-cols-2 gap-2 p-2 bg-muted rounded">
                            <span className="font-medium">Name</span>
                            <span className="text-sm text-muted-foreground">
                              Abbas
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 p-2 bg-muted rounded">
                            <span className="font-medium">Surname</span>
                            <span className="text-sm text-muted-foreground">
                              Mehdiyev
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 p-2 bg-muted rounded">
                            <span className="font-medium">MiddleName</span>
                            <span className="text-sm text-muted-foreground">
                              Ali
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 p-2 bg-muted rounded">
                            <span className="font-medium">UserName</span>
                            <span className="text-sm text-muted-foreground">
                              K2L3MRW
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 p-2 bg-muted rounded">
                            <span className="font-medium">DepartmentName</span>
                            <span className="text-sm text-muted-foreground">
                              Department of Science
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 p-2 bg-muted rounded">
                            <span className="font-medium">Position</span>
                            <span className="text-sm text-muted-foreground">
                              1
                            </span>
                          </div>
                        </div>
                        <Alert>
                          <Info className="h-4 w-4" />
                          <AlertTitle>Important Notes</AlertTitle>
                          <AlertDescription>
                            <ul className="list-disc list-inside space-y-1 text-sm">
                              <li>The first row must contain column headers</li>
                              <li>
                                DepartmentName must reference an existing
                                department
                              </li>
                              <li>
                                Position should match the backend enum value
                              </li>
                              <li>Accepted formats: .xlsx or .xls</li>
                            </ul>
                          </AlertDescription>
                        </Alert>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          onClick={() => setIsTeacherFormatInfoOpen(false)}
                        >
                          Close
                        </Button>
                        <Button onClick={downloadTeacherTemplate}>
                          <FileSpreadsheet className="h-4 w-4 mr-2" />
                          Download Template
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                  <Dialog
                    open={isTeacherUploadDialogOpen}
                    onOpenChange={setIsTeacherUploadDialogOpen}
                  >
                    <DialogTrigger asChild>
                      <Button>
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Excel
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Upload Teachers from Excel</DialogTitle>
                        <DialogDescription>
                          Import multiple teachers via an Excel spreadsheet
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <Alert>
                          <Info className="h-4 w-4" />
                          <AlertTitle>Before uploading</AlertTitle>
                          <AlertDescription>
                            Ensure your file follows the required column order
                            or download the template first.
                          </AlertDescription>
                        </Alert>
                        <div className="space-y-2">
                          <Label htmlFor="teacher-file">
                            Select Excel File
                          </Label>
                          <Input
                            id="teacher-file"
                            type="file"
                            accept=".xlsx,.xls"
                            onChange={handleTeacherFileUpload}
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          onClick={() => setIsTeacherUploadDialogOpen(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teachers.map((teacher) => (
                    <TableRow key={teacher.id}>
                      <TableCell className="font-medium">
                        {teacher.name}
                      </TableCell>
                      <TableCell>{teacher.email}</TableCell>
                      <TableCell>{teacher.department}</TableCell>
                      <TableCell>{teacher.phone}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditTeacher(teacher)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteTeacher(teacher.id)}
                          >
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

        {/* Courses Tab */}
        <TabsContent value="courses" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Course Management</CardTitle>
                  <CardDescription>
                    Add, edit, or remove course information
                  </CardDescription>
                </div>
                <Dialog
                  open={isCourseDialogOpen}
                  onOpenChange={setIsCourseDialogOpen}
                >
                  <DialogTrigger asChild>
                    <Button onClick={handleAddCourse}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Course
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>
                        {editingCourseId ? "Edit Course" : "Add New Course"}
                      </DialogTitle>
                      <DialogDescription>
                        {editingCourseId
                          ? "Update course information"
                          : "Enter details for the new course"}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="course-code">Course Code</Label>
                        <Input
                          id="course-code"
                          placeholder="e.g., CS-101"
                          value={courseForm.code || ""}
                          onChange={(e) =>
                            setCourseForm({
                              ...courseForm,
                              code: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="course-title">Course Title</Label>
                        <Input
                          id="course-title"
                          placeholder="e.g., Introduction to Programming"
                          value={courseForm.title || ""}
                          onChange={(e) =>
                            setCourseForm({
                              ...courseForm,
                              title: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="course-credits">Credits</Label>
                        <Input
                          id="course-credits"
                          type="number"
                          placeholder="e.g., 3"
                          value={courseForm.credits || ""}
                          onChange={(e) =>
                            setCourseForm({
                              ...courseForm,
                              credits: parseInt(e.target.value) || 0,
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="course-type">Course Type</Label>
                        <Select
                          value={courseForm.type || ""}
                          onValueChange={(value: string) =>
                            setCourseForm({ ...courseForm, type: value })
                          }
                        >
                          <SelectTrigger id="course-type">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Lecture">Lecture</SelectItem>
                            <SelectItem value="Seminar">Seminar</SelectItem>
                            <SelectItem value="Laboratory">
                              Laboratory
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="course-department">Department</Label>
                        <Select
                          value={courseForm.departmentId || ""}
                          onValueChange={(value: string) => {
                            const dept = departments.find(
                              (d) => d.id.toString() === value,
                            );
                            setCourseForm({
                              ...courseForm,
                              departmentId: value,
                              department: dept?.name,
                            });
                          }}
                        >
                          <SelectTrigger id="course-department">
                            <SelectValue placeholder="Select department" />
                          </SelectTrigger>
                          <SelectContent>
                            {departments.map((dept) => (
                              <SelectItem
                                key={dept.id}
                                value={dept.id.toString()}
                              >
                                {dept.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="course-teacher">Teacher</Label>
                        <Select
                          value={courseForm.teacherId?.toString() || ""}
                          onValueChange={(value: string) =>
                            setCourseForm({
                              ...courseForm,
                              teacherId: parseInt(value),
                            })
                          }
                        >
                          <SelectTrigger id="course-teacher">
                            <SelectValue placeholder="Select teacher" />
                          </SelectTrigger>
                          <SelectContent>
                            {teachers.map((teacher) => (
                              <SelectItem
                                key={teacher.id}
                                value={teacher.id.toString()}
                              >
                                {teacher.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="course-group">Group</Label>
                        <Select
                          value={courseForm.groupId?.toString() || ""}
                          onValueChange={(value: string) =>
                            setCourseForm({
                              ...courseForm,
                              groupId: parseInt(value),
                            })
                          }
                        >
                          <SelectTrigger id="course-group">
                            <SelectValue placeholder="Select group" />
                          </SelectTrigger>
                          <SelectContent>
                            {groups.map((group) => (
                              <SelectItem
                                key={group.id}
                                value={group.id.toString()}
                              >
                                {group.code}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setIsCourseDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button onClick={handleSaveCourse}>Save</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Teacher</TableHead>
                    <TableHead>Group</TableHead>
                    <TableHead>Credits</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {courses.map((course) => (
                    <TableRow key={course.id}>
                      <TableCell className="font-medium">
                        {course.code}
                      </TableCell>
                      <TableCell>{course.title}</TableCell>
                      <TableCell>{course.teacherName || "-"}</TableCell>
                      <TableCell>{course.groupCode || "-"}</TableCell>
                      <TableCell>{course.credits}</TableCell>
                      <TableCell>{course.type}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditCourse(course)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteCourse(course.id)}
                          >
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

        {/* Groups Tab */}
        <TabsContent value="groups" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Group Management</CardTitle>
                  <CardDescription>
                    Add, edit, or remove student group information
                  </CardDescription>
                </div>
                <Dialog
                  open={isGroupDialogOpen}
                  onOpenChange={setIsGroupDialogOpen}
                >
                  <DialogTrigger asChild>
                    <Button onClick={handleAddGroup}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Group
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>
                        {editingGroupId ? "Edit Group" : "Add New Group"}
                      </DialogTitle>
                      <DialogDescription>
                        {editingGroupId
                          ? "Update group information"
                          : "Enter details for the new group"}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="group-code">Group Code</Label>
                        <Input
                          id="group-code"
                          placeholder="e.g., CS-101"
                          value={groupForm.code || ""}
                          onChange={(e) =>
                            setGroupForm({ ...groupForm, code: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="group-department">Department</Label>
                        <Select
                          value={groupForm.departmentId || ""}
                          onValueChange={(value: string) => {
                            const dept = departments.find((d) => {
                              const deptId = d?.id ?? d?.Id ?? d?.departmentId;
                              return String(deptId) === value;
                            });
                            setGroupForm({
                              ...groupForm,
                              departmentId: value,
                              department:
                                dept?.name ??
                                dept?.Name ??
                                dept?.title ??
                                dept?.Title ??
                                "",
                            });
                          }}
                          disabled={departments.length === 0}
                        >
                          <SelectTrigger id="group-department">
                            <SelectValue placeholder="Select department" />
                          </SelectTrigger>
                          <SelectContent>
                            {departments.map((dept) => {
                              const deptId =
                                dept?.id ?? dept?.Id ?? dept?.departmentId;
                              if (deptId === undefined || deptId === null) {
                                return null;
                              }
                              const deptIdStr = String(deptId);
                              const deptName =
                                dept?.name ??
                                dept?.Name ??
                                dept?.title ??
                                dept?.Title ??
                                `Department ${deptIdStr}`;
                              return (
                                <SelectItem key={deptIdStr} value={deptIdStr}>
                                  {deptName}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="group-specialization">
                          Specialization
                        </Label>
                        <Select
                          value={groupForm.specializationId || ""}
                          onValueChange={(value: string) => {
                            const spec = specializations.find((s) => {
                              const specId =
                                s?.id ?? s?.Id ?? s?.ID ?? s?.specializationId;
                              return String(specId) === value;
                            });
                            setGroupForm({
                              ...groupForm,
                              specializationId: value,
                              specializationName:
                                spec?.name ??
                                spec?.Name ??
                                spec?.title ??
                                spec?.Title,
                            });
                          }}
                        >
                          <SelectTrigger id="group-specialization">
                            <SelectValue placeholder="Select specialization" />
                          </SelectTrigger>
                          <SelectContent>
                            {specializations.map((spec) => {
                              const specId =
                                spec?.id ??
                                spec?.Id ??
                                spec?.ID ??
                                spec?.specializationId;
                              if (specId === undefined || specId === null) {
                                return null;
                              }
                              const specIdStr = String(specId);
                              const specName =
                                spec?.name ??
                                spec?.Name ??
                                spec?.title ??
                                spec?.Title ??
                                `Specialization ${specIdStr}`;
                              return (
                                <SelectItem key={specIdStr} value={specIdStr}>
                                  {specName}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="group-language">
                          Education Language (enum)
                        </Label>
                        <Input
                          id="group-language"
                          type="number"
                          placeholder="Match backend enum"
                          value={
                            groupForm.educationLanguage !== undefined
                              ? groupForm.educationLanguage.toString()
                              : ""
                          }
                          onChange={(e) =>
                            setGroupForm({
                              ...groupForm,
                              educationLanguage:
                                e.target.value === ""
                                  ? undefined
                                  : Number(e.target.value),
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="group-level">
                          Education Level (enum)
                        </Label>
                        <Input
                          id="group-level"
                          type="number"
                          placeholder="Match backend enum"
                          value={
                            groupForm.educationLevel !== undefined
                              ? groupForm.educationLevel.toString()
                              : ""
                          }
                          onChange={(e) =>
                            setGroupForm({
                              ...groupForm,
                              educationLevel:
                                e.target.value === ""
                                  ? undefined
                                  : Number(e.target.value),
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="group-year">Year</Label>
                        <Select
                          value={groupForm.year?.toString() || ""}
                          onValueChange={(value: string) =>
                            setGroupForm({
                              ...groupForm,
                              year: parseInt(value),
                            })
                          }
                        >
                          <SelectTrigger id="group-year">
                            <SelectValue placeholder="Select year" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">Year 1</SelectItem>
                            <SelectItem value="2">Year 2</SelectItem>
                            <SelectItem value="3">Year 3</SelectItem>
                            <SelectItem value="4">Year 4</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="group-students">Student Count</Label>
                        <Input
                          id="group-students"
                          type="number"
                          placeholder="e.g., 25"
                          value={groupForm.studentCount || ""}
                          onChange={(e) =>
                            setGroupForm({
                              ...groupForm,
                              studentCount: parseInt(e.target.value) || 0,
                            })
                          }
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setIsGroupDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button onClick={handleSaveGroup}>Save</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Group Code</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Specialization</TableHead>
                    <TableHead>Language</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>Year</TableHead>
                    <TableHead>Student Count</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groups.map((group, index) => (
                    <TableRow key={group.id ?? `${group.code}-${index}`}>
                      <TableCell className="font-medium">
                        {group.code}
                      </TableCell>
                      <TableCell>{group.department}</TableCell>
                      <TableCell>
                        {group.specializationName ||
                          group.specializationId ||
                          "-"}
                      </TableCell>
                      <TableCell>
                        {group.educationLanguage !== undefined
                          ? group.educationLanguage
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {group.educationLevel !== undefined
                          ? group.educationLevel
                          : "-"}
                      </TableCell>
                      <TableCell>Year {group.year}</TableCell>
                      <TableCell>{group.studentCount}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditGroup(group)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteGroup(group.id)}
                          >
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

        {/* Students Tab */}
        <TabsContent value="students" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Student Management</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <Dialog
                    open={isFormatInfoOpen}
                    onOpenChange={setIsFormatInfoOpen}
                  >
                    <DialogTrigger asChild>
                      <Button variant="outline">
                        <Info className="h-4 w-4 mr-2" />
                        Excel Format
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Excel File Format Information</DialogTitle>
                        <DialogDescription>
                          Required format for Excel student import
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <Alert>
                          <FileSpreadsheet className="h-4 w-4" />
                          <AlertTitle>Required Columns</AlertTitle>
                          <AlertDescription>
                            Your Excel file must include the columns below in
                            this exact order:
                          </AlertDescription>
                        </Alert>
                        <div className="space-y-2">
                          <div className="grid grid-cols-2 gap-2 p-2 bg-muted rounded">
                            <span className="font-medium">Name</span>
                            <span className="text-sm text-muted-foreground">
                              John
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 p-2 bg-muted rounded">
                            <span className="font-medium">Surname</span>
                            <span className="text-sm text-muted-foreground">
                              Doe
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 p-2 bg-muted rounded">
                            <span className="font-medium">MiddleName</span>
                            <span className="text-sm text-muted-foreground">
                              Smith
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 p-2 bg-muted rounded">
                            <span className="font-medium">UserName</span>
                            <span className="text-sm text-muted-foreground">
                              7ABCQWE
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 p-2 bg-muted rounded">
                            <span className="font-medium">Gender (M/F)</span>
                            <span className="text-sm text-muted-foreground">
                              M
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 p-2 bg-muted rounded">
                            <span className="font-medium">GroupName</span>
                            <span className="text-sm text-muted-foreground">
                              TK-105
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 p-2 bg-muted rounded">
                            <span className="font-medium">DecreeNumber</span>
                            <span className="text-sm text-muted-foreground">
                              1
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 p-2 bg-muted rounded">
                            <span className="font-medium">AdmissionScore</span>
                            <span className="text-sm text-muted-foreground">
                              650.5
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 p-2 bg-muted rounded">
                            <span className="font-medium">FormOfEducation</span>
                            <span className="text-sm text-muted-foreground">
                              InPerson
                            </span>
                          </div>
                        </div>
                        <Alert>
                          <Info className="h-4 w-4" />
                          <AlertTitle>Important Notes</AlertTitle>
                          <AlertDescription>
                            <ul className="list-disc list-inside space-y-1 text-sm">
                              <li>The first row must contain column headers</li>
                              <li>
                                GroupName must match an existing group in the
                                system
                              </li>
                              <li>All fields are required</li>
                              <li>File format: .xlsx or .xls</li>
                            </ul>
                          </AlertDescription>
                        </Alert>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          onClick={() => setIsFormatInfoOpen(false)}
                        >
                          Close
                        </Button>
                        <Button onClick={downloadTemplate}>
                          <FileSpreadsheet className="h-4 w-4 mr-2" />
                          Download Template
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                  <Dialog
                    open={isUploadDialogOpen}
                    onOpenChange={setIsUploadDialogOpen}
                  >
                    <DialogTrigger asChild>
                      <Button>
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Excel
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Upload Students from Excel</DialogTitle>
                        <DialogDescription>
                          Upload an Excel file (.xlsx or .xls) to import
                          multiple students at once
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <Alert>
                          <Info className="h-4 w-4" />
                          <AlertTitle>Before uploading</AlertTitle>
                          <AlertDescription>
                            Make sure your Excel file follows the required
                            format. Click "Excel Format" to view requirements or
                            download a template.
                          </AlertDescription>
                        </Alert>
                        <div className="space-y-2">
                          <Label htmlFor="student-file">
                            Select Excel File
                          </Label>
                          <Input
                            id="student-file"
                            type="file"
                            accept=".xlsx,.xls"
                            onChange={handleFileUpload}
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          onClick={() => setIsUploadDialogOpen(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Alert className="mb-4">
                <Info className="h-4 w-4" />
                <AlertTitle>Student Import</AlertTitle>
                <AlertDescription>
                  Students can only be added in bulk via Excel file upload.
                </AlertDescription>
              </Alert>
              <div className="flex items-center gap-4 mb-4">
                <div className="flex-1">
                  <Input
                    placeholder="Search by name..."
                    value={studentSearchQuery}
                    onChange={(e) => {
                      setStudentSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                  />
                </div>
                <Select
                  value={studentGroupFilter}
                  onValueChange={(value: string) => {
                    setStudentGroupFilter(value);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by group" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Groups</SelectItem>
                    {groups.map((group, index) => (
                      <SelectItem
                        key={group.id ?? `${group.code}-${index}`}
                        value={group.code}
                      >
                        {group.code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={studentYearFilter}
                  onValueChange={(value: string) => {
                    setStudentYearFilter(value);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by year" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Years</SelectItem>
                    <SelectItem value="1">Year 1</SelectItem>
                    <SelectItem value="2">Year 2</SelectItem>
                    <SelectItem value="3">Year 3</SelectItem>
                    <SelectItem value="4">Year 4</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Group</TableHead>
                    <TableHead>Year</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents
                    .slice(startIndex, endIndex)
                    .map((student) => (
                      <TableRow key={student.id}>
                        <TableCell className="font-medium">
                          {student.studentId}
                        </TableCell>
                        <TableCell>{student.name}</TableCell>
                        <TableCell>{student.groupCode}</TableCell>
                        <TableCell>Year {student.year}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditStudent(student)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  Showing {startIndex + 1} to {endIndex} of{" "}
                  {filteredStudents.length} students
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </span>
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={currentPage >= totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Dialog
            open={isStudentDialogOpen}
            onOpenChange={setIsStudentDialogOpen}
          >
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Student Information</DialogTitle>
                <DialogDescription>
                  View complete student details
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Student ID</Label>
                    <p className="font-medium">{studentForm.studentId}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Full Name</Label>
                    <p className="font-medium">{studentForm.name}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Email</Label>
                    <p className="font-medium">{studentForm.email}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">
                      Phone Number
                    </Label>
                    <p className="font-medium">{studentForm.phoneNumber}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">
                      Date of Birth
                    </Label>
                    <p className="font-medium">{studentForm.dateOfBirth}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Group</Label>
                    <p className="font-medium">{studentForm.groupCode}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Year</Label>
                    <p className="font-medium">Year {studentForm.year}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">
                      Specialization
                    </Label>
                    <p className="font-medium">{studentForm.specialization}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Address</Label>
                  <p className="font-medium">{studentForm.address}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Language</Label>
                  <p className="font-medium">{studentForm.language}</p>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button onClick={() => setIsStudentDialogOpen(false)}>
                  Close
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>
    </div>
  );
}
