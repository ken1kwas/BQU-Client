import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { confirmMyEmail } from "../api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { Button } from "./ui/button";

type ConfirmStatus = "loading" | "success" | "error";

export function ConfirmEmailPage() {
  const params = useMemo(
    () => new URLSearchParams(window.location.search),
    [],
  );
  const userId = params.get("userId") ?? "";
  const token = params.get("token") ?? "";

  const [status, setStatus] = useState<ConfirmStatus>("loading");
  const [message, setMessage] = useState("Checking your confirmation link...");

  useEffect(() => {
    let active = true;

    (async () => {
      if (!userId || !token) {
        if (!active) return;
        setStatus("error");
        setMessage("This confirmation link is missing required information.");
        return;
      }

      try {
        const response = await confirmMyEmail(userId, token);
        if (!active) return;

        const responseMessage =
          (typeof response === "string" && response) ||
          response?.message ||
          response?.responseMessage ||
          response?.data?.message ||
          "Your email address has been confirmed successfully.";

        setStatus("success");
        setMessage(responseMessage);
      } catch (error: any) {
        if (!active) return;
        setStatus("error");
        setMessage(
          error?.message || "This confirmation link is invalid or has expired.",
        );
      }
    })();

    return () => {
      active = false;
    };
  }, [token, userId]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-12">
      <Card className="w-full max-w-lg shadow-sm">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            {status === "loading" ? (
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            ) : status === "success" ? (
              <CheckCircle2 className="h-6 w-6 text-primary" />
            ) : (
              <XCircle className="h-6 w-6 text-destructive" />
            )}
          </div>
          <div className="space-y-1">
            <CardTitle>
              {status === "loading"
                ? "Confirming email"
                : status === "success"
                  ? "Email confirmed"
                  : "Confirmation failed"}
            </CardTitle>
            <CardDescription>
              {status === "loading"
                ? "Please wait while we verify your email confirmation request."
                : "You can return to the app once this step is complete."}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <Alert variant={status === "error" ? "destructive" : "default"}>
            <AlertTitle>
              {status === "success"
                ? "Success"
                : status === "error"
                  ? "Unable to confirm email"
                  : "Verifying link"}
            </AlertTitle>
            <AlertDescription>{message}</AlertDescription>
          </Alert>

          <Button
            className="w-full"
            variant={status === "error" ? "outline" : "default"}
            onClick={() => {
              window.location.href = "/";
            }}
          >
            Back to app
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
