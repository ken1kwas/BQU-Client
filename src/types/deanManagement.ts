export interface Room {
  id: number;
  name: string;
  building: string;
  capacity: number;
  type: string;
}

export interface Teacher {
  id: number;
  name: string;
  surname?: string;
  middleName?: string;
  userName?: string;
  email: string;
  department: string;
  phone: string;
  position?: number;
}

export interface Course {
  id: number;
  code: string;
  title: string;
  credits: number;
  type: string;
  department: string;
  departmentName?: string;
  teacherId?: number;
  teacherName?: string;
  groupId?: number;
  groupCode?: string;
  studentCount?: number;
  hasSyllabus?: boolean;
  year?: number;
  semester?: number;
}

export interface Group {
  id: number;
  code?: string;
  groupCode?: string;
  department: string;
  departmentName?: string;
  departmentId?: string;
  year: number;
  studentCount: number;
  specializationId?: string;
  specializationName?: string;
  educationLanguage?: number;
  educationLevel?: number;
}

export interface Student {
  id: string;
  studentId: string;
  name: string;
  email?: string;
  groupId?: number;
  groupCode: string;
  year: number;
  specialization: string;
  dateOfBirth?: string;
  phoneNumber?: string;
  address?: string;
  language?: string;
  yearOfAdmission?: string;
  admissionScore?: number;
}
