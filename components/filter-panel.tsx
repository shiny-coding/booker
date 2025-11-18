'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { SUPPORTED_FORMATS } from '@/lib/types';

interface FilterPanelProps {
  availableTags: string[];
  selectedTags: string[];
  selectedFormats: string[];
  onTagsChange: (tags: string[]) => void;
  onFormatsChange: (formats: string[]) => void;
}

export function FilterPanel({
  availableTags,
  selectedTags,
  selectedFormats,
  onTagsChange,
  onFormatsChange,
}: FilterPanelProps) {
  const handleTagToggle = (tag: string) => {
    if (selectedTags.includes(tag)) {
      onTagsChange(selectedTags.filter((t) => t !== tag));
    } else {
      onTagsChange([...selectedTags, tag]);
    }
  };

  const handleFormatToggle = (format: string) => {
    if (selectedFormats.includes(format)) {
      onFormatsChange(selectedFormats.filter((f) => f !== format));
    } else {
      onFormatsChange([...selectedFormats, format]);
    }
  };

  const clearAllFilters = () => {
    onTagsChange([]);
    onFormatsChange([]);
  };

  const hasFilters = selectedTags.length > 0 || selectedFormats.length > 0;

  return (
    <div className="space-y-4">
      {/* Formats Filter */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Formats</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {SUPPORTED_FORMATS.map((format) => (
            <div key={format} className="flex items-center space-x-2">
              <Checkbox
                id={`format-${format}`}
                checked={selectedFormats.includes(format)}
                onCheckedChange={() => handleFormatToggle(format)}
              />
              <Label
                htmlFor={`format-${format}`}
                className="text-sm font-normal cursor-pointer"
              >
                {format.toUpperCase()}
              </Label>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Tags Filter */}
      {availableTags.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Tags</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-64 overflow-y-auto">
            {availableTags.map((tag) => (
              <div key={tag} className="flex items-center space-x-2">
                <Checkbox
                  id={`tag-${tag}`}
                  checked={selectedTags.includes(tag)}
                  onCheckedChange={() => handleTagToggle(tag)}
                />
                <Label
                  htmlFor={`tag-${tag}`}
                  className="text-sm font-normal cursor-pointer"
                >
                  {tag}
                </Label>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Clear Filters */}
      {hasFilters && (
        <Button variant="outline" className="w-full" onClick={clearAllFilters}>
          Clear Filters
        </Button>
      )}
    </div>
  );
}
