export interface ScheduleEntry {
  id: string | number;
  courseId: number;
  courseName: string;
  courseCode: string;
  teacherName: string;
  roomId: string | number;
  roomName: string;
  groupCode: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  type: string;
  topic?: string;
  isUpperWeek?: boolean;
}
