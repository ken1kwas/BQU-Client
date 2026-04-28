import { apiJson, unwrapApiResult } from "./core";

export async function listGroups(page = 1, pageSize = 100) {
  const raw = await apiJson<any>(
    `/api/groups?page=${page}&pageSize=${pageSize}`,
  );
  return unwrapApiResult(raw);
}

export async function getGroup(id: string) {
  const raw = await apiJson<any>(`/api/groups/${encodeURIComponent(id)}`);
  return unwrapApiResult(raw);
}

export async function getGroupSchedule(id: string) {
  const raw = await apiJson<any>(
    `/api/groups/${encodeURIComponent(id)}/schedule`,
  );
  return unwrapApiResult(raw);
}

export function createGroup(req: {
  groupCode: string;
  specializationId: string;
  year: number;
  educationLanguage: number;
  educationLevel: number;
}) {
  return apiJson<any>("/api/groups", { method: "POST", json: req });
}

export function updateGroup(
  id: string,
  req: {
    groupCode: string;
    specializationId: string;
    year: number;
  },
) {
  return apiJson<any>(`/api/groups/${id}`, { method: "PUT", json: req });
}

export function deleteGroup(id: string) {
  return apiJson<any>(`/api/groups/${id}`, { method: "DELETE" });
}

export async function setGroupExamDate(
  groupId: string,
  date: string,
): Promise<void> {
  await apiJson<null>("/api/groups/set-exam-date", {
    method: "PUT",
    json: { groupId, date },
  });
}
