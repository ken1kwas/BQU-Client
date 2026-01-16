import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { FileUp, Plus, Users, BookOpen, Calendar } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { ScrollArea } from "./ui/scroll-area";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
type ApiList<T = any> = T[] | { items?: T[]; data?: T[]; result?: T[]; value?: T[] } | any;

function getAuthToken(): string | null {
  return (
      localStorage.getItem("token") ||
      localStorage.getItem("accessToken") ||
      localStorage.getItem("access_token") ||
      localStorage.getItem("jwt") ||
      null
  );
}

function toArray<T = any>(resp: ApiList<T>): T[] {
  if (Array.isArray(resp)) return resp;
  if (!resp || typeof resp !== "object") return [];
  return (
      (resp as any).items ||
      (resp as any).data ||
      (resp as any).result ||
      (resp as any).value ||
      []
  );
}

async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = getAuthToken();
  const headers = new Headers(init.headers || {});
  headers.set("Accept", "application/json");
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Request failed: ${res.status}`);
  }
  return res;
}

async function apiJson<T = any>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await apiFetch(path, init);
  // Some endpoints return empty body; guard accordingly
  const text = await res.text().catch(() => "");
  if (!text) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    // If backend returns plain text, return as-is
    return text as unknown as T;
  }
}

async function getTeacherCourses(): Promise<any> {
  return apiJson("/api/teachers/courses");
}

async function uploadSyllabus(taughtSubjectId: string, file: File): Promise<void> {
  const fd = new FormData();
  fd.append("file", file);
  await apiFetch(`/api/syllabus/${encodeURIComponent(taughtSubjectId)}`, { method: "POST", body: fd });
}

async function updateSyllabus(syllabusId: string, file: File): Promise<void> {
  const fd = new FormData();
  fd.append("file", file);
  await apiFetch(`/api/syllabus/${encodeURIComponent(syllabusId)}`, { method: "PUT", body: fd });
}


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
}

interface AddTopicsDialogProps {
  courseName: string;
  courseCode: string;
  courseType: string;
}

function AddTopicsDialog({ courseName, courseCode, courseType }: AddTopicsDialogProps) {
  const sessionLabel = courseType === "lecture" ? "Lecture" : "Seminar";

  const [topics, setTopics] = useState([
    { session: 1, topic: "Introduction to React Hooks", date: "Sep 4" },
    { session: 2, topic: "State Management", date: "Sep 6" },
    { session: 3, topic: "Advanced TypeScript Patterns", date: "Sep 11" },
    { session: 4, topic: "", date: "Sep 13" },
    { session: 5, topic: "", date: "Sep 18" },
    { session: 6, topic: "", date: "Sep 20" },
    { session: 7, topic: "", date: "Sep 25" },
    { session: 8, topic: "", date: "Sep 27" },
    { session: 9, topic: "", date: "Oct 2" },
    { session: 10, topic: "", date: "Oct 4" },
    { session: 11, topic: "", date: "Oct 9" },
    { session: 12, topic: "", date: "Oct 11" },
    { session: 13, topic: "", date: "Oct 16" },
    { session: 14, topic: "", date: "Oct 18" },
    { session: 15, topic: "", date: "Oct 23" },
  ]);

  const handleTopicChange = (index: number, value: string) => {
    const newTopics = [...topics];
    newTopics[index].topic = value;
    setTopics(newTopics);
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
              {topics.map((item, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                    <div className="flex-shrink-0 w-24">
                      <div className="text-sm font-medium">{sessionLabel} {item.session}</div>
                      <div className="text-xs text-muted-foreground">{item.date}</div>
                    </div>
                    <div className="flex-1">
                      <Input
                          placeholder="Add topic..."
                          value={item.topic}
                          onChange={(e) => handleTopicChange(index, e.target.value)}
                      />
                    </div>
                  </div>
              ))}
            </div>
          </ScrollArea>
          <div className="flex justify-end gap-2">
            <Button variant="outline">Cancel</Button>
            <Button>Save Topics</Button>
          </div>
        </DialogContent>
      </Dialog>
  );
}

export function TeacherCourses({ onCourseSelect }: { onCourseSelect: (courseId: string | number) => void }) {
  // Local state for courses loaded from the backend
  const [courses, setCourses] = useState<TeacherCourse[]>([]);

  // Fetch teacher courses on mount
  const refreshCourses = async () => {
    try {
      const resp = await getTeacherCourses();
      const list = toArray(resp).map((c: any) => {
        const id = c.id ?? c.taughtSubjectId ?? c.taughtSubject?.id;
        const syllabusId = c.syllabusId ?? c.syllabus?.id ?? c.syllabus?.syllabusId ?? null;

        const teacherCourse: TeacherCourse = {
          id,
          title: c.title ?? c.name ?? c.taughtSubject?.title ?? c.subjectTitle ?? "",
          code: c.code ?? c.taughtSubject?.code ?? "",
          type: c.type ?? c.classType ?? "Lecture",
          groups: Array.isArray(c.groups)
              ? c.groups.map((g: any) => g.groupCode ?? g.code ?? g.name ?? "").filter(Boolean)
              : c.group?.groupCode
                  ? [c.group.groupCode]
                  : c.groupCode
                      ? [c.groupCode]
                      : [],
          studentCount: c.studentCount ?? c.studentsCount ?? c.students?.length ?? 0,
          hours: c.hours ?? c.weeklyHours ?? c.totalHours ?? 0,
          credits: c.credits ?? c.credit ?? 0,
          hasSyllabus: Boolean(syllabusId),
          syllabusId,
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
  ;

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
            await updateSyllabus(String(course.syllabusId), file);
          } else {
            await uploadSyllabus(String(course.id), file);
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
          <p className="text-muted-foreground">Manage your courses, students, and materials</p>
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
                          <Badge key={group} variant="secondary" className="justify-center text-xs py-0.5">{group}</Badge>
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
                    <AddTopicsDialog courseName={course.title} courseCode={course.code} courseType={course.type} />
                  </div>
                </CardContent>
              </Card>
          ))}
        </div>
      </div>
  );
}
