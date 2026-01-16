// src/api/bgu.ts
const BASE_URL =
    (import.meta as any).env?.VITE_API_BASE_URL || "http://localhost:5000";

function authHeader() {
    const token =
        localStorage.getItem("accessToken") ||
        localStorage.getItem("token") ||
        localStorage.getItem("jwt");
    return token ? { Authorization: `Bearer ${token}` } : {};
}

function getToken(): string | null {
    return (
        localStorage.getItem("accessToken") ||
        localStorage.getItem("token") ||
        localStorage.getItem("jwt") ||
        null
    );
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
        headers: {
            ...authHeader(),
        },
    });
    return await resp.blob();
}

export async function uploadStudentsExcel(file: File): Promise<any> {
    const formData = new FormData();
    formData.append("file", file);

    const resp = await fetchOrThrow(`${BASE_URL}/api/students/import`, {
        method: "POST",
        headers: {
            ...authHeader(),
            // НЕ ставь Content-Type
        },
        body: formData,
    });

    // импорт может вернуть json или текст — обработаем оба
    const ct = resp.headers.get("content-type") || "";
    if (ct.includes("application/json")) return await resp.json();
    return await resp.text();
}

function buildHeaders(extra?: HeadersInit): HeadersInit {
    const token = getToken();
    return {
        ...(token ? {Authorization: `Bearer ${token}`} : {}),
        ...(extra || {}),
    };
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
    init?: RequestInit & { json?: any }
): Promise<T> {
    const url = `${BASE_URL}${path}`;
    const headers: HeadersInit = buildHeaders({
        "Content-Type": "application/json",
        ...(init?.headers || {}),
    });

    const resp = await fetch(url, {
        ...init,
        headers,
        body: init?.json !== undefined ? JSON.stringify(init.json) : init?.body,
    });

    if (!resp.ok) {
        throw new Error(await parseError(resp));
    }

    if (resp.status === 204) return undefined as unknown as T;

    const ct = resp.headers.get("content-type") || "";
    if (!ct.includes("application/json")) {
        // если вдруг бэк вернёт не json
        return (await resp.text()) as unknown as T;
    }

    return (await resp.json()) as T;
}

export async function apiForm<T>(path: string, form: FormData, init?: RequestInit): Promise<T> {
    const url = `${BASE_URL}${path}`;
    const resp = await fetch(url, {
        method: "POST",
        ...init,
        headers: buildHeaders(init?.headers),
        body: form,
    });

    if (!resp.ok) throw new Error(await parseError(resp));

    const ct = resp.headers.get("content-type") || "";
    if (ct.includes("application/json")) return (await resp.json()) as T;
    return (await resp.text()) as unknown as T;
}

export function toArray<T = any>(resp: any): T[] {
    if (Array.isArray(resp)) return resp;
    if (resp?.items && Array.isArray(resp.items)) return resp.items;
    if (resp?.data && Array.isArray(resp.data)) return resp.data;
    return [];
}

