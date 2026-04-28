import type { StudentSubjectEnrollmentDto } from "./studentSubjectEnrollment";

export type StudentOption = {
  id: string;
  label: string;
};

export type TaughtSubjectOption = {
  id: string;
  label: string;
  subjectName: string;
};

export type EnrollmentFormState = {
  studentId: string;
  taughtSubjectId: string;
  attempt: string;
};

export type EnrollmentEditor =
  | {
      mode: "create";
    }
  | {
      mode: "edit";
      enrollment: StudentSubjectEnrollmentDto;
    };
