export interface CourseTopic {
  session: number;
  topic: string;
  date?: string;
}

export interface TeacherCourse {
  id: number | string;
  title: string;
  code: string;
  type: string;
  groups: string[];
  studentCount: number;
  hours: number;
  credits: number;
  hasSyllabus: boolean;
  syllabusId?: string | number;
  topics: CourseTopic[];
}
