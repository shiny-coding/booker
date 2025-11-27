import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { getMetadataManager } from '@/lib/metadata-manager';
import { auth } from '@/auth';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id: bookId } = await params;

    if (!bookId) {
      return NextResponse.json(
        { error: 'Missing book ID' },
        { status: 400 }
      );
    }

    const metadataManager = getMetadataManager();
    const book = await metadataManager.getBook(bookId);

    if (!book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    // Verify ownership
    if (book.userId !== session.user?.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const booksPath = process.env.BOOKS_PATH || './library/books';

    // Delete all format files
    for (const format of book.formats) {
      // Normalize path separators (handle Windows backslashes)
      const normalizedFilePath = format.filePath.replace(/\\/g, '/');
      const filePath = path.join(booksPath, normalizedFilePath);
      try {
        await fs.unlink(filePath);
      } catch (error) {
        console.error(`Error deleting file ${filePath}:`, error);
        // Continue even if file doesn't exist
      }
    }

    // Try to delete the book's directory if it exists and is empty
    if (book.formats.length > 0) {
      const normalizedFirstPath = book.formats[0].filePath.replace(/\\/g, '/');
      const bookDir = path.join(
        booksPath,
        path.dirname(normalizedFirstPath)
      );
      try {
        await fs.rmdir(bookDir);
      } catch (error) {
        console.error(`Error deleting directory ${bookDir}:`, error);
        // Directory might not be empty or might not exist, that's ok
      }
    }

    // Remove book from metadata
    await metadataManager.removeBook(bookId);

    // Force reload of metadata cache to ensure fresh data
    await metadataManager.load();

    return NextResponse.json(
      {
        message: 'Book deleted successfully',
        bookId,
      },
      {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      }
    );
  } catch (error) {
    console.error('Error deleting book:', error);
    return NextResponse.json(
      { error: 'Failed to delete book' },
      { status: 500 }
    );
  }
}
