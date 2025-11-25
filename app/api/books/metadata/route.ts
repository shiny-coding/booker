import { NextResponse } from 'next/server';
import { getMetadataManager } from '@/lib/metadata-manager';
import { auth } from '@/auth';

export async function GET() {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const metadataManager = getMetadataManager();

    // Force reload from file to ensure fresh data
    await metadataManager.load();

    const [tags, authors] = await Promise.all([
      metadataManager.getAllTags(),
      metadataManager.getAllAuthors(),
    ]);

    return NextResponse.json({
      tags,
      authors,
    });
  } catch (error) {
    console.error('Error fetching metadata:', error);
    return NextResponse.json(
      { error: 'Failed to fetch metadata' },
      { status: 500 }
    );
  }
}
