import { useState } from "react";

import { forgotPassword, signIn } from "./api";
import { Alert, AlertDescription, AlertTitle } from "./components/ui/alert";
import { Button } from "./components/ui/button";
import { Card, CardContent } from "./components/ui/card";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";

interface LoginPageProps {
  onLoginSuccess: (role: string | undefined) => void;
}

export default function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMessage, setForgotMessage] = useState("");
  const [forgotError, setForgotError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!login || !password) {
      setError("Daxil olun və şifrə daxil edin");
      return;
    }

    try {
      setLoading(true);
      const res = await signIn(login, password);
      const role = (res as any).roleName as string | undefined;
      onLoginSuccess(role);
    } catch (err: any) {
      setError(err.message || "Daxil olmaq başarısız oldu. Lütfən yenidən cəhd edin.");
    } finally {
      setLoading(false);
    }
  }

  async function onForgotPasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setForgotError("");
    setForgotMessage("");

    if (!email.trim()) {
      setForgotError("Lütfən e-poçt ünvanınızı daxil edin.");
      return;
    }

    try {
      setForgotLoading(true);
      await forgotPassword(email.trim());
      setForgotMessage(
        "Əgər bu e-poçt mövcuddursa, sıfırlama linki göndərilib.",
      );
    } catch (err: any) {
      setForgotError(
        err?.message || "Hazırda sorğunuz işlənə bilmədi.",
      );
    } finally {
      setForgotLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <div className="flex flex-1 items-center justify-center px-4">
        <div className="w-full max-w-md">
          <Card className="rounded-2xl border border-border shadow-lg">
            <CardContent className="p-6 sm:p-8">
              <div className="mb-6 text-center">
                <h2 className="text-2xl font-semibold">BQU LMS-ə daxil olun</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  LMS hesabınızdan istifadə edin
                </p>
              </div>

              {!showForgotPassword ? (
                <form onSubmit={onSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login">Daxil ol</Label>
                    <Input
                      id="login"
                      type="text"
                      autoComplete="username"
                      value={login}
                      onChange={(e) => setLogin(e.target.value)}
                      placeholder="FIN kodunuzu daxil edin"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Şifrə</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pr-20"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((value) => !value)}
                        className="absolute inset-y-0 right-2 my-auto h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                        aria-label={
                          showPassword ? "Şifrəni gizlət" : "Şifrəni göstər"
                        }
                      >
                        {showPassword ? "Gizlət" : "Göstər"}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <div className="text-sm text-destructive" role="alert">
                      {error}
                    </div>
                  )}

                  <div className="flex items-center justify-between text-sm">
                    <label className="inline-flex select-none items-center gap-2">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-border"
                      />
                      Yadda Saxla
                    </label>
                    <button
                      type="button"
                      className="font-medium text-primary hover:underline hover: cursor-pointer"
                      onClick={() => {
                        setShowForgotPassword(true);
                        setError("");
                        setForgotError("");
                        setForgotMessage("");
                      }}
                    >
                      Şifrə unuttunuz?
                    </button>
                  </div>

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Daxil oluruq..." : "Daxil ol"}
                  </Button>
                </form>
              ) : (
                <form onSubmit={onForgotPasswordSubmit} className="space-y-4">
                  <div className="space-y-1">
                    <h3 className="text-lg font-semibold">Şifrə unuttunuz</h3>
                    <p className="text-sm text-muted-foreground">
                      E-poçtunuzu daxil edin və siz bir sıfırlama linki alacaqsınız.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="forgot-email">E-poçt</Label>
                    <Input
                      id="forgot-email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="user@example.com"
                    />
                  </div>

                  {forgotMessage && (
                    <Alert>
                      <AlertTitle>Poçtunuzu yoxlayın</AlertTitle>
                      <AlertDescription>{forgotMessage}</AlertDescription>
                    </Alert>
                  )}

                  {forgotError && (
                    <Alert variant="destructive">
                      <AlertTitle>Sıfırlama linki göndərilə bilinmədi</AlertTitle>
                      <AlertDescription>{forgotError}</AlertDescription>
                    </Alert>
                  )}

                  <div className="flex gap-3">
                    <Button
                      type="submit"
                      className="flex-1"
                      disabled={forgotLoading}
                    >
                      {forgotLoading ? "Göndərilir..." : "Sıfırlama linki göndər"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        setShowForgotPassword(false);
                        setForgotError("");
                      }}
                    >
                      Logində qayıt
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>

          <div className="mt-4 text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()} Bakı Qızlar Universiteti
          </div>
        </div>
      </div>
    </div>
  );
}
