import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { getMetadataManager } from '@/lib/metadata-manager';
import { getShareManager } from '@/lib/share-manager';
import { getBooksPath } from '@/lib/paths';

// GET - Render a shared HTML book inline in the browser (no auth required).
//
// The file is user-uploaded HTML served from this app's own origin, which would
// normally make it a stored-XSS vector against anyone who opens the link. We
// neutralize that with a `sandbox` Content-Security-Policy: the document is
// loaded into an opaque origin, so its scripts run for rendering but cannot read
// booker's cookies/session/storage or call same-origin APIs.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    if (!token) {
      return NextResponse.json({ error: 'Missing share token' }, { status: 400 });
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
      return NextResponse.json({ error: 'Book no longer exists' }, { status: 404 });
    }

    const formatInfo = book.formats.find((f) => f.format === 'html');

    if (!formatInfo) {
      return NextResponse.json(
        { error: 'This book has no HTML format to view' },
        { status: 404 }
      );
    }

    const booksPath = getBooksPath();
    // Normalize path separators (handle Windows backslashes)
    const normalizedFilePath = formatInfo.filePath.replace(/\\/g, '/');
    const filePath = path.join(booksPath, normalizedFilePath);

    const fileBuffer = await fs.readFile(filePath);

    const headers = new Headers();
    headers.set('Content-Type', 'text/html; charset=utf-8');
    headers.set('Content-Disposition', 'inline');
    headers.set('Content-Length', String(fileBuffer.length));
    headers.set('X-Content-Type-Options', 'nosniff');
    // Sandbox the document into an opaque origin. `allow-scripts` lets the page's
    // own JS run for rendering; we deliberately omit `allow-same-origin` so it
    // cannot reach booker's cookies/session/APIs.
    headers.set(
      'Content-Security-Policy',
      'sandbox allow-scripts allow-popups allow-forms'
    );

    return new NextResponse(fileBuffer, { headers });
  } catch (error) {
    console.error('Error viewing shared HTML book:', error);
    return NextResponse.json(
      { error: 'Failed to open book' },
      { status: 500 }
    );
  }
}
