import {
  BASE_URL,
  apiForm,
  apiJson,
  authHeader,
  extractFileNameFromDisposition,
  fetchOrThrow,
  toArray,
  unwrapApiResult,
} from "./core";
import type {
  LibraryBook,
  LibraryBookFormat,
  LibraryBookMutationInput,
  LibraryBooksQuery,
  LibraryBooksResult,
  LibraryBookStatus,
} from "../types/library";

const LIBRARY_BOOKS_PATH = "/api/library/books";

function normalizeStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function normalizeFormat(value: unknown): LibraryBookFormat {
  const normalized = String(value ?? "").toLowerCase();
  return normalized === "pdf" ? "pdf" : "other";
}

function normalizeStatus(value: unknown): LibraryBookStatus {
  const normalized = String(value ?? "").toLowerCase();
  if (
    normalized === "available" ||
    normalized === "draft" ||
    normalized === "archived"
  ) {
    return normalized;
  }
  return "available";
}

function inferFormat(raw: any): LibraryBookFormat {
  const explicit = raw?.format ?? raw?.bookFormat ?? raw?.fileFormat;
  if (explicit) return normalizeFormat(explicit);

  const fileName = String(raw?.fileName ?? raw?.name ?? "").toLowerCase();
  const extension = fileName.split(".").pop();
  return normalizeFormat(extension);
}

function mapLibraryBook(raw: any): LibraryBook {
  const id = raw?.id ?? raw?.bookId ?? raw?.libraryBookId ?? "";

  return {
    id: String(id),
    title: String(raw?.title ?? raw?.name ?? ""),
    authors: normalizeStringArray(raw?.authors ?? raw?.authorNames ?? raw?.author),
    description: raw?.description ?? raw?.summary ?? "",
    isbn: raw?.isbn ?? raw?.ISBN ?? "",
    category: String(raw?.category ?? raw?.subjectArea ?? "General"),
    language: String(raw?.language ?? "English"),
    publisher: raw?.publisher ?? "",
    publishedYear:
      raw?.publishedYear ?? raw?.publicationYear ?? raw?.year ?? undefined,
    edition: raw?.edition ?? "",
    tags: normalizeStringArray(raw?.tags ?? raw?.keywords),
    format: inferFormat(raw),
    status: normalizeStatus(raw?.status ?? raw?.availabilityStatus),
    coverImageUrl: raw?.coverImageUrl ?? raw?.coverUrl ?? raw?.thumbnailUrl ?? "",
    fileName: raw?.fileName ?? raw?.originalFileName ?? "",
    fileSizeBytes: Number(raw?.fileSizeBytes ?? raw?.sizeBytes ?? 0),
    fileContentType: raw?.fileContentType ?? raw?.contentType ?? "",
    fileUrl: raw?.fileUrl ?? raw?.readUrl ?? "",
    viewCount: Number(raw?.viewCount ?? raw?.reads ?? 0),
    createdById: raw?.createdById ?? raw?.uploadedById ?? "",
    createdByFullName: raw?.createdByFullName ?? raw?.uploadedByFullName ?? "",
    createdAt: raw?.createdAt ?? raw?.uploadedAt ?? "",
    updatedAt: raw?.updatedAt ?? "",
  };
}

function appendOptional(form: FormData, key: string, value: unknown) {
  if (value === undefined || value === null || value === "") return;
  form.append(key, String(value));
}

function buildBookForm(input: LibraryBookMutationInput): FormData {
  const form = new FormData();

  form.append("title", input.title);
  input.authors.forEach((author) => form.append("authors", author));
  appendOptional(form, "description", input.description);
  appendOptional(form, "isbn", input.isbn);
  form.append("category", input.category);
  form.append("language", input.language);
  appendOptional(form, "publisher", input.publisher);
  appendOptional(form, "publishedYear", input.publishedYear);
  appendOptional(form, "edition", input.edition);
  input.tags.forEach((tag) => form.append("tags", tag));
  form.append("status", input.status);

  if (input.bookFile) form.append("bookFile", input.bookFile);
  if (input.coverImage) form.append("coverImage", input.coverImage);

  return form;
}

