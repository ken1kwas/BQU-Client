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
import { Checkbox } from "./ui/checkbox";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import { DeanStudentDetail } from "./DeanStudentDetail";
import type { DeanStudentDetailStudent } from "../types/deanStudentDetail";
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
  deleteStudent,
  ensureHHMMSS,
  uploadStudentsExcel,
} from "../api";
import type {
  Course,
  Group,
  Room,
  Student,
  Teacher,
} from "../types/deanManagement";
import type {
  CourseFormClassTime,
  GeneratedClassPreview,
} from "../types/courseForm";

const ALLOWED_COURSE_HOURS = [15, 30, 45, 50, 60, 75, 90, 105] as const;

const CLASS_TIME_PRESETS = [
  {
    id: "shift-1-slot-1",
    label: "1-ci novbe 1",
    description: "Kurs 1,3",
    start: "08:30",
    end: "09:50",
  },
  {
    id: "shift-1-slot-2",
    label: "1-ci novbe 2",
    description: "Kurs 1,3",
    start: "10:10",
    end: "11:30",
  },
  {
    id: "shift-1-slot-3",
    label: "1-ci novbe 3",
    description: "Kurs 1,3",
    start: "11:40",
    end: "13:00",
  },
  {
    id: "shift-2-slot-1",
    label: "2-ci novbe 1",
    description: "Kurs 2,4",
    start: "13:10",
    end: "14:30",
  },
  {
    id: "shift-2-slot-2",
    label: "2-ci novbe 2",
    description: "Kurs 2,4",
    start: "14:50",
    end: "16:10",
  },
  {
    id: "shift-2-slot-3",
    label: "2-ci novbe 3",
    description: "Kurs 2,4",
    start: "16:20",
    end: "17:40",
  },
] as const;

const findClassTimePreset = (start?: string, end?: string) =>
  CLASS_TIME_PRESETS.find(
    (preset) =>
      ensureHHMMSS(preset.start) === ensureHHMMSS(start ?? "") &&
      ensureHHMMSS(preset.end) === ensureHHMMSS(end ?? ""),
  );

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
    r.roomName ?? r.name ?? r.Name ?? r.RoomName ?? r.room ?? r.Room ?? "";

  const roomId = r.id ?? r.Id ?? r.roomId ?? r.RoomId ?? "";

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

const mapGroupFromApi = (
  g: any,
  departmentsList?: any[],
  specializationsList?: any[],
): Group => {
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
      const specName =
        foundSpec.name ??
        foundSpec.Name ??
        foundSpec.title ??
        foundSpec.Title ??
        "";
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
  const constructedName =
    firstName && surname
      ? `${firstName} ${middleName ? middleName + " " : ""}${surname}`.trim()
      : "";
  const fullName = s.fullName ?? constructedName ?? s.name ?? "";

  return {
    id: String(
      s.id ??
        s.Id ??
        s.studentUserId ??
        s.studentGuid ??
        s.userId ??
        s.studentId ??
        "",
    ),
    studentId: s.userName ?? s.username ?? s.studentId ?? s.userId ?? "",
    name: fullName,
    email: s.email ?? s.emailAddress ?? "",
    groupId: s.groupId ?? s.group?.id ?? s.groupId,
    groupCode:
      s.groupName ??
      s.groupCode ??
      s.group?.groupCode ??
      s.group?.code ??
      s.group?.name ??
      "",
    year: s.year ?? s.currentYear ?? s.academicYear ?? 0,
    specialization:
      s.speciality ?? s.specialization ?? s.specializationName ?? "",
    dateOfBirth: s.dateOfBirth ?? s.birthDate ?? s.dob,
    phoneNumber: s.phoneNumber ?? s.phone ?? s.mobile ?? "",
    address: s.address ?? "",
    language: s.language ?? "",
    yearOfAdmission: s.yearOfAdmission ?? s.admissionYear ?? s.yearOfAdmission,
    admissionScore: s.admissionScore ?? s.score ?? undefined,
  };
};

const FREQUENCY_LABELS: Record<number, string> = {
  1: "Alt",
  2: "Üst",
  3: "Hər ikisi",
};

const DAY_LABELS: Record<number, string> = {
  1: "Bazar ertəsi",
  2: "Çərşənbə axşamı",
  3: "Çərşənbə",
  4: "Cümə axşamı",
  5: "Cümə",
  6: "Şənbə",
  7: "Bazar günü",
};

const CLASS_TYPE_OPTIONS = [
  { value: 0, label: "Lecture" },
  { value: 1, label: "Seminar" },
] as const;

