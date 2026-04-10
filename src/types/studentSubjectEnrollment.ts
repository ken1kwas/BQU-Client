export interface StudentSubjectEnrollmentDto {
  studentId: string;
  studentName: string;
  taughtSubjectId: string;
  subjectName: string;
  groupCode: string;
  attempt: number;
}

export interface CreateStudentSubjectEnrollmentDto {
  studentId: string;
  taughtSubjectId: string;
  attempt?: number;
}

export interface UpdateStudentSubjectEnrollmentDto {
  taughtSubjectId: string;
}

