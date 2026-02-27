'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';

interface ImageCarouselProps {
  /** Main image URL */
  mainImage?: string | null;
  /** Array of variant image URLs */
  variants?: Array<{ url: string }>;
  /** Alt text for images */
  alt?: string;
  /** CSS class for the container */
  className?: string;
  /** CSS class for the image */
  imageClassName?: string;
  /** Auto-rotate interval in ms (default: 5000) */
  autoRotateInterval?: number;
  /** Whether to auto-rotate (default: true if multiple images) */
  autoRotate?: boolean;
  /** Show pagination dots (default: true if multiple images) */
  showDots?: boolean;
  /** Position of dots: 'top' | 'bottom' (default: 'bottom') */
  dotsPosition?: 'top' | 'bottom';
  /** Placeholder content when no images */
  placeholder?: React.ReactNode;
  /** Callback when image changes */
  onImageChange?: (index: number) => void;
}

export function ImageCarousel({
  mainImage,
  variants = [],
  alt = '',
  className,
  imageClassName,
  autoRotateInterval = 5000,
  autoRotate = true,
  showDots = true,
  dotsPosition = 'bottom',
  placeholder,
  onImageChange,
}: ImageCarouselProps) {
  // Combine main image with variants
  const allImages = useMemo(() => {
    const images: string[] = [];
    if (mainImage && mainImage !== '/placeholder') {
      images.push(mainImage);
    }
    variants.forEach(v => {
      if (v.url && v.url !== '/placeholder' && !images.includes(v.url)) {
        images.push(v.url);
      }
    });
    return images;
  }, [mainImage, variants]);

  // Random start index
  const [currentIndex, setCurrentIndex] = useState(() => {
    if (allImages.length <= 1) return 0;
    return Math.floor(Math.random() * allImages.length);
  });

  // Reset index when images change
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- bounds guard for external data
    setCurrentIndex(prev => (allImages.length > 0 && prev >= allImages.length) ? 0 : prev);
  }, [allImages.length]);

  // Auto-rotate
  useEffect(() => {
    if (!autoRotate || allImages.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % allImages.length);
    }, autoRotateInterval);

    return () => clearInterval(interval);
  }, [autoRotate, autoRotateInterval, allImages.length]);

  // Notify on change
  useEffect(() => {
    onImageChange?.(currentIndex);
  }, [currentIndex, onImageChange]);

  const goToImage = useCallback((index: number) => {
    setCurrentIndex(index);
  }, []);

  // No images - show placeholder
  if (allImages.length === 0) {
    return (
      <div className={cn('relative', className)}>
        {placeholder}
      </div>
    );
  }

  const hasMultiple = allImages.length > 1;
  const shouldShowDots = showDots && hasMultiple;

  return (
    <div className={cn('relative', className)}>
      {/* Image */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={allImages[currentIndex]}
        alt={alt}
        className={cn('w-full h-full object-cover transition-opacity duration-300', imageClassName)}
      />

      {/* Pagination dots */}
      {shouldShowDots && (
        <div
          className={cn(
            'absolute left-0 right-0 flex justify-center gap-1.5 z-10',
            dotsPosition === 'top' ? 'top-3' : 'bottom-3'
          )}
        >
          {allImages.map((_, index) => (
            <button
              key={index}
              onClick={() => goToImage(index)}
              className={cn(
                'w-2 h-2 rounded-full transition-all duration-200',
                'hover:scale-125',
                index === currentIndex
                  ? 'bg-white shadow-md'
                  : 'bg-white/50 hover:bg-white/75'
              )}
              aria-label={`Go to image ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
