import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { FileUp, Plus, Users, BookOpen, Calendar } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { ScrollArea } from "./ui/scroll-area";
import { Input } from "./ui/input";
import {
  listTeacherCourses,
  uploadSyllabusFile,
  updateSyllabusFile,
  toArray,
} from "../api";

// This component previously used a static list of courses.  It now
// fetches the teacher's courses from the backend on mount.  Each
// course may include a syllabusId if a file has already been
// uploaded.
interface TeacherCourse {
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

interface CourseTopic {
  session: number;
  topic: string;
  date?: string;
}

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

interface AddTopicsDialogProps {
  courseName: string;
  courseCode: string;
  courseType: string;
  initialTopics?: CourseTopic[];
}

function AddTopicsDialog({
  courseName,
  courseCode,
  courseType,
  initialTopics = [],
}: AddTopicsDialogProps) {
  const sessionLabel = courseType === "lecture" ? "Lecture" : "Seminar";

  const ensureRows = (topics: CourseTopic[]): CourseTopic[] =>
    topics.length > 0
      ? topics.map((item, index) => ({
          session:
            Number.isFinite(item.session) && Number(item.session) > 0
              ? Number(item.session)
              : index + 1,
          topic: item.topic ?? "",
          date: item.date ?? "",
        }))
      : [{ session: 1, topic: "", date: "" }];

  const [topicRows, setTopicRows] = useState<CourseTopic[]>(() =>
    ensureRows(initialTopics),
  );

  useEffect(() => {
    setTopicRows(ensureRows(initialTopics));
  }, [initialTopics]);

  const handleTopicChange = (index: number, value: string) => {
    setTopicRows((prev) => {
      const next = [...prev];
      if (!next[index]) return prev;
      next[index] = { ...next[index], topic: value };
      return next;
    });
  };

  const handleAddTopic = () => {
    setTopicRows((prev) => [
      ...prev,
      { session: prev.length + 1, topic: "", date: "" },
    ]);
  };

  const handleClearTopic = (index: number) => {
    setTopicRows((prev) => {
      const next = [...prev];
      if (!next[index]) return prev;
      next[index] = { ...next[index], topic: "" };
      return next;
    });
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full">
          <Plus className="h-4 w-4 mr-1.5" />
          Add Topics
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Manage Course Topics</DialogTitle>
          <DialogDescription>
            Add or edit topics for {courseName}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[500px] pr-4">
          <div className="space-y-3">
            {topicRows.map((item, index) => (
              <div
                key={`${item.session}-${index}`}
                className="flex items-center gap-3 p-3 border rounded-lg"
              >
                <div className="flex-shrink-0 w-24">
                  <div className="text-sm font-medium">
                    {sessionLabel} {item.session}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {item.date}
                  </div>
                </div>
                <div className="flex-1">
                  <Input
                    placeholder="Add topic..."
                    value={item.topic}
                    onChange={(e) => handleTopicChange(index, e.target.value)}
                  />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleClearTopic(index)}
                >
                  Clear
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>
        <div className="flex items-center justify-between gap-2 pt-3">
          <Button variant="outline" onClick={handleAddTopic}>
            Add Row
          </Button>
          <div className="flex gap-2">
            <Button variant="outline">Cancel</Button>
            <Button>Save Topics</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function TeacherCourses({
  onCourseSelect,
}: {
  onCourseSelect: (courseId: string | number) => void;
}) {
  // Local state for courses loaded from the backend
  const [courses, setCourses] = useState<TeacherCourse[]>([]);

  // Fetch teacher courses on mount
  const refreshCourses = async () => {
    try {
      const resp = await listTeacherCourses();
      const list = toArray(resp).map((c: any) => {
        const id = c.id ?? c.taughtSubjectId ?? c.taughtSubject?.id;
        const syllabusId =
          c.syllabusId ?? c.syllabus?.id ?? c.syllabus?.syllabusId ?? null;

        const teacherCourse: TeacherCourse = {
          id,
          title:
            c.title ?? c.name ?? c.taughtSubject?.title ?? c.subjectTitle ?? "",
          code: c.code ?? c.taughtSubject?.code ?? "",
          type: c.type ?? c.classType ?? "Lecture",
          groups: Array.isArray(c.groups)
            ? c.groups
                .map((g: any) => g.groupCode ?? g.code ?? g.name ?? "")
                .filter(Boolean)
            : c.group?.groupCode
              ? [c.group.groupCode]
              : c.groupCode
                ? [c.groupCode]
                : [],
          studentCount:
            c.studentCount ?? c.studentsCount ?? c.students?.length ?? 0,
          hours: c.hours ?? c.weeklyHours ?? c.totalHours ?? 0,
          credits: c.credits ?? c.credit ?? 0,
          hasSyllabus: Boolean(syllabusId),
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
  // Upload or update syllabus for a course.  Depending on whether a
  // syllabus already exists, we call uploadSyllabus or updateSyllabus.
  const handleSyllabusUpload = (course: TeacherCourse) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".pdf,.doc,.docx";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        try {
          if (course.hasSyllabus && course.syllabusId) {
            await updateSyllabusFile(String(course.syllabusId), file);
          } else {
            await uploadSyllabusFile(String(course.id), file);
          }
          toast.success("Syllabus uploaded successfully");
          await refreshCourses();
        } catch (error: any) {
          toast.error(error?.message ?? "Failed to upload syllabus");
        }
      }
    };
    input.click();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1>My Courses</h1>
        <p className="text-muted-foreground">
          Manage your courses, students, and materials
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
                  <span>{course.credits} credits</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span>{course.studentCount} students</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>{course.hours} hours</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => onCourseSelect(course.id)}
                >
                  Manage Grades
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSyllabusUpload(course)}
                >
                  <FileUp className="h-4 w-4 mr-1.5" />
                  {course.hasSyllabus ? "Update" : "Add"} Syllabus
                </Button>
                <AddTopicsDialog
                  courseName={course.title}
                  courseCode={course.code}
                  courseType={course.type}
                  initialTopics={course.topics}
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
