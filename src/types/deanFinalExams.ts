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
  gradeBeforeExam?: number;
  date?: string;
  grade?: number;
  gradesConfirmed?: boolean;
  isAllowed?: boolean;
};

export type StudentOption = {
  id: string;
  groupId?: string;
  groupCode?: string;
  label: string;
};

export type SubjectOption = {
  id: string;
  subjectId?: string;
  taughtSubjectId?: string;
  groupId?: string;
  code?: string;
  title?: string;
  groupCode?: string;
  label: string;
};

export type GroupOption = {
  id: string;
  groupId?: string;
  code: string;
  groupCode?: string;
  label: string;
};

export type DeanFinalExamsProps = {
  onClose?: () => void;
};
