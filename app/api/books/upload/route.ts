import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { getMetadataManager } from '@/lib/metadata-manager';
import { auth } from '@/auth';
import {
  generateBookFolderName,
  getFormatFromFilename,
  isSupportedFormat,
  cleanUploadedFilename,
  type Book,
  type BookFormatInfo,
} from '@/lib/types';

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const title = formData.get('title') as string;
    const author = formData.get('author') as string;
    const tags = formData.get('tags') as string;
    const description = formData.get('description') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!title || !author) {
      return NextResponse.json(
        { error: 'Title and author are required' },
        { status: 400 }
      );
    }

    // Check file format
    const format = getFormatFromFilename(file.name);
    if (!format || !isSupportedFormat(format)) {
      return NextResponse.json(
        { error: 'Unsupported file format' },
        { status: 400 }
      );
    }

    // Generate folder name and paths
    const folderName = generateBookFolderName(title, author);
    const booksPath = process.env.BOOKS_PATH || './library/books';
    const bookFolderPath = path.join(booksPath, folderName);

    // Create book folder
    await fs.mkdir(bookFolderPath, { recursive: true });

    // Save file with cleaned original filename
    const fileName = cleanUploadedFilename(file.name);
    const filePath = path.join(bookFolderPath, fileName);
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await fs.writeFile(filePath, buffer);

    // Get file stats
    const stats = await fs.stat(filePath);

    // Create book metadata
    const bookId = uuidv4();
    // Always use forward slashes in stored paths for cross-platform compatibility
    const relativeFilePath = `${folderName}/${fileName}`;
    const formatInfo: BookFormatInfo = {
      format,
      filePath: relativeFilePath,
      fileName,
      fileSize: stats.size,
      isOriginal: true,
      addedDate: new Date(),
    };

    const book: Book = {
      id: bookId,
      title,
      author,
      tags: tags ? tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
      formats: [formatInfo],
      description: description || undefined,
      addedDate: new Date(),
      updatedDate: new Date(),
    };

    // Save to metadata
    const metadataManager = getMetadataManager();
    await metadataManager.upsertBook(book);

    return NextResponse.json({
      success: true,
      book,
    });
  } catch (error) {
    console.error('Error uploading book:', error);
    return NextResponse.json(
      {
        error: 'Failed to upload book',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