// -------------------- AUTH --------------------
export function signIn(username: string, password: string) {
    // /api/user/signin есть в доке  [oai_citation:5‡bgu-api(5).json](sediment://file_000000005bd071f5868bea68993d4c7f)
    return apiJson<any>("/api/user/signin", {method: "POST", json: {username, password}});
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

export async function getStudentProfile() {
    return apiJson<any>("/api/students/profile");
}

// Dean endpoints
export async function getDeanProfile() {
    return apiJson<any>("/api/deans/profile");
}

// Teacher endpoints
export async function getTeacherProfile() {
    return apiJson<any>("/api/teachers/profile");
}

// -------------------- ROOMS --------------------
export function listRooms(page = 1, pageSize = 100) {
    return apiJson<any>(`/api/rooms?page=${page}&pageSize=${pageSize}`);
}

export function createRoom(req: { roomName: string; capacity: number }) {
    return apiJson<any>("/api/rooms", {method: "POST", json: req});
}

export function updateRoom(id: string, req: { name: string; capacity: number }) {
    return apiJson<any>(`/api/rooms/${id}`, {method: "PUT", json: req});
}

export function deleteRoom(id: string) {
    return apiJson<any>(`/api/rooms/${id}`, {method: "DELETE"});
}

// -------------------- GROUPS --------------------
export function listGroups(page = 1, pageSize = 100) {
    return apiJson<any>(`/api/groups?page=${page}&pageSize=${pageSize}`);
}

export function createGroup(req: {
    groupCode: string;
    specializationId: string;
    year: number;
    educationLanguage: number;
    educationLevel: number;
}) {
    return apiJson<any>("/api/groups", {method: "POST", json: req});
}

export function updateGroup(id: string, req: { groupCode: string; specialisationId: string; year: number }) {
    return apiJson<any>(`/api/groups/${id}`, {method: "PUT", json: req});
}

export function deleteGroup(id: string) {
    return apiJson<any>(`/api/groups/${id}`, {method: "DELETE"});
}

// -------------------- STUDENTS --------------------
export function listStudents(page = 1, pageSize = 100) {
    return apiJson<any>(`/api/students?page=${page}&pageSize=${pageSize}`);
}

export function searchStudents(searchText: string) {
    return apiJson<any>(`/api/students/search?searchText=${encodeURIComponent(searchText)}`);
}

export function filterStudents(groupId?: string, year?: number) {
    const qs = new URLSearchParams();
    if (groupId) qs.set("groupId", groupId);
    if (year !== undefined) qs.set("year", String(year));
    return apiJson<any>(`/api/students/filter-by?${qs.toString()}`);
}

export function createStudent(req: {
    name: string;
    surname: string;
    middleName: string;
    userName: string;
    gender: string; // char
    groupName: string;
    decreeNumber: number;
    admissionScore: number;
    formOfEducation: number;
}) {
    // StudentDto required поля  [oai_citation:6‡bgu-api(5).json](sediment://file_000000005bd071f5868bea68993d4c7f)
    return apiJson<any>("/api/students", {method: "POST", json: req});
}

export function importStudentsExcel(file: File) {
    const form = new FormData();
    form.append("file", file);
    return apiForm<any>("/api/students/import", form);
}

// -------------------- TEACHERS --------------------
export function listTeachers(page = 1, pageSize = 100) {
    return apiJson<any>(`/api/teachers?page=${page}&pageSize=${pageSize}`);
}

export function getTeacher(id: string) {
    return apiJson<any>(`/api/teachers/${id}`);
}

export function updateTeacher(id: string, req: { name: string; surname: string; departmentId: string }) {
    // UpdateTeacherRequest required поля  [oai_citation:7‡bgu-api(5).json](sediment://file_000000005bd071f5868bea68993d4c7f)
    return apiJson<any>(`/api/teachers/${id}`, {method: "PUT", json: req});
}

export function deleteTeacher(id: string) {
    return apiJson<any>(`/api/teachers/${id}`, {method: "DELETE"});
}

export function importTeachersExcel(file: File) {
    const form = new FormData();
    form.append("file", file);
    return apiForm<any>("/api/teachers/import", form);
}

// -------------------- DEPARTMENTS / SPECIALIZATIONS --------------------
export function listDepartments(page = 1, pageSize = 100) {
    return apiJson<any>(`/api/departments?page=${page}&pageSize=${pageSize}`);
}

export function listSpecializations(page = 1, pageCount = 100) {
    // в доке query param именно pageCount
    return apiJson<any>(`/api/specializations?page=${page}&pageCount=${pageCount}`);
}

// -------------------- TAUGHT SUBJECTS (COURSES) --------------------
export function listTaughtSubjects(page = 1, pageSize = 100) {
    return apiJson<any>(`/api/taught-subjects?page=${page}&pageSize=${pageSize}`);
}

export function createTaughtSubject(req: {
    code: string;
    title: string;
    departmentId: string;
    teacherId: string;
    groupId: string;
    credits: number;
    hours: number;
    classTimes: Array<{ start: string; end: string; day: number; room: string; frequency: number }>;
    year: number;
    semster: number; // да, так в доке  [oai_citation:8‡bgu-api(5).json](sediment://file_000000005bd071f5868bea68993d4c7f)
}) {
    return apiJson<any>("/api/taught-subjects", {method: "POST", json: req});
}

export function updateTaughtSubject(id: string, req: {
    code: string;
    title: string;
    credits: number;
    departmentId: string;
    teacherId: string;
    groupId: string;
}) {
    return apiJson<any>(`/api/taught-subjects/${id}`, {method: "PUT", json: req});
}

export function deleteTaughtSubject(id: string) {
    return apiJson<any>(`/api/taught-subjects/${id}`, {method: "DELETE"});
}

// -------------------- helpers --------------------
export function ensureHHMMSS(v: string): string {
    // принимает "8:30" / "08:30" / "08:30:00" -> "08:30:00"
    const s = (v || "").trim();
    if (!s) return "00:00:00";
    const parts = s.split(":");
    const hh = (parts[0] || "0").padStart(2, "0");
    const mm = (parts[1] || "0").padStart(2, "0");
    const ss = (parts[2] || "0").padStart(2, "0");
    return `${hh}:${mm}:${ss}`;
}