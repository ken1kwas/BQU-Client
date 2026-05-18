import { useEffect, useRef, useState, type CSSProperties } from "react";
import { toast } from "sonner";

import {
  getMyNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  NotificationType,
  type UserNotification,
} from "../api";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

function typeLabel(type: NotificationType): string {
  switch (type) {
    case NotificationType.Success:
      return "Success";
    case NotificationType.Warning:
      return "Warning";
    case NotificationType.Error:
      return "Error";
    default:
      return "Info";
  }
}

function typeClassName(type: NotificationType): string {
  switch (type) {
    case NotificationType.Success:
      return "bg-green-100 text-green-800 border-green-200";
    case NotificationType.Warning:
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case NotificationType.Error:
      return "bg-red-100 text-red-800 border-red-200";
    default:
      return "bg-blue-100 text-blue-800 border-blue-200";
  }
}

function typeStyle(type: NotificationType): CSSProperties {
  switch (type) {
    case NotificationType.Success:
      return { backgroundColor: "#dcfce7", color: "#166534", borderColor: "#86efac" };
    case NotificationType.Warning:
      return { backgroundColor: "#fef9c3", color: "#854d0e", borderColor: "#fde047" };
    case NotificationType.Error:
      return { backgroundColor: "#fee2e2", color: "#991b1b", borderColor: "#fca5a5" };
    default:
      return { backgroundColor: "#dbeafe", color: "#1e40af", borderColor: "#93c5fd" };
  }
}

export function MyNotifications({ roleLabel }: { roleLabel: string }) {
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const PAGE_SIZE = 20;

  const loadNotifications = async () => {
    try {
      setIsLoading(true);
      const data = await getMyNotifications(1, PAGE_SIZE);
      setNotifications(data.items);
      setPage(data.page);
      setTotalPages(data.totalPages);
    } catch (error: any) {
      toast.error(error?.message ?? "Failed to load notifications");
      setNotifications([]);
      setPage(1);
      setTotalPages(1);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMoreNotifications = async () => {
    if (isLoading || isLoadingMore || page >= totalPages) return;

    try {
      setIsLoadingMore(true);
      const nextPage = page + 1;
      const data = await getMyNotifications(nextPage, PAGE_SIZE);
      setNotifications((prev) => [...prev, ...data.items]);
      setPage(data.page);
      setTotalPages(data.totalPages);
    } catch (error: any) {
      toast.error(error?.message ?? "Failed to load more notifications");
    } finally {
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    void loadNotifications();
  }, []);

  useEffect(() => {
    const target = sentinelRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting) {
          void loadMoreNotifications();
        }
      },
      { rootMargin: "120px" },
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [isLoading, isLoadingMore, page, totalPages]);

  const handleMarkAllAsRead = async () => {
    try {
      setIsMarkingAll(true);
      await markAllNotificationsAsRead();
      toast.success("Bütün bildirişlər oxunmuş kimi işarələndi");
      setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })));
    } catch (error: any) {
      toast.error(error?.message ?? "Bildirişləri oxunmuş kimi işarələmək mümkün olmadı");
    } finally {
      setIsMarkingAll(false);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      setMarkingId(id);
      await markNotificationAsRead(id);
      toast.success("Bildiriş oxunmuş kimi işarələndi");
      setNotifications((prev) =>
        prev.map((item) => (item.id === id ? { ...item, isRead: true } : item)),
      );
    } catch (error: any) {
      toast.error(error?.message ?? "Failed to mark notification as read");
    } finally {
      setMarkingId(null);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleMarkAllAsRead}
            disabled={isLoading || isMarkingAll || notifications.length === 0}
          >
            {isMarkingAll ? "Oxunur..." : "Hamısını oxunmuş kimi işarələ"}
          </Button>
          <Button variant="outline" onClick={loadNotifications} disabled={isLoading || isLoadingMore}>
            {isLoading ? "Yüklenir..." : "Yenilə"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {notifications.length === 0 ? (
          <div className="rounded-md border border-dashed p-8 text-center text-muted-foreground">
            {isLoading ? "Bildirişlər yüklənir..." : "Bildiriş tapılmadı"}
          </div>
        ) : (
          notifications.map((item) => (
            <div
              key={item.id}
              className={`rounded-lg border p-4 transition-colors ${
                item.isRead ? "border-border bg-background" : "bg-background shadow-sm"
              }`}
              style={
                item.isRead
                  ? undefined
                  : { borderColor: "#dc2626", borderWidth: "1px" }
              }
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {!item.isRead && (
                      <span className="text-xs font-semibold text-red-600">
                        Oxunmamış
                      </span>
                    )}
                    <Badge
                      variant="outline"
                      className={typeClassName(item.notificationType)}
                      style={typeStyle(item.notificationType)}
                    >
                      {typeLabel(item.notificationType)}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    kimnən:{" "}
                    <span className="font-medium text-foreground">
                      {item.fromFullName || "-"}
                    </span>
                  </p>
                  <p className="text-sm leading-6 text-foreground">{item.message || "-"}</p>
                  <p className="text-xs text-muted-foreground">{item.receiveDate || "-"}</p>
                </div>
                <div className="shrink-0">
                  <Button
                    size="sm"
                    variant={item.isRead ? "outline" : "default"}
                    onClick={() => handleMarkAsRead(item.id)}
                    disabled={item.isRead || markingId === item.id || isMarkingAll}
                  >
                    {item.isRead
                      ? "Oxunmuş"
                      : markingId === item.id
                        ? "İşarələnir..."
                        : "Oxunmuş kimi işarələ"}
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
        {notifications.length > 0 && page < totalPages && (
          <>
            <div ref={sentinelRef} className="h-1" />
            <div className="text-center text-xs text-muted-foreground">
              {isLoadingMore ? "Daha çox bildiriş yüklənir..." : "Aşağı sürüşdürün"}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

