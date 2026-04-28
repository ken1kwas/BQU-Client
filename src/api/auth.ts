import { apiJson } from "./core";

export async function signIn(username: string, password: string) {
  const res = await apiJson<any>("/api/user/signin", {
    method: "POST",
    json: { username, password },
  });

  const token = res?.token ?? res?.accessToken ?? res?.jwt ?? res?.data?.token;
  if (typeof token === "string" && token.length > 0) {
    localStorage.setItem("token", token);
    localStorage.setItem("accessToken", token);
  }

  const expires =
    res?.expireTime ??
    res?.expiresAt ??
    res?.expiration ??
    res?.data?.expireTime;
  if (expires) {
    localStorage.setItem("tokenExpiry", String(expires));
  }

  return res;
}

export function forgotPassword(email: string) {
  return apiJson<any>("/api/auth/forgot-password", {
    method: "POST",
    json: { email },
  });
}

export function resetPassword(
  userId: string,
  token: string,
  newPassword: string,
) {
  return apiJson<any>("/api/auth/reset-password", {
    method: "POST",
    json: { userId, token, newPassword },
  });
}

export function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("accessToken");
  localStorage.removeItem("jwt");
  localStorage.removeItem("tokenExpiry");
}

export function checkUserPassword(password: string) {
  return apiJson<any>("/api/user/check-password", {
    method: "POST",
    json: { password },
  });
}

export function changeMyPassword(newPassword: string) {
  return apiJson<any>("/api/user/me/change-password", {
    method: "PUT",
    json: { newPassword },
  });
}

export function addMyEmail(email: string) {
  return apiJson<any>("/api/user/me/add-email", {
    method: "POST",
    json: { email },
  });
}

export function confirmMyEmail(userId: string, token: string) {
  const query = new URLSearchParams({ userId, token }).toString();
  return apiJson<any>(`/api/user/me/confirm-email?${query}`, {
    method: "GET",
  });
}
