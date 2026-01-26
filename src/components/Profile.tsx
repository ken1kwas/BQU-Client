import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Separator } from "./ui/separator";
import { Mail, Phone, Calendar, IdCard, Building, Award } from "lucide-react";
import { Badge } from "./ui/badge";
import { getStudentProfile, getTeacherProfile, getDeanProfile } from "../api";

interface ProfileProps {
  userRole?: "student" | "teacher" | "dean";
}

type AnyObj = Record<string, any>;

function pick(obj: AnyObj | null | undefined, keys: string[]): any {
  if (!obj) return "";
  for (const k of keys) {
    const v = obj[k];
    if (v !== undefined && v !== null && String(v).trim() !== "") return v;
  }
  return "";
}

function unwrapProfile(resp: any, role: "student" | "teacher" | "dean"): AnyObj {
  if (!resp) return {};
  // Backend envelopes like: { deanProfile: {...}, isSucceeded, ... }
  if (role === "dean") return resp.deanProfile ?? resp.profile ?? resp;
  if (role === "teacher") return resp.teacherProfile ?? resp.profile ?? resp;
  return resp.studentProfile ?? resp.profile ?? resp;
}

function formatDate(value: any): string {
  if (!value) return "";
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleDateString();
  } catch {
    return String(value);
  }
}

export function Profile({ userRole = "student" }: ProfileProps = {}) {
  const [raw, setRaw] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isTeacher = userRole === "teacher";
  const isDean = userRole === "dean";

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        let data: any;
        if (isDean) data = await getDeanProfile();
        else if (isTeacher) data = await getTeacherProfile();
        else data = await getStudentProfile();
        if (mounted) setRaw(data);
      } catch (err: any) {
        if (mounted) setError(err?.message || "Не удалось загрузить профиль");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [isDean, isTeacher]);

  const profile = useMemo(() => unwrapProfile(raw, userRole), [raw, userRole]);

  const info = useMemo(() => {
    const name = pick(profile, ["name", "firstName", "givenName"]);
    const surname = pick(profile, ["surname", "lastName", "familyName"]);
    const email = pick(profile, ["email", "mail"]);
    const phone = pick(profile, ["phone", "phoneNumber", "mobile", "mobilePhone"]);
    const dateOfBirth = pick(profile, ["dateOfBirth", "birthDate", "dob"]);
    const employeeId = pick(profile, ["employeeId", "employeeID", "staffId", "staffID"]);
    const studentId = pick(profile, ["studentId", "studentID", "recordBookNumber"]);
    const faculty = pick(profile, ["faculty", "facultyName"]);
    const finCode = pick(profile, ["finCode", "fin", "pin"]);
    const roleName = pick(profile, ["roleName", "role"]);
    const status = pick(profile, ["status", "accountStatus"]) || "Active";

    return {
      name,
      surname,
      email,
      phone,
      dateOfBirth,
      employeeId,
      studentId,
      faculty,
      finCode,
      roleName,
      status,
    };
  }, [profile]);

  const fullName = `${info.name} ${info.surname}`.trim() || "—";
  const initials = (fullName === "—" ? "U" : fullName)
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("") || "U";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="mb-2">{isDean ? "Dean Profile" : isTeacher ? "Teacher Profile" : "Student Profile"}</h1>
        <p className="text-muted-foreground">
          View and manage your profile information
        </p>
      </div>

      {error && <p className="text-destructive">{error}</p>}

      {/* Single Profile Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-6 items-start mb-6">
            <Avatar className="h-24 w-24">
              <AvatarImage src="" alt={fullName} />
              <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex flex-col md:flex-row md:items-center gap-3 mb-2">
                <h2>{loading ? "Загрузка…" : fullName}</h2>
                <Badge variant="default">{info.status}</Badge>
              </div>
              <div className="space-y-1 text-muted-foreground">
                {isDean ? (
                  <>
                    <p>FIN Code: {info.finCode || "—"}</p>
                    <p>{info.roleName || "—"}</p>
                  </>
                ) : isTeacher ? (
                  <>
                    <p>Employee ID: {info.employeeId || "—"}</p>
                    <p>{info.faculty || "—"}</p>
                  </>
                ) : (
                  <>
                    <p>Student ID: {info.studentId || "—"}</p>
                    <p>{info.faculty || "—"}</p>
                  </>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-2 md:text-right">
              {(isTeacher || isDean) && (
                <p className="text-sm text-muted-foreground">
                  {isDean ? info.roleName : info.faculty || "—"}
                </p>
              )}
            </div>
          </div>

          <Separator className="my-6" />

          {/* All information in one card */}
          <div className="grid gap-6 md:grid-cols-2">
            {!isDean && (
              <>
                <div className="flex items-start gap-3">
                  <IdCard className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">
                      {isTeacher ? "Employee ID" : "Student ID"}
                    </p>
                    <p>{isTeacher ? info.employeeId : info.studentId || "—"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">
                      {isTeacher ? "Join Year" : "Admission Year"}
                    </p>
                    <p>{info.dateOfBirth ? formatDate(info.dateOfBirth) : "—"}</p>
                  </div>
                </div>
              </>
            )}
            <div className="flex items-start gap-3">
              <Building className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Faculty</p>
                <p>{info.faculty || "—"}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Award className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">
                  {isDean ? "Role" : isTeacher ? "Department" : "Specialization"}
                </p>
                <p>{isDean ? info.roleName : info.faculty || "—"}</p>
              </div>
            </div>
            {!isDean && (
              <>
                <div className="flex items-start gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="break-all">{info.email || "—"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p>{info.phone || "—"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">Date of Birth</p>
                    <p>{info.dateOfBirth ? formatDate(info.dateOfBirth) : "—"}</p>
                  </div>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
