import { useState } from "react";

import { forgotPassword, signIn } from "../api/index";

type LoginMode = "signin" | "forgot-password";

function getErrorMessage(error: unknown, fallback: string) {
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }

  return fallback;
}

type UseLoginPageOptions = {
  onLoginSuccess: (role: string | undefined) => void;
};

export function useLoginPage({ onLoginSuccess }: UseLoginPageOptions) {
  const [mode, setMode] = useState<LoginMode>("signin");
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isSendingResetLink, setIsSendingResetLink] = useState(false);

  const [signInError, setSignInError] = useState("");
  const [forgotMessage, setForgotMessage] = useState("");
  const [forgotError, setForgotError] = useState("");

  const openForgotPassword = () => {
    setMode("forgot-password");
    setSignInError("");
    setForgotError("");
    setForgotMessage("");
  };

  const returnToSignIn = () => {
    setMode("signin");
    setForgotError("");
    setForgotMessage("");
  };

  const togglePasswordVisibility = () => {
    setShowPassword((value) => !value);
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSignInError("");

    const normalizedLogin = login.trim();

    if (!normalizedLogin || !password) {
      setSignInError("Daxil olun və şifrə daxil edin");
      return;
    }

    try {
      setIsSigningIn(true);
      const response = (await signIn(normalizedLogin, password)) as {
        roleName?: string;
      };
      onLoginSuccess(response?.roleName);
    } catch (error: unknown) {
      setSignInError(
        getErrorMessage(
          error,
          "Daxil olmaq başarısız oldu. Lütfən yenidən cəhd edin.",
        ),
      );
    } finally {
      setIsSigningIn(false);
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
      setIsSendingResetLink(true);
      await forgotPassword(email.trim());
      setForgotMessage(
        "Əgər bu e-poçt mövcuddursa, sıfırlama linki göndərilib.",
      );
    } catch (error: unknown) {
      setForgotError(
        getErrorMessage(error, "Hazırda sorğunuz işlənə bilmədi."),
      );
    } finally {
      setIsSendingResetLink(false);
    }
  }

  return {
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
  };
}
