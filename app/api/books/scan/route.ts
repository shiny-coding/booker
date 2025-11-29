import { NextResponse } from 'next/server';
import { scanBooksDirectory } from '@/lib/book-scanner';
import { getMetadataManager } from '@/lib/metadata-manager';
import { auth } from '@/auth';

export async function POST() {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user?.id;
  if (!userId) {
    return NextResponse.json({ error: 'User ID not found' }, { status: 401 });
  }

  try {
    console.log('Starting book directory scan...');
    const books = await scanBooksDirectory();

    // Assign current user as owner of all scanned books
    const metadataManager = getMetadataManager();
    for (const book of books) {
      book.userId = userId;
      await metadataManager.upsertBook(book);
    }

    console.log(`Scan complete. Found ${books.length} books.`);

    return NextResponse.json({
      success: true,
      message: `Scan complete. Found ${books.length} books.`,
      count: books.length,
    });
  } catch (error) {
    console.error('Error scanning books:', error);
    return NextResponse.json(
      {
        error: 'Failed to scan books directory',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
