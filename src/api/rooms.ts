import { apiJson, unwrapApiResult } from "./core";

export async function listRooms(page = 1, pageSize = 110) {
  const raw = await apiJson<any>(
    `/api/rooms?page=${page}&pageSize=${pageSize}`,
  );
  return unwrapApiResult(raw);
}

export function createRoom(req: { roomName: string; capacity: number }) {
  return apiJson<any>("/api/rooms", { method: "POST", json: req });
}

export function updateRoom(
  id: string,
  req: { name: string; capacity: number },
) {
  return apiJson<any>(`/api/rooms/${id}`, { method: "PUT", json: req });
}

export function deleteRoom(id: string) {
  return apiJson<any>(`/api/rooms/${id}`, { method: "DELETE" });
}
