import { useEffect, useMemo, useState } from "react";
import { CalendarDays, GraduationCap, Loader2, Users } from "lucide-react";

import { getStudentUpcomingFinals, toArray } from "../api";
import { Badge } from "./ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import type { FinalWithSortDate } from "../types/studentFinals";

function parseDdMmYyyy(value: string | null): Date | null {
  if (!value) return null;
  const parts = value.trim().split("/");
  if (parts.length !== 3) return null;

  const day = Number(parts[0]);
  const month = Number(parts[1]);
  const year = Number(parts[2]);

  if (
    !Number.isInteger(day) ||
    !Number.isInteger(month) ||
    !Number.isInteger(year) ||
    day < 1 ||
    day > 31 ||
    month < 1 ||
    month > 12
  ) {
    return null;
  }

  const parsed = new Date(year, month - 1, day);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

export function StudentFinals() {
  const [finals, setFinals] = useState<StudentUpcomingFinal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setLoading(true);
        const result = await getStudentUpcomingFinals();
        if (!mounted) return;
        setFinals(result);
      } catch (err: any) {
        if (!mounted) return;
        setError(err?.message || "Failed to load upcoming finals");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const finalsSorted = useMemo<FinalWithSortDate[]>(
    () =>
      finals
        .map((item) => ({
          ...item,
          sortDate: parseDdMmYyyy(item.formattedDate),
        }))
        .sort((a, b) => {
          if (a.sortDate && b.sortDate) {
            return a.sortDate.getTime() - b.sortDate.getTime();
          }
          if (a.sortDate && !b.sortDate) return -1;
          if (!a.sortDate && b.sortDate) return 1;
          return a.subject.localeCompare(b.subject);
        }),
    [finals],
  );

  return (
    <div className="space-y-6">
      <div>
        <h1>Semester imtahanları</h1>
        <p className="text-muted-foreground">
          Semester imtahanlarına buradan baxa bilərsiniz.
        </p>
      </div>

      {error && <p className="text-destructive text-sm">{error}</p>}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : finalsSorted.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            No upcoming finals right now.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {finalsSorted.map((final) => (
            <Card key={final.id} className="transition-shadow hover:shadow-md">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <CardTitle className="leading-tight">
                    {final.subject}
                  </CardTitle>
                  {final.groupCode ? (
                    <Badge variant="outline">{final.groupCode}</Badge>
                  ) : null}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  <span>{final.formattedDate || "Date is not set yet"}</span>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {final.teacherFullName || "Teacher is not specified"}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <GraduationCap className="h-4 w-4 text-muted-foreground" />
                  <span>
                    Enter score:{" "}
                    {typeof final.enterScore === "number"
                      ? final.enterScore
                      : "-"}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
