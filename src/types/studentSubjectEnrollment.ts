export interface StudentSubjectEnrollmentDto {
  studentId: string;
  studentName: string;
  taughtSubjectId: string;
  subjectName: string;
  groupCode: string;
  attempt: number;
}

export interface StudentSubjectEnrollmentListItemDto {
  id: string;
  studentId: string;
  studentFullName: string;
  subjectName: string;
  taughtSubjectId: string;
  taughtSubjectCode: string;
}

export interface StudentSubjectEnrollmentGetAllResponseDto {
  items: StudentSubjectEnrollmentListItemDto[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface CreateStudentSubjectEnrollmentDto {
  studentId: string;
  taughtSubjectId: string;
  attempt?: number | null;
}

export interface UpdateStudentSubjectEnrollmentDto {
  attempt: number;
}
