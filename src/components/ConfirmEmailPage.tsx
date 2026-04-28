import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { confirmMyEmail } from "../api/index";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { Button } from "./ui/button";
import type { ConfirmStatus } from "../types/confirmEmailPage";

export function ConfirmEmailPage() {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const userId = params.get("userId") ?? "";
  const token = params.get("token") ?? "";

  const [status, setStatus] = useState<ConfirmStatus>("loading");
  const [message, setMessage] = useState("Təsdiq linkinizi yoxlayırıq...");

  useEffect(() => {
    let active = true;

    (async () => {
      if (!userId || !token) {
        if (!active) return;
        setStatus("error");
        setMessage("Bu təsdiq linki lazımi məlumatlardan əskik qalmışdır.");
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
          "Sizin e-poçt ünvanı uğurla təsdiq edilmişdir.";

        setStatus("success");
        setMessage(responseMessage);
      } catch (error: any) {
        if (!active) return;
        setStatus("error");
        setMessage(
          error?.message ||
            "Bu təsdiq linki etibarsız və ya müddəti bitmiş olur.",
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
                ? "E-poçtu təsdiq etmə"
                : status === "success"
                  ? "E-poçt təsdiq edildi"
                  : "Təsdiq uğursuz oldu"}
            </CardTitle>
            <CardDescription>
              {status === "loading"
                ? "E-poçt təsdiq istəyinəsi yoxlanarkən, lütfən gözləyin."
                : "Bu addım tamamlandıqdan sonra tətbiqətə qayıda bilərsiniz."}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <Alert variant={status === "error" ? "destructive" : "default"}>
            <AlertTitle>
              {status === "success"
                ? "Uğurlu"
                : status === "error"
                  ? "E-poçtu təsdiq etmə mümkün olmadı"
                  : "Link yoxlanılır"}
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
            Tətbiqətə qayıt
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
