import { useCallback, useEffect, useState } from "react";

import {
  getDeanProfile,
  getStudentProfile,
  getTeacherProfile,
  logout,
} from "../api/index";
import type { UserRole } from "../types/app";

export function useAuthSession() {
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem("token"),
  );
  const [userRole, setUserRole] = useState<UserRole | undefined>(undefined);
  const [loadingRole, setLoadingRole] = useState(false);

  const bootstrapRole = useCallback(async () => {
    if (!token || userRole || loadingRole) return;

    setLoadingRole(true);
    try {
      let resolved = false;

      try {
        const dean = await getDeanProfile();
        if (dean) {
          setUserRole("dean");
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
    } finally {
      setLoadingRole(false);
    }
  }, [loadingRole, token, userRole]);

  useEffect(() => {
    void bootstrapRole();
  }, [bootstrapRole]);

  const clearSession = useCallback(() => {
    logout();
    setToken(null);
    setUserRole(undefined);
    setLoadingRole(false);
  }, []);

  return {
    token,
    setToken,
    userRole,
    setUserRole,
    loadingRole,
    setLoadingRole,
    clearSession,
  };
}
