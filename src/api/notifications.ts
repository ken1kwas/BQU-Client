import { apiJson } from "./core";

export enum NotificationType {
  Info = 0,
  Success = 1,
  Warning = 2,
  Error = 3,
}

export type CreateNotificationRequest = {
  from?: string;
  to: string;
  notificationType: NotificationType;
  message: string;
};

export type CreateNotificationResponse = {
  message: string;
  isSucceeded: boolean;
  statusCode: number;
};

export function createNotification(payload: CreateNotificationRequest) {
  return apiJson<CreateNotificationResponse>("/api/notifications", {
    method: "POST",
    json: payload,
  });
}

export type SendNotificationRequest = {
  notificationType: NotificationType;
  message: string;
};

export function sendNotificationToGroup(
  groupId: string,
  payload: SendNotificationRequest,
) {
  return apiJson<CreateNotificationResponse>(
    `/api/groups/${encodeURIComponent(groupId)}/send-notification`,
    {
      method: "POST",
      json: payload,
    },
  );
}

export function sendNotificationAsUser(payload: SendNotificationRequest) {
  return apiJson<CreateNotificationResponse>("/api/user/send-notification", {
    method: "POST",
    json: payload,
  });
}

export type NotificationMutationResponse = {
  message: string;
  isSucceeded: boolean;
  statusCode: number;
};

export type UserNotification = {
  id: string;
  fromFullName: string;
  message: string;
  receiveDate: string;
  notificationType: NotificationType;
  isRead: boolean;
};

type GetMyNotificationsResponse = {
  data?: {
    items?: Array<{
      id?: string;
      fromFullName?: string;
      message?: string;
      receiveDate?: string;
      notificationType?: number;
      isRead?: boolean;
    }>;
    page?: number;
    pageSize?: number;
    totalCount?: number;
    totalPages?: number;
  };
};

export type PaginatedNotificationsResult = {
  items: UserNotification[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
};

export async function getMyNotifications(
  page = 1,
  pageSize = 20,
): Promise<PaginatedNotificationsResult> {
  const raw = await apiJson<GetMyNotificationsResponse>(
    `/api/user/me/notifications?page=${page}&pageSize=${pageSize}`,
  );

  const notifications = Array.isArray(raw?.data?.items)
    ? raw.data.items
    : [];

  return {
    items: notifications.map((item) => ({
      id: String(item?.id ?? ""),
      fromFullName: String(item?.fromFullName ?? ""),
      message: String(item?.message ?? ""),
      receiveDate: String(item?.receiveDate ?? ""),
      notificationType:
        typeof item?.notificationType === "number" &&
        item.notificationType >= NotificationType.Info &&
        item.notificationType <= NotificationType.Error
          ? item.notificationType
          : NotificationType.Info,
      isRead: Boolean(item?.isRead),
    })),
    page: Number(raw?.data?.page ?? page),
    pageSize: Number(raw?.data?.pageSize ?? pageSize),
    totalCount: Number(raw?.data?.totalCount ?? 0),
    totalPages: Number(raw?.data?.totalPages ?? 1),
  };
}

export function markAllNotificationsAsRead() {
  return apiJson<NotificationMutationResponse>(
    "/api/user/me/notifications/mark-as-read",
    { method: "PUT" },
  );
}

export function markNotificationAsRead(id: string) {
  return apiJson<NotificationMutationResponse>(
    `/api/notifications/${encodeURIComponent(id)}/mark-as-read`,
    { method: "PUT" },
  );
}
