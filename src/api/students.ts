import {
  BASE_URL,
  extractFileNameFromDisposition,
  apiForm,
  apiJson,
  authHeader,
  fetchOrThrow,
  getToken,
  parseError,
  unwrapApiResult,
} from "./core";

export async function downloadStudentsTemplate(): Promise<Blob> {
  const resp = await fetchOrThrow(`${BASE_URL}/api/students/template`, {
    method: "GET",
    headers: authHeader(),
  });
  return await resp.blob();
}

export async function uploadStudentsExcel(file: File): Promise<any> {
  const formData = new FormData();
  formData.append("file", file);

  const url = `${BASE_URL}/api/students/import`;
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const resp = await fetch(url, {
    method: "POST",
    headers,
    body: formData,
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(text || `HTTP ${resp.status}`);
  }

  const ct = (resp.headers.get("content-type") || "").toLowerCase();
  if (ct.includes("application/json")) {
    return await resp.json();
  }
  if (
    ct.includes(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ) ||
    ct.includes("application/vnd.ms-excel") ||
    ct.includes("application/octet-stream") ||
    ct.includes("application/x-msdownload")
  ) {
    return await resp.blob();
  }

  const text = await resp.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function getStudentDashboard() {
  return apiJson<any>("/api/students/dashboard");
}

export async function getStudentSchedule(scope: string) {
  return apiJson<any>(`/api/students/schedule/${encodeURIComponent(scope)}`);
}

export async function getTeacherSchedule(scope: string) {
  return apiJson<any>(`/api/teachers/schedule/${encodeURIComponent(scope)}`);
}

export async function getStudentGrades(scope: string) {
  const qs = new URLSearchParams();
  if (scope) qs.set("grade", scope);
  const suffix = qs.toString();
  const url = suffix
    ? `/api/students/me/grades?${suffix}`
    : "/api/students/me/grades";
  return apiJson<any>(url);
}

export async function getStudentAcademicHistory() {
  return apiJson<any>("/api/students/me/academic-history");
}

export type StudentUpcomingFinal = {
  id: string;
  subject: string;
  enterScore: number | null;
  formattedDate: string | null;
  teacherFullName: string;
  groupCode: string;
};

export async function getStudentUpcomingFinals(): Promise<
  StudentUpcomingFinal[]
> {
  const raw = await apiJson<any>("/api/students/me/finals");
  const data = unwrapApiResult<any>(raw);
  const finals = Array.isArray(data?.finals)
    ? data.finals
    : Array.isArray(data)
      ? data
      : [];

  return finals.map((item: any) => ({
    id: String(item?.id ?? item?.Id ?? ""),
    subject: String(item?.subject ?? item?.Subject ?? ""),
    enterScore:
      typeof (item?.enterScore ?? item?.EnterScore) === "number"
        ? Number(item?.enterScore ?? item?.EnterScore)
        : null,
    formattedDate:
      typeof (
        item?.formattedDate ??
        item?.formatedDate ??
        item?.FormattedDate
      ) === "string"
        ? String(
            item?.formattedDate ?? item?.formatedDate ?? item?.FormattedDate,
          )
        : null,
    teacherFullName: String(
      item?.teacherFullName ?? item?.TeacherFullName ?? "",
    ),
    groupCode: String(item?.groupCode ?? item?.GroupCode ?? ""),
  }));
}

export function markStudentAbsence(
  studentId: string,
  classId: string,
  seminarId?: string | null,
) {
  return apiJson<any>(
    `/api/students/${encodeURIComponent(studentId)}/classes/${encodeURIComponent(classId)}/mark-absence`,
    {
      method: "PUT",
      json: {
        seminarId: seminarId ?? "",
      },
    },
  );
}

export async function getIndependentWorkByStudentAndSubject(
  studentId: string,
  taughtSubjectId: string,
) {
  const raw = await apiJson<any>(
    `/api/students/${encodeURIComponent(studentId)}/taught-subjects/${encodeURIComponent(taughtSubjectId)}/independent-works`,
    { method: "GET" },
  );
  return unwrapApiResult(raw);
}

export function markIndependentWorkGrade(
  independentWorkId: string,
  grade: number | null,
) {
  return apiJson<any>(
    `/api/independent-works/${encodeURIComponent(independentWorkId)}/grade`,
    {
      method: "PUT",
      json: { grade },
    },
  );
}

export async function listStudents(page = 1, pageSize = 100) {
  const raw = await apiJson<any>(
    `/api/students?page=${page}&pageSize=${pageSize}`,
  );
  return unwrapApiResult(raw);
}

export async function searchStudents(searchText: string) {
  const raw = await apiJson<any>(
    `/api/students/search?searchText=${encodeURIComponent(searchText)}`,
  );
  return unwrapApiResult(raw);
}

export async function filterStudents(groupId?: string, year?: number) {
  const qs = new URLSearchParams();
  if (groupId) qs.set("groupId", groupId);
  if (year !== undefined) qs.set("year", String(year));
  const queryString = qs.toString();
  const url = queryString
    ? `/api/students/filter-by?${queryString}`
    : "/api/students/filter-by";
  const raw = await apiJson<any>(url);
  return unwrapApiResult(raw);
}

export async function getStudentById(id: string | number) {
  const raw = await apiJson<any>(
    `/api/students/${encodeURIComponent(String(id))}`,
  );
  return unwrapApiResult(raw);
}

export function deleteStudent(id: string | number) {
  return apiJson<any>(`/api/students/${encodeURIComponent(String(id))}`, {
    method: "DELETE",
  });
}

export function resetStudentPassword(
  id: string | number,
  newPassword: string,
) {
  return apiJson<any>(
    `/api/students/${encodeURIComponent(String(id))}/reset-password`,
    {
      method: "PUT",
      json: {
        newPassword,
      },
    },
  );
}

export function createStudent(req: {
  name: string;
  surname: string;
  middleName: string;
  userName: string;
  gender: string;
  groupName: string;
  decreeNumber: number;
  admissionScore: number;
  formOfEducation: number;
}) {
  return apiJson<any>("/api/students", { method: "POST", json: req });
}

export function importStudentsExcel(file: File) {
  const form = new FormData();
  form.append("file", file);
  return apiForm<any>("/api/students/import", form);
}

export type DownloadedTranscriptFile = {
  blob: Blob;
  fileName: string;
};

async function downloadTranscript(path: string, fallbackFileName: string) {
  const resp = await fetch(`${BASE_URL}${path}`, {
    method: "GET",
    headers: authHeader(),
  });

  if (!resp.ok) {
    throw new Error(await parseError(resp));
  }

  const contentType = (resp.headers.get("content-type") || "").toLowerCase();
  if (contentType.includes("application/json")) {
    throw new Error(await parseError(resp));
  }

  const blob = await resp.blob();
  return {
    blob,
    fileName:
      extractFileNameFromDisposition(resp.headers.get("content-disposition")) ||
      fallbackFileName,
  } satisfies DownloadedTranscriptFile;
}

export function getStudentTranscriptExcel() {
  return downloadTranscript(
    "/api/students/me/get-transcript-excel",
    "transcript.xlsx",
  );
}

export function getStudentTranscriptPdf() {
  return downloadTranscript(
    "/api/students/me/get-transcript-pdf",
    "transcript.pdf",
  );
}
