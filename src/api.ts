const BASE_URL =
  (import.meta as any).env?.VITE_API_BASE_URL ||
  // "http://localhost:5000" ||
  "https://localhost:7085";

function getToken(): string | null {
  return (
    localStorage.getItem("accessToken") ||
    localStorage.getItem("token") ||
    localStorage.getItem("jwt") ||
    null
  );
}

function authHeader(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function extractFileNameFromDisposition(
  disposition: string | null,
): string | null {
  if (!disposition) return null;
  const utfMatch = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utfMatch?.[1]) {
    try {
      return decodeURIComponent(utfMatch[1]);
    } catch {
      return utfMatch[1];
    }
  }
  const match = disposition.match(/filename=\"?([^\";]+)\"?/i);
  return match?.[1] ?? null;
}

async function fetchOrThrow(input: RequestInfo, init?: RequestInit) {
  const resp = await fetch(input, init);
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(text || `HTTP ${resp.status}`);
  }
  return resp;
}

export async function downloadStudentsTemplate(): Promise<Blob> {
  const resp = await fetchOrThrow(`${BASE_URL}/api/students/template`, {
    method: "GET",
    headers: authHeader(),
  });
  return await resp.blob();
}

export async function uploadStudentsExcel(file: File): Promise<any> {
  const formData = new FormData();
  formData.append("file", file);

  const url = `${BASE_URL}/api/students/import`;
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const resp = await fetch(url, {
    method: "POST",
    headers,
    body: formData,
  });

  if (!resp.ok) {
    const errorText = await parseError(resp);
    throw new Error(errorText);
  }

  const ct = (resp.headers.get("content-type") || "").toLowerCase();
  if (ct.includes("application/json")) {
    return await resp.json();
  }
  if (
    ct.includes(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ) ||
    ct.includes("application/vnd.ms-excel") ||
    ct.includes("application/octet-stream") ||
    ct.includes("application/x-msdownload")
  ) {
    return await resp.blob();
  }

  const text = await resp.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function buildHeaders(extra?: Record<string, string>): Record<string, string> {
  const token = getToken();
  const headers: Record<string, string> = { ...(extra || {}) };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

function normalizeErrorValue(value: unknown): string | null {
  if (value == null) return null;

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;

    if (
      (trimmed.startsWith("[") && trimmed.endsWith("]")) ||
      (trimmed.startsWith("{") && trimmed.endsWith("}"))
    ) {
      try {
        const parsed = JSON.parse(trimmed);
        const normalized = normalizeErrorValue(parsed);
        if (normalized) return normalized;
      } catch {
        // Keep the original string when it is not valid JSON.
      }
    }

    return trimmed;
  }

  if (Array.isArray(value)) {
    const parts = value
      .map((item) => normalizeErrorValue(item))
      .filter((item): item is string => Boolean(item));
    if (!parts.length) return null;
    return [...new Set(parts)].join(" ");
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const directMessage =
      normalizeErrorValue(record.responseMessage) ??
      normalizeErrorValue(record.ResponseMessage) ??
      normalizeErrorValue(record.errorMessage) ??
      normalizeErrorValue(record.ErrorMessage) ??
      normalizeErrorValue(record.message) ??
      normalizeErrorValue(record.Message) ??
      normalizeErrorValue(record.error) ??
      normalizeErrorValue(record.Error);

    if (directMessage) return directMessage;

    if (record.errors && typeof record.errors === "object") {
      const nestedErrors = Object.entries(
        record.errors as Record<string, unknown>,
      )
        .map(([key, val]) => {
          const normalized = normalizeErrorValue(val);
          if (!normalized) return null;
          return /^\d+$/.test(key) ? normalized : `${key}: ${normalized}`;
        })
        .filter((item): item is string => Boolean(item));

      if (nestedErrors.length) return nestedErrors.join(" ");
    }

    const title =
      normalizeErrorValue(record.title) ?? normalizeErrorValue(record.detail);
    if (title) return title;

    const values = Object.values(record)
      .map((item) => normalizeErrorValue(item))
      .filter((item): item is string => Boolean(item));

    if (values.length) return [...new Set(values)].join(" ");
  }

  return String(value).trim() || null;
}

async function parseError(resp: Response): Promise<string> {
  try {
    const ct = resp.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      const j = await resp.json();
      return normalizeErrorValue(j) ?? `HTTP ${resp.status} ${resp.statusText}`;
    }

    const text = await resp.text();
    return (
      normalizeErrorValue(text) ?? `HTTP ${resp.status} ${resp.statusText}`
    );
  } catch {
    return `HTTP ${resp.status} ${resp.statusText}`;
  }
}

