export interface Student {
  id: string | number;
  name: string;
  activityAttendance: Array<{
    attendance: "present" | "absent";
    grade: number | null;
  }>;
  colloquium: (number | null)[];
  assignments: (number | null)[];
  colloquiumIds?: (string | null)[];
  seminarIds?: (string | null)[];
  assignmentIds?: (string | null)[];
  userId?: string | null;
}

export interface CourseSession {
  id: string;
  date: string;
  time: string;
  type: "L" | "S";
  seminarId?: string | null;
}
