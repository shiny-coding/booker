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
    const userId = session.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'User ID not found' }, { status: 401 });
    }

    // Force reload from file to ensure fresh data
    await metadataManager.load();

    let books = await metadataManager.getBooks();

    // Filter by current user
    books = books.filter((book) => book.userId === userId);

    // Apply search
    if (search) {
      const searchResults = await metadataManager.searchBooks(search);
      books = searchResults.filter((book) => book.userId === userId);
    }

    // Apply filters
    if (tags || formats || author) {
      const filteredBooks = await metadataManager.filterBooks({ tags, formats, author: author || undefined });
      books = filteredBooks.filter((book) => book.userId === userId);
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
