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
  return fullName || fallbackId || "Unnamed student";
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
    subjectName: subjectName || "Unnamed subject",
  };
}

const EMPTY_FORM: EnrollmentFormState = {
  studentId: "",
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
      setError(err?.message || "Failed to load enrollments");
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
      setError(err?.message || "Failed to load enrollments");
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
      toast.error("Attempt must be a whole number starting from 1");
      return;
    }

    setSaving(true);

    try {
      if (editor.mode === "create") {
        if (!form.studentId) {
          toast.error("Select a student");
          return;
        }

        if (!form.taughtSubjectId) {
          toast.error("Select a taught subject");
          return;
        }

        const payload: CreateStudentSubjectEnrollmentDto = {
          studentId: form.studentId,
          taughtSubjectId: form.taughtSubjectId,
          ...(parsedAttempt !== undefined ? { attempt: parsedAttempt } : {}),
        };

        await createStudentSubjectEnrollment(payload);
        toast.success("Enrollment created successfully");
      } else {
        if (parsedAttempt === undefined) {
          toast.error("Attempt is required when editing");
          return;
        }
        await updateStudentSubjectEnrollment(editor.enrollmentId, {
          attempt: parsedAttempt,
        });
        toast.success("Enrollment updated successfully");
      }

      resetDialog();
      await loadData(true);
    } catch (err: any) {
      toast.error(err?.message || "Failed to save enrollment");
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
      toast.success("Enrollment deleted successfully");
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete enrollment");
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
              <CardTitle>Subject enrollments</CardTitle>
              <CardDescription>
                Manage which taught subject instance each student is enrolled
                in, including retake attempts.
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
                Refresh
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
                    Add enrollment
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-xl">
                  <DialogHeader>
                    <DialogTitle>
                      {editor.mode === "create"
                        ? "Create enrollment"
                        : "Edit enrollment"}
                    </DialogTitle>
                    <DialogDescription>
                      {editor.mode === "create"
                        ? "Assign a student to a taught subject instance."
                        : "Update the attempt value for this enrollment."}
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4 py-2">
                    <div className="space-y-2">
                      <Label htmlFor="enrollment-student">Student</Label>
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
                          <SelectValue placeholder="Select student" />
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
                      <Label htmlFor="enrollment-taught-subject">
                        Taught subject
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
                          <SelectValue placeholder="Select subject and group" />
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
                      <Label htmlFor="enrollment-attempt">Attempt</Label>
                      <Input
                        id="enrollment-attempt"
                        type="number"
                        min="1"
                        placeholder="Defaults to 1"
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
                          ? "Leave blank to let the backend use its default attempt."
                          : "Attempt is editable and will be sent to the update endpoint."}
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
                      Cancel
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
                        ? "Create enrollment"
                        : "Save changes"}
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
              <p className="font-medium">No enrollments found</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student Name</TableHead>
                    <TableHead>Subject Name</TableHead>
                    <TableHead>Group Code</TableHead>
                    <TableHead>Subject Code</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
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
                                <AlertDialogTitle>Delete enrollment?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will remove the enrollment for{" "}
                                  {item.studentFullName || item.studentId} in{" "}
                                  {item.subjectName || "-"}.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
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
                                  Delete
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
                  Page {allEnrollmentsPage.page} of{" "}
                  {Math.max(1, allEnrollmentsPage.totalPages)} ({allEnrollmentsPage.totalCount} total)
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
                    Previous
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
                    Next
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
