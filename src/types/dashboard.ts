export interface DashboardCourse {
  id: string | number;
  title: string;
  code: string;
  time: string;
  location: string;
  type: string;
  instructor?: string;
  taughtSubjectId?: string | number;
}

export interface DashboardNotification {
  id: string | number;
  type: string;
  course: string;
  code?: string;
  message: string;
  timestamp: string;
}
