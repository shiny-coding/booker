import path from 'path';

/**
 * Centralized path configuration for the application.
 * All paths default to ./data directory structure.
 */

/** Base data path */
export function getDataPath(): string {
  return process.env.DATA_PATH || './data';
}

/** @deprecated Use getDataPath() instead */
export function getLibraryPath(): string {
  return getDataPath();
}

/** Path where books are stored */
export function getBooksPath(): string {
  return process.env.BOOKS_PATH || path.join(getDataPath(), 'books');
}

/** Path where cover images are stored */
export function getCoversPath(): string {
  return process.env.COVERS_PATH || path.join(getDataPath(), 'covers');
}

/** Path for metadata.json file */
export function getMetadataPath(): string {
  return path.join(getDataPath(), 'metadata.json');
}

/** Path for users.json file */
export function getUsersPath(): string {
  return path.join(getDataPath(), 'users.json');
}

/** Path for share-tokens.json file */
export function getShareTokensPath(): string {
  return path.join(getDataPath(), 'share-tokens.json');
}
