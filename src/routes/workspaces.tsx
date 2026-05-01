import { Dashboard } from "../components/Dashboard";
import { DeanEnrollmentManagement } from "../components/DeanEnrollmentManagement";
import { DeanFinalExams } from "../components/DeanFinalExams";
import { DeanManagement } from "../components/DeanManagement";
import { DeanSchedule } from "../components/DeanSchedule";
import { Grades } from "../components/Grades";
import { Profile } from "../components/Profile";
import { Schedule } from "../components/Schedule";
import { StudentFinals } from "../components/StudentFinals";
import { StudentSubjectsHistory } from "../components/StudentSubjectsHistory";
import { TeacherCourseDetail } from "../components/TeacherCourseDetail";
import { TeacherCourses } from "../components/TeacherCourses";
import { TeacherFinalExams } from "../components/TeacherFinalExams";
import type { SelectedCourse } from "../types/app";

export function StudentWorkspace({ activeView }: { activeView: string }) {
  switch (activeView) {
    case "dashboard":
      return <Dashboard />;
    case "student-finals":
      return <StudentFinals />;
    case "schedule":
      return <Schedule userRole="student" />;
    case "grades":
      return <Grades />;
    case "subjects-history":
      return <StudentSubjectsHistory />;
    case "profile":
      return <Profile />;
    default:
      return <Dashboard />;
  }
}

export function DeanWorkspace({ activeView }: { activeView: string }) {
  switch (activeView) {
    case "enrollments":
      return <DeanEnrollmentManagement />;
    case "management":
      return <DeanManagement />;
    case "dean-finals-list":
      return <DeanFinalExams mode="list" />;
    case "dean-finals-confirm":
      return <DeanFinalExams mode="confirm" />;
    case "dean-finals-create":
      return <DeanFinalExams mode="create" />;
    case "schedule":
      return <DeanSchedule />;
    case "profile":
      return <Profile userRole="dean" />;
    default:
      return <DeanManagement />;
  }
}

export function TeacherWorkspace({
  activeView,
  courseId,
  courseState,
  onCourseSelect,
  onBackToCourses,
}: {
  activeView: string;
  courseId: string | null;
  courseState: SelectedCourse | null;
  onCourseSelect: (course: string | number | SelectedCourse) => void;
  onBackToCourses: () => void;
}) {
  if (courseId) {
    return (
      <TeacherCourseDetail
        courseId={courseId}
        onBack={onBackToCourses}
        initialStudentCount={courseState?.studentCount}
        initialHours={courseState?.hours}
      />
    );
  }

  switch (activeView) {
    case "courses":
      return <TeacherCourses onCourseSelect={onCourseSelect} />;
    case "teacher-finals":
      return <TeacherFinalExams />;
    case "schedule":
      return <Schedule userRole="teacher" />;
    case "profile":
      return <Profile userRole="teacher" />;
    default:
      return <TeacherCourses onCourseSelect={onCourseSelect} />;
  }
}
