import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export type UserRole = "student" | "teacher" | "dean";

export type NavigationItem = {
  title: string;
  icon: LucideIcon;
  id: string;
};

export type NavigationGroup = {
  title: string;
  items: NavigationItem[];
};

export type SelectedCourse = {
  id: string | number;
  studentCount?: number;
  hours?: number;
};

export type AppShellProps = {
  navigation: NavigationGroup[];
  activeView: string;
  userRole: UserRole;
  onNavigate: (view: string) => void;
  handleRoleSwitch?: () => void;
  handleLogout: () => void;
  renderContent: () => ReactNode;
};
