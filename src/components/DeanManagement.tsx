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
  Users,
  BookOpen,
  DoorOpen,
  Upload,
  FileSpreadsheet,
  Info,
  ChevronLeft,
  ChevronRight,
  UserCircle,
  Eye,
} from "lucide-react";
import React, { useState, useEffect } from "react";
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
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { Badge } from "./ui/badge";
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
  deleteTeacher,
  importTeachersExcel,
  createGroup,
  updateGroup,
  deleteGroup,
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
  surname?: string;
  middleName?: string;
  userName?: string;
  email: string;
  department: string;
  phone: string;
  position?: number;
}

interface Course {
  id: number;
  code: string;
  title: string;
  credits: number;
  type: string;
  department: string;
  departmentName?: string;
  teacherId?: number;
  teacherName?: string;
  groupId?: number;
  groupCode?: string;
  studentCount?: number;
  hasSyllabus?: boolean;
  year?: number;
  semester?: number;
}

interface Group {
  id: number;
  code?: string;
  groupCode?: string;
  department: string;
  departmentName?: string;
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
  email?: string;
  groupId?: number;
  groupCode: string;
  year: number;
  specialization: string;
  dateOfBirth?: string;
  phoneNumber?: string;
  address?: string;
  language?: string;
  yearOfAdmission?: string;
  admissionScore?: number;
}

const mapRoomFromApi = (r: any): Room => {
  const typeCode = r.roomType ?? r.type;
  let type: string;
  if (typeof typeCode === "number") {
    type =
      typeCode === 0 ? "Lecture Hall" : typeCode === 1 ? "Classroom" : "Other";
  } else if (typeof typeCode === "string") {
    type = typeCode;
  } else {
    type = "";
  }
  const roomName =
    r.roomName ??
    r.name ??
    r.Name ??
    r.RoomName ??
    r.room ??
    r.Room ??
    "";

  const roomId =
    r.id ??
    r.Id ??
    r.roomId ??
    r.RoomId ??
    "";

  return {
    id: roomId,
    name: roomName,
    building: r.building ?? r.Building ?? "",
    capacity: r.capacity ?? r.Capacity ?? 0,
    type,
  };
};

const mapTeacherFromApi = (t: any): Teacher => {
  const firstName = t.name ?? t.firstName ?? "";
  const surname = t.surname ?? t.lastName ?? "";
  const middleName = t.middleName ?? "";
  const userName = t.userName ?? t.username ?? "";
  const fullName =
    `${firstName} ${surname} ${middleName}`.trim() || t.fullName || userName || "";
  return {
    id: t.id ?? t.Id ?? t.teacherId,
    name: firstName,
    surname: surname,
    middleName: middleName,
    userName: userName,
    email: t.email ?? "",
    department: t.department?.name ?? t.departmentName ?? "",
    phone: t.phone ?? t.phoneNumber ?? "",
    position: t.position,
  };
};

const mapGroupFromApi = (g: any, departmentsList?: any[], specializationsList?: any[]): Group => {
  const specialization = g.specialization ?? {};
  const specializationId =
    g.specializationId ?? specialization.id ?? specialization.Id;
  const specializationName =
    g.specializationName ??
    specialization.name ??
    specialization.Name ??
    specialization.title ??
    specialization.Title ??
    "";
  const department = g.department ?? {};
  const departmentId = g.departmentId ?? department.id ?? department.Id;
  const groupCode = g.groupCode ?? g.code ?? "";

  let departmentName =
    department.name ??
    g.department?.name ??
    g.departmentName ??
    department.Name ??
    department.title ??
    department.Title ??
    "";

  if (!departmentName && specializationName) {
    departmentName = specializationName;
  }

  if (!departmentName && specializationId && specializationsList) {
    const foundSpec = specializationsList.find((s: any) => {
      const sId = s?.id ?? s?.Id ?? s?.ID ?? s?.specializationId;
      return String(sId) === String(specializationId);
    });
    if (foundSpec) {
      const specName = foundSpec.name ?? foundSpec.Name ?? foundSpec.title ?? foundSpec.Title ?? "";
      if (specName) {
        departmentName = specName;
      }
    }
  }

  return {
    id:
      g.id ??
      g.groupId ??
      g.groupID ??
      g.Id ??
      `${String(departmentId ?? "dept")}-${String(g.year ?? "year")}`,
    code: groupCode,
    groupCode: groupCode,
    department: departmentName,
    departmentName: departmentName,
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
    specializationName: specializationName,
    educationLanguage: g.language,
    educationLevel: g.educationLevel,
  };
};

