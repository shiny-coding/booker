// Book format types
export type BookFormat = 'epub' | 'pdf' | 'azw3' | 'mobi' | 'azw' | 'txt' | 'docx';

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
  docx: ['epub', 'pdf', 'azw3', 'mobi', 'txt'],
};

// File extensions mapping
export const FORMAT_EXTENSIONS: Record<BookFormat, string> = {
  epub: '.epub',
  pdf: '.pdf',
  azw3: '.azw3',
  mobi: '.mobi',
  azw: '.azw',
  txt: '.txt',
  docx: '.docx',
};

// Supported upload formats
export const SUPPORTED_FORMATS: BookFormat[] = ['epub', 'pdf', 'mobi', 'azw', 'azw3', 'txt', 'docx'];

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

// Helper function to sanitize filename (for folder names)
export function sanitizeFilename(filename: string): string {
  // Replace spaces and special chars with dashes, but keep unicode letters/numbers
  let sanitized = filename
    .toLowerCase()
    .replace(/\s+/g, '-') // Replace spaces with dashes
    .replace(/[^\w\-_.]/g, '-') // Replace special chars but keep unicode word chars
    .replace(/-+/g, '-') // Collapse multiple dashes
    .replace(/^-|-$/g, ''); // Remove leading/trailing dashes

  // If result is empty or too short, use a fallback
  if (!sanitized || sanitized.length < 2) {
    sanitized = 'book-' + Date.now();
  }

  return sanitized;
}

// Helper function to clean uploaded filenames (more lenient than sanitizeFilename)
export function cleanUploadedFilename(filename: string): string {
  // Split filename and extension
  const lastDotIndex = filename.lastIndexOf('.');
  const name = lastDotIndex > 0 ? filename.substring(0, lastDotIndex) : filename;
  const ext = lastDotIndex > 0 ? filename.substring(lastDotIndex) : '';

  // Only remove truly problematic characters for filesystems
  // Keep: letters, numbers, spaces, dashes, underscores, dots, parentheses, brackets
  let cleaned = name
    .replace(/[<>:"|?*\/\\]/g, '') // Remove filesystem-invalid characters
    .replace(/\s+/g, ' ') // Normalize spaces
    .trim();

  // If result is empty, use a fallback
  if (!cleaned || cleaned.length < 1) {
    cleaned = 'book-' + Date.now();
  }

  return cleaned + ext;
}

// Helper function to generate book folder name
export function generateBookFolderName(title: string, author?: string): string {
  const parts = [title];
  if (author) {
    parts.push(author);
  }
  const folderName = sanitizeFilename(parts.join('-'));

  // Ensure we always have a valid folder name
  return folderName || `book-${Date.now()}`;
}
