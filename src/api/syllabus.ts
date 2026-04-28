import {
  BASE_URL,
  apiForm,
  apiJson,
  authHeader,
  extractFileNameFromDisposition,
  fetchOrThrow,
} from "./core";

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
