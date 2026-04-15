import { useEffect, useState, type ReactNode } from "react";
import {
  BarChart3,
  BookOpen,
  Calendar,
  CalendarDays,
  ClipboardCheck,
  FileSpreadsheet,
  FilePlus2,
  History,
  Home,
  LogOut,
  Settings,
  User,
  type LucideIcon,
} from "lucide-react";

import { ConfirmEmailPage } from "./components/ConfirmEmailPage";
import { Dashboard } from "./components/Dashboard";
import { DeanEnrollmentManagement } from "./components/DeanEnrollmentManagement";
import { DeanFinalExams } from "./components/DeanFinalExams";
import { DeanManagement } from "./components/DeanManagement";
import { DeanSchedule } from "./components/DeanSchedule";
import { Grades } from "./components/Grades";
import { Profile } from "./components/Profile";
import { ResetPasswordPage } from "./components/ResetPasswordPage";
import { Schedule } from "./components/Schedule";
import { StudentSubjectsHistory } from "./components/StudentSubjectsHistory";
import { TeacherCourseDetail } from "./components/TeacherCourseDetail";
import { TeacherCourses } from "./components/TeacherCourses";
import { Badge } from "./components/ui/badge";
import { Button } from "./components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "./components/ui/sidebar";
import { Toaster } from "./components/ui/sonner";
import logo from "@/assets/logo.svg";
import LoginPage from "./LoginPage";
import {
  getDeanProfile,
  getStudentProfile,
  getTeacherProfile,
  logout,
} from "./api";

const DEV_BYPASS_LOGIN = false;

type UserRole = "student" | "teacher" | "dean";

type NavigationItem = {
  title: string;
  icon: LucideIcon;
  id: string;
};

type NavigationGroup = {
  title: string;
  items: NavigationItem[];
};

type SelectedCourse = {
  id: string | number;
  studentCount?: number;
  hours?: number;
};

const studentNavigation: NavigationGroup[] = [
  {
    title: "Main",
    items: [
      { title: "Əsas səhifə", icon: Home, id: "dashboard" },
      { title: "Cədvəl", icon: Calendar, id: "schedule" },
      { title: "Qiymətləndirmə", icon: BarChart3, id: "grades" },
      { title: "Fənnlərin tarixi", icon: History, id: "subjects-history" },
      { title: "Profil", icon: User, id: "profile" },
    ],
  },
];

const teacherNavigation: NavigationGroup[] = [
  {
    title: "Main",
    items: [
      { title: "Fənnlərim", icon: BookOpen, id: "courses" },
      { title: "Cədvəl", icon: Calendar, id: "schedule" },
      { title: "Profil", icon: User, id: "profile" },
    ],
  },
];

const deanNavigation: NavigationGroup[] = [
  {
    title: "Main",
    items: [
      { title: "Enrollments", icon: FileSpreadsheet, id: "enrollments" },
      { title: "İdarəetmə", icon: Settings, id: "management" },
      { title: "Final imtahanlar", icon: CalendarDays, id: "dean-finals-list" },
      { title: "Qiyməti təsdiqlə", icon: ClipboardCheck, id: "dean-finals-confirm" },
      { title: "Final yarat", icon: FilePlus2, id: "dean-finals-create" },
      { title: "Cədvəl", icon: Calendar, id: "schedule" },
      { title: "Profil", icon: User, id: "profile" },
    ],
  },
];

type AppShellProps = {
  navigation: NavigationGroup[];
  activeView: string;
  userRole: UserRole;
  selectedCourse: SelectedCourse | null;
  setActiveView: (view: string) => void;
  setSelectedCourse: (course: SelectedCourse | null) => void;
  handleRoleSwitch?: () => void;
  handleLogout: () => void;
  renderContent: () => ReactNode;
};

