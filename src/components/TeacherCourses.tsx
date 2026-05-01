import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { FileUp, Users, BookOpen, Calendar } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
// removed AddTopics dialog-related imports (not used anymore)
import {
  listTeacherCourses,
  uploadSyllabusFile,
  downloadSyllabusFile,
  deleteSyllabusFile,
  toArray,
} from "../api/index";
import type { CourseTopic, TeacherCourse } from "../types/teacherCourses";

const formatTopicDate = (value: any): string => {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) {
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  }
  return String(value);
};

const mapTopicsFromApi = (raw: any): CourseTopic[] => {
  const candidates = [
    raw?.topics,
    raw?.courseTopics,
    raw?.sessions,
    raw?.lessons,
    raw?.classSessions,
  ];

  for (const candidate of candidates) {
    const topics = toArray(candidate);
    if (topics.length > 0) {
      return topics
        .map((topic: any, index: number) => {
          const sessionNumber = Number(
            topic?.session ??
              topic?.sessionNumber ??
              topic?.lesson ??
              index + 1,
          );
          return {
            session: Number.isFinite(sessionNumber) ? sessionNumber : index + 1,
            topic:
              topic?.topic ??
              topic?.name ??
              topic?.title ??
              topic?.description ??
              "",
            date: formatTopicDate(
              topic?.date ?? topic?.scheduledDate ?? topic?.heldOn,
            ),
          };
        })
        .filter((topic: CourseTopic) => topic.topic || topic.date);
    }
  }

  return [];
};

// AddTopicsDialog removed — feature hidden for teachers per request

export function TeacherCourses({
  onCourseSelect,
}: {
  onCourseSelect?: (
    course:
      | string
      | number
      | { id: string | number; studentCount?: number; hours?: number },
  ) => void;
}) {
  // Local state for courses loaded from the backend
  const [courses, setCourses] = useState<TeacherCourse[]>([]);
  const navigate = useNavigate();

  // Fetch teacher courses on mount
  const refreshCourses = async () => {
    try {
      const resp = await listTeacherCourses();
      const list = toArray(resp).map((c: any) => {
        const id =
          c.courseId ?? c.id ?? c.taughtSubjectId ?? c.taughtSubject?.id;
        const syllabusId =
          c.syllabusId ?? c.syllabus?.id ?? c.syllabus?.syllabusId ?? null;
        const hasSyllabus = c.hasSyllabus ?? Boolean(syllabusId);

        const teacherCourse: TeacherCourse = {
          id,
          title:
            c.courseName ??
            c.title ??
            c.name ??
            c.taughtSubject?.title ??
            c.subjectTitle ??
            "",
          code: c.courseCode ?? c.code ?? c.taughtSubject?.code ?? "",
          type: c.type ?? c.classType ?? "Lecture",
          groups: Array.isArray(c.groups)
            ? c.groups
                .map((g: any) => g.groupCode ?? g.code ?? g.name ?? "")
                .filter(Boolean)
            : c.group?.groupCode
              ? [c.group.groupCode]
              : c.groupCode
                ? [c.groupCode]
                : c.groupName
                  ? [c.groupName]
                  : [],
          studentCount:
            c.studentCount ?? c.studentsCount ?? c.students?.length ?? 0,
          hours: c.hours ?? c.weeklyHours ?? c.totalHours ?? 0,
          credits: c.creditCount ?? c.credits ?? c.credit ?? 0,
          hasSyllabus,
          syllabusId,
          topics: mapTopicsFromApi(c),
        };
        return teacherCourse;
      });
      setCourses(list);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    refreshCourses();
  }, []);
  // Upload syllabus for a course using taughtSubjectId.
  const handleSyllabusUpload = (course: TeacherCourse) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".pdf,.doc,.docx";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        try {
          await uploadSyllabusFile(String(course.id), file);
          toast.success("Syllabus uploaded successfully");
          await refreshCourses();
        } catch (error: any) {
          toast.error(error?.message ?? "Failed to upload syllabus");
        }
      }
    };
    input.click();
  };

  const handleSyllabusDownload = async (course: TeacherCourse) => {
    try {
      const { blob, fileName } = await downloadSyllabusFile(String(course.id));
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName || `syllabus-${course.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (error: any) {
      toast.error(error?.message ?? "Failed to download syllabus");
    }
  };

  const handleSyllabusView = async (course: TeacherCourse) => {
    try {
      const { blob } = await downloadSyllabusFile(String(course.id));
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener");
      // Let the browser load before revoking.
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch (error: any) {
      toast.error(error?.message ?? "Failed to open syllabus");
    }
  };

  const handleSyllabusDelete = async (course: TeacherCourse) => {
    try {
      await deleteSyllabusFile(String(course.id));
      toast.success("Syllabus deleted successfully");
      await refreshCourses();
    } catch (error: any) {
      toast.error(error?.message ?? "Failed to delete syllabus");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1>Mənim fənnlərim</h1>
        <p className="text-muted-foreground">
          Fənnləriniz, tələbələrinizi və materiallarınızı idarə edin
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {courses.map((course) => (
          <Card key={course.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-1">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <CardTitle className="text-xl">{course.title}</CardTitle>
                  <Badge variant="outline">{course.code}</Badge>
                </div>
                <div className="flex flex-col gap-1">
                  {course.groups.map((group) => (
                    <Badge
                      key={group}
                      variant="secondary"
                      className="justify-center text-xs py-0.5"
                    >
                      {group}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  <span>{course.credits} kredit</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span>{course.studentCount} tələbə</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>{course.hours} saat</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => {
                    const payload = {
                      id: course.id,
                      studentCount: course.studentCount,
                      hours: course.hours,
                    };
                    if (onCourseSelect) {
                      onCourseSelect(payload);
                    } else {
                      navigate(String(course.id), { state: payload });
                    }
                  }}
                >
                  Qiymətləri idarə edin
                </Button>
                {!course.hasSyllabus && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSyllabusUpload(course)}
                  >
                    <FileUp className="h-4 w-4 mr-1.5" />
                    Sillabusu əlavə edin
                  </Button>
                )}
                {course.hasSyllabus && (
                  <>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleSyllabusView(course)}
                    >
                      Sillabusu bax
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleSyllabusDownload(course)}
                    >
                      Sillabusu yükləyin
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleSyllabusDelete(course)}
                    >
                      Sillabusu sil
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
