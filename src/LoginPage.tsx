import { useState } from "react";
import { signIn } from "./api";

interface LoginPageProps {
  onLoginSuccess: (role: string | undefined) => void;
}
export default function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!login || !password) {
      setError("Enter login and password");
      return;
    }
    try {
      setLoading(true);
      const res = await signIn(login, password);
      const role = (res as any).roleName as string | undefined;
      onLoginSuccess(role);
    } catch (err: any) {
      setError(err.message || "Ошибка входа. Попробуйте ещё раз.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="bg-card rounded-2xl shadow-lg p-6 sm:p-8 border border-border">
            <div className="mb-4 text-center">
              <h2 className="text-2xl font-semibold">LMS-ə daxil olun</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Korporativ hesabdan istifadə edin
              </p>
            </div>
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="text"
                  className="block text-sm font-medium mb-1"
                >
                  Daxil ol
                </label>
                <input
                  id="pin"
                  type="text"
                  autoComplete="username"
                  value={login}
                  onChange={(e) => setLogin(e.target.value)}
                  className="w-full rounded-xl border border-border bg-input-background px-3 py-2 outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="FIN kodunuzu daxil edin"
                />
              </div>
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium mb-1"
                >
                  Şifrə
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl border border-border bg-input-background px-3 py-2 pr-12 outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute inset-y-0 right-2 my-auto h-10 px-2 text-xs text-muted-foreground hover:text-foreground"
                    aria-label={
                      showPassword ? "Скрыть пароль" : "Показать пароль"
                    }
                  >
                    {showPassword ? "Скрыть" : "Показать"}
                  </button>
                </div>
              </div>
              {error && (
                <div className="text-sm text-destructive" role="alert">
                  {error}
                </div>
              )}
              <div className="flex items-center justify-between text-sm">
                <label className="inline-flex items-center gap-2 select-none">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-border"
                  />
                  Yadda Saxla
                </label>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-primary text-primary-foreground py-2 font-medium hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
              >
                {loading ? "Daxil oluruq…" : "Daxil ol"}
              </button>
            </form>
          </div>
          <div className="text-center text-xs text-muted-foreground mt-4">
            © {new Date().getFullYear()} Bakı Qızlar Universiteti
          </div>
        </div>
      </div>
    </div>
  );
}
