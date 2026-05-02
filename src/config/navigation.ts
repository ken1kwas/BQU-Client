import {
  BarChart3,
  BookOpen,
  Calendar,
  CalendarDays,
  ClipboardCheck,
  FilePlus2,
  FileSpreadsheet,
  History,
  Home,
  Settings,
  User,
} from "lucide-react";

import type { NavigationGroup, UserRole } from "../types/app";

export const roleHomeView: Record<UserRole, string> = {
  student: "dashboard",
  teacher: "courses",
  dean: "management",
};

export const roleNavigationViews: Record<UserRole, Set<string>> = {
  student: new Set([
    "dashboard",
    "student-finals",
    "schedule",
    "grades",
    "subjects-history",
    "profile",
  ]),
  teacher: new Set(["courses", "teacher-finals", "schedule", "profile"]),
  dean: new Set([
    "enrollments",
    "management",
    "dean-finals-list",
    "dean-finals-confirm",
    "dean-finals-create",
    "schedule",
    "profile",
  ]),
};

export const studentNavigation: NavigationGroup[] = [
  {
    title: "Main",
    items: [
      { title: "Əsas səhifə", icon: Home, id: "dashboard" },
      {
        title: "Semester imtahanları",
        icon: CalendarDays,
        id: "student-finals",
      },
      { title: "Cədvəl", icon: Calendar, id: "schedule" },
      { title: "Qiymətləndirmə", icon: BarChart3, id: "grades" },
      { title: "Fənnlərin tarixi", icon: History, id: "subjects-history" },
      { title: "Profil", icon: User, id: "profile" },
    ],
  },
];

export const teacherNavigation: NavigationGroup[] = [
  {
    title: "Main",
    items: [
      { title: "Fənnlərim", icon: BookOpen, id: "courses" },
      {
        title: "Semester imtahanları",
        icon: CalendarDays,
        id: "teacher-finals",
      },
      { title: "Cədvəl", icon: Calendar, id: "schedule" },
      { title: "Profil", icon: User, id: "profile" },
    ],
  },
];

export const deanNavigation: NavigationGroup[] = [
  {
    title: "Main",
    items: [
      { title: "Alt qruplar", icon: FileSpreadsheet, id: "enrollments" },
      { title: "İdarəetmə", icon: Settings, id: "management" },
      {
        title: "Semester imtahanları",
        icon: CalendarDays,
        id: "dean-finals-list",
      },
      {
        title: "Qiyməti təsdiqlə",
        icon: ClipboardCheck,
        id: "dean-finals-confirm",
      },
      { title: "Final yarat", icon: FilePlus2, id: "dean-finals-create" },
      { title: "Cədvəl", icon: Calendar, id: "schedule" },
      { title: "Profil", icon: User, id: "profile" },
    ],
  },
];

export const getRoleHomePath = (role: UserRole) =>
  `/${role}/${roleHomeView[role]}`;

export const getPathRole = (pathname: string): UserRole | null => {
  const firstSegment = pathname.split("/").filter(Boolean)[0];
  if (
    firstSegment === "student" ||
    firstSegment === "teacher" ||
    firstSegment === "dean"
  ) {
    return firstSegment;
  }
  return null;
};

export const getActiveViewFromPath = (
  role: UserRole,
  pathname: string,
): string => {
  const segments = pathname.split("/").filter(Boolean);
  if (segments[0] !== role) {
    return roleHomeView[role];
  }

  const view = segments[1];
  if (!view) return roleHomeView[role];
  if (roleNavigationViews[role].has(view)) return view;

  return roleHomeView[role];
};

export const isSpecialAuthRoute = (pathname: string) =>
  pathname === "/login" ||
  pathname === "/confirm-email" ||
  pathname === "/reset-password";
