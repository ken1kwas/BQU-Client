import { useState, useEffect } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarInset,
} from "./components/ui/sidebar";
import {
  Home,
  Calendar,
  BarChart3,
  User,
  GraduationCap,
  BookOpen,
  Settings,
  LogOut,
} from "lucide-react";
import { Dashboard } from "./components/Dashboard";
import { Schedule } from "./components/Schedule";
import { Grades } from "./components/Grades";
import { Profile } from "./components/Profile";
import { TeacherCourses } from "./components/TeacherCourses";
import { TeacherCourseDetail } from "./components/TeacherCourseDetail";
import { DeanManagement } from "./components/DeanManagement";
import { DeanSchedule } from "./components/DeanSchedule";
import { Button } from "./components/ui/button";
import { Badge } from "./components/ui/badge";
import { Toaster } from "./components/ui/sonner";
import LoginPage from "./LoginPage";
import {
  getStudentProfile,
  getTeacherProfile,
  getDeanProfile,
  logout,
} from "./api";

const DEV_BYPASS_LOGIN = false;

const studentNavigation = [
  {
    title: "Main",
    items: [
      { title: "Dashboard", icon: Home, id: "dashboard" },
      { title: "Schedule", icon: Calendar, id: "schedule" },
      { title: "Grades", icon: BarChart3, id: "grades" },
      { title: "Profile", icon: User, id: "profile" },
    ],
  },
];

const teacherNavigation = [
  {
    title: "Main",
    items: [
      { title: "My Courses", icon: BookOpen, id: "courses" },
      { title: "Schedule", icon: Calendar, id: "schedule" },
      { title: "Profile", icon: User, id: "profile" },
    ],
  },
];

const deanNavigation = [
  {
    title: "Main",
    items: [
      { title: "Management", icon: Settings, id: "management" },
      { title: "Schedule", icon: Calendar, id: "schedule" },
      { title: "Profile", icon: User, id: "profile" },
    ],
  },
];

export default function App() {
  const [activeView, setActiveView] = useState("dashboard");
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem("token"),
  );
  const [userRole, setUserRole] = useState<
    "student" | "teacher" | "dean" | undefined
  >(undefined);
  const [loadingRole, setLoadingRole] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<{
    id: string | number;
    studentCount?: number;
    hours?: number;
  } | null>(null);
  const handleRoleSwitch: undefined | (() => void) = undefined;

  const handleCourseSelect = (
    course:
      | string
      | number
      | { id: string | number; studentCount?: number; hours?: number },
  ) => {
    if (course && typeof course === "object") {
      setSelectedCourse(
        course as {
          id: string | number;
          studentCount?: number;
          hours?: number;
        },
      );
    } else {
      setSelectedCourse({ id: course as string | number });
    }
  };

  const handleBackToCourses = () => {
    setSelectedCourse(null);
  };

  const handleLogout = () => {
    logout();
    setToken(null);
    setUserRole(undefined);
    setSelectedCourse(null);
    setActiveView("dashboard");
  };

  useEffect(() => {
    if (token && !userRole && !loadingRole) {
      setLoadingRole(true);
      (async () => {
        let resolved = false;
        try {
          const dean = await getDeanProfile();
          if (dean) {
            setUserRole("dean");
            setActiveView("management");
            resolved = true;
          }
        } catch {}
        if (!resolved) {
          try {
            const teacher = await getTeacherProfile();
            if (teacher) {
              setUserRole("teacher");
              setActiveView("courses");
              resolved = true;
            }
          } catch {}
        }
        if (!resolved) {
          try {
            const student = await getStudentProfile();
            if (student) {
              setUserRole("student");
              setActiveView("dashboard");
              resolved = true;
            }
          } catch {}
        }
        if (!resolved) {
          setToken(null);
          setUserRole(undefined);
        }
        setLoadingRole(false);
      })();
    }
  }, [token, userRole, loadingRole]);

  const renderContent = () => {
    if (userRole === "dean") {
      switch (activeView) {
        case "management":
          return <DeanManagement />;
        case "schedule":
          return <DeanSchedule />;
        case "profile":
          return <Profile userRole="dean" />;
        default:
          return <DeanManagement />;
      }
    }

    if (userRole === "teacher") {
      if (selectedCourse !== null) {
        return (
          <TeacherCourseDetail
            courseId={selectedCourse.id}
            onBack={handleBackToCourses}
            initialStudentCount={selectedCourse.studentCount}
            initialHours={selectedCourse.hours}
          />
        );
      }

      switch (activeView) {
        case "courses":
          return <TeacherCourses onCourseSelect={handleCourseSelect} />;
        case "schedule":
          return <Schedule userRole="teacher" />;
        case "profile":
          return <Profile userRole="teacher" />;
        default:
          return <TeacherCourses onCourseSelect={handleCourseSelect} />;
      }
    }

    // Student views
    switch (activeView) {
      case "dashboard":
        return <Dashboard />;
      case "schedule":
        return <Schedule userRole="student" />;
      case "grades":
        return <Grades />;
      case "profile":
        return <Profile />;
      default:
        return <Dashboard />;
    }
  };

  const navigation =
    userRole === "student"
      ? studentNavigation
      : userRole === "teacher"
        ? teacherNavigation
        : deanNavigation;

  if (!token && !DEV_BYPASS_LOGIN) {
    return (
      <LoginPage
        onLoginSuccess={(role) => {
          setToken(localStorage.getItem("token"));
          if (role) {
            const r = role.toLowerCase();
            if (r.includes("dean")) {
              setUserRole("dean");
              setActiveView("management");
            } else if (r.includes("teacher")) {
              setUserRole("teacher");
              setActiveView("courses");
            } else {
              setUserRole("student");
              setActiveView("dashboard");
            }
          }
        }}
      />
    );
  }

  if (!userRole) {
    return (
      <div className="flex items-center justify-center h-screen">
        <span>Loading...</span>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <Sidebar>
          <SidebarHeader className="border-b border-border p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <GraduationCap className="h-6 w-6" />
              </div>
              <div className="flex flex-col flex-1">
                <span className="text-base font-semibold">EduLMS</span>
                <span className="text-sm text-muted-foreground">
                  Learning Management
                </span>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              {handleRoleSwitch && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRoleSwitch}
                  className="w-full justify-start"
                >
                  Switch Role
                  <Badge variant="secondary" className="ml-auto">
                    {userRole === "student"
                      ? "Student"
                      : userRole === "teacher"
                        ? "Teacher"
                        : "Dean"}
                  </Badge>
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Çıxış
              </Button>
            </div>
          </SidebarHeader>

          <SidebarContent>
            {navigation.map((group) => (
              <SidebarGroup key={group.title}>
                <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {group.items.map((item) => (
                      <SidebarMenuItem key={item.id}>
                        <SidebarMenuButton
                          onClick={() => {
                            setActiveView(item.id);
                            setSelectedCourse(null);
                          }}
                          isActive={
                            activeView === item.id && selectedCourse === null
                          }
                          className="py-3"
                        >
                          <item.icon className="h-5 w-5" />
                          <span className="text-base">{item.title}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            ))}
          </SidebarContent>
        </Sidebar>

        <SidebarInset className="flex flex-1 flex-col">
          <main className="flex-1 overflow-auto p-6">{renderContent()}</main>
        </SidebarInset>
      </div>
      <Toaster />
    </SidebarProvider>
  );
}
