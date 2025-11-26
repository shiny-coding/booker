import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface ShareToken {
  token: string;
  bookId: string;
  createdAt: Date;
  expiresAt: Date | null; // null means never expires
}

interface ShareTokenCache {
  version: string;
  tokens: ShareToken[];
}

const SHARE_VERSION = '1.0.0';
const SHARE_FILENAME = 'shares.json';

export class ShareManager {
  private libraryPath: string;
  private sharePath: string;
  private cache: ShareTokenCache | null = null;

  constructor(libraryPath: string) {
    this.libraryPath = libraryPath;
    this.sharePath = path.join(libraryPath, SHARE_FILENAME);
  }

  /**
   * Load share tokens from file
   */
  async load(): Promise<ShareTokenCache> {
    try {
      const data = await fs.readFile(this.sharePath, 'utf-8');
      this.cache = JSON.parse(data, (key, value) => {
        if (key === 'createdAt' || key === 'expiresAt') {
          return value ? new Date(value) : value;
        }
        return value;
      });

      if (!this.cache) {
        throw new Error('Failed to parse share tokens');
      }

      return this.cache;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        this.cache = this.createEmptyCache();
        await this.save();
        return this.cache;
      }
      throw error;
    }
  }

  /**
   * Save share tokens to file
   */
  async save(): Promise<void> {
    if (!this.cache) {
      throw new Error('No cache to save');
    }

    await fs.mkdir(this.libraryPath, { recursive: true });
    await fs.writeFile(
      this.sharePath,
      JSON.stringify(this.cache, null, 2),
      'utf-8'
    );
  }

  /**
   * Create a new share token for a book
   */
  async createShareToken(bookId: string, expiresInDays?: number): Promise<ShareToken> {
    if (!this.cache) {
      await this.load();
    }

    if (!this.cache) {
      throw new Error('Cache not initialized');
    }

    // Check if a valid token already exists for this book
    const existingToken = this.cache.tokens.find(
      (t) => t.bookId === bookId && this.isTokenValid(t)
    );

    if (existingToken) {
      return existingToken;
    }

    // Generate new token
    const token = crypto.randomUUID();
    const now = new Date();
    const expiresAt = expiresInDays
      ? new Date(now.getTime() + expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    const shareToken: ShareToken = {
      token,
      bookId,
      createdAt: now,
      expiresAt,
    };

    this.cache.tokens.push(shareToken);
    await this.save();

    return shareToken;
  }

  /**
   * Get share token by token string
   */
  async getShareToken(token: string): Promise<ShareToken | null> {
    // Always reload from disk to ensure fresh data
    await this.load();

    const shareToken = this.cache?.tokens.find((t) => t.token === token);

    if (!shareToken) {
      return null;
    }

    if (!this.isTokenValid(shareToken)) {
      return null;
    }

    return shareToken;
  }

  /**
   * Get share token for a book
   */
  async getShareTokenForBook(bookId: string): Promise<ShareToken | null> {
    // Always reload from disk to ensure fresh data
    await this.load();

    const shareToken = this.cache?.tokens.find(
      (t) => t.bookId === bookId && this.isTokenValid(t)
    );

    return shareToken || null;
  }

  /**
   * Revoke a share token
   */
  async revokeShareToken(token: string): Promise<boolean> {
    if (!this.cache) {
      await this.load();
    }

    if (!this.cache) {
      throw new Error('Cache not initialized');
    }

    const initialLength = this.cache.tokens.length;
    this.cache.tokens = this.cache.tokens.filter((t) => t.token !== token);

    if (this.cache.tokens.length < initialLength) {
      await this.save();
      return true;
    }

    return false;
  }

  /**
   * Revoke all share tokens for a book
   */
  async revokeShareTokensForBook(bookId: string): Promise<number> {
    if (!this.cache) {
      await this.load();
    }

    if (!this.cache) {
      throw new Error('Cache not initialized');
    }

    const initialLength = this.cache.tokens.length;
    this.cache.tokens = this.cache.tokens.filter((t) => t.bookId !== bookId);
    const removedCount = initialLength - this.cache.tokens.length;

    if (removedCount > 0) {
      await this.save();
    }

    return removedCount;
  }

  /**
   * Clean up expired tokens
   */
  async cleanupExpiredTokens(): Promise<number> {
    if (!this.cache) {
      await this.load();
    }

    if (!this.cache) {
      throw new Error('Cache not initialized');
    }

    const initialLength = this.cache.tokens.length;
    this.cache.tokens = this.cache.tokens.filter((t) => this.isTokenValid(t));
    const removedCount = initialLength - this.cache.tokens.length;

    if (removedCount > 0) {
      await this.save();
    }

    return removedCount;
  }

  /**
   * Check if a token is still valid
   */
  private isTokenValid(token: ShareToken): boolean {
    if (!token.expiresAt) {
      return true; // Never expires
    }
    return new Date() < token.expiresAt;
  }

  /**
   * Create empty cache
   */
  private createEmptyCache(): ShareTokenCache {
    return {
      version: SHARE_VERSION,
      tokens: [],
    };
  }
}

// Singleton instance
let shareManager: ShareManager | null = null;

/**
 * Get share manager instance
 */
export function getShareManager(): ShareManager {
  if (!shareManager) {
    const libraryPath = process.env.LIBRARY_PATH || './library';
    shareManager = new ShareManager(libraryPath);
  }
  return shareManager;
}
