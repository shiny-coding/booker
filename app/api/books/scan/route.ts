import { NextResponse } from 'next/server';
import { scanBooksDirectory } from '@/lib/book-scanner';
import { auth } from '@/auth';

export async function POST() {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log('Starting book directory scan...');
    const books = await scanBooksDirectory();
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
