import {
  BASE_URL,
  apiJson,
  getToken,
  parseError,
  unwrapApiResult,
} from "./core";

export async function listTeachers(page = 1, pageSize = 100) {
  const raw = await apiJson<any>(
    `/api/teachers?page=${page}&pageSize=${pageSize}`,
  );
  return unwrapApiResult(raw);
}

export function listTeacherCourses() {
  return apiJson<any>("/api/teachers/courses");
}

export type TeacherFinalExamDto = {
  id: string;
  studentId: string;
  studentFullName: string;
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  groupId: string;
  groupCode: string;
  grade: number | null;
  formattedDate: string | null;
};

export async function listTeacherFinalExams(): Promise<TeacherFinalExamDto[]> {
  const raw = await apiJson<any>("/api/teachers/me/exams");
  const inner = unwrapApiResult<any>(raw);
  const exams = Array.isArray(inner?.exams)
    ? inner.exams
    : Array.isArray(inner)
      ? inner
      : [];

  return exams.map((exam: any) => ({
    id: String(exam?.id ?? exam?.Id ?? ""),
    studentId: String(exam?.studentId ?? exam?.StudentId ?? ""),
    studentFullName: String(
      exam?.studentFullName ?? exam?.StudentFullName ?? "",
    ),
    subjectId: String(exam?.subjectId ?? exam?.SubjectId ?? ""),
    subjectName: String(exam?.subjectName ?? exam?.SubjectName ?? ""),
    subjectCode: String(exam?.subjectCode ?? exam?.SubjectCode ?? ""),
    groupId: String(exam?.groupId ?? exam?.GroupId ?? ""),
    groupCode: String(exam?.groupCode ?? exam?.GroupCode ?? ""),
    grade:
      typeof (exam?.grade ?? exam?.Grade) === "number"
        ? Number(exam?.grade ?? exam?.Grade)
        : null,
    formattedDate:
      typeof (exam?.formattedDate ?? exam?.FormattedDate) === "string"
        ? String(exam?.formattedDate ?? exam?.FormattedDate)
        : null,
  }));
}

export function getTeacher(id: string) {
  return apiJson<any>(`/api/teachers/${id}`);
}

export function updateTeacher(
  id: string,
  req: { name: string; surname: string; departmentId: string },
) {
  return apiJson<any>(`/api/teachers/${id}`, { method: "PUT", json: req });
}

export function deleteTeacher(id: string) {
  return apiJson<any>(`/api/teachers/${id}`, { method: "DELETE" });
}

export async function importTeachersExcel(file: File): Promise<any> {
  const formData = new FormData();
  formData.append("file", file);

  const url = `${BASE_URL}/api/teachers/import`;
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
    const errorText = await parseError(resp);
    throw new Error(errorText);
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
