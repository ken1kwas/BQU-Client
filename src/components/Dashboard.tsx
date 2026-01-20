import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
// import { Badge } from "./ui/badge";
// import { AlertCircle, CheckCircle, XCircle, FileText, CalendarDays } from "lucide-react";
import { CourseCard } from "./CourseCard";
import { getStudentDashboard } from "../api";

interface DashboardCourse {
  id: string | number;
  title: string;
  code: string;
  time: string;
  location: string;
  type: string;
  instructor?: string;
}

// interface DashboardNotification {
//   id: string | number;
//   type: string;
//   course: string;
//   code?: string;
//   message: string;
//   timestamp: string;
// }

export function Dashboard() {
  const [courses, setCourses] = useState<DashboardCourse[]>([]);
  // const [notifications, setNotifications] = useState<DashboardNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        // Attempt to fetch dashboard data from the backend.  If the
        // backend returns an object with `todayClasses` and
        // `notifications` we normalise it into our local state.
        const data = await getStudentDashboard();
        if (!mounted) return;
        if (Array.isArray(data)) {
          // Some implementations may return the classes directly.
          setCourses(data);
        } else {
          if (Array.isArray(data.todayClasses)) setCourses(data.todayClasses);
          // if (Array.isArray(data.notifications)) setNotifications(data.notifications);
        }
      } catch (err: any) {
        if (!mounted) return;
        setError(err.message || "Не удалось загрузить данные");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1>Welcome!</h1>
        <p className="text-muted-foreground">
          Current information about your courses.
        </p>
      </div>
      {error && <p className="text-destructive">{error}</p>}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Your Courses</CardTitle>
            <CardDescription>Upcoming Classes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <p>Loading…</p>
            ) : courses.length === 0 ? (
              <p className="text-muted-foreground text-sm">No classes.</p>
            ) : (
              courses.map((classItem) => (
                <CourseCard
                  key={classItem.id}
                  title={classItem.title}
                  code={classItem.code}
                  time={classItem.time}
                  location={classItem.location}
                  instructor={classItem.instructor ?? ""}
                  type={classItem.type}
                />
              ))
            )}
          </CardContent>
        </Card>
        {/*
        <Card>
          <CardHeader>
            <CardTitle>Уведомления</CardTitle>
            <CardDescription>Последние обновления</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <p>Загрузка…</p>
            ) : notifications.length === 0 ? (
              <p className="text-muted-foreground text-sm">Нет уведомлений.</p>
            ) : (
              notifications.map((notification) => {
                // Choose an appropriate icon based on type
                let Icon = AlertCircle;
                let color = "text-yellow-500";
                switch (notification.type?.toLowerCase()) {
                  case "absence":
                    Icon = XCircle;
                    color = "text-red-500";
                    break;
                  case "assignment":
                    Icon = CheckCircle;
                    color = "text-green-500";
                    break;
                  case "event":
                    Icon = CalendarDays;
                    color = "text-purple-500";
                    break;
                  case "colloquium":
                    Icon = FileText;
                    color = "text-blue-500";
                    break;
                  case "grade":
                    Icon = AlertCircle;
                    color = "text-yellow-500";
                    break;
                }
                return (
                  <div key={notification.id} className="flex items-start gap-3 p-3 rounded-lg border">
                    <div className="flex-shrink-0 mt-1">
                      <Icon className={`h-4 w-4 ${color}`} />
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="font-medium">{notification.course}</p>
                        {notification.code && <Badge variant="outline">{notification.code}</Badge>}
                      </div>
                      <p className="text-sm">{notification.message}</p>
                      <p className="text-xs text-muted-foreground">{notification.timestamp}</p>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
        */}
      </div>
    </div>
  );
}
