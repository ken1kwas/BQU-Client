import { LogOut } from "lucide-react";

import logo from "@/assets/logo.svg";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
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
  SidebarTrigger,
  useSidebar,
} from "../components/ui/sidebar";
import type { AppShellProps } from "../types/app";

export function AppShell({
  navigation,
  activeView,
  userRole,
  onNavigate,
  handleRoleSwitch,
  handleLogout,
  renderContent,
  children,
}: AppShellProps) {
  const { isMobile, setOpenMobile } = useSidebar();
  const activeItem = navigation
    .flatMap((group) => group.items)
    .find((item) => item.id === activeView);

  const handleNavigation = (viewId: string) => {
    onNavigate(viewId);

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
                        isActive={activeView === item.id}
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
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">
              {activeItem?.title ?? "Menu"}
            </p>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 md:p-6">
          {children ?? (renderContent ? renderContent() : null)}
        </main>
      </SidebarInset>
    </div>
  );
}
