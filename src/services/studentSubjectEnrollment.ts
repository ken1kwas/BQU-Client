import { apiJson, toArray, unwrapApiResult } from "../api/index";
import type {
  CreateStudentSubjectEnrollmentDto,
  StudentSubjectEnrollmentGetAllResponseDto,
  StudentSubjectEnrollmentListItemDto,
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

function normalizeEnrollmentListItem(
  item: any,
): StudentSubjectEnrollmentListItemDto {
  return {
    id: pickString(item?.id, item?.Id),
    studentId: pickString(item?.studentId, item?.StudentId),
    studentFullName: pickString(item?.studentFullName, item?.StudentFullName),
    subjectName: pickString(item?.subjectName, item?.SubjectName),
    taughtSubjectId: pickString(item?.taughtSubjectId, item?.TaughtSubjectId),
    taughtSubjectCode: pickString(
      item?.taughtSubjectCode,
      item?.TaughtSubjectCode,
    ),
  };
}

export async function listStudentSubjectEnrollments() {
  const response = await apiJson<any>("/api/student-subject-enrollments");
  return toArray(response).map(normalizeEnrollment);
}

export async function getAllStudentSubjectEnrollments(options?: {
  page?: number;
  pageSize?: number;
}): Promise<StudentSubjectEnrollmentGetAllResponseDto> {
  const page = options?.page ?? 1;
  const pageSize = options?.pageSize ?? 10;
  const query = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });

  const raw = await apiJson<any>(`/api/student-subject-enrollments?${query}`);
  const data = unwrapApiResult<any>(raw);
  const items = toArray<any>(data?.items ?? data?.Items).map(
    normalizeEnrollmentListItem,
  );

  return {
    items,
    page: pickNumber(data?.page, data?.Page, page),
    pageSize: pickNumber(data?.pageSize, data?.PageSize, pageSize),
    totalCount: pickNumber(data?.totalCount, data?.TotalCount, 0),
    totalPages: pickNumber(data?.totalPages, data?.TotalPages, 0),
  };
}

export function createStudentSubjectEnrollment(
  payload: CreateStudentSubjectEnrollmentDto,
) {
  return apiJson<any>(
    "/api/student-subject-enrollments",
    {
      method: "POST",
      json: {
        ...payload,
        attempt: payload.attempt ?? null,
      },
    },
  ).then((raw) => unwrapApiResult<string>(raw));
}

export function updateStudentSubjectEnrollment(
  enrollmentId: string,
  payload: UpdateStudentSubjectEnrollmentDto,
) {
  return apiJson<any>(
    `/api/student-subject-enrollments/${encodeURIComponent(enrollmentId)}`,
    {
      method: "PUT",
      json: payload,
    },
  ).then((raw) => unwrapApiResult(raw));
}

export function deleteStudentSubjectEnrollment(
  enrollmentId: string,
) {
  return apiJson<void>(
    `/api/student-subject-enrollments/${encodeURIComponent(enrollmentId)}`,
    {
      method: "DELETE",
    },
  );
}
