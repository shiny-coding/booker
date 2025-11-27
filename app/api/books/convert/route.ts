import { NextRequest, NextResponse } from 'next/server';
import { convertBookFormat, isConversionAvailable } from '@/lib/book-converter';
import { getMetadataManager } from '@/lib/metadata-manager';
import { auth } from '@/auth';
import { BookFormat } from '@/lib/types';

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isConversionAvailable()) {
    return NextResponse.json(
      {
        error: 'Conversion service unavailable',
        message: 'Calibre is not installed or calibre-node is not available',
      },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const { bookId, sourceFormat, targetFormat, sourcePath } = body;

    if (!bookId || !sourceFormat || !targetFormat || !sourcePath) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify ownership
    const metadataManager = getMetadataManager();
    const book = await metadataManager.getBook(bookId);

    if (!book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    if (book.userId !== session.user?.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const job = await convertBookFormat(
      bookId,
      sourceFormat as BookFormat,
      targetFormat as BookFormat,
      sourcePath
    );

    return NextResponse.json({
      success: true,
      jobId: job.id,
      job,
    });
  } catch (error) {
    console.error('Error converting book:', error);
    return NextResponse.json(
      {
        error: 'Failed to convert book',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
