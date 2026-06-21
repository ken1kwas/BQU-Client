import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import { Checkbox } from "./ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import {
  addFinalExamDate,
  bulkConfirmFinalExams,
  confirmFinalExamGrades,
  createFinalExam,
  listFailedFinalExams,
  listGroups,
  listStudents,
  listFinalExams,
  listFinalExamsToConfirm,
  listTaughtSubjects,
  setGroupExamDate,
  toArray,
  updateFinalExam,
} from "../api/index";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import type {
  DeanFinalExamsMode,
  FinalExam,
  GroupOption,
  StudentOption,
  SubjectOption,
  DeanFinalExamsProps,
} from "../types/deanFinalExams";
import type { Props } from "../types/deanFinalExamsComponent";

function pickString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value))
      return String(value);
  }
  return "";
}

function buildStudentLabel(student: any): string {
  const firstName = pickString(
    student?.name,
    student?.firstName,
    student?.givenName,
  );
  const surname = pickString(
    student?.surname,
    student?.lastName,
    student?.familyName,
  );
  const middleName = pickString(student?.middleName);
  const fullName =
    pickString(student?.fullName) ||
    [firstName, middleName, surname].filter(Boolean).join(" ").trim();
  const fallback = pickString(
    student?.userName,
    student?.studentId,
    student?.userId,
  );
  return fullName || fallback || "Unnamed student";
}

function normalizeStudentOption(student: any): StudentOption {
  return {
    id: pickString(
      student?.id,
      student?.Id,
      student?.studentUserId,
      student?.studentGuid,
      student?.userId,
      student?.studentId,
    ),
    groupId: pickString(
      student?.groupId,
      student?.GroupId,
      student?.group?.id,
      student?.group?.Id,
    ),
    groupCode: pickString(
      student?.groupCode,
      student?.GroupCode,
      student?.group?.groupCode,
      student?.group?.code,
      student?.groupName,
      student?.GroupName,
    ),
    label: buildStudentLabel(student),
  };
}

function normalizeSubjectOption(subject: any): SubjectOption {
  const code = pickString(
    subject?.code,
    subject?.Code,
    subject?.subjectCode,
    subject?.SubjectCode,
  );
  const title = pickString(
    subject?.title,
    subject?.Title,
    subject?.subjectName,
    subject?.SubjectName,
    subject?.name,
    subject?.Name,
  );
  const groupCode = pickString(
    subject?.groupCode,
    subject?.GroupCode,
    subject?.group?.groupCode,
    subject?.group?.code,
    subject?.groupName,
    subject?.GroupName,
  );
  const groupId = pickString(
    subject?.groupId,
    subject?.GroupId,
    subject?.group?.id,
    subject?.group?.Id,
  );
  const taughtSubjectId = pickString(
    subject?.taughtSubjectId,
    subject?.TaughtSubjectId,
    subject?.id,
    subject?.Id,
  );
  const subjectId = pickString(
    subject?.subjectId,
    subject?.SubjectId,
    subject?.subject?.id,
    subject?.subject?.Id,
  );

  const baseLabel = [code, title].filter(Boolean).join(" - ") || code || title;
  const label = groupCode ? `${baseLabel} (${groupCode})` : baseLabel;

  return {
    id: subjectId || taughtSubjectId,
    subjectId,
    taughtSubjectId,
    groupId,
    code,
    title,
    groupCode,
    label: label || "Unnamed subject",
  };
}

function getTaughtSubjectOptionId(subject: SubjectOption): string {
  return subject.taughtSubjectId || subject.id;
}

function normalizeFilterValue(value?: string): string {
  return value?.trim().toLocaleLowerCase("az") ?? "";
}

function filterSubjectOptionsByGroup(
  subjects: SubjectOption[],
  context?: { id?: string; code?: string; groupId?: string; groupCode?: string },
): SubjectOption[] {
  const groupId = normalizeFilterValue(context?.groupId || context?.id);
  const groupCode = normalizeFilterValue(context?.groupCode || context?.code);

  if (!groupId && !groupCode) return subjects;

  return subjects.filter((subject) => {
    const subjectGroupId = normalizeFilterValue(subject.groupId);
    const subjectGroupCode = normalizeFilterValue(subject.groupCode);

    return (
      (groupId && subjectGroupId === groupId) ||
      (groupCode && subjectGroupCode === groupCode)
    );
  });
}

function studentMatchesSearch(student: StudentOption, search: string): boolean {
  const cleanSearch = normalizeFilterValue(search);
  if (!cleanSearch) return true;

  return (
    normalizeFilterValue(student.label).includes(cleanSearch) ||
    normalizeFilterValue(student.groupCode).includes(cleanSearch) ||
    normalizeFilterValue(student.id).includes(cleanSearch)
  );
}

function studentMatchesGroup(
  student: StudentOption,
  group?: GroupOption,
): boolean {
  if (!group) return true;

  const studentGroupId = normalizeFilterValue(student.groupId);
  const studentGroupCode = normalizeFilterValue(student.groupCode);
  const groupId = normalizeFilterValue(group.groupId || group.id);
  const groupCode = normalizeFilterValue(group.groupCode || group.code);

  return (
    (groupId && studentGroupId === groupId) ||
    (groupCode && studentGroupCode === groupCode)
  );
}

function upsertOption<T extends { id: string }>(items: T[], next: T): T[] {
  if (!next.id) return items;
  if (items.some((item) => item.id === next.id)) return items;
  return [...items, next];
}

function buildStudentOptionFromExam(exam: FinalExam): StudentOption {
  return {
    id: exam.studentId ?? "",
    groupId: exam.groupId,
    groupCode: exam.groupCode,
    label: exam.studentName || exam.studentId || "Unnamed student",
  };
}

function buildSubjectOptionFromExam(exam: FinalExam): SubjectOption {
  const taughtSubjectId = exam.taughtSubjectId ?? "";
  const subjectId = exam.subjectId ?? "";
  const code = exam.courseCode ?? "";
  const title = exam.title ?? "";
  const label =
    [code, title].filter(Boolean).join(" - ") ||
    taughtSubjectId ||
    subjectId ||
    "Unnamed subject";

  return {
    id: taughtSubjectId || subjectId,
    taughtSubjectId,
    subjectId,
    groupId: exam.groupId,
    groupCode: exam.groupCode,
    code,
    title,
    label: exam.groupCode ? `${label} (${exam.groupCode})` : label,
  };
}

