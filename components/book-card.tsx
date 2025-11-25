'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
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
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2, Trash2 } from 'lucide-react';
import type { Book, BookFormat } from '@/lib/types';
import { CONVERSION_MATRIX } from '@/lib/types';

interface BookCardProps {
  book: Book;
  onUpdate: () => void;
}

interface ConversionJob {
  id: string;
  targetFormat: BookFormat;
  progress: number;
}

export function BookCard({ book, onUpdate }: BookCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [conversionJobs, setConversionJobs] = useState<ConversionJob[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteBookDialogOpen, setDeleteBookDialogOpen] = useState(false);
  const [formatToDelete, setFormatToDelete] = useState<BookFormat | null>(null);

  const handleDownload = async (format: BookFormat) => {
    const downloadToast = toast.loading(`Downloading ${format.toUpperCase()}...`);

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
        toast.success('Download complete!', { id: downloadToast });
      } else {
        toast.error('Failed to download book', { id: downloadToast });
      }
    } catch (error) {
      console.error('Error downloading:', error);
      toast.error('Failed to download book', { id: downloadToast });
    }
  };

  const handleConvert = async (sourceFormat: BookFormat, targetFormat: BookFormat) => {
    const conversionToast = toast.loading(`Converting to ${targetFormat.toUpperCase()}...`);

    try {
      const formatInfo = book.formats.find((f) => f.format === sourceFormat);
      if (!formatInfo) {
        toast.error('Source format not found', { id: conversionToast });
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
        const data = await response.json();
        const jobId = data.jobId;

        // Add job to tracking
        setConversionJobs(prev => [...prev, { id: jobId, targetFormat, progress: 0 }]);

        // Start polling for conversion status
        pollConversionStatus(jobId, targetFormat, conversionToast);
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to start conversion', { id: conversionToast });
      }
    } catch (error) {
      console.error('Error converting:', error);
      toast.error('Failed to start conversion', { id: conversionToast });
    }
  };

  const pollConversionStatus = async (
    jobId: string,
    targetFormat: BookFormat,
    toastId: string | number
  ) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/books/convert/status?jobId=${jobId}`);
        if (response.ok) {
          const data = await response.json();

          // Update progress
          setConversionJobs(prev =>
            prev.map(job =>
              job.id === jobId ? { ...job, progress: data.progress || 50 } : job
            )
          );

          if (data.status === 'completed') {
            clearInterval(pollInterval);
            setConversionJobs(prev => prev.filter(job => job.id !== jobId));
            toast.success(`Conversion to ${targetFormat.toUpperCase()} complete!`, { id: toastId });
            onUpdate();
          } else if (data.status === 'failed') {
            clearInterval(pollInterval);
            setConversionJobs(prev => prev.filter(job => job.id !== jobId));
            toast.error(data.error || 'Conversion failed', { id: toastId });
          }
        }
      } catch (error) {
        console.error('Error polling conversion status:', error);
      }
    }, 2000); // Poll every 2 seconds

    // Stop polling after 5 minutes
    setTimeout(() => {
      clearInterval(pollInterval);
      setConversionJobs(prev => prev.filter(job => job.id !== jobId));
    }, 300000);
  };

  const handleDeleteFormat = async () => {
    if (!formatToDelete) return;

    const deleteToast = toast.loading(`Deleting ${formatToDelete.format.toUpperCase()}...`);

    try {
      const response = await fetch('/api/books/format', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookId: book.id,
          format: formatToDelete.format,
        }),
      });

      if (response.ok) {
        toast.success('Format deleted successfully', { id: deleteToast });
        setDeleteDialogOpen(false);
        setFormatToDelete(null);
        onUpdate();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to delete format', { id: deleteToast });
      }
    } catch (error) {
      console.error('Error deleting format:', error);
      toast.error('Failed to delete format', { id: deleteToast });
    }
  };

  const handleDeleteBook = async () => {
    const deleteToast = toast.loading('Deleting book...');

    try {
      const response = await fetch(`/api/books/${book.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Book deleted successfully', { id: deleteToast });
        setDeleteBookDialogOpen(false);
        setExpanded(false);
        // Delay the update slightly to ensure dialog closes first
        setTimeout(() => {
          onUpdate();
        }, 100);
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to delete book', { id: deleteToast });
      }
    } catch (error) {
      console.error('Error deleting book:', error);
      toast.error('Failed to delete book', { id: deleteToast });
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

          {/* Conversion progress in collapsed view */}
          {conversionJobs.length > 0 && (
            <div className="mb-3 space-y-2">
              {conversionJobs.map((job) => (
                <div key={job.id} className="space-y-1">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>Converting to {job.targetFormat.toUpperCase()}</span>
                    <span className="ml-auto font-medium">{job.progress}%</span>
                  </div>
                  <Progress value={job.progress} className="h-1" />
                </div>
              ))}
            </div>
          )}

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
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
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
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">Available Formats</h3>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteBookDialogOpen(true);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-2" />
                  Delete Book
                </Button>
              </div>
              <div className="space-y-2">
                {book.formats.map((format) => {
                  const availableConversions = getAvailableConversions(format.format);

                  return (
                    <div
                      key={format.format}
                      className="flex items-start justify-between p-3 border rounded-lg gap-3"
                    >
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <Badge className="shrink-0 mt-0.5">{format.format.toUpperCase()}</Badge>
                        <div className="text-sm min-w-0 flex-1">
                          <div className="font-medium break-words">{format.fileName}</div>
                          <div className="text-muted-foreground">
                            {formatFileSize(format.fileSize)}
                            {format.isOriginal && (
                              <span className="ml-2 text-xs">(Original)</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0">
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
                                disabled={conversionJobs.length > 0}
                              >
                                {conversionJobs.length > 0 ? 'Converting...' : 'Convert'}
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

                        {/* Only allow deletion if book has multiple formats */}
                        {book.formats.length > 1 && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={(e) => {
                              e.stopPropagation();
                              setFormatToDelete(format);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Ongoing Conversions */}
            {conversionJobs.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Converting</h3>
                <div className="space-y-2">
                  {conversionJobs.map((job) => (
                    <div
                      key={job.id}
                      className="flex items-center gap-3 p-3 border rounded-lg bg-muted/50"
                    >
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <div className="flex-1">
                        <div className="text-sm font-medium mb-1">
                          Converting to {job.targetFormat.toUpperCase()}
                        </div>
                        <Progress value={job.progress} className="h-2" />
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {job.progress}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Metadata */}
            <div className="text-xs text-muted-foreground">
              <div>Added: {new Date(book.addedDate).toLocaleDateString()}</div>
              <div>Updated: {new Date(book.updatedDate).toLocaleDateString()}</div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Format</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the {formatToDelete?.format.toUpperCase()} format
              {formatToDelete?.isOriginal && ' (Original)'}?
              This action cannot be undone and will permanently delete the file.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setFormatToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteFormat}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteBookDialogOpen} onOpenChange={setDeleteBookDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Book</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{book.title}"? This will permanently delete all {book.formats.length} format{book.formats.length > 1 ? 's' : ''} and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteBook}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Book
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
