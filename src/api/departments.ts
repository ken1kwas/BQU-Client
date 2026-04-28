import { apiJson, unwrapApiResult } from "./core";

export async function listDepartments(page = 1, pageSize = 100) {
  const raw = await apiJson<any>(
    `/api/departments?page=${page}&pageSize=${pageSize}`,
  );
  return unwrapApiResult(raw);
}

export async function listSpecializations(page = 1, pageCount = 100) {
  const raw = await apiJson<any>(
    `/api/specializations?page=${page}&pageCount=${pageCount}`,
  );
  return unwrapApiResult(raw);
}
