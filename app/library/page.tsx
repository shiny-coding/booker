'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BookCard } from '@/components/book-card';
import { FilterPanel } from '@/components/filter-panel';
import { UploadDialog } from '@/components/upload-dialog';
import { ThemeToggle } from '@/components/theme-toggle';
import { signOut } from 'next-auth/react';
import type { Book } from '@/lib/types';

export default function LibraryPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [filteredBooks, setFilteredBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    fetchBooks();
    fetchMetadata();
  }, []);

  useEffect(() => {
    filterBooks();
  }, [books, search, selectedTags]);

  const fetchBooks = async () => {
    try {
      const response = await fetch('/api/books');
      if (response.ok) {
        const data = await response.json();
        setBooks(data.books);
      }
    } catch (error) {
      console.error('Error fetching books:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMetadata = async () => {
    try {
      const response = await fetch('/api/books/metadata');
      if (response.ok) {
        const data = await response.json();
        setAvailableTags(data.tags);
      }
    } catch (error) {
      console.error('Error fetching metadata:', error);
    }
  };

  const handleScan = async () => {
    setScanning(true);
    try {
      const response = await fetch('/api/books/scan', { method: 'POST' });
      if (response.ok) {
        await fetchBooks();
        await fetchMetadata();
      }
    } catch (error) {
      console.error('Error scanning:', error);
    } finally {
      setScanning(false);
    }
  };

  const filterBooks = () => {
    let filtered = books;

    // Search filter
    if (search) {
      const lowerSearch = search.toLowerCase();
      filtered = filtered.filter(
        (book) =>
          book.title.toLowerCase().includes(lowerSearch) ||
          book.author.toLowerCase().includes(lowerSearch) ||
          book.tags.some((tag) => tag.toLowerCase().includes(lowerSearch))
      );
    }

    // Tags filter
    if (selectedTags.length > 0) {
      filtered = filtered.filter((book) =>
        selectedTags.every((tag) => book.tags.includes(tag))
      );
    }

    setFilteredBooks(filtered);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Bookstore</h1>
            <p className="text-sm text-muted-foreground">
              {filteredBooks.length} of {books.length} books
            </p>
          </div>
          <div className="flex gap-2">
            <UploadDialog onUploadSuccess={fetchBooks} />
            <Button onClick={handleScan} disabled={scanning} variant="outline">
              {scanning ? 'Scanning...' : 'Scan Library'}
            </Button>
            <ThemeToggle />
            <Button onClick={() => signOut()} variant="outline">
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Sidebar - Filters */}
          <aside className="w-full md:w-64 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Search</CardTitle>
              </CardHeader>
              <CardContent>
                <Input
                  placeholder="Search books..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </CardContent>
            </Card>

            <FilterPanel
              availableTags={availableTags}
              selectedTags={selectedTags}
              onTagsChange={setSelectedTags}
            />
          </aside>

          {/* Main Content - Books Grid */}
          <main className="flex-1">
            {loading ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Loading books...</p>
              </div>
            ) : filteredBooks.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground mb-4">
                    {books.length === 0
                      ? 'No books found. Upload a book or scan your library to get started.'
                      : 'No books match your filters.'}
                  </p>
                  {books.length === 0 && (
                    <div className="flex gap-2 justify-center">
                      <UploadDialog onUploadSuccess={fetchBooks} />
                      <Button onClick={handleScan} variant="outline">
                        Scan Library
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredBooks.map((book) => (
                  <BookCard key={book.id} book={book} onUpdate={fetchBooks} />
                ))}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