export async function listLibraryBooks(
  query: LibraryBooksQuery = {},
): Promise<LibraryBooksResult> {
  const search = new URLSearchParams();

  if (query.query) search.set("query", query.query);
  if (query.category && query.category !== "all") {
    search.set("category", query.category);
  }
  if (query.status && query.status !== "all") search.set("status", query.status);
  search.set("page", String(query.page ?? 1));
  search.set("pageSize", String(query.pageSize ?? 48));

  const raw = await apiJson<any>(`${LIBRARY_BOOKS_PATH}?${search.toString()}`);
  const data = unwrapApiResult<any>(raw);
  const source = data?.items ?? data?.Items ?? data;
  const items = toArray(source).map(mapLibraryBook);

  return {
    items,
    page: Number(data?.page ?? data?.Page ?? query.page ?? 1),
    pageSize: Number(data?.pageSize ?? data?.PageSize ?? query.pageSize ?? 48),
    totalCount: Number(
      data?.totalCount ?? data?.TotalCount ?? data?.count ?? items.length,
    ),
    totalPages: Number(data?.totalPages ?? data?.TotalPages ?? 1),
  };
}

export async function getLibraryBook(id: string): Promise<LibraryBook> {
  const raw = await apiJson<any>(
    `${LIBRARY_BOOKS_PATH}/${encodeURIComponent(id)}`,
  );
  return mapLibraryBook(unwrapApiResult(raw));
}

export function createLibraryBook(input: LibraryBookMutationInput) {
  return apiForm<any>(LIBRARY_BOOKS_PATH, buildBookForm(input));
}

export function updateLibraryBook(id: string, input: LibraryBookMutationInput) {
  return apiForm<any>(
    `${LIBRARY_BOOKS_PATH}/${encodeURIComponent(id)}`,
    buildBookForm(input),
    { method: "PUT" },
  );
}

export function deleteLibraryBook(id: string) {
  return apiJson<any>(`${LIBRARY_BOOKS_PATH}/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export async function downloadLibraryBookFile(id: string): Promise<{
  blob: Blob;
  fileName: string;
  contentType: string;
}> {
  const resp = await fetchOrThrow(
    `${BASE_URL}${LIBRARY_BOOKS_PATH}/${encodeURIComponent(id)}/download`,
    { method: "GET", headers: authHeader() },
  );
  const blob = await resp.blob();
  const contentType =
    resp.headers.get("content-type") || "application/octet-stream";
  const fileName =
    extractFileNameFromDisposition(resp.headers.get("content-disposition")) ||
    `library-book-${id}`;

  return { blob, fileName, contentType };
}

function isHtmlResponse(contentType: string, blob: Blob): boolean {
  const normalized = contentType.toLowerCase();
  const blobType = blob.type.toLowerCase();

  return normalized.includes("text/html") || blobType.includes("text/html");
}

export async function readLibraryBookFile(id: string): Promise<{
  blob: Blob;
  contentType: string;
}> {
  const readUrl = `${BASE_URL}${LIBRARY_BOOKS_PATH}/${encodeURIComponent(id)}/read`;

  try {
    const resp = await fetch(readUrl, { method: "GET", headers: authHeader() });

    if (resp.ok) {
      const blob = await resp.blob();
      const contentType =
        resp.headers.get("content-type") ||
        blob.type ||
        "application/octet-stream";

      if (!isHtmlResponse(contentType, blob)) {
        return { blob, contentType };
      }
    }
  } catch {
    // Fall back to the download endpoint below.
  }

  const downloaded = await downloadLibraryBookFile(id);

  if (isHtmlResponse(downloaded.contentType, downloaded.blob)) {
    throw new Error(
      "The backend returned an HTML page instead of the uploaded book file.",
    );
  }

  return {
    blob: downloaded.blob,
    contentType: downloaded.contentType,
  };
}
