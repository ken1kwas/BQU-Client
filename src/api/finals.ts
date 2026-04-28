import { apiJson, apiJsonWithFallback, unwrapApiResult } from "./core";

export async function listFinalExams(options?: {
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  const search = options?.search ?? "";
  const page = options?.page ?? 1;
  const pageSize = options?.pageSize ?? 10;
  const query = new URLSearchParams({
    search,
    page: String(page),
    pageSize: String(pageSize),
  });
  const raw = await apiJson<any>(`/api/finals?${query.toString()}`);
  return unwrapApiResult(raw);
}

export function createFinalExam(req: {
  studentId: string;
  subjectId: string;
  date: string;
}) {
  return apiJson<any>("/api/finals", { method: "POST", json: req });
}

export type UpdateExamRequest = {
  studentId: string;
  taughtSubjectId: string;
  date: string;
  grade: number;
  isAllowed: boolean;
};

export type UpdateExamResponse = {
  id: string;
  studentId: string;
  taughtSubjectId: string;
  date: string | null;
  grade: number | null;
  isAllowed: boolean;
};

export async function setFinalExamTime(
  finalExamId: string,
  date: string,
): Promise<void> {
  const encodedId = encodeURIComponent(finalExamId);
  await apiJson<null>(`/api/finals/${encodedId}/set-time`, {
    method: "PUT",
    json: { id: finalExamId, date },
  });
}

export async function addFinalExamDate(
  finalExamId: string,
  date: string,
): Promise<void> {
  await setFinalExamTime(finalExamId, date);
}

export async function gradeFinalExam(
  finalExamId: string,
  grade: number,
): Promise<string> {
  const encodedId = encodeURIComponent(finalExamId);
  const raw = await apiJson<any>(`/api/finals/${encodedId}/grade`, {
    method: "PUT",
    json: grade,
  });
  const data = unwrapApiResult<any>(raw);
  return String(data ?? "");
}

export async function updateFinalExam(
  id: string,
  req: UpdateExamRequest,
): Promise<UpdateExamResponse> {
  const raw = await apiJson<any>(`/api/finals/${encodeURIComponent(id)}`, {
    method: "PUT",
    json: req,
  });
  const data = unwrapApiResult<any>(raw);
  return {
    id: String(data?.id ?? data?.Id ?? ""),
    studentId: String(data?.studentId ?? data?.StudentId ?? ""),
    taughtSubjectId: String(
      data?.taughtSubjectId ?? data?.TaughtSubjectId ?? "",
    ),
    date:
      typeof (data?.date ?? data?.Date) === "string"
        ? (data?.date ?? data?.Date)
        : null,
    grade:
      typeof (data?.grade ?? data?.Grade) === "number"
        ? Number(data?.grade ?? data?.Grade)
        : null,
    isAllowed: Boolean(data?.isAllowed ?? data?.IsAllowed),
  };
}

export async function confirmFinalExamGrades(
  finalExamId: string,
): Promise<boolean> {
  const encodedId = encodeURIComponent(finalExamId);
  const raw = await apiJsonWithFallback<any>([
    {
      path: `/api/finals/${encodedId}/confirm`,
      init: { method: "PUT" },
    },
    {
      path: `/api/finals/${encodedId}/confirm-grades`,
      init: { method: "POST" },
    },
    {
      path: `/api/final-exams/${encodedId}/confirm-grades`,
      init: { method: "POST" },
    },
  ]);

  const isSucceeded =
    raw?.isSucceeded ?? raw?.IsSucceeded ?? raw?.success ?? raw?.Success;
  if (isSucceeded === false) {
    throw new Error(
      raw?.message ?? raw?.Message ?? "Failed to confirm final exam grades",
    );
  }

  const data = unwrapApiResult<boolean>(raw);
  return typeof data === "boolean" ? data : true;
}
