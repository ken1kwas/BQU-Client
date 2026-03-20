import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "./ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Separator } from "./ui/separator";
import {
  Building,
  Award,
  LogOut,
  KeyRound,
  IdCard,
} from "lucide-react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  checkUserPassword,
  getDeanProfile,
  getStudentProfile,
  getTeacherProfile,
  logout,
  resetMyPassword,
} from "../api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { toast } from "sonner";

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
  const inner = resp.data ?? resp;
  if (role === "dean") return inner.deanProfile ?? inner.profile ?? inner;
  if (role === "teacher") {
    return inner.teacherProfile ?? inner.teacherAcademicInfo ?? inner.profile ?? inner;
  }
  return inner.studentProfile ?? inner.studentAcademicInfoDto ?? inner.profile ?? inner;
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

const EMPTY_VALUE = "—";

export function Profile({ userRole = "student" }: ProfileProps = {}) {
  const [raw, setRaw] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [passwordStep, setPasswordStep] = useState<"check" | "reset">("check");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

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
        if (mounted) setError(err?.message || "Profil yüklənmədi");
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
    const userName = pick(profile, ["userName", "username", "userCode"]);
    const admissionYear = pick(profile, ["admissionYear", "joinYear"]);
    const faculty = pick(profile, ["faculty", "facultyName"]);
    const stateName = pick(profile, ["stateName", "departmentName"]);
    const specialization = pick(profile, ["specialization", "major", "program"]);
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
      userName,
      admissionYear,
      faculty,
      stateName,
      specialization,
      finCode,
      roleName,
      status,
    };
  }, [profile]);

  const fullName = `${info.name} ${info.surname}`.trim() || EMPTY_VALUE;
  const initials = (fullName === EMPTY_VALUE ? "U" : fullName)
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "U";

  function resetPasswordDialog() {
    setPasswordStep("check");
    setCurrentPassword("");
    setNewPassword("");
    setRepeatPassword("");
    setPasswordError("");
    setPasswordLoading(false);
  }

  function handlePasswordDialogChange(open: boolean) {
    setIsPasswordDialogOpen(open);
    if (!open) resetPasswordDialog();
  }

  const handleLogout = () => {
    logout();
    window.location.reload();
  };

  async function handleCheckPassword() {
    if (!currentPassword.trim()) {
      setPasswordError("Cari şifrəni daxil edin.");
      return;
    }

    try {
      setPasswordLoading(true);
      setPasswordError("");
      await checkUserPassword(currentPassword);
      setPasswordStep("reset");
      toast.success("Cari şifrə təsdiqləndi.");
    } catch (err: any) {
      setPasswordError(err?.message || "Cari şifrə yanlışdır.");
    } finally {
      setPasswordLoading(false);
    }
  }

  async function handleResetPassword() {
    if (!newPassword.trim() || !repeatPassword.trim()) {
      setPasswordError("Yeni şifrəni və təkrarını daxil edin.");
      return;
    }

    if (newPassword !== repeatPassword) {
      setPasswordError("Yeni şifrələr eyni deyil.");
      return;
    }

    try {
      setPasswordLoading(true);
      setPasswordError("");
      await resetMyPassword(newPassword);
      toast.success("Şifrə uğurla dəyişdirildi.");
      handlePasswordDialogChange(false);
    } catch (err: any) {
      setPasswordError(err?.message || "Şifrə dəyişdirilmədi.");
    } finally {
      setPasswordLoading(false);
    }
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="mb-2">
              {isDean
                ? "Admin Profile"
                : isTeacher
                  ? "Müəllim Profili"
                  : "Tələbə Profili"}
            </h1>
            <p className="text-muted-foreground">
              Profil məlumatınıza baxın və idarə edin
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePasswordDialogChange(true)}
            >
              <KeyRound className="mr-2 h-4 w-4" />
              Şifrəni dəyiş
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Çıxış
            </Button>
          </div>
        </div>

        {error && <p className="text-destructive">{error}</p>}

        <Card>
          <CardContent className="pt-6">
            <div className="mb-4 flex flex-col items-start gap-6 md:flex-row">
              <Avatar className="h-24 w-24">
                <AvatarImage src="" alt={fullName} />
                <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="mb-2 flex flex-col gap-3 md:flex-row md:items-center">
                  <h2>{loading ? "Yüklənir..." : fullName}</h2>
                  <Badge variant="default">{info.status}</Badge>
                </div>
                <div className="space-y-1 text-muted-foreground">
                  {isDean ? (
                    <>
                      <p>FIN kod: {info.finCode || EMPTY_VALUE}</p>
                      <p>{info.roleName || EMPTY_VALUE}</p>
                    </>
                  ) : isTeacher ? (
                    <p>FIN kod: {info.userName || EMPTY_VALUE}</p>
                  ) : (
                    <p>{info.faculty || EMPTY_VALUE}</p>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-2 md:text-right">
                {(isTeacher || isDean) && (
                  <p className="text-sm text-muted-foreground">
                    {isDean ? info.roleName || EMPTY_VALUE : info.faculty || EMPTY_VALUE}
                  </p>
                )}
              </div>
            </div>

            <Separator className="my-6" />

            <div className="grid gap-6 pt-2 md:grid-cols-2">
              {!isTeacher && !isDean && (
                <div className="flex items-start gap-3">
                  <IdCard className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">FIN kod</p>
                    <div className="mt-1">
                      <p>{info.userName || EMPTY_VALUE}</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePasswordDialogChange(true)} className="hidden"
                      >
                        <KeyRound className="mr-2 h-4 w-4" />
                        Şifrəni dəyiş
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <Building className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Fakültə</p>
                  <p>{info.faculty || EMPTY_VALUE}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Award className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">
                    {isDean ? "Rol" : isTeacher ? "Kafedra" : "İxtisas"}
                  </p>
                  <p>
                    {isDean
                      ? info.roleName || EMPTY_VALUE
                      : isTeacher
                        ? info.stateName || EMPTY_VALUE
                        : info.specialization || EMPTY_VALUE}
                  </p>
                </div>
              </div>

              {info.email && (
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p>{info.email}</p>
                  </div>
                </div>
              )}

              {info.phone && (
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">Telefon</p>
                    <p>{info.phone}</p>
                  </div>
                </div>
              )}

              {info.dateOfBirth && (
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">Doğum tarixi</p>
                    <p>{formatDate(info.dateOfBirth)}</p>
                  </div>
                </div>
              )}

              {info.admissionYear && !isTeacher && !isDean && (
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">Qəbul ili</p>
                    <p>{info.admissionYear}</p>
                  </div>
                </div>
              )}

              {info.employeeId && (isTeacher || isDean) && (
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">İşçi ID</p>
                    <p>{info.employeeId}</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isPasswordDialogOpen} onOpenChange={handlePasswordDialogChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Şifrəni dəyiş</DialogTitle>
            <DialogDescription>
              {passwordStep === "check"
                ? "Əvvəlcə cari şifrənizi təsdiqləyin."
                : "Yeni şifrənizi daxil edin və təkrarlayın."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {passwordStep === "check" ? (
              <div className="space-y-2">
                <label htmlFor="current-password" className="text-sm font-medium">
                  Cari şifrə
                </label>
                <Input
                  id="current-password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Cari şifrənizi daxil edin"
                />
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <label htmlFor="new-password" className="text-sm font-medium">
                    Yeni şifrə
                  </label>
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Yeni şifrə"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="repeat-password" className="text-sm font-medium">
                    Yeni şifrəni təkrar edin
                  </label>
                  <Input
                    id="repeat-password"
                    type="password"
                    value={repeatPassword}
                    onChange={(e) => setRepeatPassword(e.target.value)}
                    placeholder="Yeni şifrəni yenidən daxil edin"
                  />
                </div>
              </>
            )}

            {passwordError && (
              <p className="text-sm text-destructive" role="alert">
                {passwordError}
              </p>
            )}
          </div>

          <DialogFooter>
            {passwordStep === "reset" && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setPasswordStep("check");
                  setNewPassword("");
                  setRepeatPassword("");
                  setPasswordError("");
                }}
                disabled={passwordLoading}
              >
                Geri
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={() => handlePasswordDialogChange(false)}
              disabled={passwordLoading}
            >
              Bağla
            </Button>
            <Button
              type="button"
              onClick={passwordStep === "check" ? handleCheckPassword : handleResetPassword}
              disabled={passwordLoading}
            >
              {passwordLoading
                ? "Yoxlanılır..."
                : passwordStep === "check"
                  ? "Şifrəni yoxla"
                  : "Şifrəni dəyiş"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
