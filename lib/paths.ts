import path from 'path';

/**
 * Centralized path configuration for the application.
 * All paths default to ./data directory structure.
 */

/** Base library/data path */
export function getLibraryPath(): string {
  return process.env.LIBRARY_PATH || './data';
}

/** Path where books are stored */
export function getBooksPath(): string {
  return process.env.BOOKS_PATH || path.join(getLibraryPath(), 'books');
}

/** Path where cover images are stored */
export function getCoversPath(): string {
  return process.env.COVERS_PATH || path.join(getLibraryPath(), 'covers');
}

/** Path for metadata.json file */
export function getMetadataPath(): string {
  return path.join(getLibraryPath(), 'metadata.json');
}

/** Path for users.json file */
export function getUsersPath(): string {
  return path.join(getLibraryPath(), 'users.json');
}

/** Path for share-tokens.json file */
export function getShareTokensPath(): string {
  return path.join(getLibraryPath(), 'share-tokens.json');
}
