export interface ScheduleEntry {
  id: string | number;
  title: string;
  code: string;
  time: string;
  location: string;
  type: string;
  instructor?: string;
  topic?: string;
  group?: string;
  taughtSubjectId?: string | number;
  hasSyllabus?: boolean;
}

export interface ScheduleDay {
  day: string;
  date: string;
  classes: ScheduleEntry[];
}

export interface ScheduleProps {
  userRole?: "student" | "teacher";
}
