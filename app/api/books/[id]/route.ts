import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { getMetadataManager } from '@/lib/metadata-manager';
import { getBooksPath } from '@/lib/paths';
import { auth } from '@/auth';
import { generateBookFolderName } from '@/lib/types';

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
    // Force reload from file to ensure fresh data
    await metadataManager.load();
    const book = await metadataManager.getBook(bookId);

    if (!book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    // Verify ownership
    if (book.userId !== session.user?.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const booksPath = getBooksPath();

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

export async function PUT(
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

    const body = await request.json();
    const { title, author } = body;

    if (!title || !author) {
      return NextResponse.json(
        { error: 'Title and author are required' },
        { status: 400 }
      );
    }

    const metadataManager = getMetadataManager();
    // Force reload from file to ensure fresh data
    await metadataManager.load();
    const book = await metadataManager.getBook(bookId);

    if (!book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    // Verify ownership
    if (book.userId !== session.user?.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const booksPath = getBooksPath();
    const titleChanged = book.title !== title;
    const authorChanged = book.author !== author;

    // If title or author changed, we need to rename the folder and update file paths
    if (titleChanged || authorChanged) {
      // Get current folder path from first format
      if (book.formats.length === 0) {
        return NextResponse.json(
          { error: 'Book has no formats' },
          { status: 400 }
        );
      }

      const normalizedFirstPath = book.formats[0].filePath.replace(/\\/g, '/');
      const oldFolderName = path.dirname(normalizedFirstPath);
      const oldFolderPath = path.join(booksPath, oldFolderName);

      // Generate new folder name
      const newFolderName = generateBookFolderName(title, author);
      const newFolderPath = path.join(booksPath, newFolderName);

      // Check if new folder already exists (and it's not the same folder)
      if (oldFolderName !== newFolderName) {
        try {
          await fs.access(newFolderPath);
          // Folder exists, this is a conflict
          return NextResponse.json(
            { error: 'A book with this title and author already exists' },
            { status: 409 }
          );
        } catch {
          // Folder doesn't exist, we can proceed with rename
        }

        // Rename the folder
        await fs.rename(oldFolderPath, newFolderPath);

        // Update all format file paths
        book.formats = book.formats.map((format) => {
          const fileName = path.basename(format.filePath);
          return {
            ...format,
            filePath: `${newFolderName}/${fileName}`,
          };
        });
      }
    }

    // Update book metadata
    book.title = title;
    book.author = author;
    book.updatedDate = new Date();

    await metadataManager.upsertBook(book);

    return NextResponse.json({
      success: true,
      book,
    });
  } catch (error) {
    console.error('Error updating book:', error);
    return NextResponse.json(
      {
        error: 'Failed to update book',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
