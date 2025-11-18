// Book format types
export type BookFormat = 'epub' | 'pdf' | 'azw3' | 'mobi' | 'azw' | 'txt';

// Book format information
export interface BookFormatInfo {
  format: BookFormat;
  filePath: string;
  fileName: string;
  fileSize: number;
  isOriginal: boolean;
  addedDate: Date;
}

// Book metadata
export interface Book {
  id: string;
  title: string;
  author: string;
  tags: string[];
  formats: BookFormatInfo[];
  coverPath?: string;
  description?: string;
  isbn?: string;
  publisher?: string;
  publishedDate?: string;
  language?: string;
  addedDate: Date;
  updatedDate: Date;
}

// Book metadata cache structure
export interface BookMetadataCache {
  version: string;
  lastScan: Date;
  books: Book[];
}

// Conversion job
export interface ConversionJob {
  id: string;
  bookId: string;
  bookTitle: string;
  sourceFormat: BookFormat;
  targetFormat: BookFormat;
  sourcePath: string;
  targetPath: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number;
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
}

// Upload metadata
export interface UploadMetadata {
  title?: string;
  author?: string;
  tags?: string[];
  description?: string;
}

// Filter options
export interface BookFilters {
  search?: string;
  tags?: string[];
  formats?: BookFormat[];
  author?: string;
}

// Sort options
export type SortField = 'title' | 'author' | 'addedDate' | 'updatedDate';
export type SortOrder = 'asc' | 'desc';

export interface SortOptions {
  field: SortField;
  order: SortOrder;
}

// Conversion capabilities matrix
export const CONVERSION_MATRIX: Record<BookFormat, BookFormat[]> = {
  epub: ['pdf', 'azw3', 'mobi', 'txt'],
  pdf: ['epub', 'txt'],
  azw3: ['epub', 'pdf', 'mobi', 'txt'],
  mobi: ['epub', 'pdf', 'azw3', 'txt'],
  azw: ['epub', 'pdf', 'azw3', 'txt'],
  txt: ['epub', 'pdf'],
};

// File extensions mapping
export const FORMAT_EXTENSIONS: Record<BookFormat, string> = {
  epub: '.epub',
  pdf: '.pdf',
  azw3: '.azw3',
  mobi: '.mobi',
  azw: '.azw',
  txt: '.txt',
};

// Supported upload formats
export const SUPPORTED_FORMATS: BookFormat[] = ['epub', 'pdf', 'mobi', 'azw', 'azw3', 'txt'];

// Helper function to check if format is supported
export function isSupportedFormat(format: string): format is BookFormat {
  return SUPPORTED_FORMATS.includes(format.toLowerCase() as BookFormat);
}

// Helper function to get file extension from format
export function getExtension(format: BookFormat): string {
  return FORMAT_EXTENSIONS[format];
}

// Helper function to get format from filename
export function getFormatFromFilename(filename: string): BookFormat | null {
  const ext = filename.toLowerCase().split('.').pop();
  if (!ext) return null;

  const format = Object.entries(FORMAT_EXTENSIONS).find(
    ([_, extension]) => extension === `.${ext}`
  )?.[0] as BookFormat | undefined;

  return format || null;
}

// Helper function to sanitize filename
export function sanitizeFilename(filename: string): string {
  return filename
    .toLowerCase()
    .replace(/[^a-z0-9-_.]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// Helper function to generate book folder name
export function generateBookFolderName(title: string, author?: string): string {
  const parts = [title];
  if (author) {
    parts.push(author);
  }
  return sanitizeFilename(parts.join('-'));
}
