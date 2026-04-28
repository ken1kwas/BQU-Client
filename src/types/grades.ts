export interface GradeCourse {
  id: string;
  course: string;
  code: string;
  instructor: string;
  percentage: number;
  scoreOutOf50: number;
  credits: number;
  weeklyHours: number;
  classType: "Lecture" | "Seminar" | string;
  colloquium: (number | null)[];
  seminarGrades: number[];
  assignmentScores: (number | null)[];
  assignmentsPassed: number;
  assignmentTotal: number;
  classSessions: Array<{
    type: "Lecture" | "Seminar";
    attendance: "present" | "absent";
  }>;
  attendancePresent: number;
  attendanceTotal: number;
}
