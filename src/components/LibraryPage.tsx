import {
  BookOpen,
  Calendar,
  Download,
  Eye,
  FileText,
  Filter,
  ImagePlus,
  Languages,
  LibraryBig,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Tags,
  Trash2,
  Upload,
  Users,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { toast } from "sonner";

import {
  createLibraryBook,
  deleteLibraryBook,
  downloadLibraryBookFile,
  listLibraryBooks,
  readLibraryBookFile,
  updateLibraryBook,
} from "../api";
import type {
  LibraryBook,
  LibraryBookMutationInput,
  LibraryBookStatus,
} from "../types/library";
import type { UserRole } from "../types/app";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Textarea } from "./ui/textarea";
import { DeleteConfirmationDialog } from "./ui/delete-confirmation-dialog";

type LibraryPageProps = {
  userRole: UserRole;
};

type BookFormState = {
  title: string;
  authorsText: string;
  description: string;
  isbn: string;
  category: string;
  language: string;
  publisher: string;
  publishedYear: string;
  edition: string;
  tagsText: string;
  status: LibraryBookStatus;
  bookFile: File | null;
  coverImage: File | null;
};

const EMPTY_FORM: BookFormState = {
  title: "",
  authorsText: "",
  description: "",
  isbn: "",
  category: "",
  language: "İngilis dili",
  publisher: "",
  publishedYear: "",
  edition: "",
  tagsText: "",
  status: "available",
  bookFile: null,
  coverImage: null,
};

const DEFAULT_CATEGORIES = [
  "Computer Science",
  "Business",
  "Mathematics",
  "Engineering",
  "Languages",
  "Research",
  "General",
];

const COVER_COLORS = [
  ["#0f172a", "#14b8a6"],
  ["#581c87", "#f97316"],
  ["#1e3a8a", "#84cc16"],
  ["#7f1d1d", "#38bdf8"],
  ["#064e3b", "#f59e0b"],
];

