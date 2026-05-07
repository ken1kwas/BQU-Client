import { apiJson } from "./core";

export type UserListItem = {
  id: string;
  fullName: string;
};

type ListUsersResponse = {
  data?: {
    items?: Array<{
      id?: string;
      fullName?: string;
    }>;
    page?: number;
    pageSize?: number;
    totalCount?: number;
    totalPages?: number;
  };
};

export async function listUsers(page = 1, pageSize = 30): Promise<{
  items: UserListItem[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}> {
  const raw = await apiJson<ListUsersResponse>(
    `/api/user?page=${page}&pageSize=${pageSize}`,
  );

  const data = raw?.data ?? {};
  const items = Array.isArray(data.items) ? data.items : [];

  return {
    items: items
      .map((item) => ({
        id: String(item?.id ?? ""),
        fullName: String(item?.fullName ?? ""),
      }))
      .filter((item) => item.id),
    page: Number(data.page ?? page),
    pageSize: Number(data.pageSize ?? pageSize),
    totalCount: Number(data.totalCount ?? 0),
    totalPages: Number(data.totalPages ?? 1),
  };
}
