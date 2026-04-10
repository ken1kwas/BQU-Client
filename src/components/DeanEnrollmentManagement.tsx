import { useEffect, useMemo, useState } from "react";
import { Loader2, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { listStudents, listTaughtSubjects, toArray } from "../api";
import {
  createStudentSubjectEnrollment,
  deleteStudentSubjectEnrollment,
  listStudentSubjectEnrollments,
  updateStudentSubjectEnrollment,
} from "../services/studentSubjectEnrollment";
import type {
  CreateStudentSubjectEnrollmentDto,
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
import { Badge } from "./ui/badge";
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

type StudentOption = {
  id: string;
  label: string;
};

type TaughtSubjectOption = {
  id: string;
  label: string;
  subjectName: string;
};

type EnrollmentFormState = {
  studentId: string;
  taughtSubjectId: string;
  attempt: string;
};

type EnrollmentEditor =
  | {
      mode: "create";
    }
  | {
      mode: "edit";
      enrollment: StudentSubjectEnrollmentDto;
    };

function pickString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return "";
}

function buildStudentLabel(student: any) {
  const firstName = pickString(student?.name, student?.firstName, student?.givenName);
  const surname = pickString(student?.surname, student?.lastName, student?.familyName);
  const middleName = pickString(student?.middleName);
  const fullName =
    pickString(student?.fullName) ||
    [firstName, middleName, surname].filter(Boolean).join(" ").trim();
  const fallbackId = pickString(student?.userName, student?.studentId, student?.userId);
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
  const subjectName = pickString(item?.title, item?.subjectName, item?.name, item?.code);
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
  const [enrollments, setEnrollments] = useState<StudentSubjectEnrollmentDto[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [taughtSubjects, setTaughtSubjects] = useState<TaughtSubjectOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editor, setEditor] = useState<EnrollmentEditor>({ mode: "create" });
  const [form, setForm] = useState<EnrollmentFormState>(EMPTY_FORM);

  const studentCount = useMemo(
    () => new Set(enrollments.map((item) => item.studentId)).size,
    [enrollments],
  );

  const loadData = async (showRefreshingState = false) => {
    if (showRefreshingState) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      setError(null);

      const [enrollmentResponse, studentResponse, taughtSubjectResponse] =
        await Promise.all([
          listStudentSubjectEnrollments(),
          listStudents(1, 200),
          listTaughtSubjects(1, 200),
        ]);

      setEnrollments(enrollmentResponse);
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

  const openCreateDialog = () => {
    setEditor({ mode: "create" });
    setForm(EMPTY_FORM);
    setIsDialogOpen(true);
  };

  const openEditDialog = (enrollment: StudentSubjectEnrollmentDto) => {
    setEditor({ mode: "edit", enrollment });
    setForm({
      studentId: enrollment.studentId,
      taughtSubjectId: enrollment.taughtSubjectId,
      attempt: String(enrollment.attempt),
    });
    setIsDialogOpen(true);
  };

  const resetDialog = () => {
    setIsDialogOpen(false);
    setForm(EMPTY_FORM);
    setEditor({ mode: "create" });
  };

  const handleSubmit = async () => {
    if (!form.studentId) {
      toast.error("Select a student");
      return;
    }

    if (!form.taughtSubjectId) {
      toast.error("Select a taught subject");
      return;
    }

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
        const payload: CreateStudentSubjectEnrollmentDto = {
          studentId: form.studentId,
          taughtSubjectId: form.taughtSubjectId,
          ...(parsedAttempt !== undefined ? { attempt: parsedAttempt } : {}),
        };

        await createStudentSubjectEnrollment(payload);
        toast.success("Enrollment created successfully");
      } else {
        await updateStudentSubjectEnrollment(
          editor.enrollment.studentId,
          editor.enrollment.taughtSubjectId,
          editor.enrollment.attempt,
          { taughtSubjectId: form.taughtSubjectId },
        );
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

  const handleDelete = async (enrollment: StudentSubjectEnrollmentDto) => {
    try {
      await deleteStudentSubjectEnrollment(
        enrollment.studentId,
        enrollment.taughtSubjectId,
        enrollment.attempt,
      );
      setEnrollments((current) =>
        current.filter(
          (item) =>
            !(
              item.studentId === enrollment.studentId &&
              item.taughtSubjectId === enrollment.taughtSubjectId &&
              item.attempt === enrollment.attempt
            ),
        ),
      );
      toast.success("Enrollment deleted successfully");
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete enrollment");
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Total enrollments</p>
            <p className="mt-2 text-3xl font-semibold">{enrollments.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Students enrolled</p>
            <p className="mt-2 text-3xl font-semibold">{studentCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Retake records</p>
            <p className="mt-2 text-3xl font-semibold">
              {enrollments.filter((item) => item.attempt > 1).length}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <CardTitle>Subject enrollments</CardTitle>
              <CardDescription>
                Manage which taught subject instance each student is enrolled in,
                including retake attempts.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => loadData(true)}
                disabled={refreshing || loading}
              >
                <RefreshCw className={refreshing ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
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
                      {editor.mode === "create" ? "Create enrollment" : "Edit enrollment"}
                    </DialogTitle>
                    <DialogDescription>
                      {editor.mode === "create"
                        ? "Assign a student to a taught subject instance."
                        : "You can only move this enrollment to another taught subject instance."}
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4 py-2">
                    <div className="space-y-2">
                      <Label htmlFor="enrollment-student">Student</Label>
                      <Select
                        value={form.studentId}
                        onValueChange={(value) =>
                          setForm((current) => ({ ...current, studentId: value }))
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
                      <Label htmlFor="enrollment-taught-subject">Taught subject</Label>
                      <Select
                        value={form.taughtSubjectId}
                        onValueChange={(value) =>
                          setForm((current) => ({ ...current, taughtSubjectId: value }))
                        }
                        disabled={saving}
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
                        readOnly={editor.mode === "edit"}
                        disabled={editor.mode === "edit" || saving}
                      />
                      <p className="text-sm text-muted-foreground">
                        {editor.mode === "create"
                          ? "Leave blank to let the backend use its default attempt."
                          : "Attempt is read-only when editing an existing enrollment."}
                      </p>
                    </div>
                  </div>

                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={resetDialog} disabled={saving}>
                      Cancel
                    </Button>
                    <Button type="button" onClick={handleSubmit} disabled={saving}>
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      {editor.mode === "create" ? "Create enrollment" : "Save changes"}
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
          ) : enrollments.length === 0 ? (
            <div className="rounded-lg border border-dashed p-10 text-center">
              <p className="font-medium">No enrollments found</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Create the first student subject enrollment to get started.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student Name</TableHead>
                  <TableHead>Subject Name</TableHead>
                  <TableHead>Group Code</TableHead>
                  <TableHead>Attempt</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {enrollments.map((enrollment) => (
                  <TableRow
                    key={`${enrollment.studentId}-${enrollment.taughtSubjectId}-${enrollment.attempt}`}
                  >
                    <TableCell className="font-medium">
                      {enrollment.studentName || enrollment.studentId}
                    </TableCell>
                    <TableCell>{enrollment.subjectName || "-"}</TableCell>
                    <TableCell>{enrollment.groupCode || "-"}</TableCell>
                    <TableCell>
                      <Badge variant={enrollment.attempt > 1 ? "secondary" : "outline"}>
                        Attempt {enrollment.attempt}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(enrollment)}
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
                                This will remove the enrollment for {enrollment.studentName} in{" "}
                                {enrollment.subjectName}, attempt {enrollment.attempt}.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(enrollment)}>
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
