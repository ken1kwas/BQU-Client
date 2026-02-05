const BASE_URL =
  (import.meta as any).env?.VITE_API_BASE_URL || "http://localhost:5000";

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

async function parseError(resp: Response): Promise<string> {
  try {
    const ct = resp.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      const j = await resp.json();
      return j?.message || j?.error || JSON.stringify(j);
    }
    return await resp.text();
  } catch {
    return `HTTP ${resp.status}`;
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

export function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("accessToken");
  localStorage.removeItem("jwt");
  localStorage.removeItem("tokenExpiry");
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
  return apiJson<any>(`/api/students/grades/${encodeURIComponent(scope)}`);
}

export function markStudentAbsence(
  studentId: string,
  classId: string,
) {
  return apiJson<any>(
    `/api/students/${encodeURIComponent(studentId)}/classes/${encodeURIComponent(classId)}/mark-absence`,
    { method: "PUT" },
  );
}

export function createIndependentWork(
  studentId: string,
  taughtSubjectId: string,
  dueDate: string,
) {
  return apiJson<any>(
    `/api/independent-works`,
    {
      method: "POST",
      json: {
        studentId,
        taughtSubjectId,
        dueDate
      }
    },
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
  studentId: string,
  independentWorkId: string,
  isPassed: boolean | null,
) {
  const q = new URLSearchParams();
  // Only add isPassed parameter if it's not null (neutral state)
  if (isPassed !== null) {
    q.set("isPassed", String(isPassed));
  }
  const queryString = q.toString();
  const url = `/api/students/${encodeURIComponent(studentId)}/independent-works/${encodeURIComponent(independentWorkId)}/grade${queryString ? `?${queryString}` : ''}`;
  return apiJson<any>(url, { method: "PUT" });
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
export async function listRooms(page = 1, pageSize = 100) {
  const raw = await apiJson<any>(`/api/rooms?page=${page}&pageSize=${pageSize}`);
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
  const raw = await apiJson<any>(`/api/groups?page=${page}&pageSize=${pageSize}`);
  return unwrapApiResult(raw);
}

export async function getGroup(id: string) {
  const raw = await apiJson<any>(`/api/groups/${encodeURIComponent(id)}`);
  return unwrapApiResult(raw);
}

export async function getGroupSchedule(id: string) {
  const raw = await apiJson<any>(`/api/groups/${encodeURIComponent(id)}/schedule`);
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

// -------------------- STUDENTS --------------------
export async function listStudents(page = 1, pageSize = 100) {
  const raw = await apiJson<any>(`/api/students?page=${page}&pageSize=${pageSize}`);
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
  const url = queryString ? `/api/students/filter-by?${queryString}` : `/api/students/filter-by`;
  const raw = await apiJson<any>(url);
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
  const raw = await apiJson<any>(`/api/teachers?page=${page}&pageSize=${pageSize}`);
  return unwrapApiResult(raw);
}

export function listTeacherCourses() {
  return apiJson<any>("/api/teachers/courses");
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
  const raw = await apiJson<any>(`/api/departments?page=${page}&pageSize=${pageSize}`);
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
  const raw = await apiJson<any>(`/api/taught-subjects?page=${page}&pageSize=${pageSize}`);
  return unwrapApiResult(raw);
}

export async function getTaughtSubject(id: string) {
  const raw = await apiJson<any>(`/api/taught-subjects/${encodeURIComponent(id)}`);
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

// -------------------- COLLOQUIUMS --------------------
export function createColloquium(req: {
  taughtSubjectId: string;
  studentId: string;
  date: string;
  grade: number | null;
}) {
  return apiJson<any>("/api/colloquiums", { method: "POST", json: req });
}

// -------------------- SEMINARS --------------------
export function createSeminar(req: { studentId: string; taughtSubjectId: string }) {
  return apiJson<any>(
    `/api/seminars/${encodeURIComponent(req.studentId)}/${encodeURIComponent(req.taughtSubjectId)}`,
    { method: "POST" },
  ).catch((error: any) => {
    const message = String(error?.message ?? error ?? "");
    if (message.includes("404")) {
      return apiJson<any>(`/api/seminars`, {
        method: "POST",
        json: {
          studentId: req.studentId,
          taughtSubjectId: req.taughtSubjectId,
        },
      });
    }
    throw error;
  });
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

export function deleteSyllabusFile(id: string) {
  return apiJson<any>(`/api/syllabus/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
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