function AppShell({
  navigation,
  activeView,
  userRole,
  selectedCourse,
  setActiveView,
  setSelectedCourse,
  handleRoleSwitch,
  handleLogout,
  renderContent,
}: AppShellProps) {
  const { isMobile, setOpenMobile } = useSidebar();
  const activeItem =
    selectedCourse !== null
      ? navigation.flatMap((group) => group.items).find((item) => item.id === "courses")
      : navigation.flatMap((group) => group.items).find((item) => item.id === activeView);

  const handleNavigation = (viewId: string) => {
    setActiveView(viewId);
    setSelectedCourse(null);

    if (isMobile) {
      setOpenMobile(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-background">
      <Sidebar>
        <SidebarHeader className="border-b border-border p-6">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Logo" className="h-13 w-13 object-contain" />
            <div className="flex flex-1 flex-col">
              <span className="text-base font-semibold">BQU LMS</span>
              <span className="text-sm text-muted-foreground">
                Tədrisin idarə olunması sistemi
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
              className="w-full justify-start text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <LogOut className="mr-2 h-4 w-4" />
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
                        onClick={() => handleNavigation(item.id)}
                        isActive={activeView === item.id && selectedCourse === null}
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
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur md:hidden">
          <SidebarTrigger className="size-9 shrink-0 rounded-md border border-border" />
          <img src={logo} alt="Logo" className="h-8 w-8 object-contain" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">BQU LMS</p>
            <p className="truncate text-xs text-muted-foreground">
              {activeItem?.title ?? "Menu"}
            </p>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 md:p-6">{renderContent()}</main>
      </SidebarInset>
    </div>
  );
}

export default function App() {
  const isConfirmEmailRoute = window.location.pathname.endsWith("/confirm-email");
  const isResetPasswordRoute = window.location.pathname.endsWith("/reset-password");

  const [activeView, setActiveView] = useState("dashboard");
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("token"));
  const [userRole, setUserRole] = useState<UserRole | undefined>(undefined);
  const [loadingRole, setLoadingRole] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<SelectedCourse | null>(null);

  const handleRoleSwitch: undefined | (() => void) = undefined;

  const handleCourseSelect = (course: string | number | SelectedCourse) => {
    if (course && typeof course === "object") {
      setSelectedCourse(course);
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
      void (async () => {
        let resolved = false;

        try {
          const dean = await getDeanProfile();
          if (dean) {
            setUserRole("dean");
            setActiveView("management");
            resolved = true;
          }
        } catch {
          // ignore
        }

        if (!resolved) {
          try {
            const teacher = await getTeacherProfile();
            if (teacher) {
              setUserRole("teacher");
              setActiveView("courses");
              resolved = true;
            }
          } catch {
            // ignore
          }
        }

        if (!resolved) {
          try {
            const student = await getStudentProfile();
            if (student) {
              setUserRole("student");
              setActiveView("dashboard");
              resolved = true;
            }
          } catch {
            // ignore
          }
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

    switch (activeView) {
      case "dashboard":
        return <Dashboard />;
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
  };

  const navigation =
    userRole === "student"
      ? studentNavigation
      : userRole === "teacher"
        ? teacherNavigation
        : deanNavigation;

  if (isConfirmEmailRoute) {
    return (
      <>
        <ConfirmEmailPage />
        <Toaster />
      </>
    );
  }

  if (isResetPasswordRoute) {
    return (
      <>
        <ResetPasswordPage />
        <Toaster />
      </>
    );
  }

  if (!token && !DEV_BYPASS_LOGIN) {
    return (
      <LoginPage
        onLoginSuccess={(role) => {
          setToken(localStorage.getItem("token"));

          if (role) {
            const normalizedRole = role.toLowerCase();

            if (normalizedRole.includes("dean")) {
              setUserRole("dean");
              setActiveView("management");
            } else if (normalizedRole.includes("teacher")) {
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
      <div className="flex h-screen items-center justify-center">
        <span>Yüklənir...</span>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <AppShell
        navigation={navigation}
        activeView={activeView}
        userRole={userRole}
        selectedCourse={selectedCourse}
        setActiveView={setActiveView}
        setSelectedCourse={setSelectedCourse}
        handleRoleSwitch={handleRoleSwitch}
        handleLogout={handleLogout}
        renderContent={renderContent}
      />
      <Toaster />
    </SidebarProvider>
  );
}
