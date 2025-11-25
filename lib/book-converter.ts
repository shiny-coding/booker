import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import type { BookFormat, ConversionJob } from './types';
import { CONVERSION_MATRIX, getExtension } from './types';
import { getMetadataManager } from './metadata-manager';

// Calibre conversion mode: 'local' or 'remote'
const CALIBRE_MODE = process.env.CALIBRE_MODE || 'local';
const CALIBRE_API_URL = process.env.CALIBRE_API_URL || 'http://localhost:8080';

// Import calibre-node (for local mode)
// Note: calibre-node requires Calibre to be installed on the system
let calibre: any;
if (CALIBRE_MODE === 'local') {
  try {
    calibre = require('calibre-node');
  } catch (error) {
    console.warn('calibre-node not available. Conversion features will be disabled.');
    console.warn('Install Calibre from https://calibre-ebook.com/download');
    console.warn('Or use CALIBRE_MODE=remote with a Calibre service');
  }
}

export class BookConverter {
  private jobs: Map<string, ConversionJob> = new Map();
  private booksPath: string;

  constructor(booksPath: string) {
    this.booksPath = booksPath;
  }

  /**
   * Check if conversion is supported
   */
  canConvert(sourceFormat: BookFormat, targetFormat: BookFormat): boolean {
    const supportedTargets = CONVERSION_MATRIX[sourceFormat];
    return supportedTargets?.includes(targetFormat) || false;
  }

  /**
   * Get available conversion formats for a source format
   */
  getAvailableFormats(sourceFormat: BookFormat): BookFormat[] {
    return CONVERSION_MATRIX[sourceFormat] || [];
  }

  /**
   * Convert a book to a different format
   */
  async convertBook(
    bookId: string,
    sourceFormat: BookFormat,
    targetFormat: BookFormat,
    sourcePath: string
  ): Promise<ConversionJob> {
    if (CALIBRE_MODE === 'local' && !calibre) {
      throw new Error('Calibre is not installed or calibre-node is not available');
    }

    if (CALIBRE_MODE === 'remote') {
      // Check if remote service is available
      const isAvailable = await this.checkRemoteService();
      if (!isAvailable) {
        throw new Error(`Calibre remote service not available at ${CALIBRE_API_URL}`);
      }
    }

    if (!this.canConvert(sourceFormat, targetFormat)) {
      throw new Error(
        `Conversion from ${sourceFormat} to ${targetFormat} is not supported`
      );
    }

    // Get book metadata
    const metadataManager = getMetadataManager();
    const book = await metadataManager.getBook(bookId);

    if (!book) {
      throw new Error(`Book with ID ${bookId} not found`);
    }

    // Create job
    const jobId = uuidv4();
    const targetFileName = path.basename(
      sourcePath,
      path.extname(sourcePath)
    ) + getExtension(targetFormat);
    // Normalize path to use forward slashes (Unix-style) for cross-platform compatibility
    const targetPath = path.join(path.dirname(sourcePath), targetFileName).replace(/\\/g, '/');

    const job: ConversionJob = {
      id: jobId,
      bookId,
      bookTitle: book.title,
      sourceFormat,
      targetFormat,
      sourcePath,
      targetPath,
      status: 'pending',
    };

    this.jobs.set(jobId, job);

    // Start conversion asynchronously
    this.performConversion(job).catch((error) => {
      console.error(`Conversion job ${jobId} failed:`, error);
      job.status = 'failed';
      job.error = error.message;
    });

    return job;
  }

