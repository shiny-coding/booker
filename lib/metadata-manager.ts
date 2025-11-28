import { promises as fs } from 'fs';
import path from 'path';
import type { Book, BookMetadataCache } from './types';
import { getLibraryPath } from './paths';

const METADATA_VERSION = '1.0.0';
const METADATA_FILENAME = 'metadata.json';

export class MetadataManager {
  private libraryPath: string;
  private metadataPath: string;
  private cache: BookMetadataCache | null = null;

  constructor(libraryPath: string) {
    this.libraryPath = libraryPath;
    this.metadataPath = path.join(libraryPath, METADATA_FILENAME);
  }

  /**
   * Load metadata from file
   */
  async load(): Promise<BookMetadataCache> {
    try {
      const data = await fs.readFile(this.metadataPath, 'utf-8');
      this.cache = JSON.parse(data, (key, value) => {
        // Parse date strings back to Date objects
        if (
          key === 'lastScan' ||
          key === 'addedDate' ||
          key === 'updatedDate' ||
          key === 'startedAt' ||
          key === 'completedAt'
        ) {
          return value ? new Date(value) : value;
        }
        return value;
      });

      if (!this.cache) {
        throw new Error('Failed to parse metadata');
      }

      return this.cache;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        // Metadata file doesn't exist, create empty cache
        this.cache = this.createEmptyCache();
        await this.save();
        return this.cache;
      }
      throw error;
    }
  }

  /**
   * Save metadata to file
   */
  async save(): Promise<void> {
    if (!this.cache) {
      throw new Error('No cache to save');
    }

    // Ensure library directory exists
    await fs.mkdir(this.libraryPath, { recursive: true });

    // Write metadata file
    await fs.writeFile(
      this.metadataPath,
      JSON.stringify(this.cache, null, 2),
      'utf-8'
    );
  }

  /**
   * Get all books
   */
  async getBooks(): Promise<Book[]> {
    if (!this.cache) {
      await this.load();
    }
    return this.cache?.books || [];
  }

  /**
   * Get book by ID
   */
  async getBook(id: string): Promise<Book | null> {
    const books = await this.getBooks();
    return books.find((book) => book.id === id) || null;
  }

  /**
   * Add or update a book
   */
  async upsertBook(book: Book): Promise<void> {
    if (!this.cache) {
      await this.load();
    }

    if (!this.cache) {
      throw new Error('Cache not initialized');
    }

    const existingIndex = this.cache.books.findIndex((b) => b.id === book.id);

    if (existingIndex >= 0) {
      // Update existing book
      this.cache.books[existingIndex] = {
        ...book,
        updatedDate: new Date(),
      };
    } else {
      // Add new book
      this.cache.books.push({
        ...book,
        addedDate: new Date(),
        updatedDate: new Date(),
      });
    }

    await this.save();
  }

  /**
   * Remove a book
   */
  async removeBook(id: string): Promise<boolean> {
    if (!this.cache) {
      await this.load();
    }

    if (!this.cache) {
      throw new Error('Cache not initialized');
    }

    const initialLength = this.cache.books.length;
    this.cache.books = this.cache.books.filter((book) => book.id !== id);

    if (this.cache.books.length < initialLength) {
      await this.save();
      return true;
    }

    return false;
  }

  /**
   * Update last scan time
   */
  async updateLastScan(): Promise<void> {
    if (!this.cache) {
      await this.load();
    }

    if (!this.cache) {
      throw new Error('Cache not initialized');
    }

    this.cache.lastScan = new Date();
    await this.save();
  }

  /**
   * Search books by query
   */
  async searchBooks(query: string): Promise<Book[]> {
    const books = await this.getBooks();
    const lowerQuery = query.toLowerCase();

    return books.filter(
      (book) =>
        book.title.toLowerCase().includes(lowerQuery) ||
        book.author.toLowerCase().includes(lowerQuery) ||
        book.tags.some((tag) => tag.toLowerCase().includes(lowerQuery)) ||
        book.description?.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Filter books
   */
  async filterBooks(filters: {
    tags?: string[];
    formats?: string[];
    author?: string;
  }): Promise<Book[]> {
    let books = await this.getBooks();

    if (filters.tags && filters.tags.length > 0) {
      books = books.filter((book) =>
        filters.tags!.every((tag) => book.tags.includes(tag))
      );
    }

    if (filters.formats && filters.formats.length > 0) {
      books = books.filter((book) =>
        filters.formats!.some((format) =>
          book.formats.some((f) => f.format === format)
        )
      );
    }

    if (filters.author) {
      const lowerAuthor = filters.author.toLowerCase();
      books = books.filter((book) =>
        book.author.toLowerCase().includes(lowerAuthor)
      );
    }

    return books;
  }

  /**
   * Get all unique tags (optionally filtered by userId)
   */
  async getAllTags(userId?: string): Promise<string[]> {
    let books = await this.getBooks();
    if (userId) {
      books = books.filter((book) => book.userId === userId);
    }
    const tagsSet = new Set<string>();

    books.forEach((book) => {
      book.tags.forEach((tag) => tagsSet.add(tag));
    });

    return Array.from(tagsSet).sort();
  }

  /**
   * Get all unique authors (optionally filtered by userId)
   */
  async getAllAuthors(userId?: string): Promise<string[]> {
    let books = await this.getBooks();
    if (userId) {
      books = books.filter((book) => book.userId === userId);
    }
    const authorsSet = new Set<string>();

    books.forEach((book) => {
      authorsSet.add(book.author);
    });

    return Array.from(authorsSet).sort();
  }

  /**
   * Create empty cache
   */
  private createEmptyCache(): BookMetadataCache {
    return {
      version: METADATA_VERSION,
      lastScan: new Date(),
      books: [],
    };
  }

  /**
   * Clear all metadata
   */
  async clear(): Promise<void> {
    this.cache = this.createEmptyCache();
    await this.save();
  }
}

// Singleton instance
let metadataManager: MetadataManager | null = null;

/**
 * Get metadata manager instance
 */
export function getMetadataManager(): MetadataManager {
  if (!metadataManager) {
    metadataManager = new MetadataManager(getLibraryPath());
  }
  return metadataManager;
}
