export interface CourseCardProps {
  title: string;
  code: string;
  time: string;
  location: string;
  instructor: string;
  type: string;
  variant?: "today" | "week";
  topic?: string;
  group?: string;
  userRole?: "student" | "teacher";
  syllabusTaughtSubjectId?: string | number;
  hasSyllabus?: boolean;
}
