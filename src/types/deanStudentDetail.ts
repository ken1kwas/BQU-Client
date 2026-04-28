export interface DeanStudentDetailStudent {
  id: string;
}

export interface StudentClass {
  id: string;
  taughtSubjectId: string;
  name: string;
  classType: string;
  professor: string;
  start: string;
  end: string;
  period: string;
  room: string;
  code: string;
  isUpperWeek: boolean;
}

export interface StudentGradesDto {
  academicPerformance?: unknown[];
}

export interface StudentDetailResponse {
  name?: string;
  groupCode?: string;
  specializationName?: string;
  admissionYear?: string;
  course?: number;
  admissionScore?: number;
  email?: string | null;
  todayClasses?: StudentClass[];
  grades?: StudentGradesDto | null;
}

export interface DeanStudentDetailProps {
  student: DeanStudentDetailStudent;
  onBack: () => void;
}
