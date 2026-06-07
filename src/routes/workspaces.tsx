import { Dashboard } from "../components/Dashboard";
import { DeanEnrollmentManagement } from "../components/DeanEnrollmentManagement";
import { DeanFinalExams } from "../components/DeanFinalExams";
import { DeanManagement } from "../components/DeanManagement";
import { DeanNotifications } from "../components/DeanNotifications";
import { DeanSchedule } from "../components/DeanSchedule";
import { Grades } from "../components/Grades";
import { LibraryPage } from "../components/LibraryPage";
import { MyNotifications } from "../components/MyNotifications";
import { Profile } from "../components/Profile";
import { Schedule } from "../components/Schedule";
import { StudentFinals } from "../components/StudentFinals";
import { StudentSubjectsHistory } from "../components/StudentSubjectsHistory";
import { TeacherCourseDetail } from "../components/TeacherCourseDetail";
import { TeacherCourses } from "../components/TeacherCourses";
import { TeacherFinalExams } from "../components/TeacherFinalExams";
import { TeacherNotifications } from "../components/TeacherNotifications";
import type { SelectedCourse } from "../types/app";

export function StudentWorkspace({ activeView }: { activeView: string }) {
  switch (activeView) {
    case "dashboard":
      return <Dashboard />;
    case "student-finals":
      return <StudentFinals />;
    case "schedule":
      return <Schedule userRole="student" />;
    case "my-notifications":
      return <MyNotifications roleLabel="Student" />;
    case "grades":
      return <Grades />;
    case "subjects-history":
      return <StudentSubjectsHistory />;
    case "library":
      return <LibraryPage userRole="student" />;
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
    case "library":
      return <LibraryPage userRole="dean" />;
    case "my-notifications":
      return <MyNotifications roleLabel="Dean" />;
    case "dean-notifications":
      return <DeanNotifications />;
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
    case "library":
      return <LibraryPage userRole="teacher" />;
    case "my-notifications":
      return <MyNotifications roleLabel="Teacher" />;
    case "teacher-notifications":
      return <TeacherNotifications />;
    case "profile":
      return <Profile userRole="teacher" />;
    default:
      return <TeacherCourses onCourseSelect={onCourseSelect} />;
  }
}