function formatGeneratedClassDate(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function buildGeneratedClassPreview(
  classTimes: CourseFormClassTime[],
  hours?: number,
  year?: number,
  semester?: number,
): GeneratedClassPreview[] {
  const totalClasses = Math.floor(Number(hours ?? 0) / 2);
  if (totalClasses <= 0 || !year || !semester) return [];

  const usableClassTimes = classTimes.filter(
    (dto) =>
      Boolean(dto.start) &&
      Boolean(dto.end) &&
      Boolean(dto.room?.trim()) &&
      Number(dto.day) >= 1 &&
      Number(dto.day) <= 7 &&
      Number(dto.frequency) >= 1 &&
      Number(dto.frequency) <= 3,
  );
  if (usableClassTimes.length === 0) return [];

  const yearToUse = new Date().getFullYear();
  const semesterStartDate =
    semester % 2 === 1
      ? new Date(Date.UTC(yearToUse, 8, 14))
      : new Date(Date.UTC(yearToUse, 1, 14));

  let startDayOfWeek = semesterStartDate.getUTCDay();
  if (startDayOfWeek === 0) startDayOfWeek = 7;
  const daysUntilMonday = startDayOfWeek === 1 ? 0 : 8 - startDayOfWeek;
  const firstMonday = new Date(semesterStartDate);
  firstMonday.setUTCDate(firstMonday.getUTCDate() + daysUntilMonday);

  const preview: GeneratedClassPreview[] = [];
  let isLecturer = true;
  let classesCreated = 0;
  let weekNumber = 1;

  while (classesCreated < totalClasses && weekNumber <= 200) {
    const isUpperWeek = weekNumber % 2 === 1;
    const currentWeekMonday = new Date(firstMonday);
    currentWeekMonday.setUTCDate(
      currentWeekMonday.getUTCDate() + (weekNumber - 1) * 7,
    );

    usableClassTimes.forEach((dto, sourceIndex) => {
      if (classesCreated >= totalClasses) return;

      const fires =
        dto.frequency === 3 ||
        (dto.frequency === 2 && isUpperWeek) ||
        (dto.frequency === 1 && !isUpperWeek);

      if (!fires) return;

      const classDate = new Date(currentWeekMonday);
      classDate.setUTCDate(classDate.getUTCDate() + Number(dto.day) - 1);
      const sequence = classesCreated + 1;

      preview.push({
        key: `${sourceIndex}-${weekNumber}-${sequence}`,
        sourceIndex,
        sequence,
        dateLabel: formatGeneratedClassDate(classDate),
        day: Number(dto.day),
        room: dto.room,
        start: dto.start,
        end: dto.end,
        classType: dto.classType ?? (isLecturer ? 0 : 1),
      });

      isLecturer = !isLecturer;
      classesCreated++;
    });

    weekNumber++;
  }

  return preview;
}

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
    department:
      (c as any).departmentName ?? dept.name ?? dept.departmentName ?? "",
    teacherId:
      c.teacherId ?? (typeof teacher === "object" ? teacher.id : undefined),
    teacherName: teacherName,
    groupId: c.groupId ?? group.id,
    groupCode: c.groupCode ?? group.groupCode ?? "",
    studentCount: c.studentCount ?? 0,
    hasSyllabus: Boolean(c.syllabusId),
    departmentName:
      (c as any).departmentName ?? dept.name ?? dept.departmentName ?? "",
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
        classTimes?: CourseFormClassTime[];
        autoCreateClassTypes?: boolean;
      }
    >
  >({});
  const [isCourseDialogOpen, setIsCourseDialogOpen] = useState(false);
  const [editingCourseId, setEditingCourseId] = useState<number | null>(null);

  const [groupForm, setGroupForm] = useState<Partial<Group>>({});
  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<number | null>(null);

  const [studentForm, setStudentForm] = useState<Partial<Student>>({});
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isFormatInfoOpen, setIsFormatInfoOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] =
    useState<DeanStudentDetailStudent | null>(null);
  const [deletingStudentId, setDeletingStudentId] = useState<string | null>(
    null,
  );
  const [studentPendingDelete, setStudentPendingDelete] =
    useState<Student | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const studentsPerPage = 10;

  const [studentSearchQuery, setStudentSearchQuery] = useState("");
  const [studentGroupFilter, setStudentGroupFilter] = useState<string>("all");
  const [studentYearFilter, setStudentYearFilter] = useState<string>("all");

  const [teacherCurrentPage, setTeacherCurrentPage] = useState(1);
  const teachersPerPage = 10;

  const [teacherSearchQuery, setTeacherSearchQuery] = useState("");
  const [teacherPositionFilter, setTeacherPositionFilter] =
    useState<string>("all");

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
          listRooms(1, 110),
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
        setGroups(
          toArray(groupsResp).map((g: any) =>
            mapGroupFromApi(g, departmentsList, specializationsList),
          ),
        );
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
    setCurrentPage(1);
  }, [studentSearchQuery, studentGroupFilter, studentYearFilter]);

  useEffect(() => {
    const fetchFilteredStudents = async () => {
      try {
        if (studentSearchQuery) {
          const resp = await searchStudents(studentSearchQuery);
          const studentsArray = toArray(resp);
          setStudents(studentsArray.map(mapStudentFromApi));
        } else if (
          studentGroupFilter !== "all" ||
          studentYearFilter !== "all"
        ) {
          // Ждем загрузки groups перед фильтрацией
          if (groups.length === 0) {
            return;
          }
          const groupObj = groups.find(
            (g) => (g.code || g.groupCode) === studentGroupFilter,
          );
          const groupId =
            studentGroupFilter !== "all" ? groupObj?.id?.toString() : undefined;
          const year =
            studentYearFilter !== "all"
              ? parseInt(studentYearFilter, 10)
              : undefined;
          const resp = await filterStudents(groupId, year);
          const studentsArray = toArray(resp);
          setStudents(studentsArray.map(mapStudentFromApi));
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
                toast.error(
                  "Unable to load students. The server returned an error (500). Please check the backend logs.",
                  {
                    duration: 5000,
                  },
                );
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
      const resp = await listRooms(1, 110);
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
      classTimes: [
        { start: "", end: "", day: 1, room: "", frequency: 3, classType: null },
      ],
      credits: 0,
      hours: 0,
      year: 1,
      semester: 1,
      autoCreateClassTypes: true,
    });
    setEditingCourseId(null);
    setIsCourseDialogOpen(true);
  };

  const addClassTime = () => {
    setCourseForm({
      ...courseForm,
      classTimes: [
        ...(courseForm.classTimes || []),
        { start: "", end: "", day: 1, room: "", frequency: 3, classType: null },
      ],
    });
  };

  const removeClassTime = (index: number) => {
    const newClassTimes = [...(courseForm.classTimes || [])];
    newClassTimes.splice(index, 1);
    setCourseForm({ ...courseForm, classTimes: newClassTimes });
  };

  const updateClassTime = (
    index: number,
    field: keyof CourseFormClassTime,
    value: string | number | null,
  ) => {
    const newClassTimes = [...(courseForm.classTimes || [])];
    newClassTimes[index] = { ...newClassTimes[index], [field]: value };
    setCourseForm({ ...courseForm, classTimes: newClassTimes });
  };

  const updateClassTimePreset = (index: number, presetId: string) => {
    const preset = CLASS_TIME_PRESETS.find((item) => item.id === presetId);
    if (!preset) return;

    const newClassTimes = [...(courseForm.classTimes || [])];
    newClassTimes[index] = {
      ...newClassTimes[index],
      start: preset.start,
      end: preset.end,
    };
    setCourseForm({ ...courseForm, classTimes: newClassTimes });
  };

  const handleEditCourse = (course: Course) => {
    const dept = departments.find((d) => d.name === course.department);
    setCourseForm({
      ...course,
      departmentId: dept?.id?.toString(),
      autoCreateClassTypes: true,
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
        if (
          courseForm.credits === undefined ||
          courseForm.credits === null ||
          courseForm.credits === 0
        ) {
          toast.error("Credits is required");
          return;
        }
        if (
          courseForm.hours === undefined ||
          courseForm.hours === null ||
          courseForm.hours === 0
        ) {
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
        const selectedGroup = groups.find(
          (g) => String(g.id) === String(courseForm.groupId),
        );
        const selectedGroupYear =
          typeof selectedGroup?.year === "number"
            ? selectedGroup.year
            : undefined;
        if (
          typeof selectedGroupYear === "number" &&
          Number(courseForm.year) < selectedGroupYear
        ) {
          toast.error(
            `Year can't be less than group's current year (${selectedGroupYear})`,
          );
          return;
        }

        const autoCreateClassTypes = courseForm.autoCreateClassTypes !== false;
        const generatedClasses = buildGeneratedClassPreview(
          courseForm.classTimes || [],
          courseForm.hours,
          courseForm.year,
          courseForm.semester,
        );

        const validClassTimes = (courseForm.classTimes || [])
          .filter((ct: CourseFormClassTime) => {
            return (
              ct.start &&
              ct.end &&
              ct.room &&
              ct.room.trim() &&
              ct.day &&
              ct.frequency !== undefined
            );
          })
          .map((ct: CourseFormClassTime) => {
            const startTime = ensureHHMMSS(ct.start);
            const endTime = ensureHHMMSS(ct.end);
            const day = Number(ct.day);
            const room = String(ct.room).trim();
            const frequency = Number(ct.frequency);

            if (
              !startTime ||
              startTime === "00:00:00" ||
              !endTime ||
              endTime === "00:00:00"
            ) {
              throw new Error(
                "Start and end times are required for class times",
              );
            }
            if (!room) {
              throw new Error("Room is required for class times");
            }
            if (!day || day < 1 || day > 7) {
              throw new Error("Valid day (1-7) is required for class times");
            }
            if (!frequency || frequency < 1 || frequency > 3) {
              throw new Error(
                "Valid frequency (1-3) is required for class times",
              );
            }

            return {
              start: startTime,
              end: endTime,
              day: day,
              room: room,
              frequency: frequency,
              classType: autoCreateClassTypes ? null : (ct.classType ?? null),
            };
          });

        if (!autoCreateClassTypes) {
          if (generatedClasses.length === 0) {
            toast.error(
              "Add hours and complete class times to generate classes",
            );
            return;
          }
          if (
            validClassTimes.some(
              (classTime) =>
                classTime.classType === null ||
                classTime.classType === undefined,
            )
          ) {
            toast.error("Select a class type for each class time");
            return;
          }
        }

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
        console.log(
          "SUBMIT educationLanguage =",
          groupForm.educationLanguage,
          groupForm,
        );
        await createGroup({
          ...basePayload,
          educationLanguage: Number(groupForm.educationLanguage),
          educationLevel: Number(groupForm.educationLevel),
        });
        toast.success("Group added successfully");
      }
      const resp = await listGroups(1, 100);
      setGroups(
        toArray(resp).map((g: any) =>
          mapGroupFromApi(g, departments, specializations),
        ),
      );
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
        id: `local-${Date.now()}`,
      } as Student;
      setStudents([...students, newStudent]);
      toast.success("Student added successfully");
    }
    setStudentForm({});
  };

  const handleDeleteStudent = async () => {
    if (!studentPendingDelete) return;

    const studentId = String(studentPendingDelete.id ?? "");
    if (!studentId) {
      toast.error("Student id is missing");
      return;
    }

    try {
      setDeletingStudentId(studentId);
      await deleteStudent(studentId);
      toast.success("Student deleted successfully");
      setStudents((prev) =>
        prev.filter((item) => String(item.id) !== String(studentId)),
      );
      setSelectedStudent((prev) =>
        prev && String(prev.id) === String(studentId) ? null : prev,
      );
    } catch (error: any) {
      toast.error(error?.message ?? "Failed to delete student");
    } finally {
      setStudentPendingDelete(null);
      setDeletingStudentId(null);
    }
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
      } else if (
        typeof result === "object" &&
        result !== null &&
        !(result instanceof Blob)
      ) {
        if ((result as any).message || (result as any).error) {
          toast.error(
            (result as any).message ||
              (result as any).error ||
              "Error importing file",
          );
        } else {
          toast.success("File uploaded successfully");
        }
      } else {
        toast.success("File uploaded successfully");
      }

      try {
        const resp = await listStudents(1, 100);
        const studentsArray = toArray(resp);
        if (studentsArray.length > 0) {
          const mapped = studentsArray.map(mapStudentFromApi);
          setStudents(mapped);
        }
      } catch (listErr: any) {
        try {
          const resp = await filterStudents(undefined, undefined);
          const studentsArray = toArray(resp);
          if (studentsArray.length > 0) {
            setStudents(studentsArray.map(mapStudentFromApi));
          }
        } catch (filterErr) {}
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
          toast.error(
            (result as any).message ||
              (result as any).error ||
              "Error importing file",
          );
        } else {
          toast.success("File uploaded successfully");
        }
      } else {
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
  const totalPages = Math.max(
    1,
    Math.ceil(filteredStudents.length / studentsPerPage),
  );
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * studentsPerPage;
  const endIndex = Math.min(
    safeCurrentPage * studentsPerPage,
    filteredStudents.length,
  );

  const filteredTeachers = teachers.filter((teacher) => {
    const searchLower = teacherSearchQuery.toLowerCase();
    const fullName =
      `${teacher.name || ""} ${teacher.surname || ""} ${teacher.middleName || ""} ${teacher.userName || ""}`.toLowerCase();
    const matchesSearch = !teacherSearchQuery || fullName.includes(searchLower);
    const matchesPosition =
      teacherPositionFilter === "all" ||
      (teacher.position && String(teacher.position) === teacherPositionFilter);

    return matchesSearch && matchesPosition;
  });

  const teacherTotalPages = Math.ceil(
    filteredTeachers.length / teachersPerPage,
  );
  const teacherStartIndex = (teacherCurrentPage - 1) * teachersPerPage + 1;
  const teacherEndIndex = Math.min(
    teacherCurrentPage * teachersPerPage,
    filteredTeachers.length,
  );
  const generatedClassPreview = buildGeneratedClassPreview(
    courseForm.classTimes || [],
    courseForm.hours,
    courseForm.year,
    courseForm.semester,
  );

  if (selectedStudent) {
    return (
      <DeanStudentDetail
        student={selectedStudent}
        onBack={() => setSelectedStudent(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1>Tədris İdarəetməsi</h1>
        <p className="text-muted-foreground">
          Bütün sistem obyektlərini və resurslarını idarə edin
        </p>
      </div>

      <Tabs defaultValue="courses" className="w-full">
        <TabsList>
          <TabsTrigger value="courses">
            <BookOpen className="h-4 w-4 mr-2" />
            Fənnlər
          </TabsTrigger>
          <TabsTrigger value="groups">
            <Users className="h-4 w-4 mr-2" />
            Qruplar
          </TabsTrigger>
          <TabsTrigger value="students">
            <UserCircle className="h-4 w-4 mr-2" />
            Tələbələr
          </TabsTrigger>
          <TabsTrigger value="teachers">
            <Users className="h-4 w-4 mr-2" />
            Müəllimlər
          </TabsTrigger>
        </TabsList>

        <TabsContent value="courses" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Fənnlərin idarəsi</CardTitle>
                  <CardDescription>
                    Fənn məlumatlarını əlavə edin, redaktə edin və ya silin
                  </CardDescription>
                </div>
                <Dialog
                  open={isCourseDialogOpen}
                  onOpenChange={setIsCourseDialogOpen}
                >
                  <DialogTrigger asChild>
                    <Button onClick={handleAddCourse}>
                      <Plus className="h-4 w-4 mr-2" />
                      Fənn əlavə edin
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>
                        {editingCourseId
                          ? "Edit Course"
                          : "Yeni fənn əlavə edin"}
                      </DialogTitle>
                      <DialogDescription>
                        {editingCourseId
                          ? "Update course information"
                          : "Yeni fənn üçün detalları daxil edin\n"}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="course-code">Kod</Label>
                          <Input
                            id="course-code"
                            placeholder="m.ü, TRX-1"
                            maxLength={20}
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
                          <Label htmlFor="course-title">Ad</Label>
                          <Input
                            id="course-title"
                            placeholder="m.ü, Tarix"
                            maxLength={100}
                            value={courseForm.title || ""}
                            onChange={(e) =>
                              setCourseForm({
                                ...courseForm,
                                title: e.target.value,
                              })
                            }
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="course-department">Kafedra</Label>
                          <Select
                            value={courseForm.departmentId?.toString() || ""}
                            onValueChange={(value) =>
                              setCourseForm({
                                ...courseForm,
                                departmentId: value,
                              })
                            }
                          >
                            <SelectTrigger id="course-department">
                              <SelectValue placeholder="Kafedra seçin" />
                            </SelectTrigger>
                            <SelectContent>
                              {departments.map((dept) => {
                                const deptId =
                                  dept?.id ?? dept?.Id ?? dept?.departmentId;
                                const deptName =
                                  dept?.name ??
                                  dept?.Name ??
                                  dept?.title ??
                                  dept?.Title ??
                                  "";
                                if (!deptId || !deptName) return null;
                                return (
                                  <SelectItem
                                    key={String(deptId)}
                                    value={String(deptId)}
                                  >
                                    {deptName}
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="course-teacher">Müəllim</Label>
                          <Select
                            value={courseForm.teacherId?.toString() || ""}
                            onValueChange={(value) =>
                              setCourseForm({ ...courseForm, teacherId: value })
                            }
                          >
                            <SelectTrigger id="course-teacher">
                              <SelectValue placeholder="Müəllim seçin" />
                            </SelectTrigger>
                            <SelectContent>
                              {teachers.map((teacher) => {
                                const fullName =
                                  `${teacher.name || ""} ${teacher.surname || ""} ${teacher.middleName || ""}`.trim() ||
                                  teacher.userName ||
                                  `Teacher ${teacher.id}`;
                                return (
                                  <SelectItem
                                    key={teacher.id}
                                    value={teacher.id.toString()}
                                  >
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
                          <Label htmlFor="course-group">Qrup</Label>
                          <Select
                            value={courseForm.groupId?.toString() || ""}
                            onValueChange={(value) => {
                              const nextGroup = groups.find(
                                (g) => String(g.id) === String(value),
                              );
                              const nextGroupYear =
                                typeof nextGroup?.year === "number"
                                  ? nextGroup.year
                                  : undefined;
                              setCourseForm((prev) => {
                                const nextForm: any = {
                                  ...prev,
                                  groupId: value,
                                };
                                if (
                                  typeof nextGroupYear === "number" &&
                                  (nextForm.year === undefined ||
                                    nextForm.year === null ||
                                    Number(nextForm.year) < nextGroupYear)
                                ) {
                                  nextForm.year = nextGroupYear;
                                }
                                return nextForm;
                              });
                            }}
                          >
                            <SelectTrigger id="course-group">
                              <SelectValue placeholder="Qrup seçin" />
                            </SelectTrigger>
                            <SelectContent>
                              {groups.map((group) => (
                                <SelectItem
                                  key={group.id}
                                  value={group.id.toString()}
                                >
                                  {group.code || group.groupCode}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="course-credits">Kredit sayı</Label>
                          <Input
                            id="course-credits"
                            type="number"
                            min="0"
                            placeholder="m.ü, 5"
                            value={courseForm.credits || ""}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (value === "") {
                                setCourseForm({
                                  ...courseForm,
                                  credits: undefined,
                                });
                                return;
                              }
                              const numValue = parseInt(value, 10);
                              if (!isNaN(numValue) && numValue >= 0) {
                                setCourseForm({
                                  ...courseForm,
                                  credits: numValue,
                                });
                              }
                            }}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="course-hours">Saat</Label>
                          <Select
                            value={courseForm.hours?.toString() || ""}
                            onValueChange={(value) =>
                              setCourseForm({
                                ...courseForm,
                                hours: value ? parseInt(value, 10) : undefined,
                              })
                            }
                          >
                            <SelectTrigger id="course-hours">
                              <SelectValue placeholder="Saat seçin" />
                            </SelectTrigger>
                            <SelectContent>
                              {ALLOWED_COURSE_HOURS.map((hours) => (
                                <SelectItem
                                  key={hours}
                                  value={hours.toString()}
                                >
                                  {hours}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="course-year">Kurs</Label>
                          <Select
                            value={courseForm.year?.toString() || ""}
                            onValueChange={(value: string) =>
                              setCourseForm({
                                ...courseForm,
                                year: parseInt(value),
                              })
                            }
                          >
                            <SelectTrigger id="course-year">
                              <SelectValue placeholder="Select year" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1">1 kurs</SelectItem>
                              <SelectItem value="2">2 kurs</SelectItem>
                              <SelectItem value="3">3 kurs</SelectItem>
                              <SelectItem value="4">4 kurs</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="course-semester">Semestr</Label>
                          <Select
                            value={courseForm.semester?.toString() || ""}
                            onValueChange={(value) =>
                              setCourseForm({
                                ...courseForm,
                                semester: parseInt(value),
                              })
                            }
                          >
                            <SelectTrigger id="course-semester">
                              <SelectValue placeholder="Semestr seçin" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1">Semestr 1</SelectItem>
                              <SelectItem value="2">Semestr 2</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {!editingCourseId && (
                        <div className="space-y-2">
                          <Label className="text-sm">Class type mode</Label>
                          <div className="flex items-start gap-3 rounded-md border p-3">
                            <Checkbox
                              id="course-auto-create-class-types"
                              checked={
                                courseForm.autoCreateClassTypes !== false
                              }
                              onCheckedChange={(checked) =>
                                setCourseForm({
                                  ...courseForm,
                                  autoCreateClassTypes: checked !== false,
                                })
                              }
                            />
                            <div className="space-y-1">
                              <Label
                                htmlFor="course-auto-create-class-types"
                                className="cursor-pointer"
                              >
                                Auto create class types
                              </Label>
                              <p className="text-sm text-muted-foreground">
                                Checked sends <code>classType: null</code>.
                                Unchecked lets you set a type for each schedule
                                slot and preview the generated classes below.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label>Dərs Vaxtları</Label>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={addClassTime}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Dərs vaxtları əlavə edin
                          </Button>
                        </div>
                        <div className="space-y-3">
                          {(courseForm.classTimes || []).map(
                            (classTime, index) => (
                              <Card key={index} className="p-4">
                                <div className="space-y-3">
                                  <div className="space-y-2">
                                    <Label>Ders Saati</Label>
                                    <Select
                                      value={
                                        findClassTimePreset(
                                          classTime.start,
                                          classTime.end,
                                        )?.id ?? ""
                                      }
                                      onValueChange={(value) =>
                                        updateClassTimePreset(index, value)
                                      }
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="Vaxt araligi secin" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {CLASS_TIME_PRESETS.map((preset) => (
                                          <SelectItem
                                            key={preset.id}
                                            value={preset.id}
                                          >
                                            {preset.label} ({preset.description}
                                            ) {preset.start}-{preset.end}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    {classTime.start && classTime.end && (
                                      <p className="text-sm text-muted-foreground">
                                        Secilen vaxt: {classTime.start}-
                                        {classTime.end}
                                      </p>
                                    )}
                                  </div>
                                  <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-2">
                                      <Label>Başlanma Saatı</Label>
                                      <Input
                                        type="time"
                                        value={classTime.start}
                                        readOnly
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label>Bitmə Saatı</Label>
                                      <Input
                                        type="time"
                                        value={classTime.end}
                                        readOnly
                                      />
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-3 gap-3">
                                    <div className="space-y-2">
                                      <Label>Gün</Label>
                                      <Select
                                        value={classTime.day.toString()}
                                        onValueChange={(value) =>
                                          updateClassTime(
                                            index,
                                            "day",
                                            parseInt(value),
                                          )
                                        }
                                      >
                                        <SelectTrigger>
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {Object.entries(DAY_LABELS).map(
                                            ([value, label]) => (
                                              <SelectItem
                                                key={value}
                                                value={value}
                                              >
                                                {label}
                                              </SelectItem>
                                            ),
                                          )}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <div className="space-y-2">
                                      <Label>Otaq</Label>
                                      <Select
                                        value={classTime.room}
                                        onValueChange={(value) =>
                                          updateClassTime(index, "room", value)
                                        }
                                      >
                                        <SelectTrigger>
                                          <SelectValue placeholder="Otaq seçin" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {rooms.length === 0 ? (
                                            <SelectItem value="" disabled>
                                              No rooms available
                                            </SelectItem>
                                          ) : (
                                            rooms.map((room) => {
                                              const roomId = room.id;
                                              const roomName = room.name || "";
                                              const roomCapacity =
                                                room.capacity || 0;

                                              if (!roomId || !roomName)
                                                return null;

                                              return (
                                                <SelectItem
                                                  key={String(roomId)}
                                                  value={roomName}
                                                >
                                                  {roomName}{" "}
                                                  {roomCapacity > 0
                                                    ? `(${roomCapacity})`
                                                    : ""}
                                                </SelectItem>
                                              );
                                            })
                                          )}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <div className="space-y-2">
                                      <Label>Həftə</Label>
                                      <Select
                                        value={classTime.frequency.toString()}
                                        onValueChange={(value) =>
                                          updateClassTime(
                                            index,
                                            "frequency",
                                            parseInt(value),
                                          )
                                        }
                                      >
                                        <SelectTrigger>
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {Object.entries(FREQUENCY_LABELS).map(
                                            ([value, label]) => (
                                              <SelectItem
                                                key={value}
                                                value={value}
                                              >
                                                {label}
                                              </SelectItem>
                                            ),
                                          )}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  </div>
                                  {courseForm.autoCreateClassTypes ===
                                    false && (
                                    <div className="space-y-2">
                                      <Label>
                                        Class type for this schedule slot
                                      </Label>
                                      <Select
                                        value={
                                          classTime.classType === null ||
                                          classTime.classType === undefined
                                            ? ""
                                            : String(classTime.classType)
                                        }
                                        onValueChange={(value) =>
                                          updateClassTime(
                                            index,
                                            "classType",
                                            Number(value),
                                          )
                                        }
                                      >
                                        <SelectTrigger>
                                          <SelectValue placeholder="Select class type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {CLASS_TYPE_OPTIONS.map((option) => (
                                            <SelectItem
                                              key={option.value}
                                              value={String(option.value)}
                                            >
                                              {option.label}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  )}
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
                            ),
                          )}
                        </div>
                      </div>
                      {!editingCourseId &&
                        courseForm.autoCreateClassTypes === false && (
                          <div className="space-y-3">
                            <div>
                              <Label>Generated classes</Label>
                              <p className="text-sm text-muted-foreground">
                                Preview of the classes that will be created from
                                the schedule slots above.
                              </p>
                            </div>
                            {generatedClassPreview.length === 0 ? (
                              <Card className="p-4 text-sm text-muted-foreground">
                                Add hours and at least one complete class time
                                to see generated classes.
                              </Card>
                            ) : (
                              <div className="space-y-3">
                                {generatedClassPreview.map((generatedClass) => (
                                  <Card
                                    key={generatedClass.key}
                                    className="p-4"
                                  >
                                    <div className="grid gap-3 md:grid-cols-[1.2fr_1fr] md:items-end">
                                      <div className="space-y-1">
                                        <p className="font-medium">
                                          Class {generatedClass.sequence}
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                          {generatedClass.dateLabel} •{" "}
                                          {DAY_LABELS[generatedClass.day]} •{" "}
                                          {generatedClass.start}-
                                          {generatedClass.end} •{" "}
                                          {generatedClass.room}
                                        </p>
                                      </div>
                                      <div className="space-y-1">
                                        <Label>Class type</Label>
                                        <p className="text-sm font-medium">
                                          {generatedClass.classType === 0
                                            ? "Lecture"
                                            : "Seminar"}
                                        </p>
                                      </div>
                                    </div>
                                  </Card>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setIsCourseDialogOpen(false)}
                      >
                        Bağla
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
                    <TableHead>Kod</TableHead>
                    <TableHead>Ad</TableHead>
                    <TableHead>Kafedra</TableHead>
                    <TableHead>Müəllim</TableHead>
                    <TableHead>Qrup</TableHead>
                    <TableHead>Kredit sayı</TableHead>
                    <TableHead>Kurs</TableHead>
                    <TableHead className="text-right">Əməllər</TableHead>
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
                          {/* <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditCourse(course)} //EDIT TAUGHT SUBJECT
                          >
                            <Pencil className="h-4 w-4" />
                          </Button> */}
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
                  <CardTitle>Qrupların idarəsi</CardTitle>
                  <CardDescription>
                    Qrup məlumatlarını əlavə edin, redaktə edin və ya silin
                  </CardDescription>
                </div>
                <Dialog
                  open={isGroupDialogOpen}
                  onOpenChange={setIsGroupDialogOpen}
                >
                  <DialogTrigger asChild>
                    <Button onClick={handleAddGroup}>
                      <Plus className="h-4 w-4 mr-2" />
                      Qrup əlavə edin
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>
                        {editingGroupId ? "Edit Group" : "Yeni qrup əlavə edin"}
                      </DialogTitle>
                      <DialogDescription>
                        {editingGroupId
                          ? "Update group information"
                          : "Yeni qrup üçün detalları daxil edin "}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="group-code">Kod</Label>
                        <Input
                          id="group-code"
                          placeholder="m.ü, C-25"
                          maxLength={20}
                          value={groupForm.code || groupForm.groupCode || ""}
                          onChange={(e) =>
                            setGroupForm({
                              ...groupForm,
                              code: e.target.value,
                              groupCode: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="group-specialization">İxtisas</Label>
                        <Select
                          value={groupForm.specializationId || ""}
                          onValueChange={(value) =>
                            setGroupForm((prev) => ({
                              ...prev,
                              specializationId: value,
                            }))
                          }
                        >
                          <SelectTrigger id="group-specialization">
                            <SelectValue placeholder="İxtisas seçin" />
                          </SelectTrigger>
                          <SelectContent>
                            {specializations.length === 0 ? (
                              <SelectItem value="" disabled>
                                No specializations available
                              </SelectItem>
                            ) : (
                              specializations.map((spec) => {
                                const specId =
                                  spec?.id ??
                                  spec?.Id ??
                                  spec?.ID ??
                                  spec?.specializationId;
                                const specName =
                                  spec?.name ??
                                  spec?.Name ??
                                  spec?.title ??
                                  spec?.Title ??
                                  "";
                                if (!specId || !specName) return null;
                                return (
                                  <SelectItem
                                    key={String(specId)}
                                    value={String(specId)}
                                  >
                                    {specName}
                                  </SelectItem>
                                );
                              })
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="group-year">Kurs</Label>
                        <Select
                          value={groupForm.year?.toString() || ""}
                          onValueChange={(value) =>
                            setGroupForm((prev) => ({
                              ...prev,
                              year: Number(value),
                            }))
                          }
                        >
                          <SelectTrigger id="group-year">
                            <SelectValue placeholder="Kurs seçin" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">1 kurs</SelectItem>
                            <SelectItem value="2">2 kurs</SelectItem>
                            <SelectItem value="3">3 kurs</SelectItem>
                            <SelectItem value="4">4 kurs</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="group-language">Təhsil dili</Label>
                        <Select
                          value={groupForm.educationLanguage?.toString() || ""}
                          onValueChange={(value) =>
                            setGroupForm((prev) => ({
                              ...prev,
                              educationLanguage: Number(value),
                            }))
                          }
                        >
                          <SelectTrigger id="group-language">
                            <SelectValue placeholder="Dil seçin" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">Azərbaycan</SelectItem>
                            <SelectItem value="2">Rus</SelectItem>
                            <SelectItem value="3">İngilis</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="group-level">Təhsil səviyyəsi</Label>
                        <Select
                          value={groupForm.educationLevel?.toString() || ""}
                          onValueChange={(value) =>
                            setGroupForm((prev) => ({
                              ...prev,
                              educationLevel: Number(value),
                            }))
                          }
                        >
                          <SelectTrigger id="group-level">
                            <SelectValue placeholder="Səviyyə seçin" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">Bakalavr</SelectItem>
                            <SelectItem value="2">Magistr</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setIsGroupDialogOpen(false)}
                      >
                        Bağla
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
                    <TableHead>Kod</TableHead>
                    <TableHead>İxtisas</TableHead>
                    <TableHead>Dil</TableHead>
                    <TableHead>Tələbə Sayı</TableHead>
                    <TableHead>Təhsil Səviyyəsi</TableHead>
                    <TableHead>Kurs</TableHead>
                    <TableHead className="text-right">Əməllər</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groups.map((group, index) => (
                    <TableRow
                      key={
                        group.id ?? `${group.code || group.groupCode}-${index}`
                      }
                    >
                      <TableCell className="font-medium">
                        {group.code || group.groupCode || "-"}
                      </TableCell>
                      <TableCell>
                        {group.department || group.departmentName || "-"}
                      </TableCell>
                      <TableCell>{group.educationLanguage}</TableCell>
                      <TableCell>{group.studentCount}</TableCell>
                      <TableCell>{group.educationLevel}</TableCell>
                      <TableCell>{group.year} kurs</TableCell>
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
                  <CardTitle>Tələbələrin idarəsi</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <Dialog
                    open={isFormatInfoOpen}
                    onOpenChange={setIsFormatInfoOpen}
                  >
                    <DialogTrigger asChild>
                      <Button variant="outline">
                        <Info className="h-4 w-4 mr-2" />
                        Excel Formatı
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Excel Fayl Format Məlumatı</DialogTitle>
                        <DialogDescription>
                          Tələbələrin Excel vasitəsi ilə əlavə olunması üçün
                          tələb olunan format
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <Alert>
                          <FileSpreadsheet className="h-4 w-4" />
                          <AlertTitle>Tələb olunan sütunlar</AlertTitle>
                          <AlertDescription>
                            Excel faylınız bu dəqiq ardıcıllıqla aşağıdakı
                            sütunları daxil etməlidir:
                          </AlertDescription>
                        </Alert>
                        <div className="space-y-2">
                          <div className="grid grid-cols-2 gap-2 p-2 bg-muted rounded">
                            <span className="font-medium">Ad</span>
                            <span className="text-sm text-muted-foreground">
                              Əli
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 p-2 bg-muted rounded">
                            <span className="font-medium">Soyad</span>
                            <span className="text-sm text-muted-foreground">
                              Əliyev
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 p-2 bg-muted rounded">
                            <span className="font-medium">Ata adı</span>
                            <span className="text-sm text-muted-foreground">
                              Əli
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 p-2 bg-muted rounded">
                            <span className="font-medium">FIN kod</span>
                            <span className="text-sm text-muted-foreground">
                              7ABCQWE
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 p-2 bg-muted rounded">
                            <span className="font-medium">Qrupun kodu</span>
                            <span className="text-sm text-muted-foreground">
                              TK-109
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 p-2 bg-muted rounded">
                            <span className="font-medium">Qəbul balı</span>
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
                              <li>
                                Birinci sətirdə sütun başlıqları olmalıdır ya
                                boş olmalıdır
                              </li>
                              <li>Bütün sahələr mütləqdir</li>
                              <li>Fayl formatı: yalnız .xlsx və ya .xls</li>
                              <li>
                                Qrup adı sistemdəki mövcud qrupa uyğun olmalıdır
                              </li>
                            </ul>
                          </AlertDescription>
                        </Alert>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          onClick={() => setIsFormatInfoOpen(false)}
                        >
                          Bağla
                        </Button>
                        <Button onClick={downloadTemplate}>
                          <FileSpreadsheet className="h-4 w-4 mr-2" />
                          Şablonu yükləyin
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
                        Yüklə
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>
                          Excel vasitəsi ilə tələbələri yüklə
                        </DialogTitle>
                        <DialogDescription>
                          Bir neçə tələbələni əlavə etmək üçün Excel faylını
                          yükləyin
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <Alert>
                          <Info className="h-4 w-4" />
                          <AlertTitle>Yükləmədən əvvəl</AlertTitle>
                          <AlertDescription>
                            Excel faylınızın tələb olunan formata uyğun
                            olduğundan əmin olun. Tələblərə baxmaq və ya şablonu
                            yükləmək üçün "Excel Formatı" üzərinə klikləyin.
                          </AlertDescription>
                        </Alert>
                        <div className="space-y-2">
                          <Label htmlFor="student-file">
                            Excel faylını seçin
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
                          Bağla
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
                <AlertTitle>Tələbə əlavə edilməsi</AlertTitle>
                <AlertDescription>
                  Tələbələr yalnız Excel faylı yükləmə yolu ilə toplu şəkildə
                  əlavə edilə bilər.
                </AlertDescription>
              </Alert>
              <div className="flex items-center gap-4 mb-4">
                <div className="flex-1">
                  <Input
                    placeholder="Ada görə axtarın..."
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
                    <SelectItem value="all">Bütün Qruplar</SelectItem>
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
                    <SelectValue placeholder="İllərə görə filtr" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Bütün Kurslar</SelectItem>
                    <SelectItem value="1">1 kurs</SelectItem>
                    <SelectItem value="2">2 kurs</SelectItem>
                    <SelectItem value="3">3 kurs</SelectItem>
                    <SelectItem value="4">4 kurs</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>FIN kod</TableHead>
                    <TableHead>Tam adı</TableHead>
                    <TableHead>Qrup</TableHead>
                    <TableHead>Kurs</TableHead>
                    <TableHead>Qəbul ili</TableHead>
                    <TableHead>Qəbul balı</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents
                    .slice(startIndex, endIndex)
                    .map((student) => (
                      <TableRow
                        key={student.id}
                        className="cursor-pointer"
                        onClick={() =>
                          setSelectedStudent({ id: String(student.id) })
                        }
                      >
                        <TableCell className="font-medium">
                          {student.studentId || "-"}
                        </TableCell>
                        <TableCell>{student.name || "-"}</TableCell>
                        <TableCell>{student.groupCode || "-"}</TableCell>
                        <TableCell>
                          {student.year ? `${student.year} kurs` : "-"}
                        </TableCell>
                        <TableCell>{student.yearOfAdmission || "-"}</TableCell>
                        <TableCell>{student.admissionScore ?? "-"}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(event) => {
                                event.stopPropagation();
                                setSelectedStudent({ id: String(student.id) });
                              }}
                              aria-label={`View ${student.name || "student"}`}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(event) => {
                                event.stopPropagation();
                                setStudentPendingDelete(student);
                              }}
                              disabled={
                                deletingStudentId === String(student.id)
                              }
                              aria-label={`Delete ${student.name || "student"}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  Ümumi {filteredStudents.length} tələbədən {startIndex + 1}-dən{" "}
                  {endIndex}-a qədəri göstərilir
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    Səhifə {safeCurrentPage}/{totalPages}
                  </span>
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(safeCurrentPage - 1)}
                      disabled={safeCurrentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(safeCurrentPage + 1)}
                      disabled={safeCurrentPage >= totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
              <AlertDialog
                open={Boolean(studentPendingDelete)}
                onOpenChange={(open) => {
                  if (!open) setStudentPendingDelete(null);
                }}
              >
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Tələbəni sil?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Bu əməliyyat geri alına bilməz.{" "}
                      {studentPendingDelete?.name
                        ? `${studentPendingDelete.name} silinecek.`
                        : "Seçilmiş tələbə silinəcək."}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={Boolean(deletingStudentId)}>
                      Imtina
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteStudent}
                      disabled={Boolean(deletingStudentId)}
                    >
                      {deletingStudentId ? "Silinir..." : "Sil"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="teachers" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Müəllimlərin İdarəsi</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <Dialog
                    open={isTeacherFormatInfoOpen}
                    onOpenChange={setIsTeacherFormatInfoOpen}
                  >
                    <DialogTrigger asChild>
                      <Button variant="outline">
                        <Info className="h-4 w-4 mr-2" />
                        Excel Formatı
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Excel Fayl Format Məlumatı</DialogTitle>
                        <DialogDescription>
                          Müəllimlərin Excel vasitəsi ilə əlavə olunması üçün
                          tələb olunan format
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <Alert>
                          <FileSpreadsheet className="h-4 w-4" />
                          <AlertTitle>Tələb olunan sütunlar</AlertTitle>
                          <AlertDescription>
                            Excel faylınız bu dəqiq ardıcıllıqla aşağıdakı
                            sütunları daxil etməlidir:
                          </AlertDescription>
                        </Alert>
                        <div className="space-y-2">
                          <div className="grid grid-cols-2 gap-2 p-2 bg-muted rounded">
                            <span className="font-medium">Ad</span>
                            <span className="text-sm text-muted-foreground">
                              Əli
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 p-2 bg-muted rounded">
                            <span className="font-medium">Soyad</span>
                            <span className="text-sm text-muted-foreground">
                              Əliyev
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 p-2 bg-muted rounded">
                            <span className="font-medium">Ata adı</span>
                            <span className="text-sm text-muted-foreground">
                              Əli
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 p-2 bg-muted rounded">
                            <span className="font-medium">FIN kod</span>
                            <span className="text-sm text-muted-foreground">
                              K2L3MRW
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 p-2 bg-muted rounded">
                            <span className="font-medium">Kafedra adı</span>
                            <span className="text-sm text-muted-foreground">
                              Tarix kafedrası
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 p-2 bg-muted rounded">
                            <span className="font-medium">Vəzifə</span>
                            <span className="text-sm text-muted-foreground">
                              Docent
                            </span>
                          </div>
                        </div>
                        <Alert>
                          <Info className="h-4 w-4" />
                          <AlertTitle>Important Notes</AlertTitle>
                          <AlertDescription>
                            <ul className="list-disc list-outside pl-5 space-y-1 text-sm">
                              <li>
                                Birinci sətirdə sütun başlıqları olmalıdır ya
                                boş olmalıdır
                              </li>
                              <li>Bütün sahələr mütləqdir</li>
                              <li>Fayl formatı: yalnız .xlsx və ya .xls</li>
                              <li>
                                <span>
                                  Müəllimin vəzifələri yalnız bunlar ola bilər:
                                </span>

                                <ul className="mt-1 list-[circle] list-outside pl-5 space-y-1">
                                  <li>Teacher</li>
                                  <li>Head Teacher</li>
                                  <li>Docent</li>
                                  <li>Professor</li>
                                  <li>Head Of Department</li>
                                </ul>
                              </li>
                            </ul>
                          </AlertDescription>
                        </Alert>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          onClick={() => setIsTeacherFormatInfoOpen(false)}
                        >
                          Bağla
                        </Button>
                        <Button onClick={downloadTeacherTemplate}>
                          <FileSpreadsheet className="h-4 w-4 mr-2" />
                          Şablonu yükləyin
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
                        Yüklə
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>
                          Excel vasitəsi ilə müəllimləri yüklə
                        </DialogTitle>
                        <DialogDescription>
                          Bir neçə müəllimi əlavə etmək üçün Excel faylını
                          yükləyin
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <Alert>
                          <Info className="h-4 w-4" />
                          <AlertTitle>Yükləmədən əvvəl</AlertTitle>
                          <AlertDescription>
                            Excel faylınızın tələb olunan formata uyğun
                            olduğundan əmin olun. Tələblərə baxmaq və ya şablonu
                            yükləmək üçün "Excel Formatı" üzərinə klikləyin.
                          </AlertDescription>
                        </Alert>
                        <div className="space-y-2">
                          <Label htmlFor="teacher-file">
                            Excel faylını seçin
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
                          Bağla
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
                <AlertTitle>Müəllim əlavə edilməsi</AlertTitle>
                <AlertDescription>
                  Müəllimlər yalnız Excel faylı yükləmə yolu ilə toplu şəkildə
                  əlavə edilə bilər.
                </AlertDescription>
              </Alert>
              <div className="flex items-center gap-4 mb-4">
                <div className="flex-1">
                  <Input
                    placeholder="Ada görə axtarın..."
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
                    <SelectItem value="all">Bütün Vəzifələr</SelectItem>
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
                    <TableHead>Ad</TableHead>
                    <TableHead>Soyad</TableHead>
                    <TableHead>Ata adı</TableHead>
                    <TableHead>FIN kod</TableHead>
                    <TableHead>Vəzifə</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTeachers
                    .slice(
                      (teacherCurrentPage - 1) * teachersPerPage,
                      teacherCurrentPage * teachersPerPage,
                    )
                    .map((teacher, index) => {
                      const positionLabels: Record<number, string> = {
                        1: "Teacher",
                        2: "Head Teacher",
                        3: "Docent",
                        4: "Professor",
                        5: "Head Of Department",
                      };
                      const positionLabel = teacher.position
                        ? positionLabels[teacher.position] || "Teacher"
                        : "Teacher";

                      return (
                        <TableRow key={`${teacher.id}-${index}`}>
                          <TableCell className="font-medium">
                            {teacher.name || ""}
                          </TableCell>
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
                  Ümumi {filteredTeachers.length} müəllimdən{" "}
                  {teacherStartIndex + 1}-dən {teacherEndIndex}-a qədəri
                  göstərilir
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    Səhifə {teacherCurrentPage}/{teacherTotalPages}
                  </span>
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setTeacherCurrentPage(teacherCurrentPage - 1)
                      }
                      disabled={teacherCurrentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setTeacherCurrentPage(teacherCurrentPage + 1)
                      }
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
