export type LibraryBookFormat =
  | "pdf"
  | "other";

export type LibraryBookStatus = "available" | "draft" | "archived";

export type LibraryBook = {
  id: string;
  title: string;
  authors: string[];
  description?: string;
  isbn?: string;
  category: string;
  language: string;
  publisher?: string;
  publishedYear?: number;
  edition?: string;
  tags: string[];
  format: LibraryBookFormat;
  status: LibraryBookStatus;
  coverImageUrl?: string;
  fileName?: string;
  fileSizeBytes?: number;
  fileContentType?: string;
  fileUrl?: string;
  viewCount: number;
  createdById?: string;
  createdByFullName?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type LibraryBooksQuery = {
  query?: string;
  category?: string;
  status?: LibraryBookStatus | "all";
  page?: number;
  pageSize?: number;
};

export type LibraryBooksResult = {
  items: LibraryBook[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
};

export type LibraryBookMutationInput = {
  title: string;
  authors: string[];
  description?: string;
  isbn?: string;
  category: string;
  language: string;
  publisher?: string;
  publishedYear?: number;
  edition?: string;
  tags: string[];
  status: LibraryBookStatus;
  bookFile?: File | null;
  coverImage?: File | null;
};
