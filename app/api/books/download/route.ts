import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { getMetadataManager } from '@/lib/metadata-manager';
import { getBooksPath } from '@/lib/paths';
import { auth } from '@/auth';

export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const bookId = searchParams.get('bookId');
    const format = searchParams.get('format');

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

    // Verify ownership
    if (book.userId !== session.user?.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const formatInfo = book.formats.find((f) => f.format === format);

    if (!formatInfo) {
      return NextResponse.json(
        { error: `Format ${format} not found for this book` },
        { status: 404 }
      );
    }

    const booksPath = getBooksPath();
    // Normalize path separators (handle Windows backslashes)
    const normalizedFilePath = formatInfo.filePath.replace(/\\/g, '/');
    const filePath = path.join(booksPath, normalizedFilePath);

    try {
      const fileBuffer = await fs.readFile(filePath);

      const headers = new Headers();
      headers.set('Content-Type', getContentType(format));
      // Encode filename for Content-Disposition header (RFC 5987)
      const encodedFilename = encodeURIComponent(formatInfo.fileName);
      headers.set(
        'Content-Disposition',
        `attachment; filename*=UTF-8''${encodedFilename}`
      );
      headers.set('Content-Length', String(fileBuffer.length));

      return new NextResponse(fileBuffer, { headers });
    } catch (error) {
      console.error('Error reading file:', error);
      return NextResponse.json(
        { error: 'File not found on disk' },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error('Error downloading book:', error);
    return NextResponse.json(
      { error: 'Failed to download book' },
      { status: 500 }
    );
  }
}

function getContentType(format: string): string {
  const contentTypes: Record<string, string> = {
    epub: 'application/epub+zip',
    pdf: 'application/pdf',
    mobi: 'application/x-mobipocket-ebook',
    azw: 'application/vnd.amazon.ebook',
    azw3: 'application/vnd.amazon.ebook',
    txt: 'text/plain',
  };

  return contentTypes[format.toLowerCase()] || 'application/octet-stream';
}
