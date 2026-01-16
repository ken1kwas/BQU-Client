import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Separator } from "./ui/separator";
import { Mail, Phone, Calendar, IdCard, Building } from "lucide-react";
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

    return {
      name,
      surname,
      email,
      phone,
      dateOfBirth,
      employeeId,
      studentId,
      faculty,
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
        <h1 className="mb-2">Profile</h1>
        <p className="text-muted-foreground">Manage your personal information</p>
      </div>

      {error && <p className="text-destructive">{error}</p>}

      {/* Profile Header Card (верстка как была, но в верхушке только имя/фамилия) */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-6 items-start">
            <Avatar className="h-24 w-24">
              <AvatarImage src="" alt={fullName} />
              <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex flex-col md:flex-row md:items-center gap-3 mb-2">
                <h2>{loading ? "Загрузка…" : fullName}</h2>
              </div>
              {/* intentionally empty to keep old layout without extra fields */}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Personal Information (на всю ширину, Academic block удалён) */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <IdCard className="h-5 w-5" />
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="break-all">{info.email || "—"}</p>
                </div>
              </div>

              <Separator />

              <div className="flex items-start gap-3">
                <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p>{info.phone || "—"}</p>
                </div>
              </div>

              <Separator />

              <div className="flex items-start gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Birth date</p>
                  <p>{info.dateOfBirth ? formatDate(info.dateOfBirth) : "—"}</p>
                </div>
              </div>

              <Separator />

              <div className="flex items-start gap-3">
                <IdCard className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">
                    {isDean || isTeacher ? "Employee ID" : "Student ID"}
                  </p>
                  <p>{(isDean || isTeacher ? info.employeeId : info.studentId) || "—"}</p>
                </div>
              </div>

              <Separator />

              <div className="flex items-start gap-3">
                <Building className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Faculty</p>
                  <p>{info.faculty || "—"}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
