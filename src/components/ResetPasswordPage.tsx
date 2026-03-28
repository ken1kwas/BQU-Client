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
    "Enter your new password to finish resetting your account.",
  );

  useEffect(() => {
    if (!userId || !token) {
      setStatus("error");
      setMessage("This reset link is missing required information.");
    }
  }, [token, userId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!userId || !token) {
      setStatus("error");
      setMessage("This reset link is invalid. Please request a new one.");
      return;
    }

    if (!newPassword.trim()) {
      setStatus("error");
      setMessage("Please enter a new password.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setStatus("error");
      setMessage("Passwords do not match.");
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
        "Your password has been reset successfully.";

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
        error?.message || "This reset link is invalid or has expired.",
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
              {status === "success" ? "Password reset" : "Reset password"}
            </CardTitle>
            <CardDescription>
              {status === "success"
                ? "You will be redirected to the login page shortly."
                : "Create a new password for your account."}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <Alert
            variant={status === "error" ? "destructive" : "default"}
          >
            <AlertTitle>
              {status === "success"
                ? "Success"
                : status === "error"
                  ? "Unable to reset password"
                  : "Reset your password"}
            </AlertTitle>
            <AlertDescription>{message}</AlertDescription>
          </Alert>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">New password</Label>
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={submitting || status === "success" || !userId || !token}
                placeholder="Enter your new password"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm password</Label>
              <Input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={submitting || status === "success" || !userId || !token}
                placeholder="Repeat your new password"
              />
            </div>

            <div className="flex gap-3">
              <Button
                type="submit"
                className="flex-1"
                disabled={submitting || status === "success" || !userId || !token}
              >
                {submitting ? "Resetting..." : "Reset password"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => {
                  window.location.href = "/";
                }}
              >
                Back to login
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
