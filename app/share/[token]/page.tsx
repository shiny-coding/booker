'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download, BookOpen, AlertCircle } from 'lucide-react';

interface BookFormat {
  format: string;
  fileName: string;
  fileSize: number;
}

interface SharedBook {
  id: string;
  title: string;
  author: string;
  description?: string;
  tags: string[];
  formats: BookFormat[];
}

interface ShareData {
  book: SharedBook;
  expiresAt: string | null;
}

export default function SharePage() {
  const params = useParams();
  const token = params.token as string;

  const [shareData, setShareData] = useState<ShareData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      fetchBookInfo();
    }
  }, [token]);

  const fetchBookInfo = async () => {
    try {
      const response = await fetch(`/api/share/${token}`);

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Failed to load shared book');
        return;
      }

      const data = await response.json();
      setShareData(data);
    } catch (err) {
      console.error('Error fetching shared book:', err);
      setError('Failed to load shared book');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (format: string) => {
    if (!shareData) return;

    setDownloading(format);

    try {
      const response = await fetch(`/api/share/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Failed to download book');
        return;
      }

      const blob = await response.blob();
      const formatInfo = shareData.book.formats.find((f) => f.format === format);
      const fileName = formatInfo?.fileName || `${shareData.book.title}.${format}`;

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Error downloading:', err);
      setError('Failed to download book');
    } finally {
      setDownloading(null);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground animate-pulse" />
          <p className="text-muted-foreground">Loading shared book...</p>
        </div>
      </div>
    );
  }

  if (error || !shareData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
            <h2 className="text-xl font-semibold mb-2">Link Not Found</h2>
            <p className="text-muted-foreground">
              {error || 'This share link is invalid or has expired.'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { book, expiresAt } = shareData;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">{book.title}</CardTitle>
            <CardDescription className="text-lg">by {book.author}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {book.description && (
              <div>
                <h3 className="font-semibold mb-2">Description</h3>
                <p className="text-sm text-muted-foreground">{book.description}</p>
              </div>
            )}

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

            <div>
              <h3 className="font-semibold mb-3">Download</h3>
              <div className="space-y-2">
                {book.formats.map((format) => (
                  <div
                    key={format.format}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Badge>{format.format.toUpperCase()}</Badge>
                      <span className="text-sm text-muted-foreground">
                        {formatFileSize(format.fileSize)}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="bg-white text-black border-black hover:bg-gray-100"
                      onClick={() => handleDownload(format.format)}
                      disabled={downloading !== null}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      {downloading === format.format ? 'Downloading...' : 'Download'}
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {expiresAt && (
              <p className="text-xs text-muted-foreground text-center">
                This link expires on {new Date(expiresAt).toLocaleDateString()}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
