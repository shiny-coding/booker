import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import type { BookFormat, ConversionJob } from './types';
import { CONVERSION_MATRIX, getExtension } from './types';
import { getMetadataManager } from './metadata-manager';

// Import calibre-node
// Note: calibre-node requires Calibre to be installed on the system
let calibre: any;
try {
  calibre = require('calibre-node');
} catch (error) {
  console.warn('calibre-node not available. Conversion features will be disabled.');
  console.warn('Install Calibre from https://calibre-ebook.com/download');
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
    if (!calibre) {
      throw new Error('Calibre is not installed or calibre-node is not available');
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
    const targetPath = path.join(path.dirname(sourcePath), targetFileName);

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

      console.log(`Converting ${fullSourcePath} to ${fullTargetPath}`);

      // Perform conversion using calibre-node
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
   * Check if Calibre is available
   */
  static isCalibreAvailable(): boolean {
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
