import { apiJson } from "./core";

export async function getStudentProfile() {
  return apiJson<any>("/api/students/profile");
}

export async function getDeanProfile() {
  return apiJson<any>("/api/deans/profile");
}

export async function getTeacherProfile() {
  return apiJson<any>("/api/teachers/profile");
}
