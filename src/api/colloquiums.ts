import { apiJson } from "./core";

export function createColloquium(req: {
  taughtSubjectId: string;
  studentId: string;
  date: string;
  grade: number | null;
}) {
  return apiJson<any>("/api/colloquiums", { method: "POST", json: req });
}

export function updateSeminarGrade(
  studentId: string,
  seminarId: string,
  grade: number,
  classId: string,
) {
  return apiJson<any>(
    `/api/seminars/${encodeURIComponent(seminarId)}/grade`,
    {
      method: "PUT",
      json: {
        grade,
        classId,
        studentId,
      },
    },
  );
}

export function deleteSeminar(id: string) {
  return apiJson<any>(`/api/seminars/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export function deleteColloquium(id: string) {
  return apiJson<any>(`/api/colloquiums/${id}`, { method: "DELETE" });
}

export function updateColloquiumGrade(
  studentId: string,
  colloquiumId: string,
  grade: number,
) {
  const q = new URLSearchParams({ grade: String(grade) });
  return apiJson<any>(
    `/api/students/${encodeURIComponent(studentId)}/colloquiums/${encodeURIComponent(colloquiumId)}/grade?${q}`,
    { method: "PUT" },
  );
}