export async function apiJson<T>(
  path: string,
  init?: RequestInit & { json?: any },
): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const headers: Record<string, string> = buildHeaders({
    "Content-Type": "application/json",
    ...((init?.headers as Record<string, string>) || {}),
  });

  const resp = await fetch(url, {
    ...init,
    headers,
    body: init?.json !== undefined ? JSON.stringify(init.json) : init?.body,
  });

  if (!resp.ok) {
    const errorText = await parseError(resp);
    throw new Error(errorText);
  }

  if (resp.status === 204) return null as T;

  const ct = resp.headers.get("content-type") || "";
  if (!ct.includes("application/json")) {
    return (await resp.text()) as unknown as T;
  }

  return (await resp.json()) as T;
}

function unwrapApiResult<T = any>(resp: any): T {
  if (resp == null || typeof resp !== "object") return resp as T;
  if (resp.data !== undefined) return resp.data as T;
  return resp as T;
}

export async function apiForm<T>(
  path: string,
  form: FormData,
  init?: RequestInit,
): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const resp = await fetch(url, {
    method: "POST",
    ...init,
    headers: buildHeaders(init?.headers as Record<string, string>),
    body: form,
  });

  if (!resp.ok) throw new Error(await parseError(resp));

  const ct = resp.headers.get("content-type") || "";
  if (ct.includes("application/json")) return (await resp.json()) as T;
  return (await resp.text()) as unknown as T;
}

export function toArray<T = any>(resp: any): T[] {
  if (Array.isArray(resp)) return resp;
  if (!resp || typeof resp !== "object") return [];

  const candidates = [
    "items",
    "data",
    "result",
    "results",
    "value",
    "values",
    "records",
    "entities",
    "content",
    "list",
  ];

  const seen = new Set<any>();
  const queue: any[] = [resp];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || typeof current !== "object" || seen.has(current)) {
      continue;
    }
    seen.add(current);

    if (Array.isArray(current)) return current as T[];

    for (const key of candidates) {
      const val = (current as any)[key];
      if (Array.isArray(val)) return val as T[];
      if (val && typeof val === "object") queue.push(val);
    }

    for (const key of Object.keys(current as Record<string, unknown>)) {
      const val = (current as any)[key];
      if (Array.isArray(val)) return val as T[];
      if (val && typeof val === "object") queue.push(val);
    }
  }

  return [];
}

// -------------------- AUTH --------------------
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

export async function getStudentDashboard() {
  return apiJson<any>("/api/students/dashboard");
}

export async function getStudentSchedule(scope: string) {
  return apiJson<any>(`/api/students/schedule/${encodeURIComponent(scope)}`);
}

export async function getTeacherSchedule(scope: string) {
  return apiJson<any>(`/api/teachers/schedule/${encodeURIComponent(scope)}`);
}

export async function getStudentGrades(scope: string) {
  const qs = new URLSearchParams();
  if (scope) qs.set("grade", scope);
  const suffix = qs.toString();
  const url = suffix
    ? `/api/students/me/grades?${suffix}`
    : `/api/students/me/grades`;
  return apiJson<any>(url);
}

export async function getStudentAcademicHistory() {
  return apiJson<any>("/api/students/me/academic-history");
}

export function markStudentAbsence(studentId: string, classId: string) {
  return apiJson<any>(
    `/api/students/${encodeURIComponent(studentId)}/classes/${encodeURIComponent(classId)}/mark-absence`,
    { method: "PUT" },
  );
}

export async function getIndependentWorkByStudentAndSubject(
  studentId: string,
  taughtSubjectId: string,
) {
  const raw = await apiJson<any>(
    `/api/students/${encodeURIComponent(studentId)}/taught-subjects/${encodeURIComponent(taughtSubjectId)}/independent-works`,
    { method: "GET" },
  );
  return unwrapApiResult(raw);
}

