export type DeanFinalExamsMode = "list" | "confirm" | "create";

export type FinalExam = {
  id: string;
  studentId?: string;
  taughtSubjectId?: string;
  subjectId?: string;
  title: string;
  studentName?: string;
  courseCode?: string;
  groupCode?: string;
  semester?: number;
  date?: string;
  grade?: number;
  gradesConfirmed?: boolean;
  isAllowed?: boolean;
};

export type StudentOption = {
  id: string;
  label: string;
};

export type SubjectOption = {
  id: string;
  label: string;
};

export type GroupOption = {
  id: string;
  code: string;
  label: string;
};

export type DeanFinalExamsProps = {
  onClose?: () => void;
};