function normalizeGroupOption(group: any): GroupOption {
  const id = pickString(group?.id, group?.Id, group?.groupId, group?.groupID);
  const code = pickString(group?.groupCode, group?.code, group?.name);
  const groupName = pickString(group?.groupName, group?.name);
  const label =
    code && groupName && code.toLowerCase() !== groupName.toLowerCase()
      ? `${code} - ${groupName}`
      : code || groupName || "Unnamed group";

  return {
    id,
    groupId: id,
    code: code || groupName,
    groupCode: code || groupName,
    label,
  };
}

function mapFinalExamFromApi(exam: any): FinalExam {
  const id =
    exam?.id ??
    exam?.Id ??
    exam?.finalExamId ??
    exam?.FinalExamId ??
    exam?.examId ??
    exam?.ExamId ??
    "";

  const title =
    exam?.title ??
    exam?.Title ??
    exam?.name ??
    exam?.Name ??
    exam?.subjectTitle ??
    exam?.SubjectTitle ??
    exam?.subjectName ??
    exam?.SubjectName ??
    exam?.taughtSubjectTitle ??
    exam?.TaughtSubjectTitle ??
    exam?.subjectCode ??
    exam?.SubjectCode ??
    "Untitled final exam";

  const date =
    exam?.date ??
    exam?.Date ??
    exam?.examDate ??
    exam?.ExamDate ??
    exam?.scheduledDate ??
    exam?.ScheduledDate ??
    exam?.formattedDate ??
    exam?.FormattedDate ??
    undefined;

  const gradesConfirmedRaw =
    exam?.gradesConfirmed ??
    exam?.GradesConfirmed ??
    exam?.isGradesConfirmed ??
    exam?.IsGradesConfirmed ??
    exam?.isConfirmed ??
    exam?.IsConfirmed ??
    exam?.confirmed ??
    exam?.Confirmed;

  const gradeRaw =
    exam?.grade ??
    exam?.Grade ??
    exam?.examGrade ??
    exam?.ExamGrade ??
    exam?.finalGrade ??
    exam?.FinalGrade;

  const finalGradeRaw = exam?.finalGrade ?? exam?.FinalGrade;

  const isAllowedRaw =
    exam?.isAllowed ?? exam?.IsAllowed ?? exam?.allowed ?? exam?.Allowed;

  const numericGrade =
    typeof gradeRaw === "number"
      ? gradeRaw
      : typeof gradeRaw === "string" && gradeRaw.trim() !== ""
        ? Number(gradeRaw)
        : undefined;
  const gradeBeforeExamRaw =
    exam?.gradeBeforeExam ?? exam?.GradeBeforeExam ?? exam?.beforeExamGrade;
  const gradeBeforeExam =
    typeof gradeBeforeExamRaw === "number"
      ? gradeBeforeExamRaw
      : typeof gradeBeforeExamRaw === "string" &&
          gradeBeforeExamRaw.trim() !== ""
        ? Number(gradeBeforeExamRaw)
        : undefined;
  const finalGrade =
    typeof finalGradeRaw === "number"
      ? finalGradeRaw
      : typeof finalGradeRaw === "string" && finalGradeRaw.trim() !== ""
        ? Number(finalGradeRaw)
        : undefined;

  return {
    id: String(id),
    studentId: pickString(exam?.studentId, exam?.StudentId),
    groupId: pickString(
      exam?.groupId,
      exam?.GroupId,
      exam?.group?.id,
      exam?.group?.Id,
    ),
    taughtSubjectId: pickString(
      exam?.taughtSubjectId,
      exam?.TaughtSubjectId,
      exam?.taughtSubject?.id,
      exam?.taughtSubject?.Id,
      exam?.taughtSubject?.taughtSubjectId,
      exam?.taughtSubject?.TaughtSubjectId,
    ),
    subjectId: pickString(
      exam?.subjectId,
      exam?.SubjectId,
      exam?.subject?.id,
      exam?.subject?.Id,
      exam?.taughtSubject?.subjectId,
      exam?.taughtSubject?.SubjectId,
    ),
    title: String(title),
    studentName:
      exam?.studentName ??
      exam?.StudentName ??
      exam?.fullName ??
      exam?.FullName,
    courseCode:
      exam?.subjectCode ??
      exam?.SubjectCode ??
      exam?.courseCode ??
      exam?.CourseCode ??
      exam?.code ??
      exam?.Code ??
      undefined,
    groupCode:
      exam?.groupCode ??
      exam?.GroupCode ??
      exam?.groupName ??
      exam?.GroupName ??
      undefined,
    semester:
      typeof (exam?.semester ?? exam?.Semester) === "number"
        ? Number(exam?.semester ?? exam?.Semester)
        : undefined,
    gradeBeforeExam: Number.isFinite(gradeBeforeExam)
      ? gradeBeforeExam
      : undefined,
    finalGrade: Number.isFinite(finalGrade) ? finalGrade : undefined,
    date: typeof date === "string" ? date : undefined,
    grade: Number.isFinite(numericGrade) ? numericGrade : undefined,
    gradesConfirmed: Boolean(gradesConfirmedRaw),
    isAllowed: typeof isAllowedRaw === "boolean" ? isAllowedRaw : undefined,
  };
}

function canConfirmFinalExam(exam: FinalExam): boolean {
  if (exam.grade == null) return false;
  if (exam.grade === -1) return false;
  return exam.grade >= 0 && exam.grade <= 50;
}

function formatExamDateForDisplay(value?: string): string {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString();
}

function formatExamGradeForDisplay(grade?: number): string {
  if (grade == null) return "-";
  if (grade === -1) return "Qiymet verilməyib";
  return String(grade);
}