export function markIndependentWorkGrade(
  independentWorkId: string,
  grade: number | null,
) {
  return apiJson<any>(
    `/api/independent-works/${encodeURIComponent(independentWorkId)}/grade`,
    {
      method: "PUT",
      json: { grade },
    },
  );
}

export async function getStudentProfile() {
  return apiJson<any>("/api/students/profile");
}

export async function getDeanProfile() {
  return apiJson<any>("/api/deans/profile");
}

export async function getTeacherProfile() {
  return apiJson<any>("/api/teachers/profile");
}

// -------------------- ROOMS --------------------
export async function listRooms(page = 1, pageSize = 110) {
  const raw = await apiJson<any>(
    `/api/rooms?page=${page}&pageSize=${pageSize}`,
  );
  return unwrapApiResult(raw);
}

export function createRoom(req: { roomName: string; capacity: number }) {
  return apiJson<any>("/api/rooms", { method: "POST", json: req });
}

export function updateRoom(
  id: string,
  req: { name: string; capacity: number },
) {
  return apiJson<any>(`/api/rooms/${id}`, { method: "PUT", json: req });
}

export function deleteRoom(id: string) {
  return apiJson<any>(`/api/rooms/${id}`, { method: "DELETE" });
}

// -------------------- GROUPS --------------------
export async function listGroups(page = 1, pageSize = 100) {
  const raw = await apiJson<any>(
    `/api/groups?page=${page}&pageSize=${pageSize}`,
  );
  return unwrapApiResult(raw);
}

export async function getGroup(id: string) {
  const raw = await apiJson<any>(`/api/groups/${encodeURIComponent(id)}`);
  return unwrapApiResult(raw);
}

export async function getGroupSchedule(id: string) {
  const raw = await apiJson<any>(
    `/api/groups/${encodeURIComponent(id)}/schedule`,
  );
  return unwrapApiResult(raw);
}

export function createGroup(req: {
  groupCode: string;
  specializationId: string;
  year: number;
  educationLanguage: number;
  educationLevel: number;
}) {
  return apiJson<any>("/api/groups", { method: "POST", json: req });
}

export function updateGroup(
  id: string,
  req: {
    groupCode: string;
    specializationId: string;
    year: number;
  },
) {
  return apiJson<any>(`/api/groups/${id}`, { method: "PUT", json: req });
}

export function deleteGroup(id: string) {
  return apiJson<any>(`/api/groups/${id}`, { method: "DELETE" });
}

export async function setGroupExamDate(
  groupId: string,
  date: string,
): Promise<void> {
  await apiJson<null>("/api/groups/set-exam-date", {
    method: "PUT",
    json: { groupId, date },
  });
}

// -------------------- STUDENTS --------------------
export async function listStudents(page = 1, pageSize = 100) {
  const raw = await apiJson<any>(
    `/api/students?page=${page}&pageSize=${pageSize}`,
  );
  return unwrapApiResult(raw);
}

export async function searchStudents(searchText: string) {
  const raw = await apiJson<any>(
    `/api/students/search?searchText=${encodeURIComponent(searchText)}`,
  );
  return unwrapApiResult(raw);
}

export async function filterStudents(groupId?: string, year?: number) {
  const qs = new URLSearchParams();
  if (groupId) qs.set("groupId", groupId);
  if (year !== undefined) qs.set("year", String(year));
  const queryString = qs.toString();
  const url = queryString
    ? `/api/students/filter-by?${queryString}`
    : `/api/students/filter-by`;
  const raw = await apiJson<any>(url);
  return unwrapApiResult(raw);
}

export async function getStudentById(id: string | number) {
  const raw = await apiJson<any>(`/api/students/${encodeURIComponent(String(id))}`);
  return unwrapApiResult(raw);
}

export function createStudent(req: {
  name: string;
  surname: string;
  middleName: string;
  userName: string;
  gender: string;
  groupName: string;
  decreeNumber: number;
  admissionScore: number;
  formOfEducation: number;
}) {
  return apiJson<any>("/api/students", { method: "POST", json: req });
}

export function importStudentsExcel(file: File) {
  const form = new FormData();
  form.append("file", file);
  return apiForm<any>("/api/students/import", form);
}

// -------------------- TEACHERS --------------------
export async function listTeachers(page = 1, pageSize = 100) {
  const raw = await apiJson<any>(
    `/api/teachers?page=${page}&pageSize=${pageSize}`,
  );
  return unwrapApiResult(raw);
}

