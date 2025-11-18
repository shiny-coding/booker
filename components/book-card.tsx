'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Book, BookFormat } from '@/lib/types';
import { CONVERSION_MATRIX } from '@/lib/types';

interface BookCardProps {
  book: Book;
  onUpdate: () => void;
}

export function BookCard({ book, onUpdate }: BookCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [converting, setConverting] = useState<BookFormat | null>(null);

  const handleDownload = async (format: BookFormat) => {
    try {
      const response = await fetch(
        `/api/books/download?bookId=${book.id}&format=${format}`
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${book.title}.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert('Failed to download book');
      }
    } catch (error) {
      console.error('Error downloading:', error);
      alert('Failed to download book');
    }
  };

  const handleConvert = async (sourceFormat: BookFormat, targetFormat: BookFormat) => {
    setConverting(targetFormat);

    try {
      const formatInfo = book.formats.find((f) => f.format === sourceFormat);
      if (!formatInfo) {
        return;
      }

      const response = await fetch('/api/books/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookId: book.id,
          sourceFormat,
          targetFormat,
          sourcePath: formatInfo.filePath,
        }),
      });

      if (response.ok) {
        alert(`Conversion started. This may take a few minutes.`);
        // Poll for updates or refresh
        setTimeout(() => {
          onUpdate();
        }, 5000);
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to convert book');
      }
    } catch (error) {
      console.error('Error converting:', error);
      alert('Failed to convert book');
    } finally {
      setConverting(null);
    }
  };

  const getAvailableConversions = (sourceFormat: BookFormat): BookFormat[] => {
    const availableFormats = CONVERSION_MATRIX[sourceFormat] || [];
    // Filter out formats that already exist
    return availableFormats.filter(
      (format) => !book.formats.some((f) => f.format === format)
    );
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <>
      <Card
        className="cursor-pointer hover:shadow-lg transition-shadow"
        onClick={() => setExpanded(true)}
      >
        <CardHeader>
          <CardTitle className="line-clamp-2">{book.title}</CardTitle>
          <CardDescription>{book.author}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-1 mb-3">
            {book.formats.map((format) => (
              <Badge key={format.format} variant="secondary">
                {format.format.toUpperCase()}
              </Badge>
            ))}
          </div>
          {book.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {book.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {book.tags.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{book.tags.length - 3}
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={expanded} onOpenChange={setExpanded}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">{book.title}</DialogTitle>
            <DialogDescription>by {book.author}</DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Description */}
            {book.description && (
              <div>
                <h3 className="font-semibold mb-2">Description</h3>
                <p className="text-sm text-muted-foreground">{book.description}</p>
              </div>
            )}

            {/* Tags */}
            {book.tags.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Tags</h3>
                <div className="flex flex-wrap gap-1">
                  {book.tags.map((tag) => (
                    <Badge key={tag} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Available Formats */}
            <div>
              <h3 className="font-semibold mb-2">Available Formats</h3>
              <div className="space-y-2">
                {book.formats.map((format) => {
                  const availableConversions = getAvailableConversions(format.format);

                  return (
                    <div
                      key={format.format}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Badge>{format.format.toUpperCase()}</Badge>
                        <div className="text-sm">
                          <div className="font-medium">{format.fileName}</div>
                          <div className="text-muted-foreground">
                            {formatFileSize(format.fileSize)}
                            {format.isOriginal && (
                              <span className="ml-2 text-xs">(Original)</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownload(format.format);
                          }}
                        >
                          Download
                        </Button>

                        {availableConversions.length > 0 && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={converting !== null}
                              >
                                {converting === format.format ? 'Converting...' : 'Convert'}
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              {availableConversions.map((targetFormat) => (
                                <DropdownMenuItem
                                  key={targetFormat}
                                  onClick={() => handleConvert(format.format, targetFormat)}
                                >
                                  Convert to {targetFormat.toUpperCase()}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Metadata */}
            <div className="text-xs text-muted-foreground">
              <div>Added: {new Date(book.addedDate).toLocaleDateString()}</div>
              <div>Updated: {new Date(book.updatedDate).toLocaleDateString()}</div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