const mapStudentFromApi = (s: any): Student => {
  // Извлекаем имя из разных возможных полей
  const firstName = s.name ?? s.firstName ?? s.givenName ?? "";
  const surname = s.surname ?? s.lastName ?? s.familyName ?? "";
  const middleName = s.middleName ?? "";
  const constructedName = firstName && surname
    ? `${firstName} ${middleName ? middleName + " " : ""}${surname}`.trim()
    : "";
  const fullName = s.fullName ?? constructedName ?? s.name ?? "";

  return {
    id: s.id ?? s.Id ?? s.studentId ?? s.userId ?? 0,
    studentId: s.userName ?? s.username ?? s.studentId ?? s.userId ?? "",
    name: fullName,
    email: s.email ?? s.emailAddress ?? "",
    groupId: s.groupId ?? s.group?.id ?? s.groupId,
    groupCode: s.groupName ?? s.groupCode ?? s.group?.groupCode ?? s.group?.code ?? s.group?.name ?? "",
    year: s.year ?? s.currentYear ?? s.academicYear ?? 0,
    specialization: s.speciality ?? s.specialization ?? s.specializationName ?? "",
    dateOfBirth: s.dateOfBirth ?? s.birthDate ?? s.dob,
    phoneNumber: s.phoneNumber ?? s.phone ?? s.mobile ?? "",
    address: s.address ?? "",
    language: s.language ?? "",
    yearOfAdmission: s.yearOfAdmission ?? s.admissionYear ?? s.yearOfAdmission,
    admissionScore: s.admissionScore ?? s.score ?? undefined,
  };
};

const FREQUENCY_LABELS: Record<number, string> = {
  1: "Lower",
  2: "Upper",
  3: "Both"
};

const DAY_LABELS: Record<number, string> = {
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
  7: "Sunday"
};

const mapCourseFromApi = (c: any): Course => {
  const teacher = c.teacher ?? {};
  const group = c.group ?? {};
  const dept = c.department ?? {};
  let teacherName = "";
  if (typeof c.teacher === "string") {
    teacherName = c.teacher;
  } else if (c.teacherName) {
    teacherName = c.teacherName;
  } else if (teacher && typeof teacher === "object") {
    teacherName = `${teacher.name ?? ""} ${teacher.surname ?? ""}`.trim();
  }

  return {
    id: c.id,
    code: c.code ?? c.title ?? "",
    title: c.title ?? c.name ?? "",
    credits: c.credits ?? 0,
    type: c.type ?? "Lecture",
    department: (c as any).departmentName ?? dept.name ?? dept.departmentName ?? "",
    teacherId: c.teacherId ?? (typeof teacher === "object" ? teacher.id : undefined),
    teacherName: teacherName,
    groupId: c.groupId ?? group.id,
    groupCode: c.groupCode ?? group.groupCode ?? "",
    studentCount: c.studentCount ?? 0,
    hasSyllabus: Boolean(c.syllabusId),
    departmentName: (c as any).departmentName ?? dept.name ?? dept.departmentName ?? "",
    year: c.year,
    semester: c.semester ?? c.semster,
  };
};

