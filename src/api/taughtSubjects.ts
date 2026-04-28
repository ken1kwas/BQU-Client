import { apiJson, unwrapApiResult } from "./core";

export async function listTaughtSubjects(page = 1, pageSize = 100) {
  const raw = await apiJson<any>(
    `/api/taught-subjects?page=${page}&pageSize=${pageSize}`,
  );
  return unwrapApiResult(raw);
}

export async function getTaughtSubject(id: string) {
  const raw = await apiJson<any>(
    `/api/taught-subjects/${encodeURIComponent(id)}`,
  );
  return unwrapApiResult(raw);
}

export async function listTaughtSubjectStudents(id: string) {
  const raw = await apiJson<any>(
    `/api/taught-subjects/${encodeURIComponent(id)}/students`,
  );
  return unwrapApiResult(raw);
}

export async function listTaughtSubjectColloquiums(id: string) {
  const raw = await apiJson<any>(
    `/api/taught-subjects/${encodeURIComponent(id)}/colloquiums`,
  );
  return unwrapApiResult(raw);
}

export async function listTaughtSubjectClasses(id: string) {
  const raw = await apiJson<any>(
    `/api/taught-subjects/${encodeURIComponent(id)}/classes`,
  );
  return unwrapApiResult(raw);
}

export async function listTaughtSubjectIndependentWorks(id: string) {
  const raw = await apiJson<any>(
    `/api/taught-subjects/${encodeURIComponent(id)}/IndependendWorks`,
  );
  return unwrapApiResult(raw);
}

export function createTaughtSubject(req: {
  code: string;
  title: string;
  departmentId: string;
  teacherId: string;
  groupId: string;
  credits: number;
  hours: number;
  classTimes: Array<{
    start: string;
    end: string;
    day: number;
    room: string;
    frequency: number;
    classType: number | null;
  }>;
  year: number;
  semester: number;
}) {
  return apiJson<any>("/api/taught-subjects", { method: "POST", json: req });
}

export function updateTaughtSubject(
  id: string,
  req: {
    code: string;
    title: string;
    credits: number;
    departmentId: string;
    teacherId: string;
    groupId: string;
  },
) {
  return apiJson<any>(`/api/taught-subjects/${id}`, {
    method: "PUT",
    json: req,
  });
}

export function deleteTaughtSubject(id: string) {
  return apiJson<any>(`/api/taught-subjects/${id}`, { method: "DELETE" });
}