function formatGradeBeforeExam(value?: number): string {
  if (value == null) return "-";
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function toDateTimeLocalValue(value?: string): string {
  if (!value) return "";

  const fromNative = new Date(value);
  if (!Number.isNaN(fromNative.getTime())) {
    const tzOffsetMs = fromNative.getTimezoneOffset() * 60 * 1000;
    return new Date(fromNative.getTime() - tzOffsetMs)
      .toISOString()
      .slice(0, 16);
  }

  const trimmed = value.trim();
  const dayFirstMatch = trimmed.match(
    /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s?(AM|PM))?)?$/i,
  );
  if (dayFirstMatch) {
    const [, dayRaw, monthRaw, yearRaw, hourRaw, minuteRaw, , amPmRaw] =
      dayFirstMatch;
    const day = Number(dayRaw);
    const month = Number(monthRaw);
    const year = Number(yearRaw);
    let hour = Number(hourRaw ?? "0");
    const minute = Number(minuteRaw ?? "0");
    const amPm = amPmRaw?.toUpperCase();
    if (amPm === "PM" && hour < 12) hour += 12;
    if (amPm === "AM" && hour === 12) hour = 0;
    const parsed = new Date(year, month - 1, day, hour, minute);
    if (!Number.isNaN(parsed.getTime())) {
      const tzOffsetMs = parsed.getTimezoneOffset() * 60 * 1000;
      return new Date(parsed.getTime() - tzOffsetMs).toISOString().slice(0, 16);
    }
  }

  const yearFirstMatch = trimmed.match(
    /^(\d{4})[./-](\d{1,2})[./-](\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s?(AM|PM))?)?$/i,
  );
  if (yearFirstMatch) {
    const [, yearRaw, monthRaw, dayRaw, hourRaw, minuteRaw, , amPmRaw] =
      yearFirstMatch;
    const year = Number(yearRaw);
    const month = Number(monthRaw);
    const day = Number(dayRaw);
    let hour = Number(hourRaw ?? "0");
    const minute = Number(minuteRaw ?? "0");
    const amPm = amPmRaw?.toUpperCase();
    if (amPm === "PM" && hour < 12) hour += 12;
    if (amPm === "AM" && hour === 12) hour = 0;
    const parsed = new Date(year, month - 1, day, hour, minute);
    if (!Number.isNaN(parsed.getTime())) {
      const tzOffsetMs = parsed.getTimezoneOffset() * 60 * 1000;
      return new Date(parsed.getTime() - tzOffsetMs).toISOString().slice(0, 16);
    }
  }

  return "";
}

function toDateInputValue(value?: string): string {
  const dateTimeValue = toDateTimeLocalValue(value);
  if (!dateTimeValue) return "";
  return dateTimeValue.slice(0, 10);
}

function extractFinalExamItems(payload: any): any[] {
  if (!payload || typeof payload !== "object") return toArray(payload);

  const directItems = payload?.items;
  if (Array.isArray(directItems)) {
    if (directItems.length === 0) return directItems;
    const first = directItems[0];
    const looksLikeExam =
      first &&
      typeof first === "object" &&
      (first?.id || first?.Id || first?.examId || first?.ExamId);
    if (looksLikeExam) return directItems;

    const grouped: any[] = [];
    for (const group of directItems) {
      const nested = toArray(
        group?.items ??
          group?.finals ??
          group?.exams ??
          group?.records ??
          group?.data,
      );
      if (nested.length) grouped.push(...nested);
    }
    if (grouped.length) return grouped;
  }

  return toArray(payload);
}

