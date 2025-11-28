import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import type { Book, BookFormatInfo, BookFormat } from './types';
import { getFormatFromFilename, isSupportedFormat, SUPPORTED_FORMATS } from './types';
import { getMetadataManager } from './metadata-manager';
import { getBooksPath, getCoversPath } from './paths';

export class BookScanner {
  private booksPath: string;

  constructor(booksPath: string) {
    this.booksPath = booksPath;
  }

  /**
   * Scan the books directory and update metadata
   */
  async scan(): Promise<Book[]> {
    console.log(`Starting scan of: ${this.booksPath}`);

    // Ensure books directory exists
    await fs.mkdir(this.booksPath, { recursive: true });

    const books: Book[] = [];

    try {
      // Clear existing metadata before scanning
      const metadataManager = getMetadataManager();
      await metadataManager.clear();
      console.log('Cleared existing metadata');

      // Read all book folders
      const entries = await fs.readdir(this.booksPath, { withFileTypes: true });
      const bookFolders = entries.filter((entry) => entry.isDirectory());

      console.log(`Found ${bookFolders.length} book folders`);

      for (const folder of bookFolders) {
        try {
          const book = await this.scanBookFolder(folder.name);
          if (book) {
            books.push(book);
          }
        } catch (error) {
          console.error(`Error scanning folder ${folder.name}:`, error);
        }
      }

      // Update metadata
      for (const book of books) {
        await metadataManager.upsertBook(book);
      }

      await metadataManager.updateLastScan();

      console.log(`Scan complete. Found ${books.length} books`);

      return books;
    } catch (error) {
      console.error('Error during scan:', error);
      throw error;
    }
  }

  /**
   * Scan a single book folder
   */
  private async scanBookFolder(folderName: string): Promise<Book | null> {
    const folderPath = path.join(this.booksPath, folderName);

    try {
      // Read all files in the folder
      const files = await fs.readdir(folderPath);

      // Filter for supported book formats
      const bookFiles = files.filter((file) => {
        const format = getFormatFromFilename(file);
        return format && isSupportedFormat(format);
      });

      if (bookFiles.length === 0) {
        console.warn(`No valid book files found in folder: ${folderName}`);
        return null;
      }

      // Get file stats and format info
      const formats: BookFormatInfo[] = [];
      for (const file of bookFiles) {
        const filePath = path.join(folderPath, file);
        const stats = await fs.stat(filePath);
        const format = getFormatFromFilename(file);

        if (format) {
          formats.push({
            format,
            filePath: path.relative(this.booksPath, filePath),
            fileName: file,
            fileSize: stats.size,
            isOriginal: false, // Will be determined later
            addedDate: stats.birthtime,
          });
        }
      }

      // Determine the original file (oldest one)
      if (formats.length > 0) {
        formats.sort((a, b) => a.addedDate.getTime() - b.addedDate.getTime());
        formats[0].isOriginal = true;
      }

      // Parse title and author from folder name
      const { title, author } = this.parseFolderName(folderName);

      // Generate unique ID
      const id = this.generateBookId(folderName);

      // Check for cover image
      const coverPath = await this.findCoverImage(folderName);

      const book: Book = {
        id,
        title,
        author,
        tags: [],
        formats,
        coverPath,
        addedDate: formats[0].addedDate,
        updatedDate: new Date(),
      };

      return book;
    } catch (error) {
      console.error(`Error scanning book folder ${folderName}:`, error);
      throw error;
    }
  }

  /**
   * Parse folder name to extract title and author
   */
  private parseFolderName(folderName: string): { title: string; author: string } {
    // Try to split by common separators
    const separators = [' - ', '_-_', '--'];

    for (const separator of separators) {
      if (folderName.includes(separator)) {
        const parts = folderName.split(separator);
        if (parts.length >= 2) {
          return {
            title: this.cleanName(parts[0]),
            author: this.cleanName(parts[1]),
          };
        }
      }
    }

    // If no separator found, use folder name as title
    return {
      title: this.cleanName(folderName),
      author: 'Unknown Author',
    };
  }

  /**
   * Clean up folder/file name
   */
  private cleanName(name: string): string {
    return name
      .replace(/[-_]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Generate unique book ID from folder name
   */
  private generateBookId(folderName: string): string {
    return crypto.createHash('md5').update(folderName).digest('hex');
  }

  /**
   * Find cover image for a book
   */
  private async findCoverImage(folderName: string): Promise<string | undefined> {
    const coversPath = getCoversPath();
    const possibleExtensions = ['.jpg', '.jpeg', '.png', '.webp'];

    for (const ext of possibleExtensions) {
      const coverFileName = `${folderName}${ext}`;
      const coverPath = path.join(coversPath, coverFileName);

      try {
        await fs.access(coverPath);
        return `/covers/${coverFileName}`;
      } catch {
        // Cover doesn't exist, continue
      }
    }

    return undefined;
  }

  /**
   * Get book folder path
   */
  getBookFolderPath(bookId: string): string | null {
    // This is a simplified version - in a real app, you'd look up the folder name from metadata
    return path.join(this.booksPath, bookId);
  }
}

// Singleton instance
let bookScanner: BookScanner | null = null;

/**
 * Get book scanner instance
 */
export function getBookScanner(): BookScanner {
  if (!bookScanner) {
    bookScanner = new BookScanner(getBooksPath());
  }
  return bookScanner;
}

/**
 * Perform a full scan of the books directory
 */
export async function scanBooksDirectory(): Promise<Book[]> {
  const scanner = getBookScanner();
  return scanner.scan();
}
