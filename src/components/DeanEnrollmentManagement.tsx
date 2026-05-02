import { useEffect, useState } from "react";
import { Loader2, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { listStudents, listTaughtSubjects, toArray } from "../api/index";
import {
  createStudentSubjectEnrollment,
  deleteStudentSubjectEnrollment,
  getAllStudentSubjectEnrollments,
  listStudentSubjectEnrollments,
  updateStudentSubjectEnrollment,
} from "../services/studentSubjectEnrollment";
import type {
  EnrollmentEditor,
  EnrollmentFormState,
  StudentOption,
  TaughtSubjectOption,
} from "../types/deanEnrollmentManagement";
import type {
  CreateStudentSubjectEnrollmentDto,
  StudentSubjectEnrollmentGetAllResponseDto,
  StudentSubjectEnrollmentDto,
} from "../types/studentSubjectEnrollment";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./ui/alert-dialog";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Skeleton } from "./ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";

function pickString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value))
      return String(value);
  }
  return "";
}

function buildStudentLabel(student: any) {
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
  const fallbackId = pickString(
    student?.userName,
    student?.studentId,
    student?.userId,
  );
  return fullName || fallbackId || "Adsız tələbə";
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
    label: buildStudentLabel(student),
  };
}

function normalizeTaughtSubjectOption(item: any): TaughtSubjectOption {
  const subjectName = pickString(
    item?.title,
    item?.subjectName,
    item?.name,
    item?.code,
  );
  const groupCode = pickString(
    item?.groupCode,
    item?.group?.groupCode,
    item?.group?.code,
    item?.groupName,
  );

  return {
    id: pickString(item?.id, item?.Id, item?.taughtSubjectId),
    label: groupCode ? `${subjectName} (${groupCode})` : subjectName,
    subjectName: subjectName || "Adsız fənn",
  };
}

const EMPTY_FORM: EnrollmentFormState = {
  studentId: "",
  failedSubjectCode: "",
  taughtSubjectId: "",
  attempt: "",
};

