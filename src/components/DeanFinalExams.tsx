import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
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
import { Textarea } from "./ui/textarea";
import {
  addFinalExamDate,
  confirmFinalExamGrades,
  createFinalExam,
  listFinalExams,
  toArray,
} from "../api";

type DeanFinalExamsMode = "list" | "confirm" | "create";

type FinalExam = {
  id: string;
  title: string;
  courseCode?: string;
  groupCode?: string;
  semester?: number;
  date?: string;
  gradesConfirmed?: boolean;
};

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
    exam?.taughtSubjectTitle ??
    exam?.TaughtSubjectTitle ??
    "Untitled final exam";

  const date =
    exam?.date ??
    exam?.Date ??
    exam?.examDate ??
    exam?.ExamDate ??
    exam?.scheduledDate ??
    exam?.ScheduledDate ??
    undefined;

  const gradesConfirmedRaw =
    exam?.gradesConfirmed ??
    exam?.GradesConfirmed ??
    exam?.isGradesConfirmed ??
    exam?.IsGradesConfirmed ??
    exam?.confirmed ??
    exam?.Confirmed;

  return {
    id: String(id),
    title: String(title),
    courseCode:
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
    date: typeof date === "string" ? date : undefined,
    gradesConfirmed: Boolean(gradesConfirmedRaw),
  };
}

type Props = {
  mode: DeanFinalExamsMode;
};

export function DeanFinalExams({ mode }: Props) {
  const [finalExams, setFinalExams] = useState<FinalExam[]>([]);
  const [isFinalDateDialogOpen, setIsFinalDateDialogOpen] = useState(false);
  const [selectedFinalExamId, setSelectedFinalExamId] = useState<string | null>(
    null,
  );
  const [finalExamDateInput, setFinalExamDateInput] = useState("");
  const [createFinalExamRawDto, setCreateFinalExamRawDto] = useState(
    '{\n  "taughtSubjectId": "",\n  "groupId": ""\n}',
  );

  const loadFinalExams = async () => {
    try {
      const finalsResp = await listFinalExams(1, 100);
      setFinalExams(toArray(finalsResp).map(mapFinalExamFromApi));
    } catch (error: any) {
      toast.error(error?.message ?? "Failed to load final exams");
      setFinalExams([]);
    }
  };

  useEffect(() => {
    if (mode === "create") return;
    void loadFinalExams();
  }, [mode]);

  const openAddDateDialog = (finalExamId: string, currentDate?: string) => {
    setSelectedFinalExamId(finalExamId);
    const parsed = currentDate ? new Date(currentDate) : null;
    if (parsed && !Number.isNaN(parsed.getTime())) {
      const tzOffsetMs = parsed.getTimezoneOffset() * 60 * 1000;
      setFinalExamDateInput(
        new Date(parsed.getTime() - tzOffsetMs).toISOString().slice(0, 16),
      );
    } else {
      setFinalExamDateInput("");
    }
    setIsFinalDateDialogOpen(true);
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
      await loadFinalExams();
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
      await loadFinalExams();
    } catch (error: any) {
      toast.error(error?.message ?? "Failed to confirm grades");
    }
  };

  const handleCreateFinalExam = async () => {
    try {
      const parsedDto = JSON.parse(createFinalExamRawDto);
      await createFinalExam(parsedDto);
      toast.success("Final exam created");
      setCreateFinalExamRawDto('{\n  "taughtSubjectId": "",\n  "groupId": ""\n}');
    } catch (error: any) {
      if (error instanceof SyntaxError) {
        toast.error("DTO must be valid JSON");
        return;
      }
      toast.error(error?.message ?? "Failed to create final exam");
    }
  };

  if (mode === "create") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Final imtahan yarat</CardTitle>
          <CardDescription>
            Dəqiq DTO gələnə qədər JSON payload ilə yeni final yarada bilərsiniz
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="final-create-dto">Final DTO (JSON)</Label>
            <Textarea
              id="final-create-dto"
              className="min-h-[220px]"
              value={createFinalExamRawDto}
              onChange={(e) => setCreateFinalExamRawDto(e.target.value)}
            />
          </div>
          <div className="flex justify-end">
            <Button onClick={handleCreateFinalExam}>Final yarat</Button>
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
            <Button variant="outline" onClick={loadFinalExams}>
              Yenilə
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>İmtahan</TableHead>
                <TableHead>Qrup</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Əməliyyat</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {finalExams.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    Təsdiq ediləcək final imtahan yoxdur
                  </TableCell>
                </TableRow>
              ) : (
                finalExams.map((exam) => (
                  <TableRow key={`confirm-${exam.id}`}>
                    <TableCell className="font-medium">{exam.title}</TableCell>
                    <TableCell>{exam.groupCode || "-"}</TableCell>
                    <TableCell>
                      <Badge variant={exam.gradesConfirmed ? "secondary" : "default"}>
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
      <Dialog open={isFinalDateDialogOpen} onOpenChange={setIsFinalDateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Final imtahan tarixi</DialogTitle>
            <DialogDescription>
              Seçilmiş final imtahanı üçün tarixi təyin edin
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="final-exam-date">Tarix və saat</Label>
            <Input
              id="final-exam-date"
              type="datetime-local"
              value={finalExamDateInput}
              onChange={(e) => setFinalExamDateInput(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsFinalDateDialogOpen(false)}>
              Bağla
            </Button>
            <Button onClick={handleSaveFinalExamDate}>Yadda saxla</Button>
          </div>
        </DialogContent>
      </Dialog>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Final imtahan siyahısı</CardTitle>
              <CardDescription>
                Bütün final imtahanları və onların tarixləri
              </CardDescription>
            </div>
            <Button variant="outline" onClick={loadFinalExams}>
              Yenilə
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>İmtahan</TableHead>
                <TableHead>Fənn kodu</TableHead>
                <TableHead>Qrup</TableHead>
                <TableHead>Semestr</TableHead>
                <TableHead>Tarix</TableHead>
                <TableHead className="text-right">Əməliyyat</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {finalExams.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    Final imtahan tapılmadı
                  </TableCell>
                </TableRow>
              ) : (
                finalExams.map((exam) => (
                  <TableRow key={exam.id}>
                    <TableCell className="font-medium">{exam.title}</TableCell>
                    <TableCell>{exam.courseCode || "-"}</TableCell>
                    <TableCell>{exam.groupCode || "-"}</TableCell>
                    <TableCell>{exam.semester ?? "-"}</TableCell>
                    <TableCell>
                      {exam.date ? new Date(exam.date).toLocaleString() : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openAddDateDialog(exam.id, exam.date)}
                      >
                        Tarix əlavə et
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
