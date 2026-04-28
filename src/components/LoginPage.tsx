import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { useLoginPage } from "../hooks/useLoginPage";
import type { LoginPageProps } from "../types/loginPage";

export default function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const {
    mode,
    login,
    setLogin,
    password,
    setPassword,
    email,
    setEmail,
    showPassword,
    togglePasswordVisibility,
    isSigningIn,
    isSendingResetLink,
    signInError,
    forgotMessage,
    forgotError,
    openForgotPassword,
    returnToSignIn,
    onSubmit,
    onForgotPasswordSubmit,
  } = useLoginPage({ onLoginSuccess });

  return (
    <div className="flex min-h-screen flex-col bg-background text-foregroundpy-12">
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

              {mode === "signin" ? (
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
                        onClick={togglePasswordVisibility}
                        className="absolute inset-y-0 right-2 my-auto h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                        aria-label={
                          showPassword ? "Şifrəni gizlət" : "Şifrəni göstər"
                        }
                      >
                        {showPassword ? "Gizlət" : "Göstər"}
                      </button>
                    </div>
                  </div>

                  {signInError && (
                    <div className="text-sm text-destructive" role="alert">
                      {signInError}
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
                      onClick={openForgotPassword}
                    >
                      Şifrə unuttunuz?
                    </button>
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isSigningIn}
                  >
                    {isSigningIn ? "Daxil oluruq..." : "Daxil ol"}
                  </Button>
                </form>
              ) : (
                <form onSubmit={onForgotPasswordSubmit} className="space-y-4">
                  <div className="space-y-1">
                    <h3 className="text-lg font-semibold">Şifrə unuttunuz</h3>
                    <p className="text-sm text-muted-foreground">
                      E-poçtunuzu daxil edin və siz bir sıfırlama linki
                      alacaqsınız.
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
                      <AlertTitle>
                        Sıfırlama linki göndərilə bilinmədi
                      </AlertTitle>
                      <AlertDescription>{forgotError}</AlertDescription>
                    </Alert>
                  )}

                  <div className="flex gap-3">
                    <Button
                      type="submit"
                      className="flex-1"
                      disabled={isSendingResetLink}
                    >
                      {isSendingResetLink
                        ? "Göndərilir..."
                        : "Sıfırlama linki göndər"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={returnToSignIn}
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
