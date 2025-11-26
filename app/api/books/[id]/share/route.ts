import { NextRequest, NextResponse } from 'next/server';
import { getMetadataManager } from '@/lib/metadata-manager';
import { getShareManager } from '@/lib/share-manager';
import { auth } from '@/auth';

export async function POST(
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

    const shareManager = getShareManager();
    const shareToken = await shareManager.createShareToken(bookId);

    const baseUrl = request.headers.get('origin') || request.nextUrl.origin;
    const shareUrl = `${baseUrl}/share/${shareToken.token}`;

    return NextResponse.json({
      token: shareToken.token,
      shareUrl,
      expiresAt: shareToken.expiresAt,
      book: {
        id: book.id,
        title: book.title,
        author: book.author,
      },
    });
  } catch (error) {
    console.error('Error creating share link:', error);
    return NextResponse.json(
      { error: 'Failed to create share link' },
      { status: 500 }
    );
  }
}

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

    const shareManager = getShareManager();
    const removedCount = await shareManager.revokeShareTokensForBook(bookId);

    return NextResponse.json({
      message: 'Share links revoked',
      removedCount,
    });
  } catch (error) {
    console.error('Error revoking share links:', error);
    return NextResponse.json(
      { error: 'Failed to revoke share links' },
      { status: 500 }
    );
  }
}
