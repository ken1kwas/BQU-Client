import { apiJson, toArray } from "../api/index";
import type {
  CreateStudentSubjectEnrollmentDto,
  StudentSubjectEnrollmentDto,
  UpdateStudentSubjectEnrollmentDto,
} from "../types/studentSubjectEnrollment";

function pickString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value))
      return String(value);
  }
  return "";
}

function pickNumber(...values: unknown[]): number {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return 1;
}

function normalizeEnrollment(item: any): StudentSubjectEnrollmentDto {
  return {
    studentId: pickString(item?.studentId, item?.StudentId),
    studentName: pickString(item?.studentName, item?.StudentName),
    taughtSubjectId: pickString(item?.taughtSubjectId, item?.TaughtSubjectId),
    subjectName: pickString(item?.subjectName, item?.SubjectName),
    groupCode: pickString(item?.groupCode, item?.GroupCode),
    attempt: pickNumber(item?.attempt, item?.Attempt),
  };
}

export async function listStudentSubjectEnrollments() {
  const response = await apiJson<any>("/api/studentsubjectenrollments");
  return toArray(response).map(normalizeEnrollment);
}

export function createStudentSubjectEnrollment(
  payload: CreateStudentSubjectEnrollmentDto,
) {
  return apiJson<StudentSubjectEnrollmentDto>(
    "/api/studentsubjectenrollments",
    {
      method: "POST",
      json: payload,
    },
  );
}

export function updateStudentSubjectEnrollment(
  studentId: string,
  taughtSubjectId: string,
  attempt: number,
  payload: UpdateStudentSubjectEnrollmentDto,
) {
  return apiJson<StudentSubjectEnrollmentDto>(
    `/api/studentsubjectenrollments/${encodeURIComponent(studentId)}/${encodeURIComponent(taughtSubjectId)}/${attempt}`,
    {
      method: "PUT",
      json: payload,
    },
  );
}

export function deleteStudentSubjectEnrollment(
  studentId: string,
  taughtSubjectId: string,
  attempt: number,
) {
  return apiJson<void>(
    `/api/studentsubjectenrollments/${encodeURIComponent(studentId)}/${encodeURIComponent(taughtSubjectId)}/${attempt}`,
    {
      method: "DELETE",
    },
  );
}
