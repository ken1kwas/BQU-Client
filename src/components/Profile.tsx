import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "./ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Separator } from "./ui/separator";
import {
  Award,
  Building,
  CalendarDays,
  GraduationCap,
  IdCard,
  KeyRound,
  Landmark,
  LogOut,
  Mail,
  Phone,
  UserSquare2,
} from "lucide-react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  addMyEmail,
  changeMyPassword,
  checkUserPassword,
  getDeanProfile,
  getStudentProfile,
  getTeacherProfile,
  logout,
} from "../api/index";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { toast } from "sonner";
import type { ProfileProps } from "../types/profile";
import type { AnyObj } from "../types/helpers";

function pick(obj: AnyObj | null | undefined, keys: string[]): any {
  if (!obj) return "";
  for (const k of keys) {
    const v = obj[k];
    if (v !== undefined && v !== null && String(v).trim() !== "") return v;
  }
  return "";
}

function unwrapProfile(
  resp: any,
  role: "student" | "teacher" | "dean",
): AnyObj {
  if (!resp) return {};
  const inner = resp.data ?? resp;
  if (role === "dean") return inner.deanProfile ?? inner.profile ?? inner;
  if (role === "teacher") {
    return (
      inner.teacherProfile ??
      inner.teacherAcademicInfo ??
      inner.profile ??
      inner
    );
  }
  return (
    inner.studentProfile ??
    inner.studentAcademicInfoDto ??
    inner.profile ??
    inner
  );
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

const EMPTY_VALUE = "-";

function ProfileInfoTile({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border bg-muted/20 p-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 text-muted-foreground">{icon}</div>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 break-words font-medium text-foreground">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

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
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [emailError, setEmailError] = useState("");
  const [emailSuccess, setEmailSuccess] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);

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
        if (mounted) setError(err?.message || "Profil yuklenmedi");
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
    const email = pick(profile, ["email", "Email", "mail"]);
    const phone = pick(profile, [
      "phone",
      "phoneNumber",
      "mobile",
      "mobilePhone",
    ]);
    const dateOfBirth = pick(profile, ["dateOfBirth", "birthDate", "dob"]);
    const employeeId = pick(profile, [
      "employeeId",
      "employeeID",
      "staffId",
      "staffID",
    ]);
    const userName = pick(profile, ["userName", "username", "userCode"]);
    const admissionYear = pick(profile, ["admissionYear", "joinYear"]);
    const faculty = pick(profile, ["faculty", "facultyName"]);
    const stateName = pick(profile, ["stateName", "departmentName"]);
    const specialization = pick(profile, [
      "specialization",
      "major",
      "program",
    ]);
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
  const hasEmail = Boolean(String(info.email || "").trim());
  const initials =
    (fullName === EMPTY_VALUE ? "U" : fullName)
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

  function resetEmailDialog(nextEmail = info.email || "") {
    setEmailInput(nextEmail);
    setEmailError("");
    setEmailSuccess("");
    setEmailLoading(false);
  }

  function handleEmailDialogChange(open: boolean) {
    setIsEmailDialogOpen(open);
    resetEmailDialog();
  }

  const handleLogout = () => {
    logout();
    window.location.reload();
  };

  async function handleCheckPassword() {
    if (!currentPassword.trim()) {
      setPasswordError("Cari sifreni daxil edin.");
      return;
    }

    try {
      setPasswordLoading(true);
      setPasswordError("");
      await checkUserPassword(currentPassword);
      setPasswordStep("reset");
      toast.success("Cari sifre tesdiqlendi.");
    } catch (err: any) {
      setPasswordError(err?.message || "Cari sifre yanlisdir.");
    } finally {
      setPasswordLoading(false);
    }
  }

  async function handleResetPassword() {
    if (!newPassword.trim() || !repeatPassword.trim()) {
      setPasswordError("Yeni sifreni ve tekrarini daxil edin.");
      return;
    }

    if (newPassword !== repeatPassword) {
      setPasswordError("Yeni sifreler eyni deyil.");
      return;
    }

    try {
      setPasswordLoading(true);
      setPasswordError("");
      await changeMyPassword(newPassword);
      toast.success("Sifre ugurla deyisdirildi.");
      handlePasswordDialogChange(false);
    } catch (err: any) {
      setPasswordError(err?.message || "Sifre deyisdirilmedi.");
    } finally {
      setPasswordLoading(false);
    }
  }

  async function handleAddEmail() {
    const trimmedEmail = emailInput.trim();

    if (!trimmedEmail) {
      setEmailError("Email daxil edin.");
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(trimmedEmail)) {
      setEmailError("Duzgun email daxil edin.");
      return;
    }

    try {
      setEmailLoading(true);
      setEmailError("");
      setEmailSuccess("");
      await addMyEmail(trimmedEmail);
      const successMessage =
        "Confirmation link sent. Please check your inbox and confirm your email.";
      setEmailSuccess(successMessage);
      toast.success(successMessage);
    } catch (err: any) {
      setEmailError(err?.message || "Email elave edilmedi.");
    } finally {
      setEmailLoading(false);
    }
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="mb-2">
              {isDean
                ? "Admin Profile"
                : isTeacher
                  ? "Muellim Profili"
                  : "Telebe Profili"}
            </h1>
            <p className="text-muted-foreground">
              Profil melumatlariniza baxin ve idare edin
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!hasEmail && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleEmailDialogChange(true)}
              >
                <Mail className="mr-2 h-4 w-4" />
                E-poçt Əlavə Et
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePasswordDialogChange(true)}
            >
              <KeyRound className="mr-2 h-4 w-4" />
              Sifreni deyis
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Cixis
            </Button>
          </div>
        </div>

        {error && <p className="text-destructive">{error}</p>}

        <Card>
          <CardContent className="pt-6">
            <div className="grid gap-6 lg:grid-cols-[auto_1fr]">
              <Avatar className="h-24 w-24">
                <AvatarImage src="" alt={fullName} />
                <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
              </Avatar>

              <div className="min-w-0 space-y-6">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center">
                      <h2 className="truncate">
                        {loading ? "Yuklenir..." : fullName}
                      </h2>
                      <Badge variant="default" className="w-fit">
                        {info.status}
                      </Badge>
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

                  {(isTeacher || isDean) && (
                    <p className="text-sm text-muted-foreground">
                      {isDean
                        ? info.roleName || EMPTY_VALUE
                        : info.faculty || EMPTY_VALUE}
                    </p>
                  )}
                </div>

                <Separator />

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {!isTeacher && !isDean && (
                    <ProfileInfoTile
                      icon={<IdCard className="h-4 w-4" />}
                      label="FIN kod"
                      value={info.userName || EMPTY_VALUE}
                    />
                  )}

                  <ProfileInfoTile
                    icon={<Building className="h-4 w-4" />}
                    label="Fakulte"
                    value={info.faculty || EMPTY_VALUE}
                  />

                  <ProfileInfoTile
                    icon={
                      isDean ? (
                        <UserSquare2 className="h-4 w-4" />
                      ) : isTeacher ? (
                        <Landmark className="h-4 w-4" />
                      ) : (
                        <GraduationCap className="h-4 w-4" />
                      )
                    }
                    label={isDean ? "Rol" : isTeacher ? "Kafedra" : "Ixtisas"}
                    value={
                      isDean
                        ? info.roleName || EMPTY_VALUE
                        : isTeacher
                          ? info.stateName || EMPTY_VALUE
                          : info.specialization || EMPTY_VALUE
                    }
                  />

                  {info.email && (
                    <ProfileInfoTile
                      icon={<Mail className="h-4 w-4" />}
                      label="Email"
                      value={info.email}
                    />
                  )}

                  {info.phone && (
                    <ProfileInfoTile
                      icon={<Phone className="h-4 w-4" />}
                      label="Telefon"
                      value={info.phone}
                    />
                  )}

                  {info.dateOfBirth && (
                    <ProfileInfoTile
                      icon={<CalendarDays className="h-4 w-4" />}
                      label="Dogum tarixi"
                      value={formatDate(info.dateOfBirth)}
                    />
                  )}

                  {info.admissionYear && !isTeacher && !isDean && (
                    <ProfileInfoTile
                      icon={<CalendarDays className="h-4 w-4" />}
                      label="Qebul ili"
                      value={info.admissionYear}
                    />
                  )}

                  {info.employeeId && (isTeacher || isDean) && (
                    <ProfileInfoTile
                      icon={<Award className="h-4 w-4" />}
                      label="Isci ID"
                      value={info.employeeId}
                    />
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={isPasswordDialogOpen}
        onOpenChange={handlePasswordDialogChange}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Sifreni deyis</DialogTitle>
            <DialogDescription>
              {passwordStep === "check"
                ? "Evvelce cari sifrenizi tesdiqleyin."
                : "Yeni sifrenizi daxil edin ve tekrarini yazin."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {passwordStep === "check" ? (
              <div className="space-y-2">
                <label
                  htmlFor="current-password"
                  className="text-sm font-medium"
                >
                  Cari sifre
                </label>
                <Input
                  id="current-password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Cari sifrenizi daxil edin"
                />
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <label htmlFor="new-password" className="text-sm font-medium">
                    Yeni sifre
                  </label>
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Yeni sifre"
                  />
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="repeat-password"
                    className="text-sm font-medium"
                  >
                    Yeni sifreni tekrar edin
                  </label>
                  <Input
                    id="repeat-password"
                    type="password"
                    value={repeatPassword}
                    onChange={(e) => setRepeatPassword(e.target.value)}
                    placeholder="Yeni sifreni yeniden daxil edin"
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
              Bagla
            </Button>
            <Button
              type="button"
              onClick={
                passwordStep === "check"
                  ? handleCheckPassword
                  : handleResetPassword
              }
              disabled={passwordLoading}
            >
              {passwordLoading
                ? "Yoxlanilir..."
                : passwordStep === "check"
                  ? "Sifreni yoxla"
                  : "Sifreni deyis"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEmailDialogOpen} onOpenChange={handleEmailDialogChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Email</DialogTitle>
            <DialogDescription>
              Enter the email address you want to connect to your account. We
              will send a confirmation link to that inbox.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="profile-email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="profile-email"
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="user@example.com"
              />
            </div>

            {emailSuccess && (
              <Alert>
                <AlertTitle>Confirmation email sent</AlertTitle>
                <AlertDescription>{emailSuccess}</AlertDescription>
              </Alert>
            )}

            {emailError && (
              <Alert variant="destructive">
                <AlertTitle>Unable to add email</AlertTitle>
                <AlertDescription>{emailError}</AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleEmailDialogChange(false)}
              disabled={emailLoading}
            >
              Close
            </Button>
            <Button
              type="button"
              onClick={handleAddEmail}
              disabled={emailLoading}
            >
              {emailLoading ? "Sending..." : "Send confirmation link"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