export function DeanEnrollmentManagement() {
  const [enrollments, setEnrollments] = useState<StudentSubjectEnrollmentDto[]>(
    [],
  );
  const [allEnrollmentsPage, setAllEnrollmentsPage] =
    useState<StudentSubjectEnrollmentGetAllResponseDto>({
      items: [],
      page: 1,
      pageSize: 10,
      totalCount: 0,
      totalPages: 0,
    });
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [taughtSubjects, setTaughtSubjects] = useState<TaughtSubjectOption[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editor, setEditor] = useState<EnrollmentEditor>({ mode: "create" });
  const [form, setForm] = useState<EnrollmentFormState>(EMPTY_FORM);

  const loadData = async (showRefreshingState = false) => {
    if (showRefreshingState) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      setError(null);

      const [enrollmentResponse, allEnrollmentResponse, studentResponse, taughtSubjectResponse] =
        await Promise.all([
          listStudentSubjectEnrollments(),
          getAllStudentSubjectEnrollments({
            page: allEnrollmentsPage.page,
            pageSize: allEnrollmentsPage.pageSize,
          }),
          listStudents(1, 200),
          listTaughtSubjects(1, 200),
        ]);

      setEnrollments(enrollmentResponse);
      setAllEnrollmentsPage(allEnrollmentResponse);
      setStudents(
        toArray(studentResponse)
          .map(normalizeStudentOption)
          .filter((item) => item.id && item.label),
      );
      setTaughtSubjects(
        toArray(taughtSubjectResponse)
          .map(normalizeTaughtSubjectOption)
          .filter((item) => item.id && item.subjectName),
      );
    } catch (err: any) {
      setError(err?.message || "Alt Qrupları yükləmə alışması başarısız oldu");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadAllEnrollmentsPage = async (
    page: number,
    pageSize = allEnrollmentsPage.pageSize,
  ) => {
    setRefreshing(true);
    try {
      setError(null);
      const response = await getAllStudentSubjectEnrollments({ page, pageSize });
      setAllEnrollmentsPage(response);
    } catch (err: any) {
      setError(err?.message || "Alt Qrupları yükləmə alışması başarısız oldu");
    } finally {
      setRefreshing(false);
    }
  };

  const openCreateDialog = () => {
    setEditor({ mode: "create" });
    setForm(EMPTY_FORM);
    setIsDialogOpen(true);
  };

  const openEditDialog = (enrollment: {
    enrollmentId: string;
    studentId: string;
    studentName: string;
    taughtSubjectId: string;
    subjectName: string;
    attempt?: number;
  }) => {
    setEditor({
      mode: "edit",
      enrollmentId: enrollment.enrollmentId,
      enrollment: {
        ...enrollment,
        attempt: enrollment.attempt ?? 1,
      },
    });
      setForm({
        studentId: enrollment.studentId,
        failedSubjectCode: "",
        taughtSubjectId: enrollment.taughtSubjectId,
        attempt:
          typeof enrollment.attempt === "number" ? String(enrollment.attempt) : "",
    });
    setIsDialogOpen(true);
  };

  const resetDialog = () => {
    setIsDialogOpen(false);
    setForm(EMPTY_FORM);
    setEditor({ mode: "create" });
  };

  const handleSubmit = async () => {
    const parsedAttempt =
      form.attempt.trim() === "" ? undefined : Number(form.attempt);

    if (
      parsedAttempt !== undefined &&
      (!Number.isInteger(parsedAttempt) || parsedAttempt < 1)
    ) {
      toast.error("Cəhd 1-dən başlayan tam rəqəm olmalıdır");
      return;
    }

    setSaving(true);

    try {
      if (editor.mode === "create") {
        if (!form.studentId) {
          toast.error("Tələbə seçin");
          return;
        }

        if (!form.taughtSubjectId) {
          toast.error("Tədris olunan fənn seçin");
          return;
        }
        if (!form.failedSubjectCode.trim()) {
          toast.error("Uğursuz fənn kodu daxil edin");
          return;
        }

        const payload: CreateStudentSubjectEnrollmentDto = {
          studentId: form.studentId,
          failedSubjectCode: form.failedSubjectCode.trim(),
          taughtSubjectId: form.taughtSubjectId,
          ...(parsedAttempt !== undefined ? { attempt: parsedAttempt } : {}),
        };

        await createStudentSubjectEnrollment(payload);
        toast.success("Alt Qrup uğurlu şəkildə yaradıldı");
      } else {
        if (parsedAttempt === undefined) {
          toast.error("Redaktə edərkən cəhd tələb olunur");
          return;
        }
        await updateStudentSubjectEnrollment(editor.enrollmentId, {
          attempt: parsedAttempt,
        });
        toast.success("Alt Qrup uğurlu şəkildə yeniləndi");
      }

      resetDialog();
      await loadData(true);
    } catch (err: any) {
      toast.error(err?.message || "Alt Qrupı saxlamaq alışması başarısız oldu");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (payload: {
    id: string;
    studentName: string;
    subjectName: string;
  }) => {
    try {
      await deleteStudentSubjectEnrollment(payload.id);
      setAllEnrollmentsPage((current) => ({
        ...current,
        items: current.items.filter((item) => item.id !== payload.id),
        totalCount: Math.max(0, current.totalCount - 1),
      }));
      toast.success("Alt Qrup uğurlu şəkildə silindi");
    } catch (err: any) {
      toast.error(err?.message || "Alt Qrupı silmə alışması başarısız oldu");
    }
  };

  const getGroupCodeForItem = (studentId: string, taughtSubjectId: string) => {
    const matched = enrollments.find(
      (enrollment) =>
        enrollment.studentId === studentId &&
        enrollment.taughtSubjectId === taughtSubjectId,
    );
    return matched?.groupCode || "-";
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <CardTitle>Fənn alt qrupları</CardTitle>
              <CardDescription>
                Hər bir tələbənin hansı müəllim-tərəfindən tədris olunan fənn nümunəsinə alt qrupa qeydiyyatdan keçirildiğini, o cümlədən yenidən cəhd etməyi idarə edin.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => loadAllEnrollmentsPage(allEnrollmentsPage.page)}
                disabled={refreshing || loading}
              >
                <RefreshCw
                  className={refreshing ? "h-4 w-4 animate-spin" : "h-4 w-4"}
                />
                Yenilə
              </Button>
              <Dialog
                open={isDialogOpen}
                onOpenChange={(open) => {
                  setIsDialogOpen(open);
                  if (!open) {
                    setForm(EMPTY_FORM);
                    setEditor({ mode: "create" });
                  }
                }}
              >
                <DialogTrigger asChild>
                  <Button type="button" onClick={openCreateDialog}>
                    <Plus className="h-4 w-4" />
                    Alt Qrup əlavə et
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-xl">
                  <DialogHeader>
                    <DialogTitle>
                      {editor.mode === "create"
                        ? "Alt Qrup yarat"
                        : "Alt Qrupı redaktə et"}
                    </DialogTitle>
                    <DialogDescription>
                      {editor.mode === "create"
                        ? "Tələbəni müəllim-tərəfindən tədris olunan fənn nümunəsinə təyin edin."
                        : "Bu alt qrup üçün cəhd dəyərini yeniləyin."}
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4 py-2">
                    <div className="space-y-2">
                      <Label htmlFor="enrollment-student">Tələbə</Label>
                      <Select
                        value={form.studentId}
                        onValueChange={(value) =>
                          setForm((current) => ({
                            ...current,
                            studentId: value,
                          }))
                        }
                        disabled={editor.mode === "edit" || saving}
                      >
                        <SelectTrigger id="enrollment-student">
                          <SelectValue placeholder="Tələbə seçin" />
                        </SelectTrigger>
                        <SelectContent>
                          {students.map((student) => (
                            <SelectItem key={student.id} value={student.id}>
                              {student.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="enrollment-failed-subject-code">
                        Uğursuz fənn kodu
                      </Label>
                      <Input
                        id="enrollment-failed-subject-code"
                        placeholder="məs. CS101"
                        value={form.failedSubjectCode}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            failedSubjectCode: event.target.value,
                          }))
                        }
                        disabled={editor.mode === "edit" || saving}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="enrollment-taught-subject">
                        Tədris olunan fənn
                      </Label>
                      <Select
                        value={form.taughtSubjectId}
                        onValueChange={(value) =>
                          setForm((current) => ({
                            ...current,
                            taughtSubjectId: value,
                          }))
                        }
                        disabled={editor.mode === "edit" || saving}
                      >
                        <SelectTrigger id="enrollment-taught-subject">
                          <SelectValue placeholder="Fənn və qrupunu seçin" />
                        </SelectTrigger>
                        <SelectContent>
                          {taughtSubjects.map((subject) => (
                            <SelectItem key={subject.id} value={subject.id}>
                              {subject.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="enrollment-attempt">Cəhd</Label>
                      <Input
                        id="enrollment-attempt"
                        type="number"
                        min="1"
                        placeholder="Standart olaraq 1"
                        value={form.attempt}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            attempt: event.target.value,
                          }))
                        }
                        disabled={saving}
                      />
                      <p className="text-sm text-muted-foreground">
                        {editor.mode === "create"
                          ? "Arxanın standart cəhdini istifadə etməsinə icazə vermək üçün boş buraxın."
                          : "Cəhd redaktə edilə bilər və yenilənmə nöqtəsinə göndəriləcəkdir."}
                      </p>
                    </div>
                  </div>

                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={resetDialog}
                      disabled={saving}
                    >
                      Ləğv et
                    </Button>
                    <Button
                      type="button"
                      onClick={handleSubmit}
                      disabled={saving}
                    >
                      {saving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : null}
                      {editor.mode === "create"
                        ? "Alt Qrup yarat"
                        : "Dəyişiklikləri yadda saxla"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? (
            <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
              {error}
            </div>
          ) : null}
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : allEnrollmentsPage.items.length === 0 ? (
            <div className="rounded-lg border border-dashed p-10 text-center">
              <p className="font-medium">Alt Qruplar tapılmadı</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tələbənin adı</TableHead>
                    <TableHead>Fənn adı</TableHead>
                    <TableHead>Qrup kodu</TableHead>
                    <TableHead>Fənn kodu</TableHead>
                    <TableHead className="text-right">Fəaliyyətlər</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allEnrollmentsPage.items.map((item) => (
                    <TableRow key={item.id || `${item.studentId}-${item.taughtSubjectId}`}>
                      <TableCell className="font-medium">
                        {item.studentFullName || item.studentId}
                      </TableCell>
                      <TableCell>{item.subjectName || "-"}</TableCell>
                      <TableCell>
                        {getGroupCodeForItem(item.studentId, item.taughtSubjectId)}
                      </TableCell>
                      <TableCell>{item.taughtSubjectCode || "-"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              openEditDialog({
                                enrollmentId: item.id,
                                studentId: item.studentId,
                                studentName: item.studentFullName || item.studentId,
                                taughtSubjectId: item.taughtSubjectId,
                                subjectName: item.subjectName || "-",
                              })
                            }
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button type="button" variant="ghost" size="sm">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Alt Qrupı silmək?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Bu, {" "}
                                  {item.studentFullName || item.studentId} üçün {" "}
                                  {item.subjectName || "-"} -də alt qrupı silir.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Ləğv et</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() =>
                                    handleDelete({
                                      id: item.id,
                                      studentName:
                                        item.studentFullName || item.studentId,
                                      subjectName: item.subjectName || "-",
                                    })
                                  }
                                >
                                  Sil
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Səhifə {allEnrollmentsPage.page} / {Math.max(1, allEnrollmentsPage.totalPages)} ({allEnrollmentsPage.totalCount} cəmi)
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={refreshing || allEnrollmentsPage.page <= 1}
                    onClick={() =>
                      loadAllEnrollmentsPage(allEnrollmentsPage.page - 1)
                    }
                  >
                    Əvvəlki
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={
                      refreshing ||
                      allEnrollmentsPage.page >= allEnrollmentsPage.totalPages
                    }
                    onClick={() =>
                      loadAllEnrollmentsPage(allEnrollmentsPage.page + 1)
                    }
                  >
                    Sonrakı
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