export function DeanManagement() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [specializations, setSpecializations] = useState<any[]>([]);

  const [roomForm, setRoomForm] = useState<Partial<Room>>({});
  const [isRoomDialogOpen, setIsRoomDialogOpen] = useState(false);
  const [editingRoomId, setEditingRoomId] = useState<number | null>(null);

  const [teacherForm, setTeacherForm] = useState<Partial<Teacher>>({});
  const [isTeacherDialogOpen, setIsTeacherDialogOpen] = useState(false);
  const [editingTeacherId, setEditingTeacherId] = useState<number | null>(null);
  const [isTeacherUploadDialogOpen, setIsTeacherUploadDialogOpen] =
    useState(false);
  const [isTeacherFormatInfoOpen, setIsTeacherFormatInfoOpen] = useState(false);

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

  const [groupForm, setGroupForm] = useState<Partial<Group>>({});
  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<number | null>(null);

  const [studentForm, setStudentForm] = useState<Partial<Student>>({});
  const [isStudentDialogOpen, setIsStudentDialogOpen] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState<number | null>(null);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isFormatInfoOpen, setIsFormatInfoOpen] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const studentsPerPage = 10;

  const [studentSearchQuery, setStudentSearchQuery] = useState("");
  const [studentGroupFilter, setStudentGroupFilter] = useState<string>("all");
  const [studentYearFilter, setStudentYearFilter] = useState<string>("all");

  const [teacherCurrentPage, setTeacherCurrentPage] = useState(1);
  const teachersPerPage = 10;

  const [teacherSearchQuery, setTeacherSearchQuery] = useState("");
  const [teacherPositionFilter, setTeacherPositionFilter] = useState<string>("all");

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [
          roomsResp,
          teachersResp,
          groupsResp,
          coursesResp,
          deptsResp,
          specsResp,
        ] = await Promise.all([
          listRooms(1, 100),
          listTeachers(1, 100),
          listGroups(1, 100),
          listTaughtSubjects(1, 100),
          listDepartments(1, 100),
          listSpecializations(1, 100),
        ]);
        const departmentsList = toArray(deptsResp);
        const specializationsList = toArray(specsResp);


        setRooms(toArray(roomsResp).map(mapRoomFromApi));
        setTeachers(toArray(teachersResp).map(mapTeacherFromApi));
        setGroups(toArray(groupsResp).map((g: any) => mapGroupFromApi(g, departmentsList, specializationsList)));
        setCourses(toArray(coursesResp).map(mapCourseFromApi));
        setDepartments(departmentsList);
        setSpecializations(specializationsList);

      } catch (err) {
        // Ignore
      }
    };
    fetchAll();
  }, []);

  useEffect(() => {
    const fetchFilteredStudents = async () => {
      try {
        if (studentSearchQuery) {
          const resp = await searchStudents(studentSearchQuery);
          const studentsArray = toArray(resp);
          if (studentsArray.length > 0) {
            setStudents(studentsArray.map(mapStudentFromApi));
          }
        } else if (
          studentGroupFilter !== "all" ||
          studentYearFilter !== "all"
        ) {
          // Ждем загрузки groups перед фильтрацией
          if (groups.length === 0) {
            return;
          }
          const groupObj = groups.find((g) => (g.code || g.groupCode) === studentGroupFilter);
          const groupId =
            studentGroupFilter !== "all" ? groupObj?.id?.toString() : undefined;
          const year =
            studentYearFilter !== "all"
              ? parseInt(studentYearFilter, 10)
              : undefined;
          const resp = await filterStudents(groupId, year);
          const studentsArray = toArray(resp);
          if (studentsArray.length > 0) {
            setStudents(studentsArray.map(mapStudentFromApi));
          }
        } else {
          // Загружаем всех студентов
          let studentsLoaded = false;
          try {
            const resp = await listStudents(1, 100);
            const studentsArray = toArray(resp);
            if (studentsArray.length > 0) {
              const mapped = studentsArray.map(mapStudentFromApi);
              setStudents(mapped);
              studentsLoaded = true;
            } else {
              // Пробуем альтернативный метод
              try {
                const resp2 = await filterStudents(undefined, undefined);
                const studentsArray2 = toArray(resp2);
                if (studentsArray2.length > 0) {
                  setStudents(studentsArray2.map(mapStudentFromApi));
                  studentsLoaded = true;
                }
              } catch (filterErr) {
                // Ignore
              }
            }
          } catch (listErr: any) {
            // Если listStudents не работает, пробуем filterStudents без параметров
            try {
              const resp = await filterStudents(undefined, undefined);
              const studentsArray = toArray(resp);
              if (studentsArray.length > 0) {
                setStudents(studentsArray.map(mapStudentFromApi));
                studentsLoaded = true;
              }
            } catch (filterErr) {
              // Показываем предупреждение пользователю только если список пустой
              if (students.length === 0 && !studentsLoaded) {
                toast.error("Unable to load students. The server returned an error (500). Please check the backend logs.", {
                  duration: 5000,
                });
                // Устанавливаем пустой массив, чтобы показать, что данных нет
                setStudents([]);
              }
            }
          }
        }
      } catch (err) {
        // Не устанавливаем пустой массив при ошибке, оставляем текущий список
      }
    };
    fetchFilteredStudents();
  }, [studentSearchQuery, studentGroupFilter, studentYearFilter, groups]);

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
      if (editingRoomId) {
        await updateRoom(editingRoomId.toString(), {
          name: roomForm.name ?? "",
          capacity: Number(roomForm.capacity ?? 0),
        });
        toast.success("Room updated successfully");
      } else {
        await createRoom({
          roomName: roomForm.name ?? "",
          capacity: Number(roomForm.capacity ?? 0),
        });
        toast.success("Room added successfully");
      }
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

  const handleAddCourse = () => {
    setCourseForm({
      classTimes: [{ start: "", end: "", day: 1, room: "", frequency: 3 }],
      credits: 0,
      hours: 0,
      year: 1,
      semester: 1,
    });
    setEditingCourseId(null);
    setIsCourseDialogOpen(true);
  };

  const addClassTime = () => {
    setCourseForm({
      ...courseForm,
      classTimes: [...(courseForm.classTimes || []), { start: "", end: "", day: 1, room: "", frequency: 3 }]
    });
  };

  const removeClassTime = (index: number) => {
    const newClassTimes = [...(courseForm.classTimes || [])];
    newClassTimes.splice(index, 1);
    setCourseForm({ ...courseForm, classTimes: newClassTimes });
  };

  const updateClassTime = (index: number, field: keyof any, value: string | number) => {
    const newClassTimes = [...(courseForm.classTimes || [])];
    newClassTimes[index] = { ...newClassTimes[index], [field]: value };
    setCourseForm({ ...courseForm, classTimes: newClassTimes });
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
        if (courseForm.credits === undefined || courseForm.credits === null || courseForm.credits === 0) {
          toast.error("Credits is required");
          return;
        }
        if (courseForm.hours === undefined || courseForm.hours === null || courseForm.hours === 0) {
          toast.error("Hours is required");
          return;
        }
        if (courseForm.year === undefined || courseForm.year === null) {
          toast.error("Year is required");
          return;
        }
        if (courseForm.semester === undefined || courseForm.semester === null) {
          toast.error("Semester is required");
          return;
        }

        const validClassTimes = (courseForm.classTimes || [])
          .filter((ct: any) => {
            return ct.start && ct.end && ct.room && ct.room.trim() && ct.day && ct.frequency !== undefined;
          })
          .map((ct: any) => {
            const startTime = ensureHHMMSS(ct.start);
            const endTime = ensureHHMMSS(ct.end);
            const day = Number(ct.day);
            const room = String(ct.room).trim();
            const frequency = Number(ct.frequency);

            if (!startTime || startTime === "00:00:00" || !endTime || endTime === "00:00:00") {
              throw new Error("Start and end times are required for class times");
            }
            if (!room) {
              throw new Error("Room is required for class times");
            }
            if (!day || day < 1 || day > 7) {
              throw new Error("Valid day (1-7) is required for class times");
            }
            if (!frequency || frequency < 1 || frequency > 3) {
              throw new Error("Valid frequency (1-3) is required for class times");
            }

            return {
              start: startTime,
              end: endTime,
              day: day,
              room: room,
              frequency: frequency,
            };
          });

        const requestPayload = {
          code: String(courseForm.code).trim(),
          title: String(courseForm.title).trim(),
          departmentId: String(courseForm.departmentId),
          teacherId: String(courseForm.teacherId),
          groupId: String(courseForm.groupId),
          credits: Number(courseForm.credits),
          hours: Number(courseForm.hours),
          year: Number(courseForm.year),
          semester: Number(courseForm.semester),
          classTimes: validClassTimes,
        };

        await createTaughtSubject(requestPayload);
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

  const handleAddGroup = () => {
    setGroupForm({});
    setEditingGroupId(null);
    setIsGroupDialogOpen(true);
  };

  const handleSaveGroup = async () => {
    try {
      const groupCode = groupForm.code || groupForm.groupCode;
      if (
        !groupCode ||
        !groupForm.specializationId ||
        groupForm.year === undefined
      ) {
        toast.error("Fill in code/specialization/year");
        return;
      }

      const basePayload = {
        groupCode: groupCode,
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
          console.log("SUBMIT educationLanguage =", groupForm.educationLanguage, groupForm);
        await createGroup({
          ...basePayload,
          educationLanguage: Number(groupForm.educationLanguage),
          educationLevel: Number(groupForm.educationLevel),
        });
        toast.success("Group added successfully");
      }
      const resp = await listGroups(1, 100);
      setGroups(toArray(resp).map((g: any) => mapGroupFromApi(g, departments, specializations)));
    } catch (error: any) {
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
      setGroups((prev) => prev.filter((g) => g.id !== id));
      toast.error(error?.message ?? "Failed to delete group");
    }
  };

  const handleAddStudent = () => {
    setStudentForm({});
    setEditingStudentId(null);
    setIsStudentDialogOpen(true);
  };

  const handleSaveStudent = () => {
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
        toast.success("Import completed. Report downloaded.");
      }
      else if (
        typeof result === "object" &&
        result !== null &&
        !(result instanceof Blob)
      ) {
        if ((result as any).message || (result as any).error) {
          toast.error((result as any).message || (result as any).error || "Error importing file");
        } else {
          toast.success("File uploaded successfully");
        }
      }
      else {
        toast.success("File uploaded successfully");
      }

      // Обновляем список студентов после импорта
      // Если GET /api/students не работает (500 ошибка), это проблема бэкенда
      // Импорт прошел успешно, но список студентов получить не можем
      // Пытаемся обновить список студентов, но не критично, если не получится
      let studentsLoaded = false;
      try {
        const resp = await listStudents(1, 100);
        const studentsArray = toArray(resp);
        if (studentsArray.length > 0) {
          const mapped = studentsArray.map(mapStudentFromApi);
          setStudents(mapped);
          studentsLoaded = true;
          toast.success(`Import completed! Loaded ${mapped.length} students`);
        } else {
          // Список пустой, но импорт прошел успешно
          toast.success("Import completed successfully! The student list is currently empty or the GET endpoint is not working properly.", {
            duration: 5000,
          });
        }
      } catch (listErr: any) {
        // GET /api/students возвращает 500 ошибку - это проблема бэкенда
        // Импорт прошел успешно, но получить список студентов не можем
        // Пробуем альтернативный метод
        try {
          const resp = await filterStudents(undefined, undefined);
          const studentsArray = toArray(resp);
          if (studentsArray.length > 0) {
            setStudents(studentsArray.map(mapStudentFromApi));
            studentsLoaded = true;
            toast.success(`Import completed! Loaded ${studentsArray.length} students via filter endpoint`);
          } else {
            toast.success("Import completed successfully! However, the GET /api/students endpoint is returning 500 error. Please check backend logs or refresh the page.", {
              duration: 7000,
            });
          }
        } catch (filterErr) {
          // Оба эндпоинта не работают - это проблема бэкенда
          toast.success("Import completed successfully! However, both GET endpoints (/api/students and /api/students/filter-by) are returning 500 errors. Please check backend logs or refresh the page.", {
            duration: 7000,
          });
        }
      }
      setIsUploadDialogOpen(false);
      event.target.value = "";
    } catch (error: any) {
      toast.error(error?.message ?? "Error importing file");
      event.target.value = "";
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
        toast.success("Import completed. Report downloaded.");
      }
      // Если это JSON объект с сообщением (обычно это ошибка или успешный ответ без файла)
      else if (
        typeof result === "object" &&
        result !== null &&
        !(result instanceof Blob)
      ) {
        if ((result as any).message || (result as any).error) {
          toast.error((result as any).message || (result as any).error || "Error importing file");
        } else {
          toast.success("File uploaded successfully");
        }
      }
      else {
        toast.success("File uploaded successfully");
      }

      const resp = await listTeachers(1, 100);
      setTeachers(toArray(resp).map(mapTeacherFromApi));
      setIsTeacherUploadDialogOpen(false);
      event.target.value = "";
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to import teachers");
      event.target.value = "";
    }
  };

  const downloadTeacherTemplate = async () => {
    try {
      const fileName = "TeacherTemplate(2).xlsx";
      const resp = await fetch(`/${encodeURIComponent(fileName)}`);
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
  const downloadTemplate = async () => {
    try {
      const fileName = "students-template (2).xlsx";
      const resp = await fetch(`/${encodeURIComponent(fileName)}`);
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
  const filteredStudents = students;
  const totalPages = Math.ceil(filteredStudents.length / studentsPerPage);
  const startIndex = (currentPage - 1) * studentsPerPage;
  const endIndex = Math.min(
    currentPage * studentsPerPage,
    filteredStudents.length,
  );

  const filteredTeachers = teachers.filter(teacher => {
    const searchLower = teacherSearchQuery.toLowerCase();
    const fullName = `${teacher.name || ""} ${teacher.surname || ""} ${teacher.middleName || ""} ${teacher.userName || ""}`.toLowerCase();
    const matchesSearch = !teacherSearchQuery || fullName.includes(searchLower);
    const matchesPosition = teacherPositionFilter === "all" ||
      (teacher.position && String(teacher.position) === teacherPositionFilter);

    return matchesSearch && matchesPosition;
  });

  const teacherTotalPages = Math.ceil(filteredTeachers.length / teachersPerPage);
  const teacherStartIndex = (teacherCurrentPage - 1) * teachersPerPage + 1;
  const teacherEndIndex = Math.min(teacherCurrentPage * teachersPerPage, filteredTeachers.length);

  return (
    <div className="space-y-6">
      <div>
        <h1>System Management</h1>
        <p className="text-muted-foreground">
          Manage all system entities and resources
        </p>
      </div>

      <Tabs defaultValue="courses" className="w-full">
        <TabsList>
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
          <TabsTrigger value="teachers">
            <Users className="h-4 w-4 mr-2" />
            Teachers
          </TabsTrigger>
        </TabsList>

        <TabsContent value="courses" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Course Management</CardTitle>
                  <CardDescription>Add, edit, or remove course information</CardDescription>
                </div>
                <Dialog open={isCourseDialogOpen} onOpenChange={setIsCourseDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={handleAddCourse}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Course
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>{editingCourseId ? "Edit Course" : "Add New Course"}</DialogTitle>
                      <DialogDescription>
                        {editingCourseId ? "Update course information" : "Enter details for the new course"}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="course-code">Course Code</Label>
                          <Input
                            id="course-code"
                            placeholder="e.g., MAT-AN"
                            value={courseForm.code || ""}
                            onChange={(e) => setCourseForm({ ...courseForm, code: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="course-title">Course Title</Label>
                          <Input
                            id="course-title"
                            placeholder="e.g., Mat. Analiz"
                            value={courseForm.title || ""}
                            onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="course-department">Department</Label>
                          <Select
                            value={courseForm.departmentId?.toString() || ""}
                            onValueChange={(value) => setCourseForm({ ...courseForm, departmentId: value })}
                          >
                            <SelectTrigger id="course-department">
                              <SelectValue placeholder="Select department" />
                            </SelectTrigger>
                            <SelectContent>
                              {departments.map(dept => {
                                const deptId = dept?.id ?? dept?.Id ?? dept?.departmentId;
                                const deptName = dept?.name ?? dept?.Name ?? dept?.title ?? dept?.Title ?? "";
                                if (!deptId || !deptName) return null;
                                return (
                                  <SelectItem key={String(deptId)} value={String(deptId)}>{deptName}</SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="course-teacher">Teacher</Label>
                          <Select
                            value={courseForm.teacherId?.toString() || ""}
                            onValueChange={(value) => setCourseForm({ ...courseForm, teacherId: value })}
                          >
                            <SelectTrigger id="course-teacher">
                              <SelectValue placeholder="Select teacher" />
                            </SelectTrigger>
                            <SelectContent>
                              {teachers.map(teacher => {
                                const fullName = `${teacher.name || ""} ${teacher.surname || ""} ${teacher.middleName || ""}`.trim() || teacher.userName || `Teacher ${teacher.id}`;
                                return (
                                  <SelectItem key={teacher.id} value={teacher.id.toString()}>
                                    {fullName}
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="course-group">Group</Label>
                          <Select
                            value={courseForm.groupId?.toString() || ""}
                            onValueChange={(value) => setCourseForm({ ...courseForm, groupId: value })}
                          >
                            <SelectTrigger id="course-group">
                              <SelectValue placeholder="Select group" />
                            </SelectTrigger>
                            <SelectContent>
                              {groups.map(group => (
                                <SelectItem key={group.id} value={group.id.toString()}>{group.code || group.groupCode}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="course-credits">Credits</Label>
                          <Input
                            id="course-credits"
                            type="number"
                            placeholder="e.g., 5"
                            value={courseForm.credits || ""}
                            onChange={(e) => setCourseForm({ ...courseForm, credits: parseInt(e.target.value) })}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="course-hours">Hours</Label>
                          <Input
                            id="course-hours"
                            type="number"
                            placeholder="e.g., 60"
                            value={courseForm.hours || ""}
                            onChange={(e) => setCourseForm({ ...courseForm, hours: parseInt(e.target.value) })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="course-year">Year</Label>
                          <Select
                            value={courseForm.year?.toString() || ""}
                            onValueChange={(value: string) => setCourseForm({ ...courseForm, year: parseInt(value) })}
                          >
                            <SelectTrigger id="course-year">
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
                          <Label htmlFor="course-semester">Semester</Label>
                          <Select
                            value={courseForm.semester?.toString() || ""}
                            onValueChange={(value) => setCourseForm({ ...courseForm, semester: parseInt(value) })}
                          >
                            <SelectTrigger id="course-semester">
                              <SelectValue placeholder="Select semester" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1">Semester 1</SelectItem>
                              <SelectItem value="2">Semester 2</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label>Class Times</Label>
                          <Button type="button" variant="outline" size="sm" onClick={addClassTime}>
                            <Plus className="h-4 w-4 mr-1" />
                            Add Time Slot
                          </Button>
                        </div>
                        <div className="space-y-3">
                          {(courseForm.classTimes || []).map((classTime, index) => (
                            <Card key={index} className="p-4">
                              <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                  <div className="space-y-2">
                                    <Label>Start Time</Label>
                                    <Input
                                      type="time"
                                      value={classTime.start}
                                      onChange={(e) => updateClassTime(index, "start", e.target.value)}
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>End Time</Label>
                                    <Input
                                      type="time"
                                      value={classTime.end}
                                      onChange={(e) => updateClassTime(index, "end", e.target.value)}
                                    />
                                  </div>
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                  <div className="space-y-2">
                                    <Label>Day</Label>
                                    <Select
                                      value={classTime.day.toString()}
                                      onValueChange={(value) => updateClassTime(index, "day", parseInt(value))}
                                    >
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {Object.entries(DAY_LABELS).map(([value, label]) => (
                                          <SelectItem key={value} value={value}>{label}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Room</Label>
                                    <Select
                                      value={classTime.room}
                                      onValueChange={(value) => updateClassTime(index, "room", value)}
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select room" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {rooms.length === 0 ? (
                                          <SelectItem value="" disabled>No rooms available</SelectItem>
                                        ) : (
                                          rooms.map(room => {
                                            const roomId = room.id;
                                            const roomName = room.name || "";
                                            const roomCapacity = room.capacity || 0;

                                            if (!roomId || !roomName) return null;

                                            return (
                                              <SelectItem key={String(roomId)} value={String(roomId)}>
                                                {roomName} {roomCapacity > 0 ? `(${roomCapacity})` : ""}
                                              </SelectItem>
                                            );
                                          })
                                        )}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Frequency</Label>
                                    <Select
                                      value={classTime.frequency.toString()}
                                      onValueChange={(value) => updateClassTime(index, "frequency", parseInt(value))}
                                    >
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {Object.entries(FREQUENCY_LABELS).map(([value, label]) => (
                                          <SelectItem key={value} value={value}>{label}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                                {(courseForm.classTimes || []).length > 1 && (
                                  <Button
                                    type="button"
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => removeClassTime(index)}
                                  >
                                    <Trash2 className="h-4 w-4 mr-1" />
                                    Remove
                                  </Button>
                                )}
                              </div>
                            </Card>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setIsCourseDialogOpen(false)}>Cancel</Button>
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
                    <TableHead>Department</TableHead>
                    <TableHead>Teacher</TableHead>
                    <TableHead>Group</TableHead>
                    <TableHead>Credits</TableHead>
                    <TableHead>Year</TableHead>
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
                      <TableCell>{course.department}</TableCell>
                      <TableCell>{course.teacherName || "-"}</TableCell>
                      <TableCell>{course.groupCode || "-"}</TableCell>
                      <TableCell>{course.credits}</TableCell>
                      <TableCell>{course.year || "-"}</TableCell>
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
                            placeholder="e.g., CS-50"
                            value={groupForm.code || groupForm.groupCode || ""}
                            onChange={(e) =>
                                setGroupForm({ ...groupForm, code: e.target.value, groupCode: e.target.value })
                            }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="group-specialization">Specialization</Label>
                        <Select
                            value={groupForm.specializationId || ""}
                            onValueChange={(value) =>
                                setGroupForm(prev => ({ ...prev, specializationId: value }))
                            }>
                          <SelectTrigger id="group-specialization">
                            <SelectValue placeholder="Select specialization" />
                          </SelectTrigger>
                          <SelectContent>
                            {specializations.length === 0 ? (
                              <SelectItem value="" disabled>No specializations available</SelectItem>
                            ) : (
                              specializations.map(spec => {
                                const specId = spec?.id ?? spec?.Id ?? spec?.ID ?? spec?.specializationId;
                                const specName = spec?.name ?? spec?.Name ?? spec?.title ?? spec?.Title ?? "";
                                if (!specId || !specName) return null;
                                return (
                                  <SelectItem key={String(specId)} value={String(specId)}>{specName}</SelectItem>
                                );
                              })
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="group-year">Year</Label>
                        <Select
                            value={groupForm.year?.toString() || ""}
                            onValueChange={(value) =>
                                setGroupForm(prev => ({ ...prev, year: Number(value) }))
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
                        <Label htmlFor="group-language">Education Language</Label>
                        <Select
                            value={groupForm.educationLanguage?.toString() || ""}
                            onValueChange={(value) =>
                                setGroupForm(prev => ({ ...prev, educationLanguage: Number(value) }))
                            }
                        >
                          <SelectTrigger id="group-language">
                            <SelectValue placeholder="Select language" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">Azerbaijani</SelectItem>
                            <SelectItem value="2">Russian</SelectItem>
                            <SelectItem value="3">English</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="group-level">Education Level</Label>
                        <Select
                            value={groupForm.educationLevel?.toString() || ""}
                            onValueChange={(value) =>
                                setGroupForm(prev => ({ ...prev, educationLevel: Number(value) }))
                            }
                        >
                          <SelectTrigger id="group-level">
                            <SelectValue placeholder="Select level" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">Bachelor</SelectItem>
                            <SelectItem value="2">Master</SelectItem>
                          </SelectContent>
                        </Select>
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
                        <TableHead>Specialization</TableHead>
                        <TableHead>Language</TableHead>
                        <TableHead>Student Count</TableHead>
                        <TableHead>Education Level</TableHead>
                        <TableHead>Year</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {groups.map((group, index) => (
                        <TableRow key={group.id ?? `${group.code || group.groupCode}-${index}`}>
                          <TableCell className="font-medium">{group.code || group.groupCode || "-"}</TableCell>
                          <TableCell>{group.department || group.departmentName || "-"}</TableCell>
                          <TableCell>{group.educationLanguage }</TableCell>
                          <TableCell>{group.studentCount}</TableCell>
                          <TableCell>{group.educationLevel}</TableCell>
                          <TableCell>Year {group.year}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
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
                            <span className="font-medium">GroupName</span>
                            <span className="text-sm text-muted-foreground">
                              TK-109
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 p-2 bg-muted rounded">
                            <span className="font-medium">AdmissionScore</span>
                            <span className="text-sm text-muted-foreground">
                              650,5
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
                    {groups
                      .filter((group) => group.code || group.groupCode)
                      .map((group, index) => {
                        const groupCode = group.code || group.groupCode || "";
                        return (
                          <SelectItem
                            key={group.id ?? `${groupCode}-${index}`}
                            value={groupCode}
                          >
                            {groupCode}
                          </SelectItem>
                        );
                      })}
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
                    <TableHead>Username</TableHead>
                    <TableHead>Full Name</TableHead>
                    <TableHead>Group</TableHead>
                    <TableHead>Year</TableHead>
                    <TableHead>Year of Admission</TableHead>
                    <TableHead>Admission Score</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents
                    .slice(startIndex, endIndex)
                    .map((student) => (
                      <TableRow key={student.id}>
                        <TableCell className="font-medium">
                          {student.studentId || "-"}
                        </TableCell>
                        <TableCell>{student.name || "-"}</TableCell>
                        <TableCell>{student.groupCode || "-"}</TableCell>
                        <TableCell>{student.year ? `Year ${student.year}` : "-"}</TableCell>
                        <TableCell>{student.yearOfAdmission || "-"}</TableCell>
                        <TableCell>{student.admissionScore ?? "-"}</TableCell>
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
                    <Label className="text-muted-foreground">Username</Label>
                    <p className="font-medium">{studentForm.studentId || "-"}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Full Name</Label>
                    <p className="font-medium">{studentForm.name || "-"}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Group</Label>
                    <p className="font-medium">{studentForm.groupCode || "-"}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Year</Label>
                    <p className="font-medium">{studentForm.year ? `Year ${studentForm.year}` : "-"}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Specialization</Label>
                    <p className="font-medium">{studentForm.specialization || "-"}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Year of Admission</Label>
                    <p className="font-medium">{studentForm.yearOfAdmission || "-"}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Admission Score</Label>
                    <p className="font-medium">{studentForm.admissionScore ?? "-"}</p>
                  </div>
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
        <TabsContent value="teachers" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Teacher Management</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <Dialog open={isTeacherFormatInfoOpen} onOpenChange={setIsTeacherFormatInfoOpen}>
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
                          Required format for Excel teacher import
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <Alert>
                          <FileSpreadsheet className="h-4 w-4" />
                          <AlertTitle>Required Columns</AlertTitle>
                          <AlertDescription>
                            Your Excel file must contain the following columns in this exact order:
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
                              Riyazi Kiberneti
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 p-2 bg-muted rounded">
                            <span className="font-medium">Position</span>
                            <span className="text-sm text-muted-foreground">
                              Docent
                            </span>
                          </div>
                        </div>
                        <Alert>
                          <Info className="h-4 w-4" />
                          <AlertTitle>Important Notes</AlertTitle>
                          <AlertDescription>
                            <ul className="list-disc list-inside space-y-1 text-sm">
                              <li>The first row must contain column headers</li>
                              <li>All fields are required</li>
                              <li>File format: .xlsx or .xls</li>
                            </ul>
                          </AlertDescription>
                        </Alert>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setIsTeacherFormatInfoOpen(false)}>Close</Button>
                        <Button onClick={downloadTeacherTemplate}>
                          <FileSpreadsheet className="h-4 w-4 mr-2" />
                          Download Template
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                  <Dialog open={isTeacherUploadDialogOpen} onOpenChange={setIsTeacherUploadDialogOpen}>
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
                          Upload an Excel file (.xlsx or .xls) to import multiple teachers at once
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <Alert>
                          <Info className="h-4 w-4" />
                          <AlertTitle>Before uploading</AlertTitle>
                          <AlertDescription>
                            Make sure your Excel file follows the required format. Click "Excel Format" to view requirements or download a template.
                          </AlertDescription>
                        </Alert>
                        <div className="space-y-2">
                          <Label htmlFor="teacher-file">Select Excel File</Label>
                          <Input
                            id="teacher-file"
                            type="file"
                            accept=".xlsx,.xls"
                            onChange={handleTeacherFileUpload}
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setIsTeacherUploadDialogOpen(false)}>Cancel</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Alert className="mb-4">
                <Info className="h-4 w-4" />
                <AlertTitle>Teacher Import</AlertTitle>
                <AlertDescription>
                  Teachers can only be added in bulk via Excel file upload.
                </AlertDescription>
              </Alert>
              <div className="flex items-center gap-4 mb-4">
                <div className="flex-1">
                  <Input
                    placeholder="Search by name..."
                    value={teacherSearchQuery}
                    onChange={(e) => {
                      setTeacherSearchQuery(e.target.value);
                      setTeacherCurrentPage(1);
                    }}
                  />
                </div>
                <Select
                  value={teacherPositionFilter}
                  onValueChange={(value) => {
                    setTeacherPositionFilter(value);
                    setTeacherCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Filter by position" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Positions</SelectItem>
                    <SelectItem value="1">Teacher</SelectItem>
                    <SelectItem value="2">Head Teacher</SelectItem>
                    <SelectItem value="3">Docent</SelectItem>
                    <SelectItem value="4">Professor</SelectItem>
                    <SelectItem value="5">Head Of Department</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Surname</TableHead>
                    <TableHead>Middle Name</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Position</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTeachers.slice((teacherCurrentPage - 1) * teachersPerPage, teacherCurrentPage * teachersPerPage).map((teacher, index) => {
                    const positionLabels: Record<number, string> = {
                      1: "Teacher",
                      2: "Head Teacher",
                      3: "Docent",
                      4: "Professor",
                      5: "Head Of Department",
                    };
                    const positionLabel = teacher.position ? positionLabels[teacher.position] || "Teacher" : "Teacher";

                    return (
                      <TableRow key={`${teacher.id}-${index}`}>
                        <TableCell className="font-medium">{teacher.name || ""}</TableCell>
                        <TableCell>{teacher.surname || ""}</TableCell>
                        <TableCell>{teacher.middleName || ""}</TableCell>
                        <TableCell>{teacher.userName || ""}</TableCell>
                        <TableCell>
                          <Badge>{positionLabel}</Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  Showing {teacherStartIndex} to {teacherEndIndex} of {filteredTeachers.length} teachers
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Page {teacherCurrentPage} of {teacherTotalPages}</span>
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setTeacherCurrentPage(teacherCurrentPage - 1)}
                      disabled={teacherCurrentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setTeacherCurrentPage(teacherCurrentPage + 1)}
                      disabled={teacherCurrentPage >= teacherTotalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