export function listTeacherCourses() {
  return apiJson<any>("/api/teachers/courses");
}

export type TeacherFinalExamDto = {
  id: string;
  studentId: string;
  studentFullName: string;
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  groupId: string;
  groupCode: string;
  grade: number | null;
  formattedDate: string | null;
};

export async function listTeacherFinalExams(): Promise<TeacherFinalExamDto[]> {
  const raw = await apiJson<any>("/api/teachers/me/exams");
  const inner = unwrapApiResult<any>(raw);
  const exams = Array.isArray(inner?.exams)
    ? inner.exams
    : Array.isArray(inner)
      ? inner
      : [];

  return exams.map((exam: any) => ({
    id: String(exam?.id ?? exam?.Id ?? ""),
    studentId: String(exam?.studentId ?? exam?.StudentId ?? ""),
    studentFullName: String(
      exam?.studentFullName ?? exam?.StudentFullName ?? "",
    ),
    subjectId: String(exam?.subjectId ?? exam?.SubjectId ?? ""),
    subjectName: String(exam?.subjectName ?? exam?.SubjectName ?? ""),
    subjectCode: String(exam?.subjectCode ?? exam?.SubjectCode ?? ""),
    groupId: String(exam?.groupId ?? exam?.GroupId ?? ""),
    groupCode: String(exam?.groupCode ?? exam?.GroupCode ?? ""),
    grade:
      typeof (exam?.grade ?? exam?.Grade) === "number"
        ? Number(exam?.grade ?? exam?.Grade)
        : null,
    formattedDate:
      typeof (exam?.formattedDate ?? exam?.FormattedDate) === "string"
        ? String(exam?.formattedDate ?? exam?.FormattedDate)
        : null,
  }));
}

export function getTeacher(id: string) {
  return apiJson<any>(`/api/teachers/${id}`);
}

export function updateTeacher(
  id: string,
  req: { name: string; surname: string; departmentId: string },
) {
  return apiJson<any>(`/api/teachers/${id}`, { method: "PUT", json: req });
}

export function deleteTeacher(id: string) {
  return apiJson<any>(`/api/teachers/${id}`, { method: "DELETE" });
}

