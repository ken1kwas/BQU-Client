import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, KeyRound, Loader2, XCircle } from "lucide-react";

import { resetPassword } from "../api";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

type ResetStatus = "idle" | "success" | "error";

export function ResetPasswordPage() {
  const searchParams = useMemo(
    () => new URLSearchParams(window.location.search),
    [],
  );
  const userId = searchParams.get("userId") ?? "";
  const token = searchParams.get("token") ?? "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<ResetStatus>("idle");
  const [message, setMessage] = useState(
    "Hesabınızı sıfırlamağı bitirmək üçün yeni şifrənizi daxil edin.",
  );

  useEffect(() => {
    if (!userId || !token) {
      setStatus("error");
      setMessage("Bu sıfırlama linki tələb olunan məlumatları ehtiva etmir.");
    }
  }, [token, userId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!userId || !token) {
      setStatus("error");
      setMessage("Bu sıfırlama linki keçərsizdir. Lütfən yenisini istəyin.");
      return;
    }

    if (!newPassword.trim()) {
      setStatus("error");
      setMessage("Lütfən yeni şifre daxil edin.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setStatus("error");
      setMessage("Şifrələr uyğun gəlmir.");
      return;
    }

    try {
      setSubmitting(true);
      setStatus("idle");
      const response = await resetPassword(userId, token, newPassword);
      const responseMessage =
        (typeof response === "string" && response) ||
        response?.message ||
        response?.responseMessage ||
        response?.data?.message ||
        "Sizin şifrəniz uğurla sıfırlanmışdır."

      setStatus("success");
      setMessage(responseMessage);
      setNewPassword("");
      setConfirmPassword("");

      window.setTimeout(() => {
        window.location.href = "/";
      }, 1800);
    } catch (error: any) {
      setStatus("error");
      setMessage(
        error?.message || "Bu sıfırlama linki keçərsiz və ya müddəti başa çatmışdır.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-12">
      <Card className="w-full max-w-lg shadow-sm">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            {submitting ? (
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            ) : status === "success" ? (
              <CheckCircle2 className="h-6 w-6 text-primary" />
            ) : status === "error" ? (
              <XCircle className="h-6 w-6 text-destructive" />
            ) : (
              <KeyRound className="h-6 w-6 text-primary" />
            )}
          </div>
          <div className="space-y-1">
            <CardTitle>
              {status === "success" ? "Şifre sıfırlandı" : "Şifri sıfırla"}
            </CardTitle>
            <CardDescription>
              {status === "success"
                ? "Siz tezliklə giriş səhifəsinə yönləndirilərsiniz."
                : "Hesabınız üçün yeni şifre yaradın."}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <Alert
            variant={status === "error" ? "destructive" : "default"}
          >
            <AlertTitle>
              {status === "success"
                ? "Uğurlu"
                : status === "error"
                  ? "Şifre sıfırlanmadı"
                  : "Şifrənizi sıfırlayın"}
            </AlertTitle>
            <AlertDescription>{message}</AlertDescription>
          </Alert>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">Yeni şifre</Label>
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={submitting || status === "success" || !userId || !token}
                placeholder="Yeni şifrənizi daxil edin"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">Şifrəni təsdiqlə</Label>
              <Input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={submitting || status === "success" || !userId || !token}
                placeholder="Yeni şifrənizi təkrarlayın"
              />
            </div>

            <div className="flex gap-3">
              <Button
                type="submit"
                className="flex-1"
                disabled={submitting || status === "success" || !userId || !token}
              >
                {submitting ? "Sıfırlanır..." : "Şifri sıfırla"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => {
                  window.location.href = "/";
                }}
              >
                Logində qayıt
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
