'use client';

import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { SUPPORTED_FORMATS } from '@/lib/types';

interface UploadDialogProps {
  onUploadSuccess: () => void;
}

export function UploadDialog({ onUploadSuccess }: UploadDialogProps) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [tags, setTags] = useState('');
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'application/epub+zip': ['.epub'],
      'application/pdf': ['.pdf'],
      'application/x-mobipocket-ebook': ['.mobi'],
      'application/vnd.amazon.ebook': ['.azw', '.azw3'],
      'text/plain': ['.txt'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    maxFiles: 1,
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        const uploadedFile = acceptedFiles[0];
        setFile(uploadedFile);

        // Auto-fill title from filename
        if (!title) {
          const filename = uploadedFile.name.replace(/\.[^/.]+$/, '');
          setTitle(filename.replace(/[-_]/g, ' '));
        }
      }
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file || !title || !author) {
      toast.error('Please provide a file, title, and author');
      return;
    }

    setUploading(true);
    const uploadToast = toast.loading('Uploading book...');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', title);
      formData.append('author', author);
      formData.append('tags', tags);
      formData.append('description', description);

      const response = await fetch('/api/books/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        toast.success('Book uploaded successfully!', { id: uploadToast });
        setOpen(false);
        resetForm();
        onUploadSuccess();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to upload book', { id: uploadToast });
      }
    } catch (error) {
      console.error('Error uploading:', error);
      toast.error('Failed to upload book', { id: uploadToast });
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setFile(null);
    setTitle('');
    setAuthor('');
    setTags('');
    setDescription('');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="btn-gradient">Upload Book</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="gradient-text">Upload New Book</DialogTitle>
          <DialogDescription>
            Upload an ebook file and provide its metadata
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* File Upload */}
          <div>
            <Label>File</Label>
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragActive
                  ? 'border-[var(--accent-orange)] bg-[var(--accent-orange)]/5'
                  : 'border-[var(--accent-orange)]/50 hover:border-[var(--accent-orange)]'
              }`}
            >
              <input {...getInputProps()} />
              {file ? (
                <div>
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                    }}
                  >
                    Remove
                  </Button>
                </div>
              ) : (
                <div>
                  <p className="text-muted-foreground">
                    Drag and drop a book file here, or click to select
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Supported formats: {SUPPORTED_FORMATS.join(', ').toUpperCase()}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">
              Title <span className="text-red-500">*</span>
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Book title"
              required
            />
          </div>

          {/* Author */}
          <div className="space-y-2">
            <Label htmlFor="author">
              Author <span className="text-red-500">*</span>
            </Label>
            <Input
              id="author"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="Author name"
              required
            />
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label htmlFor="tags">Tags</Label>
            <Input
              id="tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="fiction, fantasy, bestseller (comma separated)"
            />
            <p className="text-xs text-muted-foreground">
              Separate multiple tags with commas
            </p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Book description or synopsis"
              className="w-full min-h-[100px] px-3 py-2 text-sm rounded-md border border-input bg-background"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={uploading || !file || !title || !author}>
              {uploading ? 'Uploading...' : 'Upload Book'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
