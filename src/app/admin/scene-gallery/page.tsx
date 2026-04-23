'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/http-client/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Loader2,
  ChevronLeft,
  ChevronRight,
  X,
  Search,
  Unlink,
  ExternalLink,
  Image as ImageIcon,
  Layers,
  Filter,
} from 'lucide-react';

interface ImageVariant {
  url: string;
  prompt: string;
  created_at: string;
  qa_status?: 'passed' | 'failed' | null;
}

interface SceneData {
  id: string;
  slug: string;
  title: { ru: string; en: string };
  category: string;
  user_description?: { ru: string; en: string };
  image_variants?: ImageVariant[];
  paired_scene?: string;
}

interface LinkedImage {
  url: string;
  scene: SceneData;
  variantIndex: number;
  prompt?: string;
  qa_status?: 'passed' | 'failed' | null;
}

export default function SceneGalleryPage() {
  const [scenes, setScenes] = useState<SceneData[]>([]);
  const [linkedImages, setLinkedImages] = useState<LinkedImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [unlinking, setUnlinking] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);

  // Lightbox
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // Jump to position
  const [showJumpInput, setShowJumpInput] = useState(false);
  const [jumpValue, setJumpValue] = useState('');

  const supabase = createClient();

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Build linked images list when scenes or filters change
  useEffect(() => {
    const images: LinkedImage[] = [];
    const uniqueCategories = new Set<string>();

    for (const scene of scenes) {
      if (scene.category) {
        uniqueCategories.add(scene.category);
      }

      // Apply filters
      if (categoryFilter && scene.category !== categoryFilter) continue;
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchesSearch =
          scene.slug.toLowerCase().includes(search) ||
          scene.title?.ru?.toLowerCase().includes(search) ||
          scene.title?.en?.toLowerCase().includes(search) ||
          scene.category?.toLowerCase().includes(search) ||
          scene.user_description?.ru?.toLowerCase().includes(search) ||
          scene.user_description?.en?.toLowerCase().includes(search);
        if (!matchesSearch) continue;
      }

      // Add all variants from this scene
      if (scene.image_variants && scene.image_variants.length > 0) {
        for (let i = 0; i < scene.image_variants.length; i++) {
          const variant = scene.image_variants[i];
          if (variant.url && !variant.url.startsWith('placeholder_')) {
            images.push({
              url: variant.url,
              scene,
              variantIndex: i,
              prompt: variant.prompt,
              qa_status: variant.qa_status,
            });
          }
        }
      }
    }

    setLinkedImages(images);
    setCategories(Array.from(uniqueCategories).sort());

    // Reset index if out of bounds (functional update avoids dep on currentIndex)
    const maxIdx = Math.max(0, images.length - 1);
    setCurrentIndex(prev => prev >= images.length ? maxIdx : prev);
  }, [scenes, searchTerm, categoryFilter]);

  async function loadData() {
    setLoading(true);
    try {
      // Load all scenes with images
      const { data: scenesData, error } = await supabase
        .from('scenes')
        .select('id, slug, title, category, user_description, image_variants, paired_scene')
        .gte('version', 2)
        .eq('is_active', true)
        .not('image_variants', 'is', null)
        .order('category')
        .order('slug');

      if (error) throw error;

      // Filter scenes that actually have image_variants with content
      const scenesWithImages = (scenesData || []).filter(
        (s) => s.image_variants && s.image_variants.length > 0
      );

      setScenes(scenesWithImages);
    } catch (error) {
      console.error('Error loading data:', error);
      setMessage({ type: 'error', text: 'Failed to load scenes' });
    } finally {
      setLoading(false);
    }
  }

  // Unlink image from scene
  async function unlinkImage(imageUrl: string, sceneId: string) {
    setUnlinking(imageUrl);
    try {
      const response = await fetch('/api/admin/save-variant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sceneId,
          action: 'delete',
          variantUrl: imageUrl,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to unlink');
      }

      setMessage({ type: 'success', text: 'Image removed from scene' });

      // Update local state
      setScenes((prev) =>
        prev.map((s) => {
          if (s.id === sceneId) {
            return {
              ...s,
              image_variants: result.variants,
            };
          }
          return s;
        })
      );
    } catch (error) {
      console.error('Error unlinking image:', error);
      setMessage({ type: 'error', text: 'Failed to unlink image' });
    } finally {
      setUnlinking(null);
    }
  }

  // Navigation
  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => {
      const max = linkedImages.length;
      return prev + 1 >= max ? 0 : prev + 1;
    });
  }, [linkedImages.length]);

  const goToPrev = useCallback(() => {
    setCurrentIndex((prev) => {
      const max = linkedImages.length;
      return prev - 1 < 0 ? max - 1 : prev - 1;
    });
  }, [linkedImages.length]);

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement) return;

      if (e.key === 'ArrowRight' || e.key === 'd') {
        goToNext();
      } else if (e.key === 'ArrowLeft' || e.key === 'a') {
        goToPrev();
      } else if (e.key === 'Escape') {
        if (lightboxOpen) {
          setLightboxOpen(false);
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToNext, goToPrev, lightboxOpen]);

  const currentImage = linkedImages[currentIndex];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Layers className="h-6 w-6" />
          Scene Image Gallery
        </h1>
        <div className="text-sm text-gray-500">
          Only images assigned to scenes
        </div>
      </div>

      {message && (
        <div
          className={`mb-4 p-3 rounded ${
            message.type === 'success'
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
          }`}
        >
          {message.text}
          <button onClick={() => setMessage(null)} className="ml-2">
            <X className="h-4 w-4 inline" />
          </button>
        </div>
      )}

      {/* Stats & Filters */}
      <div className="mb-4 p-3 bg-gray-100 rounded-lg flex flex-wrap items-center gap-4 text-sm">
        <span>
          Total images: <strong>{linkedImages.length}</strong>
        </span>
        <span>
          Scenes with images: <strong>{scenes.length}</strong>
        </span>

        {/* Category filter */}
        <div className="flex items-center gap-2 ml-auto">
          <Filter className="h-4 w-4 text-gray-500" />
          <select
            value={categoryFilter || ''}
            onChange={(e) => {
              setCategoryFilter(e.target.value || null);
              setCurrentIndex(0);
            }}
            className="text-sm border rounded px-2 py-1"
          >
            <option value="">All categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search scenes..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentIndex(0);
            }}
            className="pl-8 w-64 h-8"
          />
        </div>
      </div>

      {linkedImages.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <ImageIcon className="h-16 w-16 mx-auto mb-4 opacity-50" />
          <p>No images found</p>
          {(searchTerm || categoryFilter) && (
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => {
                setSearchTerm('');
                setCategoryFilter(null);
              }}
            >
              Clear filters
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-6">
          {/* Left: Image display */}
          <div className="col-span-2 border rounded-lg p-4">
            {/* Navigation header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold">
                  Image{' '}
                  {showJumpInput ? (
                    <input
                      type="number"
                      min={1}
                      max={linkedImages.length}
                      value={jumpValue}
                      onChange={(e) => setJumpValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const num = parseInt(jumpValue);
                          if (num >= 1 && num <= linkedImages.length) {
                            setCurrentIndex(num - 1);
                          }
                          setShowJumpInput(false);
                          setJumpValue('');
                        } else if (e.key === 'Escape') {
                          setShowJumpInput(false);
                          setJumpValue('');
                        }
                      }}
                      onBlur={() => {
                        const num = parseInt(jumpValue);
                        if (num >= 1 && num <= linkedImages.length) {
                          setCurrentIndex(num - 1);
                        }
                        setShowJumpInput(false);
                        setJumpValue('');
                      }}
                      className="w-16 px-1 py-0 text-center border rounded text-lg font-semibold"
                      autoFocus
                    />
                  ) : (
                    <button
                      onClick={() => {
                        setJumpValue(String(currentIndex + 1));
                        setShowJumpInput(true);
                      }}
                      className="hover:bg-gray-100 px-1 rounded cursor-pointer"
                      title="Click to jump to position"
                    >
                      {currentIndex + 1}
                    </button>
                  )}{' '}
                  / {linkedImages.length}
                </h2>
              </div>

              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={goToPrev}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="outline" onClick={goToNext}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Image */}
            {currentImage && (
              <div>
                <div
                  className="relative group cursor-pointer"
                  onClick={() => setLightboxOpen(true)}
                >
                  <img
                    src={currentImage.url}
                    alt={currentImage.scene.slug}
                    className="w-full h-[600px] object-contain bg-gray-50 rounded-lg"
                  />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <div className="bg-black/50 text-white px-3 py-1.5 rounded-full text-sm">
                      Click to view full size
                    </div>
                  </div>
                </div>

                {/* Prompt info */}
                {currentImage.prompt && (
                  <div className="mt-2 text-xs text-gray-500 truncate">
                    Prompt: {currentImage.prompt}
                  </div>
                )}

                <div className="mt-4 text-xs text-gray-500">
                  <strong>Hotkeys:</strong> ← → or A/D to navigate
                </div>
              </div>
            )}
          </div>

          {/* Right: Scene info */}
          <div className="border rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-4">Scene Info</h2>

            {currentImage && (
              <div className="space-y-4">
                {/* Scene details */}
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="font-medium text-lg mb-1">
                    {currentImage.scene.slug}
                  </div>
                  <div className="text-sm text-gray-600 mb-2">
                    Category: <strong>{currentImage.scene.category}</strong>
                  </div>
                  <div className="text-sm text-gray-700">
                    {currentImage.scene.title?.ru || currentImage.scene.title?.en}
                  </div>
                  {currentImage.scene.user_description?.ru && (
                    <div className="mt-2 text-xs text-gray-500 line-clamp-3">
                      {currentImage.scene.user_description.ru}
                    </div>
                  )}
                  {currentImage.scene.paired_scene && (
                    <div className="mt-2 text-xs text-purple-600">
                      Paired: {currentImage.scene.paired_scene}
                    </div>
                  )}
                </div>

                {/* Variant info */}
                <div className="p-3 bg-blue-50 rounded-lg text-sm">
                  <div className="text-blue-800">
                    Variant {currentImage.variantIndex + 1} of{' '}
                    {currentImage.scene.image_variants?.length || 0}
                  </div>
                  {currentImage.qa_status && (
                    <div
                      className={`mt-1 ${
                        currentImage.qa_status === 'passed'
                          ? 'text-green-600'
                          : 'text-red-600'
                      }`}
                    >
                      QA: {currentImage.qa_status}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-red-600 hover:bg-red-50"
                    onClick={() =>
                      unlinkImage(currentImage.url, currentImage.scene.id)
                    }
                    disabled={unlinking === currentImage.url}
                  >
                    {unlinking === currentImage.url ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Unlink className="h-4 w-4 mr-2" />
                    )}
                    Remove from scene
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() =>
                      window.open(`/admin/scenes?search=${currentImage.scene.slug}`, '_blank')
                    }
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open in Scenes Admin
                  </Button>
                </div>

                {/* Other images from same scene */}
                {currentImage.scene.image_variants &&
                  currentImage.scene.image_variants.length > 1 && (
                    <div>
                      <div className="text-sm font-medium mb-2">
                        Other images in this scene:
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {currentImage.scene.image_variants
                          .filter((v) => !v.url.startsWith('placeholder_'))
                          .map((variant, idx) => {
                            const isActive =
                              variant.url === currentImage.url;
                            return (
                              <div
                                key={variant.url}
                                className={`relative cursor-pointer rounded overflow-hidden ${
                                  isActive
                                    ? 'ring-2 ring-blue-500'
                                    : 'opacity-70 hover:opacity-100'
                                }`}
                                onClick={() => {
                                  // Find this variant's index in linkedImages
                                  const targetIndex = linkedImages.findIndex(
                                    (img) =>
                                      img.url === variant.url &&
                                      img.scene.id === currentImage.scene.id
                                  );
                                  if (targetIndex >= 0) {
                                    setCurrentIndex(targetIndex);
                                  }
                                }}
                              >
                                <img
                                  src={variant.url}
                                  alt={`Variant ${idx + 1}`}
                                  className="w-full aspect-square object-cover"
                                />
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightboxOpen && currentImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            className="absolute top-4 right-4 text-white hover:text-gray-300"
            onClick={() => setLightboxOpen(false)}
          >
            <X className="h-8 w-8" />
          </button>

          {/* Navigation in lightbox */}
          <button
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 p-2"
            onClick={(e) => {
              e.stopPropagation();
              goToPrev();
            }}
          >
            <ChevronLeft className="h-10 w-10" />
          </button>
          <button
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 p-2"
            onClick={(e) => {
              e.stopPropagation();
              goToNext();
            }}
          >
            <ChevronRight className="h-10 w-10" />
          </button>

          <img
            src={currentImage.url}
            alt="Full size"
            className="max-w-[90vw] max-h-[90vh] object-contain"
            onClick={(e) => e.stopPropagation()}
          />

          {/* Scene info in lightbox */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-lg text-sm">
            <span className="font-medium">{currentImage.scene.slug}</span>
            <span className="mx-2">|</span>
            <span>{currentImage.scene.category}</span>
            <span className="mx-2">|</span>
            <span>
              {currentIndex + 1} / {linkedImages.length}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
