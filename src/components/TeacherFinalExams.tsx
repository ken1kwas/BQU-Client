import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  gradeFinalExam,
  listTeacherFinalExams,
  type TeacherFinalExamDto,
} from "../api/index";
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
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";

function gradeBadgeVariant(grade: number | null): "default" | "secondary" {
  if (grade == null || grade === -1) return "secondary";
  return "default";
}

function gradeLabel(grade: number | null): string {
  if (grade == null) return "-";
  if (grade === -1) return "Re-check";
  return String(grade);
}

function formatTeacherDate(value: string | null | undefined): string {
  if (!value) return "-";
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  const slashMatch = String(value).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const [, month, day, year] = slashMatch;
    return `${day.padStart(2, "0")}/${month.padStart(2, "0")}/${year}`;
  }

  return String(value);
}

export function TeacherFinalExams() {
  const [exams, setExams] = useState<TeacherFinalExamDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [isGradeDialogOpen, setIsGradeDialogOpen] = useState(false);
  const [gradingExam, setGradingExam] = useState<TeacherFinalExamDto | null>(
    null,
  );
  const [gradeInput, setGradeInput] = useState("");
  const [savingGrade, setSavingGrade] = useState(false);

  const loadExams = async () => {
    try {
      setLoading(true);
      const resp = await listTeacherFinalExams();
      setExams(resp.filter((item) => item.id));
    } catch (error: any) {
      toast.error(error?.message ?? "Failed to load exams");
      setExams([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadExams();
  }, []);

  const openGradeDialog = (exam: TeacherFinalExamDto) => {
    setGradingExam(exam);
    setGradeInput(
      exam.grade != null && exam.grade >= 0 && exam.grade <= 50
        ? String(exam.grade)
        : "",
    );
    setIsGradeDialogOpen(true);
  };

  const handleSaveGrade = async () => {
    try {
      if (!gradingExam) {
        toast.error("Select an exam first");
        return;
      }

      const parsedGrade = Number(gradeInput);
      if (
        !Number.isInteger(parsedGrade) ||
        parsedGrade < 0 ||
        parsedGrade > 50
      ) {
        toast.error("Grade must be an integer between 0 and 50");
        return;
      }

      setSavingGrade(true);
      await gradeFinalExam(gradingExam.id, parsedGrade);

      toast.success("Grade updated");
      setIsGradeDialogOpen(false);
      setGradingExam(null);
      setGradeInput("");
      await loadExams();
    } catch (error: any) {
      toast.error(error?.message ?? "Failed to update grade");
    } finally {
      setSavingGrade(false);
    }
  };

  return (
    <>
      <Dialog open={isGradeDialogOpen} onOpenChange={setIsGradeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Grade</DialogTitle>
            <DialogDescription>
              Enter final exam grade between 0 and 50.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="teacher-final-grade">Grade</Label>
            <Input
              id="teacher-final-grade"
              type="number"
              min={0}
              max={50}
              step={1}
              value={gradeInput}
              onChange={(e) => setGradeInput(e.target.value)}
              placeholder="0 to 50"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setIsGradeDialogOpen(false)}
            >
              Close
            </Button>
            <Button onClick={handleSaveGrade} disabled={savingGrade}>
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <div>
              <CardTitle>Final Exams</CardTitle>
              <CardDescription>Teacher final exams list</CardDescription>
            </div>
            <Button variant="outline" onClick={loadExams} disabled={loading}>
              {loading ? "Loading..." : "Refresh"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Group</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Grade</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {exams.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center text-muted-foreground"
                  >
                    {loading ? "Loading exams..." : "No exams found"}
                  </TableCell>
                </TableRow>
              ) : (
                exams.map((exam) => (
                  <TableRow key={exam.id}>
                    <TableCell>
                      <div className="font-medium">
                        {exam.studentFullName || "-"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">
                        {exam.subjectName || "-"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {exam.subjectCode || "-"}
                      </div>
                    </TableCell>
                    <TableCell>{exam.groupCode || "-"}</TableCell>
                    <TableCell>{formatTeacherDate(exam.formattedDate)}</TableCell>
                    <TableCell>
                      <Badge variant={gradeBadgeVariant(exam.grade)}>
                        {gradeLabel(exam.grade)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" onClick={() => openGradeDialog(exam)}>
                        Grade
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
