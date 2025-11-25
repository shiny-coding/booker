import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { getMetadataManager } from '@/lib/metadata-manager';
import { auth } from '@/auth';
import type { BookFormat } from '@/lib/types';

export async function DELETE(request: NextRequest) {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { bookId, format } = body;

    if (!bookId || !format) {
      return NextResponse.json(
        { error: 'Missing bookId or format' },
        { status: 400 }
      );
    }

    const metadataManager = getMetadataManager();
    const book = await metadataManager.getBook(bookId);

    if (!book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    // Find the format to delete
    const formatInfo = book.formats.find((f) => f.format === format);

    if (!formatInfo) {
      return NextResponse.json(
        { error: `Format ${format} not found for this book` },
        { status: 404 }
      );
    }

    // Prevent deletion if it's the only format
    if (book.formats.length === 1) {
      return NextResponse.json(
        { error: 'Cannot delete the last remaining format. A book must have at least one format.' },
        { status: 400 }
      );
    }

    const booksPath = process.env.BOOKS_PATH || './library/books';
    const filePath = path.join(booksPath, formatInfo.filePath);

    // Delete the file
    try {
      await fs.unlink(filePath);
    } catch (error) {
      console.error('Error deleting file:', error);
      // Continue even if file doesn't exist
    }

    // Remove format from book metadata
    book.formats = book.formats.filter((f) => f.format !== format);
    book.updatedDate = new Date();

    await metadataManager.upsertBook(book);

    return NextResponse.json({
      message: 'Format deleted successfully',
      book: {
        id: book.id,
        title: book.title,
        formats: book.formats,
      },
    });
  } catch (error) {
    console.error('Error deleting format:', error);
    return NextResponse.json(
      { error: 'Failed to delete format' },
      { status: 500 }
    );
  }
}
