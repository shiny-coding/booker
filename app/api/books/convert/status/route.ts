import { NextRequest, NextResponse } from 'next/server';
import { getBookConverter } from '@/lib/book-converter';
import { getMetadataManager } from '@/lib/metadata-manager';
import { auth } from '@/auth';

export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');

    if (!jobId) {
      return NextResponse.json(
        { error: 'Missing jobId parameter' },
        { status: 400 }
      );
    }

    const converter = getBookConverter();
    const job = converter.getJob(jobId);

    if (!job) {
      // Job not found in memory - check if it might have completed
      // by looking at recent conversions across all books
      const metadataManager = getMetadataManager();
      const allBooks = await metadataManager.getBooks();

      // Check if any book has a recently added format (within last 5 minutes)
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const recentConversion = allBooks.some(book =>
        book.formats.some(format =>
          !format.isOriginal &&
          new Date(format.addedDate) > fiveMinutesAgo
        )
      );

      if (recentConversion) {
        // Likely completed but job was lost due to server reload
        return NextResponse.json({
          id: jobId,
          status: 'completed',
          progress: 100,
          message: 'Conversion completed (job tracking was lost due to server restart)',
        });
      }

      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    // Calculate progress based on status
    let progress = 0;
    if (job.status === 'pending') {
      progress = 10;
    } else if (job.status === 'processing') {
      progress = 50;
    } else if (job.status === 'completed') {
      progress = 100;
    } else if (job.status === 'failed') {
      progress = 0;
    }

    return NextResponse.json({
      id: job.id,
      status: job.status,
      progress,
      bookId: job.bookId,
      sourceFormat: job.sourceFormat,
      targetFormat: job.targetFormat,
      error: job.error,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
    });
  } catch (error) {
    console.error('Error fetching conversion status:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch conversion status',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
