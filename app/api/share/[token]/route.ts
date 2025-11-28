import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { getMetadataManager } from '@/lib/metadata-manager';
import { getShareManager } from '@/lib/share-manager';
import { getBooksPath } from '@/lib/paths';

// GET - Get book info for shared link (no auth required)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    if (!token) {
      return NextResponse.json(
        { error: 'Missing share token' },
        { status: 400 }
      );
    }

    const shareManager = getShareManager();
    const shareToken = await shareManager.getShareToken(token);

    if (!shareToken) {
      return NextResponse.json(
        { error: 'Invalid or expired share link' },
        { status: 404 }
      );
    }

    const metadataManager = getMetadataManager();
    const book = await metadataManager.getBook(shareToken.bookId);

    if (!book) {
      return NextResponse.json(
        { error: 'Book no longer exists' },
        { status: 404 }
      );
    }

    // Return book info (excluding internal paths)
    return NextResponse.json({
      book: {
        id: book.id,
        title: book.title,
        author: book.author,
        description: book.description,
        tags: book.tags,
        formats: book.formats.map((f) => ({
          format: f.format,
          fileName: f.fileName,
          fileSize: f.fileSize,
        })),
      },
      expiresAt: shareToken.expiresAt,
    });
  } catch (error) {
    console.error('Error fetching shared book:', error);
    return NextResponse.json(
      { error: 'Failed to fetch book info' },
      { status: 500 }
    );
  }
}

// POST - Download a specific format (no auth required)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  let token: string | undefined;
  let format: string | undefined;

  try {
    const resolvedParams = await params;
    token = resolvedParams.token;
    const body = await request.json();
    format = body.format;

    if (!token) {
      return NextResponse.json(
        { error: 'Missing share token' },
        { status: 400 }
      );
    }

    if (!format) {
      return NextResponse.json(
        { error: 'Missing format' },
        { status: 400 }
      );
    }

    const shareManager = getShareManager();
    const shareToken = await shareManager.getShareToken(token);

    if (!shareToken) {
      return NextResponse.json(
        { error: 'Invalid or expired share link' },
        { status: 404 }
      );
    }

    const metadataManager = getMetadataManager();
    const book = await metadataManager.getBook(shareToken.bookId);

    if (!book) {
      return NextResponse.json(
        { error: 'Book no longer exists' },
        { status: 404 }
      );
    }

    const formatInfo = book.formats.find((f) => f.format === format);

    if (!formatInfo) {
      return NextResponse.json(
        { error: `Format ${format} not available for this book` },
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
    console.error('Error downloading shared book:', error, { token, format });
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
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  };

  return contentTypes[format.toLowerCase()] || 'application/octet-stream';
}