export async function importTeachersExcel(file: File): Promise<any> {
  const formData = new FormData();
  formData.append("file", file);

  const url = `${BASE_URL}/api/teachers/import`;
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const resp = await fetch(url, {
    method: "POST",
    headers,
    body: formData,
  });

  if (!resp.ok) {
    const errorText = await parseError(resp);
    throw new Error(errorText);
  }

  const ct = (resp.headers.get("content-type") || "").toLowerCase();
  if (ct.includes("application/json")) {
    return await resp.json();
  }
  if (
    ct.includes(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ) ||
    ct.includes("application/vnd.ms-excel") ||
    ct.includes("application/octet-stream") ||
    ct.includes("application/x-msdownload")
  ) {
    return await resp.blob();
  }

  const text = await resp.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

// -------------------- DEPARTMENTS / SPECIALIZATIONS --------------------
export async function listDepartments(page = 1, pageSize = 100) {
  const raw = await apiJson<any>(
    `/api/departments?page=${page}&pageSize=${pageSize}`,
  );
  return unwrapApiResult(raw);
}

export async function listSpecializations(page = 1, pageCount = 100) {
  const raw = await apiJson<any>(
    `/api/specializations?page=${page}&pageCount=${pageCount}`,
  );
  return unwrapApiResult(raw);
}

// -------------------- TAUGHT SUBJECTS (COURSES) --------------------
export async function listTaughtSubjects(page = 1, pageSize = 100) {
  const raw = await apiJson<any>(
    `/api/taught-subjects?page=${page}&pageSize=${pageSize}`,
  );
  return unwrapApiResult(raw);
}

export async function getTaughtSubject(id: string) {
  const raw = await apiJson<any>(
    `/api/taught-subjects/${encodeURIComponent(id)}`,
  );
  return unwrapApiResult(raw);
}

export async function listTaughtSubjectStudents(id: string) {
  const raw = await apiJson<any>(
    `/api/taught-subjects/${encodeURIComponent(id)}/students`,
  );
  return unwrapApiResult(raw);
}

export async function listTaughtSubjectColloquiums(id: string) {
  const raw = await apiJson<any>(
    `/api/taught-subjects/${encodeURIComponent(id)}/colloquiums`,
  );
  return unwrapApiResult(raw);
}

export async function listTaughtSubjectClasses(id: string) {
  const raw = await apiJson<any>(
    `/api/taught-subjects/${encodeURIComponent(id)}/classes`,
  );
  return unwrapApiResult(raw);
}

export async function listTaughtSubjectIndependentWorks(id: string) {
  const raw = await apiJson<any>(
    `/api/taught-subjects/${encodeURIComponent(id)}/IndependendWorks`,
  );
  return unwrapApiResult(raw);
}

export function createTaughtSubject(req: {
  code: string;
  title: string;
  departmentId: string;
  teacherId: string;
  groupId: string;
  credits: number;
  hours: number;
  classTimes: Array<{
    start: string;
    end: string;
    day: number;
    room: string;
    frequency: number;
    classType: number | null;
  }>;
  year: number;
  semester: number;
}) {
  return apiJson<any>("/api/taught-subjects", { method: "POST", json: req });
}

export function updateTaughtSubject(
  id: string,
  req: {
    code: string;
    title: string;
    credits: number;
    departmentId: string;
    teacherId: string;
    groupId: string;
  },
) {
  return apiJson<any>(`/api/taught-subjects/${id}`, {
    method: "PUT",
    json: req,
  });
}

export function deleteTaughtSubject(id: string) {
  return apiJson<any>(`/api/taught-subjects/${id}`, { method: "DELETE" });
}

// -------------------- FINAL EXAMS --------------------
async function apiJsonWithFallback<T>(
  attempts: Array<{
    path: string;
    init?: RequestInit & { json?: any };
  }>,
): Promise<T> {
  let lastError: unknown = null;
  for (const attempt of attempts) {
    try {
      return await apiJson<T>(attempt.path, attempt.init);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError ?? new Error("Request failed");
}

export async function listFinalExams(options?: {
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  const search = options?.search ?? "";
  const page = options?.page ?? 1;
  const pageSize = options?.pageSize ?? 10;
  const query = new URLSearchParams({
    search,
    page: String(page),
    pageSize: String(pageSize),
  });
  const raw = await apiJson<any>(`/api/finals?${query.toString()}`);
  return unwrapApiResult(raw);
}

export function createFinalExam(req: {
  studentId: string;
  subjectId: string;
  date: string;
}) {
  return apiJson<any>("/api/finals", { method: "POST", json: req });
}

export type UpdateExamRequest = {
  studentId: string;
  taughtSubjectId: string;
  date: string;
  grade: number;
  isAllowed: boolean;
};

export type UpdateExamResponse = {
  id: string;
  studentId: string;
  taughtSubjectId: string;
  date: string | null;
  grade: number | null;
  isAllowed: boolean;
};

export async function setFinalExamTime(
  finalExamId: string,
  date: string,
): Promise<void> {
  const encodedId = encodeURIComponent(finalExamId);
  await apiJson<null>(`/api/finals/${encodedId}/set-time`, {
    method: "PUT",
    json: { id: finalExamId, date },
  });
}

export async function addFinalExamDate(
  finalExamId: string,
  date: string,
): Promise<void> {
  await setFinalExamTime(finalExamId, date);
}

export async function gradeFinalExam(
  finalExamId: string,
  grade: number,
): Promise<string> {
  const encodedId = encodeURIComponent(finalExamId);
  const raw = await apiJson<any>(`/api/finals/${encodedId}/grade`, {
    method: "PUT",
    json: grade,
  });
  const data = unwrapApiResult<any>(raw);
  return String(data ?? "");
}

export async function updateFinalExam(
  id: string,
  req: UpdateExamRequest,
): Promise<UpdateExamResponse> {
  const raw = await apiJson<any>(`/api/finals/${encodeURIComponent(id)}`, {
    method: "PUT",
    json: req,
  });
  const data = unwrapApiResult<any>(raw);
  return {
    id: String(data?.id ?? data?.Id ?? ""),
    studentId: String(data?.studentId ?? data?.StudentId ?? ""),
    taughtSubjectId: String(data?.taughtSubjectId ?? data?.TaughtSubjectId ?? ""),
    date:
      typeof (data?.date ?? data?.Date) === "string"
        ? (data?.date ?? data?.Date)
        : null,
    grade:
      typeof (data?.grade ?? data?.Grade) === "number"
        ? Number(data?.grade ?? data?.Grade)
        : null,
    isAllowed: Boolean(data?.isAllowed ?? data?.IsAllowed),
  };
}

export async function confirmFinalExamGrades(
  finalExamId: string,
): Promise<boolean> {
  const encodedId = encodeURIComponent(finalExamId);
  const raw = await apiJsonWithFallback<any>([
    {
      path: `/api/finals/${encodedId}/confirm`,
      init: { method: "PUT" },
    },
    {
      path: `/api/finals/${encodedId}/confirm-grades`,
      init: { method: "POST" },
    },
    {
      path: `/api/final-exams/${encodedId}/confirm-grades`,
      init: { method: "POST" },
    },
  ]);

  const isSucceeded =
    raw?.isSucceeded ?? raw?.IsSucceeded ?? raw?.success ?? raw?.Success;
  if (isSucceeded === false) {
    throw new Error(
      raw?.message ?? raw?.Message ?? "Failed to confirm final exam grades",
    );
  }

  const data = unwrapApiResult<boolean>(raw);
  return typeof data === "boolean" ? data : true;
}

// -------------------- COLLOQUIUMS --------------------
export function createColloquium(req: {
  taughtSubjectId: string;
  studentId: string;
  date: string;
  grade: number | null;
}) {
  return apiJson<any>("/api/colloquiums", { method: "POST", json: req });
}

export function updateSeminarGrade(
  studentId: string,
  seminarId: string,
  grade: number,
) {
  const q = new URLSearchParams({ grade: String(grade) });
  return apiJson<any>(
    `/api/students/${encodeURIComponent(studentId)}/seminars/${encodeURIComponent(seminarId)}/grade?${q}`,
    { method: "PUT" },
  );
}

export function deleteSeminar(id: string) {
  return apiJson<any>(`/api/seminars/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export function deleteColloquium(id: string) {
  return apiJson<any>(`/api/colloquiums/${id}`, { method: "DELETE" });
}

export function updateColloquiumGrade(
  studentId: string,
  colloquiumId: string,
  grade: number,
) {
  const q = new URLSearchParams({ grade: String(grade) });
  return apiJson<any>(
    `/api/students/${encodeURIComponent(studentId)}/colloquiums/${encodeURIComponent(colloquiumId)}/grade?${q}`,
    { method: "PUT" },
  );
}

// -------------------- SYLLABUS --------------------
export function uploadSyllabusFile(taughtSubjectId: string, file: File) {
  const form = new FormData();
  form.append("file", file);
  return apiForm<any>(
    `/api/syllabus/${encodeURIComponent(taughtSubjectId)}`,
    form,
  );
}

export function updateSyllabusFile(syllabusId: string, file: File) {
  const form = new FormData();
  form.append("file", file);
  return apiForm<any>(`/api/syllabus/${encodeURIComponent(syllabusId)}`, form, {
    method: "PUT",
  });
}

export function deleteSyllabusFile(taughtSubjectId: string) {
  return apiJson<any>(
    `/api/taught-subjects/${encodeURIComponent(taughtSubjectId)}/syllabus`,
    { method: "DELETE" },
  );
}

export async function downloadSyllabusFile(taughtSubjectId: string): Promise<{
  blob: Blob;
  fileName: string;
  contentType: string;
}> {
  const resp = await fetchOrThrow(
    `${BASE_URL}/api/taught-subjects/${encodeURIComponent(taughtSubjectId)}/syllabus`,
    { method: "GET", headers: authHeader() },
  );
  const blob = await resp.blob();
  const contentType = resp.headers.get("content-type") || "application/pdf";
  const fileName =
    extractFileNameFromDisposition(resp.headers.get("content-disposition")) ||
    `syllabus-${taughtSubjectId}.pdf`;
  return { blob, fileName, contentType };
}

// -------------------- helpers --------------------
export function ensureHHMMSS(v: string): string {
  const s = (v || "").trim();
  if (!s) return "00:00:00";
  const parts = s.split(":");
  const hh = (parts[0] || "0").padStart(2, "0");
  const mm = (parts[1] || "0").padStart(2, "0");
  const ss = (parts[2] || "0").padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}
