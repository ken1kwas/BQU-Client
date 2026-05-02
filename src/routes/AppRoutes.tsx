import { useEffect } from "react";
import type { Dispatch, SetStateAction } from "react";
import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  Outlet,
} from "react-router-dom";

import { ConfirmEmailPage } from "../components/ConfirmEmailPage";
import LoginPage from "../components/LoginPage";
import { ResetPasswordPage } from "../components/ResetPasswordPage";
import { TeacherCourseDetail } from "../components/TeacherCourseDetail";
import { TeacherCourses } from "../components/TeacherCourses";
import { SidebarProvider } from "../components/ui/sidebar";
import { Toaster } from "../components/ui/sonner";
import { AppShell } from "../layouts/AppShell";
import { useAuthSession } from "../hooks/useAuthSession";
import type { SelectedCourse, UserRole } from "../types/app";
import {
  DeanWorkspace,
  StudentWorkspace,
  TeacherWorkspace,
} from "./workspaces";
import {
  deanNavigation,
  getActiveViewFromPath,
  getPathRole,
  getRoleHomePath,
  isSpecialAuthRoute,
  roleHomeView,
  roleNavigationViews,
  studentNavigation,
  teacherNavigation,
} from "../config/navigation";

const DEV_BYPASS_LOGIN = false;

function LoginRoute({
  setToken,
  setUserRole,
}: {
  setToken: Dispatch<SetStateAction<string | null>>;
  setUserRole: Dispatch<SetStateAction<UserRole | undefined>>;
}) {
  const navigate = useNavigate();

  return (
    <LoginPage
      onLoginSuccess={(role) => {
        setToken(localStorage.getItem("token"));

        if (!role) return;

        const normalizedRole = role.toLowerCase();

        if (normalizedRole.includes("dean")) {
          setUserRole("dean");
          navigate(getRoleHomePath("dean"), { replace: true });
        } else if (normalizedRole.includes("teacher")) {
          setUserRole("teacher");
          navigate(getRoleHomePath("teacher"), { replace: true });
        } else {
          setUserRole("student");
          navigate(getRoleHomePath("student"), { replace: true });
        }
      }}
    />
  );
}

function AppWorkspace({
  token,
  userRole,
  loadingRole,
  clearSession,
}: {
  token: string | null;
  userRole: UserRole | undefined;
  loadingRole: boolean;
  clearSession: () => void;
}) {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!token && !DEV_BYPASS_LOGIN && !isSpecialAuthRoute(location.pathname)) {
      navigate("/login", { replace: true });
    }
  }, [location.pathname, navigate, token]);

  useEffect(() => {
    if (!userRole || loadingRole) return;

    const currentRole = getPathRole(location.pathname);
    if (currentRole && currentRole !== userRole) {
      navigate(getRoleHomePath(userRole), { replace: true });
      return;
    }

    if (location.pathname === "/" || location.pathname === "/login") {
      navigate(getRoleHomePath(userRole), { replace: true });
      return;
    }

    if (currentRole === userRole) {
      const activeView = getActiveViewFromPath(userRole, location.pathname);
      if (!roleNavigationViews[userRole].has(activeView)) {
        navigate(getRoleHomePath(userRole), { replace: true });
      }
    }
  }, [loadingRole, location.pathname, navigate, userRole]);

  const navigation =
    userRole === "student"
      ? studentNavigation
      : userRole === "teacher"
        ? teacherNavigation
        : deanNavigation;

  const activeView = userRole
    ? getActiveViewFromPath(userRole, location.pathname)
    : roleHomeView.student;

  const handleCourseSelect = (course: string | number | SelectedCourse) => {
    const courseData =
      course && typeof course === "object"
        ? course
        : { id: course as string | number };

    navigate(`/teacher/courses/${courseData.id}`, {
      state: {
        studentCount: courseData.studentCount,
        hours: courseData.hours,
      },
    });
  };

  const handleBackToCourses = () => {
    navigate("/teacher/courses", { replace: true });
  };

  const handleLogout = () => {
    clearSession();
    navigate("/login", { replace: true });
  };

  if (!token && !DEV_BYPASS_LOGIN) {
    return <Navigate to="/login" replace />;
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
        onNavigate={(viewId) => navigate(`/${userRole}/${viewId}`)}
        handleLogout={handleLogout}
      >
        <Outlet />
      </AppShell>
      <Toaster />
    </SidebarProvider>
  );
}

export function AppRoutes() {
  const {
    token,
    setToken,
    userRole,
    setUserRole,
    loadingRole,
    setLoadingRole,
    clearSession,
  } = useAuthSession();

  // Default content renderer for routes that don't have a dedicated nested
  // route. Uses the same workspace components as before.
  function WorkspaceIndex() {
    const location = useLocation();
    const navigate = useNavigate();
    if (!userRole) return null;

    if (userRole === "dean") {
      const activeView = getActiveViewFromPath(userRole, location.pathname);
      return <DeanWorkspace activeView={activeView} />;
    }

    if (userRole === "teacher") {
      const activeView = getActiveViewFromPath(userRole, location.pathname);
      const handleCourseSelect = (course: string | number | SelectedCourse) => {
        const courseData =
          course && typeof course === "object"
            ? course
            : { id: course as string | number };
        navigate(`/teacher/courses/${courseData.id}`, {
          state: {
            studentCount: courseData.studentCount,
            hours: courseData.hours,
          },
        });
      };

      return (
        <TeacherWorkspace
          activeView={activeView}
          courseId={null}
          courseState={null}
          onCourseSelect={handleCourseSelect}
          onBackToCourses={() =>
            navigate("/teacher/courses", { replace: true })
          }
        />
      );
    }

    const activeView = getActiveViewFromPath("student", location.pathname);
    return <StudentWorkspace activeView={activeView} />;
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={
          token && !DEV_BYPASS_LOGIN ? (
            <Navigate to="/" replace />
          ) : (
            <LoginRoute setToken={setToken} setUserRole={setUserRole} />
          )
        }
      />
      <Route
        path="/confirm-email"
        element={
          <>
            <ConfirmEmailPage />
            <Toaster />
          </>
        }
      />
      <Route
        path="/reset-password"
        element={
          <>
            <ResetPasswordPage />
            <Toaster />
          </>
        }
      />
      <Route
        path="/*"
        element={
          <AppWorkspace
            token={token}
            userRole={userRole}
            loadingRole={loadingRole}
            clearSession={clearSession}
          />
        }
      >
        <Route index element={<WorkspaceIndex />} />
        <Route path="teacher">
          <Route path="courses" element={<TeacherCourses />} />
          <Route path="courses/:courseId" element={<TeacherCourseDetail />} />
        </Route>
        <Route path="*" element={<WorkspaceIndex />} />
      </Route>
    </Routes>
  );
}