function splitList(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function fileSizeLabel(bytes?: number): string {
  if (!bytes) return "Fayl";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function mimeTypeForBook(book: LibraryBook, fallback: string): string {
  if (fallback && fallback !== "application/octet-stream") return fallback;

  switch (book.format) {
    case "pdf":
      return "application/pdf";
    default:
      return fallback || "application/octet-stream";
  }
}

function canDownloadBook(book: LibraryBook): boolean {
  return book.format !== "pdf";
}

function statusLabel(status: LibraryBookStatus): string {
  switch (status) {
    case "draft":
      return "Qaralama";
    case "archived":
      return "Arxivdə";
    default:
      return "Əlçatandır";
  }
}

function categoryLabel(value: string): string {
  switch (value) {
    case "Computer Science":
      return "Kompüter elmləri";
    case "Business":
      return "Biznes";
    case "Mathematics":
      return "Riyaziyyat";
    case "Engineering":
      return "Mühəndislik";
    case "Languages":
      return "Dillər";
    case "Research":
      return "Tədqiqat";
    case "General":
      return "Ümumi";
    default:
      return value;
  }
}

function languageLabel(value?: string): string {
  switch ((value ?? "").trim().toLowerCase()) {
    case "english":
      return "İngilis dili";
    case "azerbaijani":
    case "azerbaycani":
    case "azərbaycan dili":
      return "Azərbaycan dili";
    case "turkish":
      return "Türk dili";
    case "russian":
      return "Rus dili";
    default:
      return value || "-";
  }
}

function statusClass(status: LibraryBookStatus): string {
  switch (status) {
    case "draft":
      return "border-yellow-200 bg-yellow-50 text-yellow-800";
    case "archived":
      return "border-slate-200 bg-slate-100 text-slate-700";
    default:
      return "border-green-200 bg-green-50 text-green-800";
  }
}

function coverStyle(title: string): CSSProperties {
  const index =
    title.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0) %
    COVER_COLORS.length;
  const [from, to] = COVER_COLORS[index];

  return {
    background:
      `linear-gradient(145deg, ${from} 0%, ${from} 45%, ${to} 100%)`,
  };
}

function formFromBook(book: LibraryBook): BookFormState {
  return {
    title: book.title,
    authorsText: book.authors.join(", "),
    description: book.description ?? "",
    isbn: book.isbn ?? "",
    category: book.category,
    language: book.language,
    publisher: book.publisher ?? "",
    publishedYear: book.publishedYear ? String(book.publishedYear) : "",
    edition: book.edition ?? "",
    tagsText: book.tags.join(", "),
    status: book.status,
    bookFile: null,
    coverImage: null,
  };
}

function toMutationInput(form: BookFormState): LibraryBookMutationInput {
  const year = Number(form.publishedYear);

  return {
    title: form.title.trim(),
    authors: splitList(form.authorsText),
    description: form.description.trim(),
    isbn: form.isbn.trim(),
    category: form.category.trim() || "General",
    language: form.language.trim() || "İngilis dili",
    publisher: form.publisher.trim(),
    publishedYear: Number.isFinite(year) && year > 0 ? year : undefined,
    edition: form.edition.trim(),
    tags: splitList(form.tagsText),
    status: form.status,
    bookFile: form.bookFile,
    coverImage: form.coverImage,
  };
}

function BookCover({
  book,
  className = "",
}: {
  book: LibraryBook;
  className?: string;
}) {
  return (
    <div
      className={`relative flex aspect-[3/4] min-h-[170px] overflow-hidden rounded-md border shadow-sm ${className}`}
      style={book.coverImageUrl ? undefined : coverStyle(book.title)}
    >
      {book.coverImageUrl ? (
        <img
          src={book.coverImageUrl}
          alt={book.title}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full flex-col justify-between p-4 text-white">
          <LibraryBig className="h-7 w-7 opacity-80" />
          <div className="space-y-2">
            <p className="line-clamp-3 text-lg font-semibold leading-tight">
              {book.title || "Başlıqsız"}
            </p>
            <p className="line-clamp-1 text-xs uppercase tracking-normal opacity-80">
              {book.authors.join(", ") || "Kitabxana"}
            </p>
          </div>
        </div>
      )}
      <Badge className="absolute right-2 top-2 bg-white/90 text-slate-900">
        {book.format.toUpperCase()}
      </Badge>
    </div>
  );
}

export function LibraryPage({ userRole }: LibraryPageProps) {
  const canManage = userRole === "dean" || userRole === "teacher";
  const [books, setBooks] = useState<LibraryBook[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState<LibraryBookStatus | "all">(
    canManage ? "all" : "available",
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<LibraryBook | null>(null);
  const [form, setForm] = useState<BookFormState>(EMPTY_FORM);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState("");
  const [readerOpen, setReaderOpen] = useState(false);
  const [readerUrl, setReaderUrl] = useState("");
  const [readerTitle, setReaderTitle] = useState("");
  const [readerObjectUrl, setReaderObjectUrl] = useState("");

  const categories = useMemo(() => {
    const fromBooks = books.map((book) => book.category).filter(Boolean);
    return Array.from(new Set([...DEFAULT_CATEGORIES, ...fromBooks]));
  }, [books]);

  const loadBooks = async () => {
    try {
      setIsLoading(true);
      const data = await listLibraryBooks({
        query,
        category,
        status,
        page: 1,
        pageSize: 48,
      });
      setBooks(data.items);
    } catch (error: any) {
      toast.error(error?.message ?? "Kitabxana kitabları yüklənmədi");
      setBooks([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadBooks();
  }, [category, status]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadBooks();
    }, 350);

    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (!form.coverImage) {
      setCoverPreviewUrl(editingBook?.coverImageUrl ?? "");
      return;
    }

    const nextUrl = URL.createObjectURL(form.coverImage);
    setCoverPreviewUrl(nextUrl);

    return () => URL.revokeObjectURL(nextUrl);
  }, [editingBook?.coverImageUrl, form.coverImage]);

  useEffect(() => {
    return () => {
      if (readerObjectUrl) URL.revokeObjectURL(readerObjectUrl);
    };
  }, [readerObjectUrl]);

  const openCreateDialog = () => {
    setEditingBook(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEditDialog = (book: LibraryBook) => {
    setEditingBook(book);
    setForm(formFromBook(book));
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    const payload = toMutationInput(form);

    if (!payload.title) {
      toast.error("Başlıq tələb olunur");
      return;
    }

    if (payload.authors.length === 0) {
      toast.error("Ən azı bir müəllif qeyd olunmalıdır");
      return;
    }

    if (!editingBook && !payload.bookFile) {
      toast.error("Kitab faylı tələb olunur");
      return;
    }

    try {
      setIsSaving(true);
      if (editingBook) {
        await updateLibraryBook(editingBook.id, payload);
        toast.success("Kitab yeniləndi");
      } else {
        await createLibraryBook(payload);
        toast.success("Kitab kitabxanaya əlavə edildi");
      }
      setDialogOpen(false);
      await loadBooks();
    } catch (error: any) {
      toast.error(error?.message ?? "Kitabı yadda saxlamaq mümkün olmadı");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (book: LibraryBook) => {
    try {
      await deleteLibraryBook(book.id);
      toast.success("Kitab silindi");
      await loadBooks();
    } catch (error: any) {
      toast.error(error?.message ?? "Kitabı silmək mümkün olmadı");
    }
  };

  const handleDownload = async (book: LibraryBook) => {
    try {
      const { blob, fileName } = await downloadLibraryBookFile(book.id);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = fileName || book.fileName || `${book.title}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (error: any) {
      toast.error(error?.message ?? "Kitabı yükləmək mümkün olmadı");
    }
  };

  const handleRead = async (book: LibraryBook) => {
    const isPdf = book.format === "pdf";
    const pdfViewerWindow = isPdf ? window.open("about:blank", "_blank") : null;

    if (isPdf && !pdfViewerWindow) {
      toast.error("PDF oxuyucunu açmaq üçün pop-up icazəsi verin");
      return;
    }

    if (isPdf && pdfViewerWindow) {
      pdfViewerWindow.document.write(
        "<!doctype html><title>Oxuyucu açılır...</title><body style=\"margin:0;display:grid;place-items:center;height:100vh;font-family:Arial,sans-serif;color:#475569;\">Oxuyucu açılır...</body>",
      );
      pdfViewerWindow.document.close();
    }

    try {
      if (readerObjectUrl) {
        URL.revokeObjectURL(readerObjectUrl);
        setReaderObjectUrl("");
      }

      setReaderTitle(book.title);
      setReaderUrl("");

      const { blob, contentType } = await readLibraryBookFile(book.id);
      const readableBlob = new Blob([blob], {
        type: mimeTypeForBook(book, contentType),
      });
      const url = URL.createObjectURL(readableBlob);

      setReaderObjectUrl(url);

      if (isPdf && pdfViewerWindow) {
        pdfViewerWindow.location.href = url;
        return;
      }

      setReaderUrl(url);

      setReaderOpen(true);
    } catch (error: any) {
      if (pdfViewerWindow) {
        pdfViewerWindow.document.body.innerHTML =
          "<div style=\"padding:24px;font-family:Arial,sans-serif;color:#991b1b;\">Oxuyucunu açmaq mümkün olmadı.</div>";
      }
      toast.error(error?.message ?? "Oxuyucunu açmaq mümkün olmadı");
    }
  };

  const visibleBooks = canManage
    ? books
    : books.filter((book) => book.status === "available");

  return (
    <div className="space-y-6">
      <div className="rounded-md border bg-white shadow-sm">
        <div className="flex  flex-wrap items-center justify-between gap-4 p-5">
          <div className="min-w-0">
            <p className="mt-1 px-2 text-sm text-muted-foreground">
              {canManage
                ? "Rəqəmsal kitabları, üz qabıqlarını və məlumatları idarə edin."
                : "Tədris materiallarını axtarın, oxuyun və yükləyin."}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={loadBooks}
                disabled={isLoading}
                className="h-10"
              >
              <RefreshCw className="h-4 w-4" />
              {isLoading ? "Yüklənir" : "Yenilə"}
              </Button>
              {canManage && (
                <Button onClick={openCreateDialog} className="h-10">
                  <Plus className="h-4 w-4" />
                  Kitab əlavə et
                </Button>
              )}
          </div>
        </div>

        <div className="border-t bg-slate-50/70 p-4">
          <div className="flex flex-wrap gap-3">
          <div
            className="flex min-w-[280px] flex-1 items-center gap-2 rounded-md bg-white px-3"
            style={{ border: "1px solid #d9dde7", height: 44 }}
          >
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Başlıq, müəllif, ISBN və ya etiket üzrə axtar"
              className="h-full border-0 bg-transparent px-0 shadow-none focus-visible:border-transparent focus-visible:ring-0"
              style={{ border: 0, boxShadow: "none" }}
            />
          </div>

          <div className="min-w-[220px] flex-1 sm:flex-none">
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger
                className="h-11 bg-white"
                style={{ border: "1px solid #d9dde7", boxShadow: "none" }}
              >
              <Filter className="h-4 w-4" />
              <SelectValue placeholder="Kateqoriya" />
            </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Bütün kateqoriyalar</SelectItem>
                {categories.map((item) => (
                  <SelectItem key={item} value={item}>
                    {categoryLabel(item)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="min-w-[180px] flex-1 sm:flex-none">
            <Select
              value={status}
              onValueChange={(value) =>
                setStatus(value as LibraryBookStatus | "all")
              }
            >
              <SelectTrigger
                className="h-11 bg-white"
                style={{ border: "1px solid #d9dde7", boxShadow: "none" }}
              >
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {canManage && <SelectItem value="all">Bütün statuslar</SelectItem>}
                <SelectItem value="available">Əlçatandır</SelectItem>
                {canManage && <SelectItem value="draft">Qaralama</SelectItem>}
                {canManage && <SelectItem value="archived">Arxivdə</SelectItem>}
              </SelectContent>
            </Select>
          </div>
          </div>
        </div>
      </div>

      {visibleBooks.length === 0 ? (
        <div className="rounded-md border border-dashed bg-white p-10 text-center">
          <BookOpen className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <p className="font-medium">
            {isLoading ? "Kitabxana yüklənir..." : "Kitab tapılmadı"}
          </p>
          <p className="text-sm text-muted-foreground">
            {canManage
              ? "Kitabxanada görünməsi üçün ilk kitabı əlavə edin."
              : "Başqa açar söz və ya kateqoriya ilə yoxlayın."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visibleBooks.map((book) => (
            <Card key={book.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="grid grid-cols-[112px_1fr] gap-4">
                  <BookCover book={book} />
                  <div className="min-w-0 space-y-3">
                    <div className="space-y-1">
                      <CardTitle className="line-clamp-2 text-lg leading-snug">
                        {book.title || "Başlıqsız"}
                      </CardTitle>
                      <p className="line-clamp-2 text-sm text-muted-foreground">
                        {book.authors.join(", ") || "Müəllif məlum deyil"}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">{categoryLabel(book.category)}</Badge>
                      <Badge
                        variant="outline"
                        className={statusClass(book.status)}
                      >
                        {statusLabel(book.status)}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <p className="line-clamp-3 min-h-[60px] text-sm leading-5 text-muted-foreground">
                  {book.description || "Təsvir əlavə edilməyib."}
                </p>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Languages className="h-4 w-4" />
                    <span className="truncate">{languageLabel(book.language)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <FileText className="h-4 w-4" />
                    <span className="truncate">
                      {fileSizeLabel(book.fileSizeBytes)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Eye className="h-4 w-4" />
                    <span>{book.viewCount} oxunma</span>
                  </div>
                </div>

                {book.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {book.tags.slice(0, 4).map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>

              <CardFooter className="flex flex-wrap gap-2 border-t bg-slate-50/70 p-4">
                <Button
                  size="sm"
                  onClick={() => handleRead(book)}
                  disabled={book.status !== "available" && !canManage}
                >
                  <Eye className="h-4 w-4" />
                  Oxu
                </Button>
                {canDownloadBook(book) && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDownload(book)}
                    disabled={book.status !== "available" && !canManage}
                  >
                    <Download className="h-4 w-4" />
                    Yüklə
                  </Button>
                )}
                {canManage && (
                  <div className="ml-auto flex gap-2">
                    <Button
                      size="icon"
                      variant="outline"
                      title="Kitabı redaktə et"
                      onClick={() => openEditDialog(book)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <DeleteConfirmationDialog
                      trigger={
                        <Button
                          size="icon"
                          variant="outline"
                          title="Kitabı sil"
                          aria-label={`Delete ${book.title}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      }
                      title="Kitabı silmək?"
                      description={
                        <>
                          Bu əməliyyat geri qaytarıla bilməz. “{book.title}”
                          kitabxanadan silinəcək.
                        </>
                      }
                      onConfirm={() => handleDelete(book)}
                    />
                  </div>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingBook ? "Kitabı redaktə et" : "Kitab əlavə et"}
            </DialogTitle>
            <DialogDescription>
              Kitab faylını yükləyin və tələbələrin axtaracağı məlumatları əlavə edin.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="book-title">Başlıq</Label>
              <Input
                id="book-title"
                value={form.title}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, title: event.target.value }))
                }
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="book-authors">Müəlliflər</Label>
              <Input
                id="book-authors"
                value={form.authorsText}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    authorsText: event.target.value,
                  }))
                }
                placeholder="Məsələn: Nizami Gəncəvi, Anar"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="book-description">Təsvir</Label>
              <Textarea
                id="book-description"
                value={form.description}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    description: event.target.value,
                  }))
                }
                className="min-h-24"
              />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="book-category">Kateqoriya</Label>
                <Input
                  id="book-category"
                  value={form.category}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      category: event.target.value,
                    }))
                  }
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="book-language">Dil</Label>
                <Input
                  id="book-language"
                  value={form.language}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      language: event.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="book-isbn">ISBN</Label>
                <Input
                  id="book-isbn"
                  value={form.isbn}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, isbn: event.target.value }))
                  }
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="book-year">Nəşr ili</Label>
                <Input
                  id="book-year"
                  type="number"
                  min="1000"
                  max="3000"
                  value={form.publishedYear}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      publishedYear: event.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="book-publisher">Nəşriyyat</Label>
                <Input
                  id="book-publisher"
                  value={form.publisher}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      publisher: event.target.value,
                    }))
                  }
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="book-edition">Nəşr</Label>
                <Input
                  id="book-edition"
                  value={form.edition}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      edition: event.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="book-tags">Etiketlər</Label>
              <Input
                id="book-tags"
                value={form.tagsText}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    tagsText: event.target.value,
                  }))
                }
                placeholder="frontend, alqoritmlər, mühasibat"
              />
            </div>

            <div className="grid gap-2">
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(value) =>
                  setForm((prev) => ({
                    ...prev,
                    status: value as LibraryBookStatus,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Əlçatandır</SelectItem>
                  <SelectItem value="draft">Qaralama</SelectItem>
                  <SelectItem value="archived">Arxivdə</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="book-file">Kitab faylı</Label>
                <div className="relative">
                  <Input
                    id="book-file"
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        bookFile: event.target.files?.[0] ?? null,
                      }))
                    }
                    className="pr-9"
                  />
                  <Upload className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="cover-image">Üz qabığı şəkli</Label>
                <div className="relative">
                  <Input
                    id="cover-image"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        coverImage: event.target.files?.[0] ?? null,
                      }))
                    }
                    className="pr-9"
                  />
                  <ImagePlus className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                </div>
              </div>
            </div>

            <div className="rounded-md border bg-slate-50 p-3">
              <div className="grid grid-cols-[76px_1fr] gap-3">
                <div
                  className="flex aspect-[3/4] overflow-hidden rounded-md border"
                  style={coverPreviewUrl ? undefined : coverStyle(form.title)}
                >
                  {coverPreviewUrl ? (
                    <img
                      src={coverPreviewUrl}
                      alt="Üz qabığı önizləməsi"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-end p-2 text-xs font-semibold text-white">
                      {form.title || "Üz qabığı"}
                    </div>
                  )}
                </div>
                <div className="min-w-0 space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="truncate">
                      {form.authorsText || "Müəlliflər"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Tags className="h-4 w-4 text-muted-foreground" />
                    <span className="truncate">{form.tagsText || "Etiketlər"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{form.publishedYear || "İl"}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={isSaving}
            >
              <X className="h-4 w-4" />
              Ləğv et
            </Button>
            <Button onClick={handleSubmit} disabled={isSaving}>
              {isSaving
                ? "Yadda saxlanılır"
                : editingBook
                  ? "Dəyişiklikləri saxla"
                  : "Yarat"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={readerOpen} onOpenChange={setReaderOpen}>
        <DialogContent className="grid h-[94vh] max-h-[94vh] grid-rows-[auto_1fr_auto] p-4 sm:max-w-[96vw]">
          <DialogHeader>
            <DialogTitle className="line-clamp-1">{readerTitle}</DialogTitle>
            <DialogDescription>Oxuyucu</DialogDescription>
          </DialogHeader>
          <div className="min-h-0 overflow-hidden rounded-md border bg-slate-100">
            {readerUrl ? (
              <iframe
                title={readerTitle}
                src={readerUrl}
                className="h-full w-full bg-white"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Oxuyucu açılır...
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" asChild>
              <a href={readerUrl} target="_blank" rel="noreferrer">
                Yeni tabda aç
              </a>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
