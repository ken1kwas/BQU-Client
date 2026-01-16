import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { ScrollArea } from "./ui/scroll-area";
import { Award, Target, BookOpen, Check, X, TrendingUp } from "lucide-react";
import { getStudentGrades } from "../api";

type ClassSession = {
  date: string;
  type: "Lecture" | "Seminar";
  attendance: "present" | "absent";
  grade?: number; // 0-10 for seminars
};

// Default grades are used as fallback while data is loading.  Once the
// backend returns real data the `grades` state will be updated.
const defaultGrades = [
  {
    id: 1,
    course: "Advanced Web Development",
    code: "CS 4520",
    instructor: "Dr. Smith / Prof. Anderson",
    currentGrade: "A-",
    percentage: 91.5,
    credits: 3,
    weeklyHours: 45,
    classType: "Seminar" as const,
    colloquium: [8, 9, null], // 3 mini exams, 0-10 scale
    assignmentScores: [1, 1, 1, 1, 1, 1, 1, 1, 1, 0], // 10 assignments, each scored 0 or 1
    trend: "up",
    classSessions: [
      { date: "Sep 4", type: "Lecture" as const, attendance: "present" as const },
      { date: "Sep 6", type: "Seminar" as const, attendance: "present" as const, grade: 8 },
      { date: "Sep 11", type: "Lecture" as const, attendance: "present" as const },
      { date: "Sep 13", type: "Seminar" as const, attendance: "present" as const, grade: 9 },
      { date: "Sep 18", type: "Lecture" as const, attendance: "present" as const },
      { date: "Sep 20", type: "Seminar" as const, attendance: "present" as const, grade: 10 },
      { date: "Sep 25", type: "Lecture" as const, attendance: "absent" as const },
      { date: "Sep 27", type: "Seminar" as const, attendance: "present" as const, grade: 7 },
      { date: "Oct 2", type: "Lecture" as const, attendance: "present" as const },
      { date: "Oct 4", type: "Seminar" as const, attendance: "present" as const, grade: 9 },
      { date: "Oct 9", type: "Lecture" as const, attendance: "present" as const },
      { date: "Oct 11", type: "Seminar" as const, attendance: "present" as const, grade: 8 },
      { date: "Oct 16", type: "Lecture" as const, attendance: "present" as const },
      { date: "Oct 18", type: "Seminar" as const, attendance: "present" as const, grade: 9 },
      { date: "Oct 23", type: "Lecture" as const, attendance: "present" as const },
      { date: "Oct 25", type: "Seminar" as const, attendance: "present" as const, grade: 10 },
      { date: "Oct 30", type: "Lecture" as const, attendance: "present" as const },
      { date: "Nov 1", type: "Seminar" as const, attendance: "present" as const, grade: 8 },
      { date: "Nov 6", type: "Lecture" as const, attendance: "present" as const },
      { date: "Nov 8", type: "Seminar" as const, attendance: "present" as const, grade: 9 },
    ],
    categories: [
      { name: "Assignments", weight: 40, score: 88.5 },
      { name: "Projects", weight: 35, score: 95.0 },
      { name: "Participation", weight: 15, score: 92.0 },
      { name: "Final Exam", weight: 10, score: null }
    ]
  },
  {
    id: 2,
    course: "Linear Algebra",
    code: "MATH 2210",
    instructor: "Prof. Johnson",
    currentGrade: "B+",
    percentage: 87.3,
    credits: 4,
    weeklyHours: 60,
    classType: "Seminar" as const,
    colloquium: [7, 8, 9],
    assignmentScores: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    trend: "up",
    classSessions: [
      { date: "Sep 4", type: "Lecture" as const, attendance: "present" as const },
      { date: "Sep 6", type: "Seminar" as const, attendance: "present" as const, grade: 7 },
      { date: "Sep 11", type: "Lecture" as const, attendance: "present" as const },
      { date: "Sep 13", type: "Seminar" as const, attendance: "present" as const, grade: 8 },
      { date: "Sep 18", type: "Lecture" as const, attendance: "present" as const },
      { date: "Sep 20", type: "Seminar" as const, attendance: "present" as const, grade: 6 },
      { date: "Sep 25", type: "Lecture" as const, attendance: "present" as const },
      { date: "Sep 27", type: "Seminar" as const, attendance: "present" as const, grade: 9 },
      { date: "Oct 2", type: "Lecture" as const, attendance: "present" as const },
      { date: "Oct 4", type: "Seminar" as const, attendance: "present" as const, grade: 8 },
      { date: "Oct 9", type: "Lecture" as const, attendance: "present" as const },
      { date: "Oct 11", type: "Seminar" as const, attendance: "present" as const, grade: 7 },
      { date: "Oct 16", type: "Lecture" as const, attendance: "present" as const },
      { date: "Oct 18", type: "Seminar" as const, attendance: "present" as const, grade: 9 },
    ],
    categories: [
      { name: "Problem Sets", weight: 30, score: 84.2 },
      { name: "Quizzes", weight: 20, score: 89.5 },
      { name: "Midterm", weight: 25, score: 88.0 },
      { name: "Final Exam", weight: 25, score: null }
    ]
  },
  {
    id: 3,
    course: "Modern Literature",
    code: "ENG 3150",
    instructor: "Dr. Williams / Dr. Brown",
    currentGrade: "A",
    percentage: 94.2,
    credits: 3,
    weeklyHours: 30,
    classType: "Lecture" as const,
    colloquium: [9, 10, 9],
    assignmentScores: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    trend: "stable",
    classSessions: [
      { date: "Sep 4", type: "Lecture" as const, attendance: "present" as const },
      { date: "Sep 6", type: "Seminar" as const, attendance: "present" as const, grade: 9 },
      { date: "Sep 11", type: "Lecture" as const, attendance: "present" as const },
      { date: "Sep 13", type: "Seminar" as const, attendance: "present" as const, grade: 10 },
      { date: "Sep 18", type: "Lecture" as const, attendance: "present" as const },
      { date: "Sep 20", type: "Seminar" as const, attendance: "present" as const, grade: 9 },
      { date: "Sep 25", type: "Lecture" as const, attendance: "present" as const },
      { date: "Sep 27", type: "Seminar" as const, attendance: "present" as const, grade: 10 },
      { date: "Oct 2", type: "Lecture" as const, attendance: "present" as const },
      { date: "Oct 4", type: "Seminar" as const, attendance: "present" as const, grade: 9 },
      { date: "Oct 9", type: "Lecture" as const, attendance: "present" as const },
      { date: "Oct 11", type: "Seminar" as const, attendance: "present" as const, grade: 10 },
      { date: "Oct 16", type: "Lecture" as const, attendance: "present" as const },
      { date: "Oct 18", type: "Seminar" as const, attendance: "present" as const, grade: 9 },
    ],
    categories: [
      { name: "Essays", weight: 50, score: 95.5 },
      { name: "Discussion", weight: 25, score: 94.0 },
      { name: "Final Paper", weight: 25, score: null }
    ]
  },
  {
    id: 4,
    course: "Data Structures & Algorithms",
    code: "CS 3200",
    instructor: "Dr. Chen",
    currentGrade: "B",
    percentage: 82.1,
    credits: 4,
    weeklyHours: 45,
    classType: "Seminar" as const,
    colloquium: [6, 7, null],
    assignmentScores: [1, 1, 1, 1, 0, 0, 0, 0, 0, 0],
    trend: "down",
    classSessions: [
      { date: "Sep 4", type: "Lecture" as const, attendance: "present" as const },
      { date: "Sep 6", type: "Seminar" as const, attendance: "present" as const, grade: 6 },
      { date: "Sep 11", type: "Lecture" as const, attendance: "present" as const },
      { date: "Sep 13", type: "Seminar" as const, attendance: "present" as const, grade: 7 },
      { date: "Sep 18", type: "Lecture" as const, attendance: "absent" as const },
      { date: "Sep 20", type: "Seminar" as const, attendance: "present" as const, grade: 5 },
      { date: "Sep 25", type: "Lecture" as const, attendance: "present" as const },
      { date: "Sep 27", type: "Seminar" as const, attendance: "present" as const, grade: 8 },
      { date: "Oct 2", type: "Lecture" as const, attendance: "present" as const },
      { date: "Oct 4", type: "Seminar" as const, attendance: "absent" as const },
      { date: "Oct 9", type: "Lecture" as const, attendance: "present" as const },
      { date: "Oct 11", type: "Seminar" as const, attendance: "present" as const, grade: 7 },
      { date: "Oct 16", type: "Lecture" as const, attendance: "present" as const },
      { date: "Oct 18", type: "Seminar" as const, attendance: "present" as const, grade: 6 },
      { date: "Oct 23", type: "Lecture" as const, attendance: "present" as const },
      { date: "Oct 25", type: "Seminar" as const, attendance: "present" as const, grade: 8 },
    ],
    categories: [
      { name: "Programming", weight: 45, score: 80.5 },
      { name: "Theory Exams", weight: 30, score: 85.0 },
      { name: "Labs", weight: 15, score: 82.5 },
      { name: "Final Project", weight: 10, score: null }
    ]
  },
  {
    id: 5,
    course: "Organic Chemistry",
    code: "CHEM 2520",
    instructor: "Prof. Davis",
    currentGrade: "B+",
    percentage: 86.8,
    credits: 4,
    weeklyHours: 60,
    classType: "Lecture" as const,
    colloquium: [8, 8, 9],
    assignmentScores: [1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
    trend: "up",
    classSessions: [
      { date: "Sep 4", type: "Lecture" as const, attendance: "present" as const },
      { date: "Sep 6", type: "Seminar" as const, attendance: "present" as const, grade: 8 },
      { date: "Sep 11", type: "Lecture" as const, attendance: "present" as const },
      { date: "Sep 13", type: "Seminar" as const, attendance: "present" as const, grade: 8 },
      { date: "Sep 18", type: "Lecture" as const, attendance: "present" as const },
      { date: "Sep 20", type: "Seminar" as const, attendance: "present" as const, grade: 9 },
      { date: "Sep 25", type: "Lecture" as const, attendance: "present" as const },
      { date: "Sep 27", type: "Seminar" as const, attendance: "present" as const, grade: 8 },
      { date: "Oct 2", type: "Lecture" as const, attendance: "present" as const },
      { date: "Oct 4", type: "Seminar" as const, attendance: "present" as const, grade: 9 },
      { date: "Oct 9", type: "Lecture" as const, attendance: "present" as const },
      { date: "Oct 11", type: "Seminar" as const, attendance: "present" as const, grade: 8 },
      { date: "Oct 16", type: "Lecture" as const, attendance: "present" as const },
      { date: "Oct 18", type: "Seminar" as const, attendance: "present" as const, grade: 9 },
    ],
    categories: [
      { name: "Lab Reports", weight: 30, score: 87.5 },
      { name: "Exams", weight: 50, score: 86.2 },
      { name: "Homework", weight: 20, score: 87.0 }
    ]
  },
  {
    id: 6,
    course: "Psychology of Learning",
    code: "PSYC 3100",
    instructor: "Dr. Anderson",
    currentGrade: "A",
    percentage: 95.5,
    credits: 3,
    weeklyHours: 30,
    classType: "Seminar" as const,
    colloquium: [9, 10, 10],
    assignmentScores: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    trend: "stable",
    classSessions: [
      { date: "Sep 4", type: "Lecture" as const, attendance: "present" as const },
      { date: "Sep 6", type: "Seminar" as const, attendance: "present" as const, grade: 9 },
      { date: "Sep 11", type: "Lecture" as const, attendance: "present" as const },
      { date: "Sep 13", type: "Seminar" as const, attendance: "present" as const, grade: 10 },
      { date: "Sep 18", type: "Lecture" as const, attendance: "present" as const },
      { date: "Sep 20", type: "Seminar" as const, attendance: "present" as const, grade: 10 },
      { date: "Sep 25", type: "Lecture" as const, attendance: "present" as const },
      { date: "Sep 27", type: "Seminar" as const, attendance: "present" as const, grade: 9 },
      { date: "Oct 2", type: "Lecture" as const, attendance: "present" as const },
      { date: "Oct 4", type: "Seminar" as const, attendance: "present" as const, grade: 10 },
      { date: "Oct 9", type: "Lecture" as const, attendance: "present" as const },
      { date: "Oct 11", type: "Seminar" as const, attendance: "present" as const, grade: 10 },
      { date: "Oct 16", type: "Lecture" as const, attendance: "present" as const },
      { date: "Oct 18", type: "Seminar" as const, attendance: "present" as const, grade: 9 },
      { date: "Oct 23", type: "Lecture" as const, attendance: "present" as const },
      { date: "Oct 25", type: "Seminar" as const, attendance: "present" as const, grade: 10 },
      { date: "Oct 30", type: "Lecture" as const, attendance: "present" as const },
      { date: "Nov 1", type: "Seminar" as const, attendance: "present" as const, grade: 10 },
    ],
    categories: [
      { name: "Research Papers", weight: 40, score: 96.0 },
      { name: "Exams", weight: 35, score: 95.5 },
      { name: "Participation", weight: 25, score: 95.0 }
    ]
  }
];

const semesterStats = {
  currentGPA: 3.67,
  previousGPA: 3.55,
  creditHours: 21,
  completedCredits: 89,
  totalCredits: 120,
  classRank: 45,
  totalStudents: 324
};

export function Grades() {
  const [grades, setGrades] = useState<any[]>(defaultGrades);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const data = await getStudentGrades("current");
        if (!mounted) return;
        if (Array.isArray(data)) {
          setGrades(data);
        } else if (data && Array.isArray((data as any).courses)) {
          setGrades((data as any).courses);
        }
      } catch (err: any) {
        if (mounted) setError(err.message || "Не удалось загрузить оценки");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);
  const getGradeColor = (percentage: number) => {
    if (percentage >= 90) return 'default';
    if (percentage >= 80) return 'secondary';
    if (percentage >= 70) return 'outline';
    return 'destructive';
  };

  const getSessionBadgeVariant = (session: ClassSession) => {
    if (session.attendance === "absent") return "destructive";
    
    if (session.type === "Lecture") {
      return "secondary";
    } else {
      return "default";
    }
  };

  const getSessionLabel = (session: ClassSession) => {
    if (session.attendance === "absent") return "Absent";
    
    if (session.type === "Lecture") {
      return "Present";
    } else {
      return session.grade ? `${session.grade}` : "Present";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1>Grades & Performance</h1>
        <p className="text-muted-foreground">Track your academic progress and performance</p>
      </div>

      {/* GPA Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current GPA</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{semesterStats.currentGPA}</div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3 text-green-500" />
              +{(semesterStats.currentGPA - semesterStats.previousGPA).toFixed(2)} from last semester
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Credit Hours</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{semesterStats.creditHours}</div>
            <p className="text-xs text-muted-foreground">This semester</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Degree Progress</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round((semesterStats.completedCredits / semesterStats.totalCredits) * 100)}%</div>
            <p className="text-xs text-muted-foreground">{semesterStats.completedCredits}/{semesterStats.totalCredits} credits</p>
            <Progress value={(semesterStats.completedCredits / semesterStats.totalCredits) * 100} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Courses</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">6</div>
            <p className="text-xs text-muted-foreground">This semester</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="current" className="w-full">
        <TabsList>
          <TabsTrigger value="current">Current Courses</TabsTrigger>
          <TabsTrigger value="sessions">Class Sessions</TabsTrigger>
        </TabsList>

        <TabsContent value="current" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {grades.map((course) => (
              <Card key={course.id} className="hover:shadow-md transition-shadow relative">
                <Badge variant="outline" className="absolute top-4 right-4 z-10">{course.code}</Badge>
                <CardHeader className="pb-1">
                  <div className="flex items-start justify-between">
                    <div className="pr-20">
                      <CardTitle>
                        {course.course}
                      </CardTitle>
                      <CardDescription className="mt-1">{course.instructor} • {course.credits} credits • {course.weeklyHours} hours</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2 -mt-4">
                    <div className="flex items-center justify-between text-sm">
                      <span>Overall Score</span>
                      <span>{Math.round((course.percentage / 100) * 50)}/50</span>
                    </div>
                    <Progress value={course.percentage} />
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-6 text-sm">
                      <div>
                        <p className="text-muted-foreground mb-2">Seminar Grades</p>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {course.classSessions
                            .filter(s => s.type === "Seminar" && s.grade !== undefined)
                            .map((session, idx) => (
                              <Badge key={idx} variant="secondary" className="text-sm px-2.5 py-0.5">
                                {session.grade}
                              </Badge>
                            ))}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-muted-foreground mb-2">Colloquium</p>
                        <div className="flex items-center gap-2 justify-end">
                          {course.colloquium.every(s => s === null) ? (
                            <span className="text-muted-foreground">-</span>
                          ) : (
                            course.colloquium.map((score, idx) => (
                              <Badge key={idx} variant={score === null ? "outline" : "secondary"} className="px-5 py-2.5 text-base">
                                {score === null ? "-" : `${score}`}
                              </Badge>
                            ))
                          )}
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-muted-foreground text-sm">Assignments</span>
                        <span className="text-muted-foreground text-sm">
                          {course.assignmentScores.filter(s => s > 0).length}/{course.assignmentScores.length}
                        </span>
                      </div>
                      {course.assignmentScores.length === 0 || course.assignmentScores.every(s => s === 0) ? (
                        <span className="text-muted-foreground">-</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {course.assignmentScores.map((score, idx) => (
                            <Badge 
                              key={idx} 
                              variant={score === 1 ? "default" : "outline"}
                              className="text-xs flex items-center gap-1"
                            >
                              {score === 1 ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-muted-foreground text-sm">Attendance</span>
                        <span className="text-muted-foreground text-sm">
                          {course.classSessions.filter(s => s.attendance === "present").length}/{course.classSessions.length}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {course.classSessions.map((session, idx) => (
                          <Badge 
                            key={idx} 
                            variant={session.attendance === "absent" ? "destructive" : "default"}
                            className="text-xs"
                          >
                            {session.attendance === "absent" ? "a" : "p"}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="sessions" className="space-y-4">
          <div className="space-y-6">
            {grades.map((course) => (
              <Card key={course.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl">
                      {course.course}
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="overflow-hidden">
                  <div className="overflow-x-auto -mx-6 px-6">
                    <div className="flex gap-3 pb-4 w-max min-w-full">
                      {course.classSessions.map((session, idx) => (
                        <div key={idx} className="space-y-1.5 flex-shrink-0 w-24">
                          <div className="text-sm text-center">
                            {session.date}
                          </div>
                          <div className="text-xs text-muted-foreground text-center">
                            {session.type === "Lecture" ? "Lecture" : "Seminar"}
                          </div>
                          <Badge 
                            variant={getSessionBadgeVariant(session)}
                            className="w-full justify-center"
                          >
                            {getSessionLabel(session)}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>


      </Tabs>
    </div>
  );
}
