'use client';

import React, { useRef, useState } from 'react';
import Image from 'next/image';
import { adminApi } from '@/lib/api/admin';
import { Upload, Link2, X, Loader2 } from 'lucide-react';

export interface ImageUploadFieldProps {
  value: string | null | undefined;
  onChange: (url: string | null) => void;
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export function ImageUploadField({ value, onChange }: ImageUploadFieldProps) {
  const [mode, setMode] = useState<'upload' | 'url'>('upload');
  const [urlInput, setUrlInput] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Only JPEG, PNG, or WebP images are allowed.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be under 5MB.');
      return;
    }

    setIsUploading(true);
    try {
      const { upload_url, public_url } = await adminApi.getImageUploadUrl(file.type);
      const putRes = await fetch(upload_url, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      if (!putRes.ok) throw new Error('Upload failed');
      onChange(public_url);
    } catch (err: any) {
      setError(err.message || 'Could not upload image. Try pasting a URL instead.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleUrlSave = () => {
    if (!urlInput.trim()) return;
    onChange(urlInput.trim());
    setUrlInput('');
  };

  return (
    <div>
      <label className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1.5 block">
        Item Image
      </label>

      {value ? (
        <div className="flex items-center gap-3 mb-3">
          <div className="relative w-16 h-16 rounded-sm overflow-hidden border border-line bg-cream flex-shrink-0">
            <Image src={value} alt="Item preview" fill sizes="64px" className="object-cover" />
          </div>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-error hover:text-red-700"
          >
            <X className="w-3.5 h-3.5" />
            Remove image
          </button>
        </div>
      ) : (
        <>
          <div className="flex gap-1 mb-2.5 p-0.5 bg-cream-light rounded-btn border border-line w-fit">
            <button
              type="button"
              onClick={() => setMode('upload')}
              className={`px-3 py-1.5 rounded-sm text-xs font-semibold transition-colors ${
                mode === 'upload' ? 'bg-surface text-ink shadow-xs' : 'text-ink-muted'
              }`}
            >
              Upload file
            </button>
            <button
              type="button"
              onClick={() => setMode('url')}
              className={`px-3 py-1.5 rounded-sm text-xs font-semibold transition-colors ${
                mode === 'url' ? 'bg-surface text-ink shadow-xs' : 'text-ink-muted'
              }`}
            >
              Paste URL
            </button>
          </div>

          {mode === 'upload' ? (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileSelect}
                className="hidden"
                id="item-image-file-input"
              />
              <label
                htmlFor="item-image-file-input"
                className={`flex items-center justify-center gap-2 w-full h-24 border-2 border-dashed border-line rounded-card text-sm font-medium text-ink-muted cursor-pointer hover:border-primary-400 hover:bg-cream-light/50 transition-colors ${
                  isUploading ? 'pointer-events-none opacity-60' : ''
                }`}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Click to choose an image (JPEG, PNG, WebP, max 5MB)
                  </>
                )}
              </label>
            </div>
          ) : (
            <div className="flex gap-2">
              <div className="flex-1 flex items-center gap-2 h-11 px-3 bg-surface border border-line rounded-sm">
                <Link2 className="w-4 h-4 text-ink-subtle flex-shrink-0" />
                <input
                  type="url"
                  placeholder="https://example.com/roll.jpg"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  className="flex-1 bg-transparent text-sm text-ink focus:outline-none placeholder:text-ink-subtle"
                />
              </div>
              <button
                type="button"
                onClick={handleUrlSave}
                disabled={!urlInput.trim()}
                className="px-4 h-11 bg-primary-500 hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-sm transition-colors"
              >
                Use URL
              </button>
            </div>
          )}
        </>
      )}

      {error && <p className="text-xs text-error mt-1.5">{error}</p>}
    </div>
  );
}
