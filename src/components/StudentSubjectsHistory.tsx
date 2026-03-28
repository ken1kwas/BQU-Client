import { useEffect, useMemo, useState } from "react";
import { BookOpenText, CalendarRange, GraduationCap, Loader2 } from "lucide-react";

import { getStudentAcademicHistory, toArray } from "../api";
import { Badge } from "./ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";

type SubjectHistoryEntry = {
  taughtSubjectId: string;
  taughtSubjectName: string;
  dateFrom: string;
  dateTo: string;
  professorName: string;
};

function pickString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return "";
}

function normalizeHistoryResponse(raw: any): SubjectHistoryEntry[] {
  const list = toArray(
    raw?.data?.academicHistoryDtos ??
      raw?.academicHistoryDtos ??
      raw?.data?.items ??
      raw?.items ??
      raw,
  );

  return list.map((item: any, index: number) => ({
    taughtSubjectId: pickString(
      item?.taughtSubjectId,
      item?.TaughtSubjectId,
      `subject-${index}`,
    ),
    taughtSubjectName: pickString(
      item?.taughtSubjectName,
      item?.TaughtSubjectName,
      `Subject ${index + 1}`,
    ),
    dateFrom: pickString(item?.dateFrom, item?.DateFrom),
    dateTo: pickString(item?.dateTo, item?.DateTo),
    professorName: pickString(item?.professorName, item?.ProfessorName),
  }));
}

export function StudentSubjectsHistory() {
  const [history, setHistory] = useState<SubjectHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await getStudentAcademicHistory();
        if (!mounted) return;
        setHistory(normalizeHistoryResponse(response));
      } catch (err: any) {
        if (!mounted) return;
        setError(err?.message || "Failed to load subjects history");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const professorCount = useMemo(
    () =>
      new Set(
        history
          .map((entry) => entry.professorName)
          .filter((value) => value.length > 0),
      ).size,
    [history],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1>Subjects History</h1>
          <p className="text-muted-foreground">
            View the subjects you studied in previous academic periods.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Card className="min-w-[180px]">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-lg bg-primary/10 p-2 text-primary">
                <BookOpenText className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Subjects</p>
                <p className="text-xl font-semibold">{history.length}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {error && (
        <Card className="border-destructive/40">
          <CardContent className="p-4 text-sm text-destructive">
            {error}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Academic History</CardTitle>
          <CardDescription>
            Each row shows a completed or scheduled subject period from your history.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : history.length === 0 ? (
            <div className="rounded-lg border border-dashed p-10 text-center">
              <p className="font-medium">No subjects history found</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Your academic history will appear here once the backend returns data.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subject</TableHead>
                  <TableHead>Professor</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((entry) => (
                  <TableRow key={entry.taughtSubjectId}>
                    <TableCell className="font-medium">
                      {entry.taughtSubjectName || "-"}
                    </TableCell>
                    <TableCell>{entry.professorName || "-"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CalendarRange className="h-4 w-4" />
                        <span>
                          {entry.dateFrom || "-"} - {entry.dateTo || "-"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="secondary">Recorded</Badge>
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
