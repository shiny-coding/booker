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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Trash2, Share2, Copy, Check, Download, Code, Pencil } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Book, BookFormat, BookFormatInfo } from '@/lib/types';
import { CONVERSION_MATRIX, SUPPORTED_FORMATS } from '@/lib/types';

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
  const [formatToDelete, setFormatToDelete] = useState<BookFormatInfo | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showEmbed, setShowEmbed] = useState(false);
  const [copiedEmbed, setCopiedEmbed] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editTitle, setEditTitle] = useState(book.title);
  const [editAuthor, setEditAuthor] = useState(book.author);
  const [saving, setSaving] = useState(false);

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

  const handleEditBook = async () => {
    if (!editTitle.trim() || !editAuthor.trim()) {
      toast.error('Title and author are required');
      return;
    }

    setSaving(true);
    const saveToast = toast.loading('Saving changes...');

    try {
      const response = await fetch(`/api/books/${book.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle.trim(),
          author: editAuthor.trim(),
        }),
      });

      if (response.ok) {
        toast.success('Book updated successfully', { id: saveToast });
        setEditDialogOpen(false);
        onUpdate();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to update book', { id: saveToast });
      }
    } catch (error) {
      console.error('Error updating book:', error);
      toast.error('Failed to update book', { id: saveToast });
    } finally {
      setSaving(false);
    }
  };

  const openEditDialog = () => {
    setEditTitle(book.title);
    setEditAuthor(book.author);
    setEditDialogOpen(true);
  };

  const handleShare = async () => {
    setSharing(true);
    setCopied(false);

    try {
      const response = await fetch(`/api/books/${book.id}/share`, {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        setShareUrl(data.shareUrl);
        setShareToken(data.token);
        // Copy to clipboard immediately
        await navigator.clipboard.writeText(data.shareUrl);
        setCopied(true);
        toast.success('Share link copied to clipboard');
        setTimeout(() => setCopied(false), 2000);
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to create share link');
      }
    } catch (error) {
      console.error('Error creating share link:', error);
      toast.error('Failed to create share link');
    } finally {
      setSharing(false);
    }
  };

  const handleCopyShareUrl = async () => {
    if (!shareUrl) return;

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success('Link copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      toast.error('Failed to copy link');
    }
  };

  // Get all formats that this book can potentially have (existing + convertible)
  const getAllPossibleFormats = (): BookFormat[] => {
    const existingFormats = new Set(book.formats.map((f) => f.format));
    const convertibleFormats = new Set<BookFormat>();

    // For each existing format, add what it can be converted to
    book.formats.forEach((f) => {
      const targets = CONVERSION_MATRIX[f.format] || [];
      targets.forEach((t) => convertibleFormats.add(t));
    });

    // Combine existing and convertible, maintaining a consistent order
    const allFormats = new Set<BookFormat>([...existingFormats, ...convertibleFormats]);
    const formatOrder: BookFormat[] = ['epub', 'pdf', 'azw3', 'mobi', 'txt', 'docx', 'azw'];
    return formatOrder.filter((f) => allFormats.has(f));
  };

  // Find the best source format to convert from for a target format
  const getBestSourceFormat = (targetFormat: BookFormat): BookFormat | null => {
    for (const existingFormat of book.formats) {
      const canConvert = CONVERSION_MATRIX[existingFormat.format]?.includes(targetFormat);
      if (canConvert) {
        return existingFormat.format;
      }
    }
    return null;
  };

  // Check if a format is currently being converted
  const isFormatConverting = (format: BookFormat): boolean => {
    return conversionJobs.some((job) => job.targetFormat === format);
  };

  // Handle checkbox click for format conversion or deletion
  const handleFormatToggle = (format: BookFormat, checked: boolean) => {
    if (checked) {
      // Format doesn't exist, need to convert
      const sourceFormat = getBestSourceFormat(format);
      if (sourceFormat) {
        handleConvert(sourceFormat, format);
      }
    } else {
      // Unchecking = delete format (show confirmation)
      const formatInfo = book.formats.find((f) => f.format === format);
      if (formatInfo && book.formats.length > 1) {
        setFormatToDelete(formatInfo);
        setDeleteDialogOpen(true);
      }
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <>
      <Card
        className="cursor-pointer hover:shadow-lg transition-shadow gradient-border"
        onClick={() => setExpanded(true)}
      >
        <CardHeader>
          <CardTitle className="line-clamp-2 text-accent-primary">{book.title}</CardTitle>
          <CardDescription>{book.author}</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Format checkboxes */}
          <div className="flex flex-wrap gap-3 mb-3" onClick={(e) => e.stopPropagation()}>
            {getAllPossibleFormats().map((format) => {
              const exists = book.formats.some((f) => f.format === format);
              const converting = isFormatConverting(format);
              const canDelete = exists && book.formats.length > 1;

              return (
                <div key={format} className="flex items-center gap-1.5">
                  {converting ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  ) : (
                    <Checkbox
                      checked={exists}
                      disabled={exists && !canDelete}
                      onCheckedChange={(checked) => handleFormatToggle(format, checked as boolean)}
                    />
                  )}
                  <span
                    className={`text-xs font-medium select-none ${
                      exists ? 'text-[var(--accent-dark-orange)] cursor-pointer hover:underline' : 'text-muted-foreground'
                    }`}
                    onClick={() => exists && handleDownload(format)}
                  >
                    {format.toUpperCase()}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Conversion progress in collapsed view */}
          {conversionJobs.length > 0 && (
            <div className="mb-3 space-y-2">
              {conversionJobs.map((job) => (
                <div key={job.id} className="space-y-1">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>Converting to {job.targetFormat.toUpperCase()}</span>
                    <span className="ml-auto font-medium">{job.progress}%</span>
                  </div>
                  <Progress value={job.progress} className="h-1" />
                </div>
              ))}
            </div>
          )}

          {book.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
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

          {/* Share and Embed buttons */}
          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
            <Button
              size="sm"
              variant="outline"
              className="flex-1 border-[var(--accent-orange)] text-[var(--accent-dark-orange)] hover:bg-[var(--accent-orange)]/10"
              onClick={handleShare}
              disabled={sharing}
            >
              {sharing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Share2 className="h-4 w-4 mr-2" />
              )}
              {sharing ? 'Creating...' : 'Share'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1 border-[var(--accent-orange)] text-[var(--accent-dark-orange)] hover:bg-[var(--accent-orange)]/10"
              disabled={sharing}
              onClick={async () => {
                let token = shareToken;
                // Create share link first if needed
                if (!token) {
                  try {
                    const response = await fetch(`/api/books/${book.id}/share`, {
                      method: 'POST',
                    });
                    if (response.ok) {
                      const data = await response.json();
                      setShareUrl(data.shareUrl);
                      setShareToken(data.token);
                      token = data.token;
                    } else {
                      toast.error('Failed to create share link');
                      return;
                    }
                  } catch {
                    toast.error('Failed to create share link');
                    return;
                  }
                }
                const code = `<iframe src="${window.location.origin}/api/embed/${token}" width="420" height="${280 + book.formats.length * 56}" frameborder="0" style="border-radius: 12px; max-width: 100%;"></iframe>`;
                await navigator.clipboard.writeText(code);
                toast.success('Embed code copied');
              }}
            >
              <Code className="h-4 w-4 mr-2" />
              Embed
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={expanded} onOpenChange={(open) => {
        setExpanded(open);
        if (!open) {
          setShareUrl(null);
          setShareToken(null);
          setCopied(false);
          setShowEmbed(false);
          setCopiedEmbed(false);
        }
      }}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl gradient-text">{book.title}</DialogTitle>
            <DialogDescription className="text-[var(--accent-dark-orange)]">by {book.author}</DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Description */}
            {book.description && (
              <div>
                <h3 className="font-semibold mb-2 text-[var(--accent-dark-orange)]">Description</h3>
                <p className="text-sm text-muted-foreground">{book.description}</p>
              </div>
            )}

            {/* Tags */}
            {book.tags.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2 text-[var(--accent-dark-orange)]">Tags</h3>
                <div className="flex flex-wrap gap-1">
                  {book.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="border-[var(--accent-orange)] text-[var(--accent-dark-orange)]">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Share Link */}
            <div>
              <h3 className="font-semibold mb-2 text-[var(--accent-dark-orange)]">Share</h3>
              <div className="flex items-center gap-2">
                {shareUrl ? (
                  <>
                    <input
                      type="text"
                      value={shareUrl}
                      readOnly
                      className="flex-1 px-3 py-2 text-sm border rounded-md bg-muted"
                      onClick={(e) => e.currentTarget.select()}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-[var(--accent-orange)] text-[var(--accent-dark-orange)] hover:bg-[var(--accent-orange)]/10"
                      onClick={handleCopyShareUrl}
                    >
                      {copied ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-[var(--accent-orange)] text-[var(--accent-dark-orange)] hover:bg-[var(--accent-orange)]/10"
                    onClick={handleShare}
                    disabled={sharing}
                  >
                    <Share2 className="h-4 w-4 mr-2" />
                    {sharing ? 'Creating link...' : 'Create Share Link'}
                  </Button>
                )}
              </div>
              {shareUrl && (
                <p className="text-xs text-muted-foreground mt-2">
                  Anyone with this link can download any format of this book.
                </p>
              )}

              {/* Embed Code */}
              {shareToken && (
                <div className="mt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowEmbed(!showEmbed)}
                    className="w-full"
                  >
                    <Code className="h-4 w-4 mr-2" />
                    {showEmbed ? 'Hide Embed Code' : 'Get Embed Code'}
                  </Button>

                  {showEmbed && (
                    <div className="mt-3 space-y-3">
                      <div>
                        <label className="text-xs font-medium mb-1 block">Iframe (Auto theme)</label>
                        <div className="relative">
                          <textarea
                            readOnly
                            className="w-full h-16 p-2 text-xs font-mono border rounded-md bg-muted resize-none"
                            value={`<iframe src="${typeof window !== 'undefined' ? window.location.origin : ''}/api/embed/${shareToken}" width="420" height="${280 + book.formats.length * 56}" frameborder="0" style="border-radius: 12px; max-width: 100%;"></iframe>`}
                            onClick={(e) => e.currentTarget.select()}
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            className="absolute top-1 right-1 h-6 w-6 p-0"
                            onClick={async () => {
                              const code = `<iframe src="${window.location.origin}/api/embed/${shareToken}" width="420" height="${280 + book.formats.length * 56}" frameborder="0" style="border-radius: 12px; max-width: 100%;"></iframe>`;
                              await navigator.clipboard.writeText(code);
                              setCopiedEmbed(true);
                              toast.success('Embed code copied');
                              setTimeout(() => setCopiedEmbed(false), 2000);
                            }}
                          >
                            {copiedEmbed ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Detects <code className="bg-muted px-1 rounded text-[10px]">color-theme-4</code> or <code className="bg-muted px-1 rounded text-[10px]">dark</code> class.
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 text-xs"
                          onClick={async () => {
                            const code = `<iframe src="${window.location.origin}/api/embed/${shareToken}?theme=light" width="420" height="${280 + book.formats.length * 56}" frameborder="0" style="border-radius: 12px; max-width: 100%;"></iframe>`;
                            await navigator.clipboard.writeText(code);
                            setCopiedEmbed(true);
                            toast.success('Light embed copied');
                            setTimeout(() => setCopiedEmbed(false), 2000);
                          }}
                        >
                          Copy Light
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 text-xs"
                          onClick={async () => {
                            const code = `<iframe src="${window.location.origin}/api/embed/${shareToken}?theme=dark" width="420" height="${280 + book.formats.length * 56}" frameborder="0" style="border-radius: 12px; max-width: 100%;"></iframe>`;
                            await navigator.clipboard.writeText(code);
                            setCopiedEmbed(true);
                            toast.success('Dark embed copied');
                            setTimeout(() => setCopiedEmbed(false), 2000);
                          }}
                        >
                          Copy Dark
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Formats */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-[var(--accent-dark-orange)]">Formats</h3>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-[var(--accent-orange)] text-[var(--accent-dark-orange)] hover:bg-[var(--accent-orange)]/10"
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditDialog();
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5 mr-2" />
                    Edit
                  </Button>
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
              </div>

              {/* Conversion progress */}
              {conversionJobs.length > 0 && (
                <div className="space-y-2 mb-4">
                  {conversionJobs.map((job) => (
                    <div
                      key={job.id}
                      className="flex items-center gap-3 p-2 border rounded-lg bg-muted/30"
                    >
                      <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-muted-foreground mb-1">
                          Converting to {job.targetFormat.toUpperCase()}
                        </div>
                        <Progress value={job.progress} className="h-1.5" />
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {job.progress}%
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Formats table */}
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="w-10 px-3 py-2"></th>
                      <th className="text-left px-3 py-2 font-medium">Format</th>
                      <th className="text-left px-3 py-2 font-medium">Size</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getAllPossibleFormats().map((format) => {
                      const formatInfo = book.formats.find((f) => f.format === format);
                      const exists = !!formatInfo;
                      const converting = isFormatConverting(format);
                      // Can only uncheck if more than one format exists
                      const canDelete = exists && book.formats.length > 1;

                      return (
                        <tr
                          key={format}
                          className={`border-t ${exists ? '' : 'text-muted-foreground'}`}
                        >
                          <td className="px-3 py-2">
                            {converting ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Checkbox
                                checked={exists}
                                disabled={exists && !canDelete}
                                onCheckedChange={(checked) => handleFormatToggle(format, checked as boolean)}
                              />
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <span
                              className={`select-none font-medium ${exists ? 'text-[var(--accent-dark-orange)] cursor-pointer hover:underline' : ''}`}
                              onClick={() => exists && handleDownload(format)}
                            >
                              {format.toUpperCase()}
                              {formatInfo?.isOriginal && (
                                <span className="ml-2 text-xs text-muted-foreground">(Original)</span>
                              )}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-[var(--accent-orange)]">
                            {formatInfo ? formatFileSize(formatInfo.fileSize) : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
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

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Book</DialogTitle>
            <DialogDescription>
              Update the book title and author. The folder will be renamed accordingly.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Book title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-author">Author</Label>
              <Input
                id="edit-author"
                value={editAuthor}
                onChange={(e) => setEditAuthor(e.target.value)}
                placeholder="Author name"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleEditBook}
              disabled={saving || !editTitle.trim() || !editAuthor.trim()}
              className="bg-[var(--accent-orange)] hover:bg-[var(--accent-dark-orange)] text-white"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
