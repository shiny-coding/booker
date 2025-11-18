import { NextRequest, NextResponse } from 'next/server';
import { getMetadataManager } from '@/lib/metadata-manager';
import { auth } from '@/auth';

export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const tags = searchParams.get('tags')?.split(',').filter(Boolean);
    const formats = searchParams.get('formats')?.split(',').filter(Boolean);
    const author = searchParams.get('author');

    const metadataManager = getMetadataManager();

    let books = await metadataManager.getBooks();

    // Apply search
    if (search) {
      books = await metadataManager.searchBooks(search);
    }

    // Apply filters
    if (tags || formats || author) {
      books = await metadataManager.filterBooks({ tags, formats, author });
    }

    return NextResponse.json({ books });
  } catch (error) {
    console.error('Error fetching books:', error);
    return NextResponse.json(
      { error: 'Failed to fetch books' },
      { status: 500 }
    );
  }
}