  /**
   * Perform the actual conversion
   */
  private async performConversion(job: ConversionJob): Promise<void> {
    try {
      job.status = 'processing';
      job.startedAt = new Date();
      this.jobs.set(job.id, job);

      const fullSourcePath = path.join(this.booksPath, job.sourcePath);
      const fullTargetPath = path.join(this.booksPath, job.targetPath);

      // Check if source file exists
      try {
        await fs.access(fullSourcePath);
      } catch {
        throw new Error(`Source file not found: ${fullSourcePath}`);
      }

      console.log(`Converting ${fullSourcePath} to ${fullTargetPath} (mode: ${CALIBRE_MODE})`);

      // Perform conversion based on mode
      if (CALIBRE_MODE === 'remote') {
        await this.performRemoteConversion(job.sourcePath, job.targetPath);
      } else {
        // Local conversion using calibre-node
        await new Promise<void>((resolve, reject) => {
          calibre.ebookConvert(
            fullSourcePath,
            fullTargetPath,
            {},
            (error: Error) => {
              if (error) {
                reject(error);
              } else {
                resolve();
              }
            }
          );
        });
      }

      // Verify output file exists
      try {
        await fs.access(fullTargetPath);
      } catch {
        throw new Error('Conversion completed but output file not found');
      }

      // Get file stats
      const stats = await fs.stat(fullTargetPath);

      // Update book metadata
      const metadataManager = getMetadataManager();
      const book = await metadataManager.getBook(job.bookId);

      if (book) {
        // Add new format to book
        book.formats.push({
          format: job.targetFormat,
          filePath: job.targetPath,
          fileName: path.basename(job.targetPath),
          fileSize: stats.size,
          isOriginal: false,
          addedDate: new Date(),
        });

        await metadataManager.upsertBook(book);
      }

      // Update job status
      job.status = 'completed';
      job.completedAt = new Date();
      job.progress = 100;
      this.jobs.set(job.id, job);

      console.log(`Conversion completed: ${job.targetPath}`);
    } catch (error) {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Unknown error';
      job.completedAt = new Date();
      this.jobs.set(job.id, job);
      throw error;
    }
  }

  /**
   * Get conversion job status
   */
  getJob(jobId: string): ConversionJob | null {
    return this.jobs.get(jobId) || null;
  }

  /**
   * Get all jobs
   */
  getAllJobs(): ConversionJob[] {
    return Array.from(this.jobs.values());
  }

  /**
   * Get jobs for a specific book
   */
  getJobsForBook(bookId: string): ConversionJob[] {
    return Array.from(this.jobs.values()).filter(
      (job) => job.bookId === bookId
    );
  }

  /**
   * Clear completed jobs
   */
  clearCompletedJobs(): void {
    for (const [jobId, job] of this.jobs.entries()) {
      if (job.status === 'completed' || job.status === 'failed') {
        this.jobs.delete(jobId);
      }
    }
  }

  /**
   * Check if remote Calibre service is available
   */
  private async checkRemoteService(): Promise<boolean> {
    try {
      const response = await fetch(`${CALIBRE_API_URL}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });
      return response.ok;
    } catch (error) {
      console.error('Failed to connect to remote Calibre service:', error);
      return false;
    }
  }

  /**
   * Perform conversion using remote Calibre service
   */
  private async performRemoteConversion(
    sourcePath: string,
    targetPath: string
  ): Promise<void> {
    try {
      // For remote mode, prepend 'books/' since Docker mounts ./library:/books
      // and our files are in library/books/
      const remoteSourcePath = `books/${sourcePath}`;
      const remoteTargetPath = `books/${targetPath}`;

      const response = await fetch(`${CALIBRE_API_URL}/convert`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          source_path: remoteSourcePath,
          target_path: remoteTargetPath,
        }),
        signal: AbortSignal.timeout(300000), // 5 minute timeout
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Remote conversion failed');
      }

      const result = await response.json();
      console.log('Remote conversion result:', result);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Remote conversion failed: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Check if Calibre is available
   */
  static isCalibreAvailable(): boolean {
    if (CALIBRE_MODE === 'remote') {
      // For remote mode, we'll check availability at runtime
      return true;
    }
    return !!calibre;
  }
}

// Singleton instance
let bookConverter: BookConverter | null = null;

/**
 * Get book converter instance
 */
export function getBookConverter(): BookConverter {
  if (!bookConverter) {
    const booksPath = process.env.BOOKS_PATH || './library/books';
    bookConverter = new BookConverter(booksPath);
  }
  return bookConverter;
}

/**
 * Convert a book format
 */
export async function convertBookFormat(
  bookId: string,
  sourceFormat: BookFormat,
  targetFormat: BookFormat,
  sourcePath: string
): Promise<ConversionJob> {
  const converter = getBookConverter();
  return converter.convertBook(bookId, sourceFormat, targetFormat, sourcePath);
}

/**
 * Check if conversion is available
 */
export function isConversionAvailable(): boolean {
  return BookConverter.isCalibreAvailable();
}