export function DeanFinalExams({ mode }: Props) {
  const [finalExams, setFinalExams] = useState<FinalExam[]>([]);
  const [groupOptions, setGroupOptions] = useState<GroupOption[]>([]);
  const [isGroupOptionsLoading, setIsGroupOptionsLoading] = useState(false);
  const [selectedGroupFilterId, setSelectedGroupFilterId] = useState("all");
  const [setDateGroupId, setSetDateGroupId] = useState("");
  const [setDateSubjectId, setSetDateSubjectId] = useState("");
  const [setDateInput, setSetDateInput] = useState("");
  const [isSettingGroupDate, setIsSettingGroupDate] = useState(false);
  const [isGroupExamSubjectOptionsLoading, setIsGroupExamSubjectOptionsLoading] =
    useState(false);
  const [finalsPage, setFinalsPage] = useState(1);
  const [finalsPageSize, setFinalsPageSize] = useState(10);
  const [finalsTotalPages, setFinalsTotalPages] = useState(1);
  const [finalsTotalCount, setFinalsTotalCount] = useState(0);
  const [finalsSearchInput, setFinalsSearchInput] = useState("");
  const [finalsSearch, setFinalsSearch] = useState("");
  const [isFinalsLoading, setIsFinalsLoading] = useState(false);
  const [isFinalDateDialogOpen, setIsFinalDateDialogOpen] = useState(false);
  const [selectedFinalExamId, setSelectedFinalExamId] = useState<string | null>(
    null,
  );
  const [finalExamDateInput, setFinalExamDateInput] = useState("");
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
  const [updateExamId, setUpdateExamId] = useState("");
  const [updateStudentId, setUpdateStudentId] = useState("");
  const [updateTaughtSubjectId, setUpdateTaughtSubjectId] = useState("");
  const [updateSubjectId, setUpdateSubjectId] = useState("");
  const [updateExamCourseCode, setUpdateExamCourseCode] = useState("");
  const [updateExamTitle, setUpdateExamTitle] = useState("");
  const [updateGroupCode, setUpdateGroupCode] = useState("");
  const [updateSubjectFallbackLabel, setUpdateSubjectFallbackLabel] =
    useState("Current subject");
  const [updateDateInput, setUpdateDateInput] = useState("");
  const [updateGradeInput, setUpdateGradeInput] = useState("");
  const [updateIsAllowed, setUpdateIsAllowed] = useState(true);
  const [isUpdatingExam, setIsUpdatingExam] = useState(false);
  const [createFinalExamStudentId, setCreateFinalExamStudentId] = useState("");
  const [createFinalExamSubjectId, setCreateFinalExamSubjectId] = useState("");
  const [createFinalExamDateInput, setCreateFinalExamDateInput] = useState("");
  const [createStudentSearchInput, setCreateStudentSearchInput] = useState("");
  const [createStudentGroupFilterId, setCreateStudentGroupFilterId] =
    useState("all");
  const [failedFinalExams, setFailedFinalExams] = useState<FinalExam[]>([]);
  const [isFailedFinalsLoading, setIsFailedFinalsLoading] = useState(false);
  const [studentOptions, setStudentOptions] = useState<StudentOption[]>([]);
  const [subjectOptions, setSubjectOptions] = useState<SubjectOption[]>([]);
  const [createOptionsLoading, setCreateOptionsLoading] = useState(false);
  const [isBulkConfirming, setIsBulkConfirming] = useState(false);
  const confirmableExams = finalExams.filter(
    (exam) => !exam.gradesConfirmed && canConfirmFinalExam(exam),
  );
  const selectedGroupFilter =
    selectedGroupFilterId && selectedGroupFilterId !== "all"
      ? groupOptions.find((group) => group.id === selectedGroupFilterId)
      : undefined;
  const selectedCreateGroupFilter =
    createStudentGroupFilterId && createStudentGroupFilterId !== "all"
      ? groupOptions.find((group) => group.id === createStudentGroupFilterId)
      : undefined;
  const effectiveSetDateGroupId =
    setDateGroupId ||
    (selectedGroupFilterId !== "all" ? selectedGroupFilterId : "");
  const selectedSetDateGroup = setDateGroupId
    ? groupOptions.find((group) => group.id === setDateGroupId)
    : selectedGroupFilter;
  const selectedCreateStudent = studentOptions.find(
    (student) => student.id === createFinalExamStudentId,
  );
  const selectedUpdateStudent = studentOptions.find(
    (student) => student.id === updateStudentId,
  );
  const setDateSubjectOptions = selectedSetDateGroup
    ? filterSubjectOptionsByGroup(subjectOptions, selectedSetDateGroup)
    : [];
  const createSubjectOptions = selectedCreateStudent
    ? filterSubjectOptionsByGroup(subjectOptions, selectedCreateStudent)
    : [];
  const createStudentOptions = studentOptions
    .filter((student) =>
      studentMatchesGroup(student, selectedCreateGroupFilter),
    )
    .filter((student) => studentMatchesSearch(student, createStudentSearchInput))
    .sort((a, b) => a.label.localeCompare(b.label));
  const updateSubjectOptions = filterSubjectOptionsByGroup(subjectOptions, {
    groupId: selectedUpdateStudent?.groupId,
    groupCode: selectedUpdateStudent?.groupCode || updateGroupCode,
  });

  const renderFinalExamRow = (exam: FinalExam) => (
    <TableRow key={exam.id}>
      <TableCell className="font-medium">
        {exam.studentName ? (
          <div className="text-xs text-muted-foreground">
            {exam.studentName}
          </div>
        ) : null}
      </TableCell>
      <TableCell>{exam.courseCode || "-"}</TableCell>
      <TableCell>{exam.groupCode || "-"}</TableCell>
      <TableCell>{formatGradeBeforeExam(exam.gradeBeforeExam)}</TableCell>
      <TableCell>{formatExamDateForDisplay(exam.date)}</TableCell>
      <TableCell>{formatExamGradeForDisplay(exam.grade)}</TableCell>
      <TableCell>
        <Badge variant={exam.isAllowed === false ? "secondary" : "default"}>
          {exam.isAllowed === false
            ? "Buraxılmır"
            : exam.isAllowed === true
              ? "Buraxılır"
              : "-"}
        </Badge>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          {exam.grade == null || exam.grade === -1 ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                openAddDateDialog(exam.id, exam.date, exam.isAllowed)
              }
              disabled={exam.isAllowed === false}
            >
              Tarix seç
            </Button>
          ) : null}
          <Button size="sm" onClick={() => openUpdateExamDialog(exam)}>
            Yenilə
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );

  const loadFinalExamsForList = async () => {
    try {
      setIsFinalsLoading(true);
      const finalsResp = await listFinalExams({
        search: finalsSearch.trim(),
        page: finalsPage,
        pageSize: finalsPageSize,
        groupId:
          selectedGroupFilterId && selectedGroupFilterId !== "all"
            ? selectedGroupFilterId
            : undefined,
      });
      const items = extractFinalExamItems(finalsResp);
      setFinalExams(items.map(mapFinalExamFromApi));

      const totalPagesRaw = finalsResp?.totalPages ?? finalsResp?.TotalPages;
      const totalCountRaw = finalsResp?.totalCount ?? finalsResp?.TotalCount;
      const parsedTotalPages = Number(totalPagesRaw);
      const parsedTotalCount = Number(totalCountRaw);

      setFinalsTotalPages(
        Number.isFinite(parsedTotalPages) && parsedTotalPages > 0
          ? parsedTotalPages
          : 1,
      );
      setFinalsTotalCount(
        Number.isFinite(parsedTotalCount) && parsedTotalCount >= 0
          ? parsedTotalCount
          : items.length,
      );
    } catch (error: any) {
      toast.error(error?.message ?? "Failed to load final exams");
      setFinalExams([]);
      setFinalsTotalPages(1);
      setFinalsTotalCount(0);
    } finally {
      setIsFinalsLoading(false);
    }
  };

  const loadFinalExamsForConfirm = async () => {
    try {
      setIsFinalsLoading(true);
      const items = await listFinalExamsToConfirm();
      setFinalExams(items.map(mapFinalExamFromApi));
    } catch (error: any) {
      toast.error(error?.message ?? "Failed to load final exams");
      setFinalExams([]);
    } finally {
      setIsFinalsLoading(false);
    }
  };

  const refreshFinalExams = async () => {
    if (mode === "confirm") {
      await loadFinalExamsForConfirm();
      return;
    }
    await loadFinalExamsForList();
  };

  const loadStudentAndSubjectOptions = async () => {
    try {
      setCreateOptionsLoading(true);
      const [studentsResp, subjectsResp] = await Promise.all([
        listStudents(1, 200),
        listTaughtSubjects(1, 200),
      ]);

      setStudentOptions(
        toArray(studentsResp)
          .map(normalizeStudentOption)
          .filter((item) => item.id && item.label),
      );
      setSubjectOptions(
        toArray(subjectsResp)
          .map(normalizeSubjectOption)
          .filter((item) => item.id && item.label),
      );
    } catch (error: any) {
      toast.error(error?.message ?? "Failed to load students/subjects");
    } finally {
      setCreateOptionsLoading(false);
    }
  };

  const loadFailedFinalExamsForCreate = async () => {
    try {
      setIsFailedFinalsLoading(true);
      const failedResp = await listFailedFinalExams({
        search: createStudentSearchInput.trim(),
        groupId:
          createStudentGroupFilterId && createStudentGroupFilterId !== "all"
            ? createStudentGroupFilterId
            : undefined,
        page: 1,
        pageSize: 25,
      });
      setFailedFinalExams(
        extractFinalExamItems(failedResp).map(mapFinalExamFromApi),
      );
    } catch (error: any) {
      toast.error(error?.message ?? "Failed to load failed exams");
      setFailedFinalExams([]);
    } finally {
      setIsFailedFinalsLoading(false);
    }
  };

  const loadGroupExamSubjectOptions = async () => {
    try {
      setIsGroupExamSubjectOptionsLoading(true);
      const subjectsResp = await listTaughtSubjects(1, 200);
      setSubjectOptions(
        toArray(subjectsResp)
          .map(normalizeSubjectOption)
          .filter((item) => item.id && item.label),
      );
    } catch (error: any) {
      toast.error(error?.message ?? "Failed to load subjects");
    } finally {
      setIsGroupExamSubjectOptionsLoading(false);
    }
  };

  const loadGroupOptions = async () => {
    try {
      setIsGroupOptionsLoading(true);
      const groupsResp = await listGroups(1, 200);
      const groups = toArray(groupsResp)
        .map(normalizeGroupOption)
        .filter((group) => group.id && group.code)
        .sort((a, b) => a.code.localeCompare(b.code));
      setGroupOptions(groups);
    } catch (error: any) {
      toast.error(error?.message ?? "Failed to load groups");
      setGroupOptions([]);
    } finally {
      setIsGroupOptionsLoading(false);
    }
  };

  useEffect(() => {
    if (mode !== "list") return;
    void loadFinalExamsForList();
  }, [mode, finalsPage, finalsPageSize, finalsSearch, selectedGroupFilterId]);

  useEffect(() => {
    if (mode !== "confirm") return;
    void loadFinalExamsForConfirm();
  }, [mode]);

  useEffect(() => {
    if (mode !== "create") return;
    void loadStudentAndSubjectOptions();
    void loadGroupOptions();
  }, [mode]);

  useEffect(() => {
    if (mode !== "create") return;
    const timeoutId = window.setTimeout(() => {
      void loadFailedFinalExamsForCreate();
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [mode, createStudentSearchInput, createStudentGroupFilterId]);

  useEffect(() => {
    if (mode !== "list") return;
    void loadGroupOptions();
    void loadGroupExamSubjectOptions();
  }, [mode]);

  useEffect(() => {
    if (!setDateSubjectId) return;
    if (
      !setDateSubjectOptions.some(
        (subject) => getTaughtSubjectOptionId(subject) === setDateSubjectId,
      )
    ) {
      setSetDateSubjectId("");
    }
  }, [setDateSubjectId, setDateSubjectOptions]);

  useEffect(() => {
    if (!createFinalExamSubjectId) return;
    if (!createSubjectOptions.some((subject) => subject.id === createFinalExamSubjectId)) {
      setCreateFinalExamSubjectId("");
    }
  }, [createFinalExamSubjectId, createSubjectOptions]);

  useEffect(() => {
    if (!isUpdateDialogOpen) return;
    if (updateTaughtSubjectId) return;
    if (subjectOptions.length === 0) return;

    const courseCode = updateExamCourseCode.trim().toLowerCase();
    const title = updateExamTitle.trim().toLowerCase();
    const groupCode = updateGroupCode.trim().toLowerCase();

    const exactBySubjectAndGroup = updateSubjectId
      ? updateSubjectOptions.find(
          (subject) =>
            subject.subjectId === updateSubjectId &&
            (!groupCode || subject.groupCode?.toLowerCase() === groupCode),
        )
      : undefined;

    const exactBySubject =
      !exactBySubjectAndGroup && updateSubjectId
        ? updateSubjectOptions.find((subject) => subject.subjectId === updateSubjectId)
        : undefined;

    const exactByCodeAndGroup =
      !exactBySubjectAndGroup && !exactBySubject && courseCode && groupCode
        ? updateSubjectOptions.find((subject) => {
            return (
              subject.code?.toLowerCase() === courseCode &&
              subject.groupCode?.toLowerCase() === groupCode
            );
          })
        : undefined;

    const byCode =
      !exactByCodeAndGroup && courseCode
        ? updateSubjectOptions.find((subject) =>
            subject.label.toLowerCase().includes(courseCode),
          )
        : undefined;

    const byTitle =
      !exactByCodeAndGroup && !byCode && title
        ? updateSubjectOptions.find((subject) =>
            subject.label.toLowerCase().includes(title),
          )
        : undefined;

    const resolved =
      exactBySubjectAndGroup ??
      exactBySubject ??
      exactByCodeAndGroup ??
      byCode ??
      byTitle;
    if (resolved) {
      setUpdateTaughtSubjectId(getTaughtSubjectOptionId(resolved));
    }
  }, [
    isUpdateDialogOpen,
    updateSubjectOptions,
    updateTaughtSubjectId,
    updateExamCourseCode,
    updateExamTitle,
    updateGroupCode,
    updateSubjectId,
  ]);

  const openAddDateDialog = (
    finalExamId: string,
    currentDate?: string,
    isAllowed?: boolean,
  ) => {
    if (isAllowed === false) {
      toast.error("Bu qeyd üçün imtahan tarixi təyin etmək icazəli deyil");
      return;
    }
    setSelectedFinalExamId(finalExamId);
    const parsed = currentDate ? new Date(currentDate) : null;
    if (parsed && !Number.isNaN(parsed.getTime())) {
      setFinalExamDateInput(parsed.toISOString().slice(0, 10));
    } else {
      setFinalExamDateInput("");
    }
    setIsFinalDateDialogOpen(true);
  };

  const openUpdateExamDialog = (exam: FinalExam) => {
    setUpdateExamId(exam.id);
    setUpdateStudentId(exam.studentId ?? "");
    setUpdateTaughtSubjectId(exam.taughtSubjectId ?? "");
    setUpdateSubjectId(exam.subjectId ?? "");
    setUpdateExamCourseCode(exam.courseCode ?? "");
    setUpdateExamTitle(exam.title ?? "");
    setUpdateGroupCode(exam.groupCode ?? "");
    setUpdateSubjectFallbackLabel(
      [exam.courseCode, exam.title, exam.groupCode ? `(${exam.groupCode})` : ""]
        .filter(Boolean)
        .join(" ") ||
        exam.title ||
        exam.courseCode ||
        "Current subject",
    );
    setUpdateGradeInput(exam.grade == null ? "" : String(exam.grade));
    setUpdateIsAllowed(exam.isAllowed !== false);
    setUpdateDateInput(toDateInputValue(exam.date));

    setIsUpdateDialogOpen(true);
    if (studentOptions.length === 0 || subjectOptions.length === 0) {
      void loadStudentAndSubjectOptions();
    }
  };

  const handleSaveFinalExamDate = async () => {
    try {
      if (!selectedFinalExamId) {
        toast.error("Select an exam first");
        return;
      }
      if (!finalExamDateInput) {
        toast.error("Date is required");
        return;
      }

      await addFinalExamDate(
        selectedFinalExamId,
        new Date(finalExamDateInput).toISOString(),
      );
      toast.success("Final exam date saved");
      await refreshFinalExams();
      setIsFinalDateDialogOpen(false);
      setSelectedFinalExamId(null);
      setFinalExamDateInput("");
    } catch (error: any) {
      toast.error(error?.message ?? "Failed to save exam date");
    }
  };

  const handleConfirmFinalGrades = async (finalExamId: string) => {
    try {
      await confirmFinalExamGrades(finalExamId);
      toast.success("Grades confirmed");
      await refreshFinalExams();
    } catch (error: any) {
      toast.error(error?.message ?? "Failed to confirm grades");
    }
  };

  const handleBulkConfirmFinalGrades = async () => {
    const ids = confirmableExams.map((exam) => exam.id).filter(Boolean);

    if (ids.length === 0) {
      toast.error("Təsdiq ediləcək final imtahan yoxdur");
      return;
    }

    try {
      setIsBulkConfirming(true);
      const response = await bulkConfirmFinalExams(ids);
      toast.success(response.message || "Final qiymətləri təsdiqləndi");
      await refreshFinalExams();
    } catch (error: any) {
      toast.error(error?.message ?? "Final qiymətlərini təsdiqləmək mümkün olmadı");
    } finally {
      setIsBulkConfirming(false);
    }
  };

  const handleSetGroupDate = async () => {
    try {
      if (!effectiveSetDateGroupId) {
        toast.error("Group is required");
        return;
      }
      if (!setDateSubjectId) {
        toast.error("Subject is required");
        return;
      }
      if (!setDateInput) {
        toast.error("Date is required");
        return;
      }

      setIsSettingGroupDate(true);
      await setGroupExamDate(
        effectiveSetDateGroupId,
        setDateSubjectId,
        new Date(setDateInput).toISOString(),
      );
      toast.success("Final exam date set for selected group");
      await refreshFinalExams();
    } catch (error: any) {
      toast.error(error?.message ?? "Failed to set group exam date");
    } finally {
      setIsSettingGroupDate(false);
    }
  };

  const handleSelectFailedFinalExam = (exam: FinalExam) => {
    const studentId = exam.studentId?.trim();
    const subjectId = (exam.taughtSubjectId || exam.subjectId || "").trim();

    if (!studentId || !subjectId) {
      toast.error("Failed exam data is missing student or subject");
      return;
    }

    const studentOption = buildStudentOptionFromExam(exam);
    const subjectOption = buildSubjectOptionFromExam(exam);

    setStudentOptions((prev) => upsertOption(prev, studentOption));
    setSubjectOptions((prev) => upsertOption(prev, subjectOption));
    setCreateFinalExamStudentId(studentId);
    setCreateFinalExamSubjectId(subjectId);

    const matchingGroup = groupOptions.find((group) =>
      studentMatchesGroup(studentOption, group),
    );
    if (matchingGroup) {
      setCreateStudentGroupFilterId(matchingGroup.id);
    }

    toast.success("Failed exam selected");
  };

  const handleUpdateFinalExam = async () => {
    try {
      if (!updateExamId) {
        toast.error("Exam ID is missing");
        return;
      }
      if (!updateStudentId) {
        toast.error("Student is required");
        return;
      }
      if (!updateTaughtSubjectId) {
        toast.error("Subject is required");
        return;
      }
      if (!updateDateInput) {
        toast.error("Date is required");
        return;
      }
      if (updateGradeInput.trim() === "") {
        toast.error("Grade is required");
        return;
      }

      const parsedGrade = Number(updateGradeInput);
      if (
        !Number.isInteger(parsedGrade) ||
        parsedGrade < -1 ||
        parsedGrade > 50
      ) {
        toast.error("Grade must be an integer between -1 and 50");
        return;
      }

      setIsUpdatingExam(true);
      await updateFinalExam(updateExamId, {
        studentId: updateStudentId,
        taughtSubjectId: updateTaughtSubjectId,
        date: new Date(updateDateInput).toISOString(),
        grade: parsedGrade,
        isAllowed: updateIsAllowed,
      });
      toast.success("Final exam updated");
      setIsUpdateDialogOpen(false);
      await refreshFinalExams();
    } catch (error: any) {
      toast.error(error?.message ?? "Failed to update exam");
    } finally {
      setIsUpdatingExam(false);
    }
  };

  const handleCreateFinalExam = async () => {
    try {
      if (!createFinalExamStudentId.trim()) {
        toast.error("Student ID is required");
        return;
      }
      if (!createFinalExamSubjectId.trim()) {
        toast.error("Subject ID is required");
        return;
      }
      if (!createFinalExamDateInput) {
        toast.error("Date is required");
        return;
      }

      const payload = {
        studentId: createFinalExamStudentId.trim(),
        subjectId: createFinalExamSubjectId.trim(),
        date: new Date(createFinalExamDateInput).toISOString(),
      };

      const created = await createFinalExam(payload);
      const createdId =
        typeof created === "string"
          ? created
          : (created?.id ?? created?.Id ?? created?.data ?? created?.Data);

      if (createdId) {
        toast.success(`Final exam created. ID: ${String(createdId)}`);
      } else {
        toast.success("Final exam created");
      }

      setCreateFinalExamStudentId("");
      setCreateFinalExamSubjectId("");
      setCreateFinalExamDateInput("");
    } catch (error: any) {
      toast.error(error?.message ?? "Failed to create final exam");
    }
  };

  if (mode === "create") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Semester imtahan yarat</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 md:grid-cols-[1fr_260px]">
            <div className="space-y-2">
              <Label htmlFor="final-create-student-search">Tələbə axtar</Label>
              <Input
                id="final-create-student-search"
                value={createStudentSearchInput}
                onChange={(event) =>
                  setCreateStudentSearchInput(event.target.value)
                }
                placeholder="Ad, soyad, istifadəçi adı"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="final-create-group-filter">Qrup</Label>
              <Select
                value={createStudentGroupFilterId}
                onValueChange={(value) => {
                  setCreateStudentGroupFilterId(value);
                  setCreateFinalExamStudentId("");
                  setCreateFinalExamSubjectId("");
                }}
                disabled={isGroupOptionsLoading}
              >
                <SelectTrigger id="final-create-group-filter">
                  <SelectValue
                    placeholder={
                      isGroupOptionsLoading
                        ? "Qruplar yüklənir..."
                        : "Qrup seçin"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Bütün qruplar</SelectItem>
                  {groupOptions.map((group) => (
                    <SelectItem key={`create-group-${group.id}`} value={group.id}>
                      {group.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="final-create-student-id">Telebə</Label>
            <Select
              value={createFinalExamStudentId}
              onValueChange={(value) => {
                setCreateFinalExamStudentId(value);
                setCreateFinalExamSubjectId("");
              }}
              disabled={createOptionsLoading || createStudentOptions.length === 0}
            >
              <SelectTrigger id="final-create-student-id">
                <SelectValue
                  placeholder={
                    createOptionsLoading
                      ? "Loading students..."
                      : "Select a student"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {createStudentOptions.map((student) => (
                  <SelectItem key={student.id} value={student.id}>
                    {[student.label, student.groupCode ? `(${student.groupCode})` : ""]
                      .filter(Boolean)
                      .join(" ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!createOptionsLoading && createStudentOptions.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No students available
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="final-create-subject-id">Fənn</Label>
            <Select
              value={createFinalExamSubjectId}
              onValueChange={setCreateFinalExamSubjectId}
              disabled={
                createOptionsLoading ||
                !selectedCreateStudent ||
                createSubjectOptions.length === 0
              }
            >
              <SelectTrigger id="final-create-subject-id">
                <SelectValue
                  placeholder={
                    createOptionsLoading
                      ? "Loading subjects..."
                      : !selectedCreateStudent
                        ? "Select a student first"
                      : "Select a subject"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {createSubjectOptions.map((subject) => (
                  <SelectItem key={subject.id} value={subject.id}>
                    {subject.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!createOptionsLoading &&
            selectedCreateStudent &&
            createSubjectOptions.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No subjects available for this student's group
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="final-create-date">Tarix və saat</Label>
            <Input
              id="final-create-date"
              type="datetime-local"
              value={createFinalExamDateInput}
              onChange={(e) => setCreateFinalExamDateInput(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label>Kəsilmiş imtahanlar</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={loadFailedFinalExamsForCreate}
                disabled={isFailedFinalsLoading}
              >
                Təzələ
              </Button>
            </div>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tələbə</TableHead>
                    <TableHead>Fənn</TableHead>
                    <TableHead>Qrup</TableHead>
                    <TableHead>İmtahana qədər</TableHead>
                    <TableHead>İmtahan</TableHead>
                    <TableHead className="text-right">Əməliyyat</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isFailedFinalsLoading ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center text-muted-foreground"
                      >
                        Yüklənir...
                      </TableCell>
                    </TableRow>
                  ) : failedFinalExams.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center text-muted-foreground"
                      >
                        Kəsilmiş imtahan tapılmadı
                      </TableCell>
                    </TableRow>
                  ) : (
                    failedFinalExams.map((exam) => (
                      <TableRow key={`failed-${exam.id}-${exam.studentId}`}>
                        <TableCell className="font-medium">
                          {exam.studentName || exam.studentId || "-"}
                        </TableCell>
                        <TableCell>
                          {[exam.courseCode, exam.title].filter(Boolean).join(" - ")}
                        </TableCell>
                        <TableCell>{exam.groupCode || "-"}</TableCell>
                        <TableCell>
                          {formatGradeBeforeExam(exam.gradeBeforeExam)}
                        </TableCell>
                        <TableCell>
                          {formatExamGradeForDisplay(exam.grade)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => handleSelectFailedFinalExam(exam)}
                          >
                            Seç
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
          <div className="flex justify-end">
            <Button
              onClick={handleCreateFinalExam}
              disabled={createOptionsLoading}
            >
              Semester imtahan yarat
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (mode === "confirm") {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Final qiymətlərini təsdiqlə</CardTitle>
              <CardDescription>
                Təsdiq gözləyən qiymətlər üçün bu bölmədən istifadə edin
              </CardDescription>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                onClick={handleBulkConfirmFinalGrades}
                disabled={
                  isFinalsLoading ||
                  isBulkConfirming ||
                  confirmableExams.length === 0
                }
              >
                {isBulkConfirming
                  ? "Təsdiqlənir..."
                  : `Hamısını təsdiqlə (${confirmableExams.length})`}
              </Button>
              <Button variant="outline" onClick={refreshFinalExams}>
                Təzələ
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>İmtahan</TableHead>
                <TableHead>Qrup</TableHead>
                <TableHead>Qiymet</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Əməliyyat</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isFinalsLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center text-muted-foreground"
                  >
                    Yüklənir...
                  </TableCell>
                </TableRow>
              ) : confirmableExams.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center text-muted-foreground"
                  >
                    Təsdiq ediləcək final imtahan yoxdur
                  </TableCell>
                </TableRow>
              ) : (
                confirmableExams.map((exam) => (
                  <TableRow key={`confirm-${exam.id}`}>
                    <TableCell className="font-medium">
                      <div>{exam.title}</div>
                      {exam.studentName ? (
                        <div className="text-xs text-muted-foreground">
                          {exam.studentName}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell>{exam.groupCode || "-"}</TableCell>
                    <TableCell>
                      {formatExamGradeForDisplay(exam.grade)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={exam.gradesConfirmed ? "secondary" : "default"}
                      >
                        {exam.gradesConfirmed ? "Təsdiqlənib" : "Gözləyir"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        onClick={() => handleConfirmFinalGrades(exam.id)}
                        disabled={exam.gradesConfirmed}
                      >
                        Qiymətləri təsdiqlə
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Dialog
        open={isFinalDateDialogOpen}
        onOpenChange={setIsFinalDateDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Final imtahan tarixi</DialogTitle>
            <DialogDescription>
              Seçilmiş final imtahanı üçün tarixi təyin edin
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="final-exam-date">Tarix</Label>
            <Input
              id="final-exam-date"
              type="date"
              value={finalExamDateInput}
              onChange={(e) => setFinalExamDateInput(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setIsFinalDateDialogOpen(false)}
            >
              Bağla
            </Button>
            <Button onClick={handleSaveFinalExamDate}>Yadda saxla</Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Final imtahanı yenilə</DialogTitle>
            <DialogDescription>
              Tələbə, fənn, tarix və qiymət məlumatlarını yeniləyin
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label htmlFor="final-update-student-id">Tələbə</Label>
              <Select
                value={updateStudentId}
                onValueChange={(value) => {
                  setUpdateStudentId(value);
                  setUpdateSubjectId("");
                  setUpdateTaughtSubjectId("");
                }}
                disabled={createOptionsLoading || studentOptions.length === 0}
              >
                <SelectTrigger id="final-update-student-id">
                  <SelectValue
                    placeholder={
                      createOptionsLoading
                        ? "Loading students..."
                        : "Select a student"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {studentOptions.map((student) => (
                    <SelectItem key={student.id} value={student.id}>
                      {student.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="final-update-subject-id">Fənn</Label>
              <Select
                value={updateTaughtSubjectId}
                onValueChange={setUpdateTaughtSubjectId}
                disabled={
                  createOptionsLoading ||
                  (!updateTaughtSubjectId && updateSubjectOptions.length === 0)
                }
              >
                <SelectTrigger id="final-update-subject-id">
                  <SelectValue
                    placeholder={
                      createOptionsLoading
                        ? "Loading subjects..."
                        : "Select a subject"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {updateTaughtSubjectId &&
                  !updateSubjectOptions.some(
                    (subject) =>
                      getTaughtSubjectOptionId(subject) ===
                      updateTaughtSubjectId,
                  ) ? (
                    <SelectItem value={updateTaughtSubjectId}>
                      {updateSubjectFallbackLabel}
                    </SelectItem>
                  ) : null}
                  {updateSubjectOptions.map((subject) => (
                    <SelectItem
                      key={getTaughtSubjectOptionId(subject)}
                      value={getTaughtSubjectOptionId(subject)}
                    >
                      {subject.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="final-update-group-code">Qrup</Label>
              <Input
                id="final-update-group-code"
                value={updateGroupCode || "-"}
                disabled
                readOnly
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="final-update-date">Tarix</Label>
              <Input
                id="final-update-date"
                type="date"
                value={updateDateInput}
                onChange={(e) => setUpdateDateInput(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="final-update-grade">Qiymət</Label>
              <Input
                id="final-update-grade"
                type="number"
                min={-1}
                max={50}
                step={1}
                value={updateGradeInput}
                onChange={(e) => setUpdateGradeInput(e.target.value)}
                placeholder="-1 to 50"
              />
              <p className="text-xs text-muted-foreground">
                Qiymət -1 (imtahan verilməyib) ilə 50 arasında olmalıdır
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="final-update-is-allowed">Buraxılır</Label>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="final-update-is-allowed"
                  checked={updateIsAllowed}
                  onCheckedChange={(checked) =>
                    setUpdateIsAllowed(checked !== false)
                  }
                />
                <Label
                  htmlFor="final-update-is-allowed"
                  className="cursor-pointer"
                >
                  Buraxılır
                </Label>
              </div>
              <p className="text-xs text-muted-foreground">
                İcazə statusu: {updateIsAllowed ? "Buraxılır" : "Buraxılmır"}
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setIsUpdateDialogOpen(false)}
            >
              Bağla
            </Button>
            <Button onClick={handleUpdateFinalExam} disabled={isUpdatingExam}>
              Yadda saxla
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <div>
              <CardTitle>Final imtahan siyahısı</CardTitle>
              <CardDescription>
                Bütün final imtahanları və onların tarixləri
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Input
                value={finalsSearchInput}
                onChange={(e) => setFinalsSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setFinalsPage(1);
                    setFinalsSearch(finalsSearchInput.trim());
                  }
                }}
                placeholder="Axtar..."
                className="w-[220px]"
              />
              <Button
                variant="outline"
                onClick={() => {
                  setFinalsPage(1);
                  setFinalsSearch(finalsSearchInput.trim());
                }}
              >
                Axtar
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setFinalsSearchInput("");
                  setFinalsSearch("");
                  setFinalsPage(1);
                }}
                disabled={!finalsSearchInput && !finalsSearch}
              >
                Təmizlə
              </Button>
              <Select
                value={selectedGroupFilterId}
                onValueChange={(value) => {
                  setSelectedGroupFilterId(value);
                  setSetDateGroupId(value === "all" ? "" : value);
                  setSetDateSubjectId("");
                  setFinalsPage(1);
                }}
              >
                <SelectTrigger className="w-[220px]">
                  <SelectValue
                    placeholder={
                      isGroupOptionsLoading
                        ? "Qruplar yüklənir..."
                        : "Qrupa görə filter"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Bütün qruplar</SelectItem>
                  {groupOptions.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={refreshFinalExams}>
                Təzələ
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4 grid gap-2 md:grid-cols-[1fr_1fr_180px_auto]">
            <Select
              value={effectiveSetDateGroupId}
              onValueChange={(value) => {
                setSetDateGroupId(value);
                setSetDateSubjectId("");
              }}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    isGroupOptionsLoading
                      ? "Qruplar yüklənir..."
                      : "Tarix təyin ediləcək qrupu seçin"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {groupOptions.map((group) => (
                  <SelectItem key={`set-date-${group.id}`} value={group.id}>
                    {group.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={setDateSubjectId}
              onValueChange={setSetDateSubjectId}
              disabled={
                isGroupExamSubjectOptionsLoading ||
                !effectiveSetDateGroupId ||
                setDateSubjectOptions.length === 0
              }
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    isGroupExamSubjectOptionsLoading
                      ? "Fənnlər yüklənir..."
                      : !effectiveSetDateGroupId
                        ? "Əvvəl qrup seçin"
                      : "Fənn seçin"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {setDateSubjectOptions.map((subject) => (
                  <SelectItem
                    key={`set-date-subject-${getTaughtSubjectOptionId(subject)}`}
                    value={getTaughtSubjectOptionId(subject)}
                  >
                    {subject.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={setDateInput}
              onChange={(e) => setSetDateInput(e.target.value)}
            />
            <Button
              onClick={handleSetGroupDate}
              disabled={
                !effectiveSetDateGroupId ||
                !setDateSubjectId ||
                !setDateInput ||
                isSettingGroupDate
              }
            >
              Qrupa final tarixi təyin et
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tələbə</TableHead>
                <TableHead>Fənn kodu</TableHead>
                <TableHead>Qrup</TableHead>
                <TableHead>İmtahana qədər</TableHead>
                <TableHead>Tarix</TableHead>
                <TableHead>Qiymet</TableHead>
                <TableHead>İcazə statusu</TableHead>
                <TableHead className="text-right">Əməliyyat</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {finalExams.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="text-center text-muted-foreground"
                  >
                    Final imtahan tapılmadı
                  </TableCell>
                </TableRow>
              ) : (
                finalExams.map(renderFinalExamRow)
              )}
            </TableBody>
          </Table>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Page {finalsPage} of {Math.max(1, finalsTotalPages)} (
              {finalsTotalCount} items)
            </p>
            <div className="flex items-center gap-2">
              <Select
                value={String(finalsPageSize)}
                onValueChange={(value) => {
                  setFinalsPageSize(Number(value));
                  setFinalsPage(1);
                }}
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 / page</SelectItem>
                  <SelectItem value="20">20 / page</SelectItem>
                  <SelectItem value="50">50 / page</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                disabled={isFinalsLoading || finalsPage <= 1}
                onClick={() => setFinalsPage((prev) => Math.max(1, prev - 1))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={
                  isFinalsLoading || finalsPage >= Math.max(1, finalsTotalPages)
                }
                onClick={() =>
                  setFinalsPage((prev) =>
                    Math.min(Math.max(1, finalsTotalPages), prev + 1),
                  )
                }
              >
                Next
              </Button>
            </div>
          </div>{" "}
        </CardContent>
      </Card>
    </>
  );
}
