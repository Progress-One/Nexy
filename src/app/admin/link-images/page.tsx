'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/http-client/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Check, Image as ImageIcon, Link2, Search, X, ChevronLeft, ChevronRight, SkipForward, Grid, Layers, Sparkles, Eye, EyeOff, Zap, StopCircle, Unlink, Trash2, Star, AlertTriangle, RotateCcw } from 'lucide-react';

interface StorageFile {
  name: string;
  url: string;
  created_at: string;
}

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
  tags?: string[];
  ai_description?: { ru: string; en: string };
  user_description?: { ru: string; en: string };
  image_prompt?: string;
  image_url?: string;
  image_variants?: ImageVariant[];
  generation_prompt?: string;
  paired_scene?: string; // slug of paired scene
}

interface SceneSearchResult extends SceneData {
  searchScore: number;
  matchedFields: string[];
}

interface SceneSuggestion {
  id: string;
  slug: string;
  title: { ru: string; en: string };
  category: string;
  score: number;
  matchReasons: string[];
}

interface ImageAnalysisFlags {
  anatomyIssues?: boolean;
  anatomyDetails?: string;
  sameGenderOnly?: boolean;
  nonSexual?: boolean;
}

interface ImageAnalysis {
  participants: { count: number; genders: string[] };
  activity: string;
  keywords: string[];
  mood: string;
  setting: string;
  elements: string[];
  bodyParts?: string[];
  clothing?: string[];
  flags?: ImageAnalysisFlags;
}

type ViewMode = 'grid' | 'gallery';

export default function LinkImagesPage() {
  const [storageFiles, setStorageFiles] = useState<StorageFile[]>([]);
  const [scenes, setScenes] = useState<SceneData[]>([]);
  const [loading, setLoading] = useState(true);
  const [linking, setLinking] = useState<string | null>(null);
  const [selectedScene, setSelectedScene] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [imageSearchTerm, setImageSearchTerm] = useState('');
  const [showAll, setShowAll] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Gallery mode state
  const [viewMode, setViewMode] = useState<ViewMode>('gallery');
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [sceneSearch, setSceneSearch] = useState('');
  const [linkedCount, setLinkedCount] = useState(0);
  const [skippedFiles, setSkippedFiles] = useState<Set<string>>(new Set());
  const [savedFiles, setSavedFiles] = useState<Set<string>>(new Set());

  // AI suggestion state
  const [aiSuggestions, setAiSuggestions] = useState<SceneSuggestion[]>([]);
  const [imageAnalysis, setImageAnalysis] = useState<ImageAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [showLinked, setShowLinked] = useState(false);

  // Lightbox state
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Jump to position state
  const [showJumpInput, setShowJumpInput] = useState(false);
  const [jumpValue, setJumpValue] = useState('');

  // Batch analysis state
  const [batchAnalyzing, setBatchAnalyzing] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ total: 0, analyzed: 0, remaining: 0 });
  const [imageAnalysisMap, setImageAnalysisMap] = useState<Record<string, ImageAnalysis>>({});
  const [stopBatch, setStopBatch] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    loadData();
    loadImageAnalysis();
    loadHiddenFiles();
    loadSavedFiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load hidden files from database (with pagination for large sets)
  async function loadHiddenFiles() {
    try {
      const allFilenames: string[] = [];
      const pageSize = 1000;
      let offset = 0;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('hidden_storage_images')
          .select('filename')
          .range(offset, offset + pageSize - 1);

        if (error) {
          console.error('Failed to load hidden files:', error);
          return;
        }

        if (data && data.length > 0) {
          allFilenames.push(...data.map(d => d.filename));
          offset += pageSize;
          hasMore = data.length === pageSize;
        } else {
          hasMore = false;
        }
      }

      console.log(`[LoadHidden] Loaded ${allFilenames.length} hidden files`);
      setSkippedFiles(new Set(allFilenames));
    } catch (e) {
      console.error('Failed to load hidden files:', e);
    }
  }

  // Hide a file (save to DB)
  async function hideFile(filename: string) {
    try {
      const { error } = await supabase
        .from('hidden_storage_images')
        .upsert({ filename }, { onConflict: 'filename' });

      if (error) {
        console.error('Failed to hide file:', error);
        setMessage({ type: 'error', text: 'Failed to save hidden state' });
        return false;
      }

      setSkippedFiles(prev => new Set([...prev, filename]));
      return true;
    } catch (e) {
      console.error('Failed to hide file:', e);
      return false;
    }
  }

  // Unhide a specific file (remove from DB)
  async function unhideFile(filename: string) {
    try {
      const { error } = await supabase
        .from('hidden_storage_images')
        .delete()
        .eq('filename', filename);

      if (error) {
        console.error('Failed to unhide file:', error);
        setMessage({ type: 'error', text: 'Failed to unhide file' });
        return false;
      }

      setSkippedFiles(prev => {
        const next = new Set(prev);
        next.delete(filename);
        return next;
      });
      return true;
    } catch (e) {
      console.error('Failed to unhide file:', e);
      return false;
    }
  }

  // Toggle to show hidden files in the view
  const [showHiddenFiles, setShowHiddenFiles] = useState(false);
  const [showSavedFiles, setShowSavedFiles] = useState(false);
  const [showFlagged, setShowFlagged] = useState<'anatomy' | 'sameGender' | 'nonSexual' | null>(null);

  // Load saved files from database (with pagination for large sets)
  async function loadSavedFiles() {
    try {
      const allFilenames: string[] = [];
      const pageSize = 1000;
      let offset = 0;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('saved_storage_images')
          .select('filename')
          .range(offset, offset + pageSize - 1);

        if (error) {
          console.error('Failed to load saved files:', error);
          return;
        }

        if (data && data.length > 0) {
          allFilenames.push(...data.map(d => d.filename));
          offset += pageSize;
          hasMore = data.length === pageSize;
        } else {
          hasMore = false;
        }
      }

      console.log(`[LoadSaved] Loaded ${allFilenames.length} saved files`);
      setSavedFiles(new Set(allFilenames));
    } catch (e) {
      console.error('Failed to load saved files:', e);
    }
  }

  // Save a file for later (add to DB)
  async function saveFileForLater(filename: string) {
    try {
      const { error } = await supabase
        .from('saved_storage_images')
        .upsert({ filename }, { onConflict: 'filename' });

      if (error) {
        console.error('Failed to save file:', error);
        setMessage({ type: 'error', text: 'Failed to save file' });
        return false;
      }

      setSavedFiles(prev => new Set([...prev, filename]));
      setMessage({ type: 'success', text: 'Saved for later ⭐' });
      return true;
    } catch (e) {
      console.error('Failed to save file:', e);
      return false;
    }
  }

  // Unsave a file (remove from DB)
  async function unsaveFile(filename: string) {
    try {
      const { error } = await supabase
        .from('saved_storage_images')
        .delete()
        .eq('filename', filename);

      if (error) {
        console.error('Failed to unsave file:', error);
        setMessage({ type: 'error', text: 'Failed to unsave file' });
        return false;
      }

      setSavedFiles(prev => {
        const next = new Set(prev);
        next.delete(filename);
        return next;
      });
      return true;
    } catch (e) {
      console.error('Failed to unsave file:', e);
      return false;
    }
  }

  // Load existing image analysis from database
  async function loadImageAnalysis() {
    try {
      const res = await fetch('/api/admin/batch-analyze');
      const { data } = await res.json();
      const map: Record<string, ImageAnalysis> = {};
      for (const item of data || []) {
        map[item.file_name] = item.analysis;
      }
      setImageAnalysisMap(map);
    } catch (e) {
      console.error('Failed to load image analysis:', e);
    }
  }

  // Clear AI flags for a file (restore from flagged state)
  async function clearAnalysisFlags(filename: string) {
    try {
      const res = await fetch(`/api/admin/batch-analyze?file_name=${encodeURIComponent(filename)}&clear_flags=true`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const err = await res.json();
        setMessage({ type: 'error', text: err.error || 'Failed to clear flags' });
        return false;
      }

      const result = await res.json();

      // Update local state with cleared flags
      setImageAnalysisMap(prev => ({
        ...prev,
        [filename]: result.analysis
      }));

      setMessage({ type: 'success', text: `Restored: ${filename.substring(0, 30)}...` });
      return true;
    } catch (e) {
      console.error('Failed to clear flags:', e);
      setMessage({ type: 'error', text: 'Failed to clear flags' });
      return false;
    }
  }

  // Batch analyze all images
  async function handleBatchAnalyze() {
    setBatchAnalyzing(true);
    setStopBatch(false);

    while (!stopBatch) {
      try {
        const res = await fetch('/api/admin/batch-analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ batchSize: 3 })
        });

        if (!res.ok) {
          const err = await res.json();
          setMessage({ type: 'error', text: err.error || 'Batch analyze failed' });
          break;
        }

        const data = await res.json();
        console.log('[batch-analyze frontend] API response:', { total: data.total, analyzed: data.analyzed, remaining: data.remaining, done: data.done });
        setBatchProgress({
          total: data.total,
          analyzed: data.analyzed,
          remaining: data.remaining
        });

        // Update local map with new results
        for (const result of data.results || []) {
          if (result.success && result.analysis) {
            setImageAnalysisMap(prev => ({
              ...prev,
              [result.file_name]: result.analysis
            }));
          }
        }

        if (data.done || data.remaining === 0) {
          setMessage({ type: 'success', text: `Batch complete! Analyzed ${data.analyzed} images.` });
          break;
        }
      } catch (e) {
        console.error('Batch analyze error:', e);
        setMessage({ type: 'error', text: `Batch error: ${(e as Error).message}` });
        break;
      }
    }

    setBatchAnalyzing(false);
    setStopBatch(false);
  }

  function handleStopBatch() {
    setStopBatch(true);
    setMessage({ type: 'success', text: 'Stopping batch analysis...' });
  }

  async function loadData() {
    setLoading(true);
    try {
      // Load ALL storage files with pagination (Supabase limit is 1000 per request)
      const allFiles: Array<{ name: string; created_at: string | null }> = [];
      const pageSize = 1000;
      let offset = 0;
      let hasMore = true;

      while (hasMore) {
        const { data: files, error: storageError } = await supabase.storage
          .from('scenes')
          .list('', {
            limit: pageSize,
            offset,
            sortBy: { column: 'created_at', order: 'desc' }
          });

        if (storageError) throw storageError;

        if (files && files.length > 0) {
          allFiles.push(...files);
          offset += pageSize;
          hasMore = files.length === pageSize;
        } else {
          hasMore = false;
        }
      }

      console.log(`[LoadData] Loaded ${allFiles.length} files from storage`);

      const storageFilesWithUrls: StorageFile[] = allFiles
        .filter(f => !f.name.startsWith('.')) // Skip system files like .emptyFolderPlaceholder
        .map(f => ({
          name: f.name,
          url: supabase.storage.from('scenes').getPublicUrl(f.name).data.publicUrl,
          created_at: f.created_at || '',
        }));

      setStorageFiles(storageFilesWithUrls);

      // Load ALL active scenes with tags and ai_description for better search
      const { data: scenesData, error: scenesError } = await supabase
        .from('scenes')
        .select('id, slug, title, category, tags, ai_description, user_description, image_prompt, image_url, image_variants, generation_prompt, paired_scene')
        .gte('version', 2)
        .eq('is_active', true)
        .order('category')
        .order('slug');

      if (scenesError) throw scenesError;

      setScenes(scenesData || []);

      // Load batch analysis progress
      const analysisRes = await fetch('/api/admin/batch-analyze');
      if (analysisRes.ok) {
        const analysisData = await analysisRes.json();
        const analyzedCount = (analysisData.data || []).length;
        // Don't set total here - we don't know how many files are hidden yet
        // The correct total will be set when batch analysis runs
        setBatchProgress({
          total: 0, // Will be set correctly when batch runs
          analyzed: analyzedCount,
          remaining: 0
        });

        // Load analysis map
        const analysisMap: Record<string, ImageAnalysis> = {};
        for (const item of analysisData.data || []) {
          analysisMap[item.file_name] = item.analysis;
        }
        setImageAnalysisMap(analysisMap);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      setMessage({ type: 'error', text: 'Failed to load data' });
    } finally {
      setLoading(false);
    }
  }

  // Get scenes linked to a specific image URL
  const getScenesLinkedToImage = useCallback((imageUrl: string): SceneData[] => {
    const baseUrl = imageUrl.split('?')[0];
    return scenes.filter(s =>
      s.image_variants?.some(v => v.url.split('?')[0] === baseUrl)
    );
  }, [scenes]);

  // Unlink image from scene (and its paired scene)
  async function unlinkImageFromScene(fileUrl: string, sceneId: string) {
    setLinking(sceneId);
    try {
      // Find the scene and its paired scene
      const scene = scenes.find(s => s.id === sceneId);
      const pairedScene = scene?.paired_scene ? scenes.find(s => s.slug === scene.paired_scene) : null;

      // Unlink from main scene
      const response = await fetch('/api/admin/save-variant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sceneId, action: 'delete', variantUrl: fileUrl }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to unlink');
      }

      // Also unlink from paired scene if exists
      let pairedResult: { variants?: ImageVariant[] } | null = null;
      if (pairedScene) {
        const pairedResponse = await fetch('/api/admin/save-variant', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sceneId: pairedScene.id, action: 'delete', variantUrl: fileUrl }),
        });
        pairedResult = await pairedResponse.json();
      }

      const pairedMsg = pairedScene ? ` + paired ${pairedScene.slug}` : '';
      setMessage({ type: 'success', text: `Unlinked from scene${pairedMsg}` });

      // Update local scenes state for both scenes
      setScenes(prev => prev.map(s => {
        if (s.id === sceneId) {
          return {
            ...s,
            image_variants: result.variants,
            image_url: s.image_url === fileUrl ? (result.variants?.[0]?.url || null) : s.image_url
          };
        }
        if (pairedScene && s.id === pairedScene.id && pairedResult?.variants) {
          return {
            ...s,
            image_variants: pairedResult.variants,
            image_url: s.image_url === fileUrl ? (pairedResult.variants?.[0]?.url || null) : s.image_url
          };
        }
        return s;
      }));
    } catch (error) {
      console.error('Error unlinking image:', error);
      setMessage({ type: 'error', text: 'Failed to unlink image' });
    } finally {
      setLinking(null);
    }
  }

  async function linkImageToScene(fileUrl: string, sceneId: string, autoAdvance = false) {
    setLinking(sceneId);
    try {
      // Find the scene and its paired scene
      const scene = scenes.find(s => s.id === sceneId);
      const pairedScene = scene?.paired_scene ? scenes.find(s => s.slug === scene.paired_scene) : null;

      // Use API route with service role key to bypass RLS
      const response = await fetch('/api/admin/save-variant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sceneId,
          action: 'save',
          imageUrl: fileUrl,
          prompt: 'Linked from storage'
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to link');
      }

      // Also link to paired scene if exists
      let pairedResult: { variants?: ImageVariant[] } | null = null;
      if (pairedScene) {
        const pairedResponse = await fetch('/api/admin/save-variant', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sceneId: pairedScene.id,
            action: 'save',
            imageUrl: fileUrl,
            prompt: 'Linked from storage'
          }),
        });
        pairedResult = await pairedResponse.json();
      }

      if (result.message === 'Image already saved as variant') {
        setMessage({ type: 'success', text: 'Already linked!' });
        if (autoAdvance) goToNextImage();
        return;
      }

      setLinkedCount(prev => prev + 1);
      const pairedMsg = pairedScene ? ` + paired ${pairedScene.slug}` : '';
      setMessage({ type: 'success', text: `Linked! (${linkedCount + 1} total)${pairedMsg}` });
      // Don't clear scene search - keep it for linking multiple images to similar scenes

      if (autoAdvance) {
        goToNextImage();
      }

      // Update local scenes state with the variants returned from API
      setScenes(prev => prev.map(s => {
        if (s.id === sceneId) {
          return { ...s, image_url: fileUrl, image_variants: result.variants };
        }
        if (pairedScene && s.id === pairedScene.id && pairedResult?.variants) {
          return { ...s, image_url: fileUrl, image_variants: pairedResult.variants };
        }
        return s;
      }));
    } catch (error) {
      console.error('Error linking image:', error);
      setMessage({ type: 'error', text: 'Failed to link image' });
    } finally {
      setLinking(null);
    }
  }

  // Calculate file lists (must be before useCallback hooks that use them)
  const allLinkedUrls = new Set(
    scenes.flatMap(s => (s.image_variants || []).map(v => v.url.split('?')[0]))
  );

  const unlinkedFiles = storageFiles.filter(f => {
    if (skippedFiles.has(f.name) || savedFiles.has(f.name)) return false;
    const baseUrl = f.url.split('?')[0];
    return !allLinkedUrls.has(baseUrl);
  });

  const linkedFiles = storageFiles.filter(f => {
    if (skippedFiles.has(f.name) || savedFiles.has(f.name)) return false;
    const baseUrl = f.url.split('?')[0];
    return allLinkedUrls.has(baseUrl);
  });

  // Special views for saved/hidden files
  const savedFilesList = storageFiles.filter(f => savedFiles.has(f.name));
  const hiddenFilesList = storageFiles.filter(f => skippedFiles.has(f.name));

  // Flagged files based on analysis
  const flaggedFiles = {
    anatomy: storageFiles.filter(f => imageAnalysisMap[f.name]?.flags?.anatomyIssues),
    sameGender: storageFiles.filter(f => imageAnalysisMap[f.name]?.flags?.sameGenderOnly),
    nonSexual: storageFiles.filter(f => imageAnalysisMap[f.name]?.flags?.nonSexual),
  };
  const totalFlagged = new Set([
    ...flaggedFiles.anatomy.map(f => f.name),
    ...flaggedFiles.sameGender.map(f => f.name),
    ...flaggedFiles.nonSexual.map(f => f.name),
  ]).size;

  // Display files based on view mode
  const displayFiles = showFlagged
    ? flaggedFiles[showFlagged]
    : showSavedFiles
      ? savedFilesList
      : showHiddenFiles
        ? hiddenFilesList
        : showLinked
          ? [...unlinkedFiles, ...linkedFiles]
          : unlinkedFiles;

  const goToNextImage = useCallback(() => {
    setCurrentImageIndex(prev => {
      const maxIndex = displayFiles.length;
      const next = prev + 1;
      return next >= maxIndex ? 0 : next;
    });
    // Don't clear scene search - keep it for linking multiple images to similar scenes
  }, [displayFiles.length]);

  const goToPrevImage = useCallback(() => {
    setCurrentImageIndex(prev => {
      const maxIndex = displayFiles.length;
      const next = prev - 1;
      return next < 0 ? maxIndex - 1 : next;
    });
    // Don't clear scene search - keep it for linking multiple images to similar scenes
  }, [displayFiles.length]);

  // Hide current image (removes from list, saves to DB, next image appears at same index)
  const hideCurrentImage = useCallback(async () => {
    const file = displayFiles[currentImageIndex];
    if (!file) return;

    // Save to database
    const success = await hideFile(file.name);

    if (success) {
      setMessage({ type: 'success', text: `Hidden: ${file.name.substring(0, 30)}...` });
    }

    // If we're at the last image, move back one (or to 0 if list becomes empty)
    if (currentImageIndex >= displayFiles.length - 1) {
      setCurrentImageIndex(prev => Math.max(0, prev - 1));
    }
    // Otherwise, stay at same index - next file will shift into this position
    // Don't clear scene search - keep it persistent
    setImageAnalysis(null);
    setAiSuggestions([]);
  }, [currentImageIndex, displayFiles, hideFile]);

  // Skip to next image without hiding
  const skipImage = useCallback(() => {
    goToNextImage();
  }, [goToNextImage]);

  // AI suggestion handler
  async function handleAiSuggest() {
    const file = displayFiles[currentImageIndex];
    if (!file) return;

    setAnalyzing(true);
    setAiSuggestions([]);
    setImageAnalysis(null);

    try {
      const res = await fetch('/api/admin/suggest-scenes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: file.url })
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to analyze image');
      }

      const data = await res.json();
      setAiSuggestions(data.suggestions || []);
      setImageAnalysis(data.analysis || null);
      setMessage({ type: 'success', text: `Found ${data.suggestions?.length || 0} matching scenes` });
    } catch (e) {
      console.error('AI suggestion error:', e);
      setMessage({ type: 'error', text: `AI analysis failed: ${(e as Error).message}` });
    } finally {
      setAnalyzing(false);
    }
  }

  // Clear AI suggestions when image changes
  useEffect(() => {
    setAiSuggestions([]);
    setImageAnalysis(null);
  }, [currentImageIndex]);

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (viewMode !== 'gallery') return;
      if (e.target instanceof HTMLInputElement) return;

      if (e.key === 'ArrowRight' || e.key === 'd') {
        goToNextImage();
      } else if (e.key === 'ArrowLeft' || e.key === 'a') {
        goToPrevImage();
      } else if (e.key === 's' || e.key === 'Escape') {
        skipImage();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewMode, goToNextImage, goToPrevImage, skipImage]);

  // Advanced search with scoring and field matching
  const searchScenes = (query: string): SceneSearchResult[] => {
    if (!query.trim()) {
      return scenes.map(s => ({ ...s, searchScore: 0, matchedFields: [] }));
    }

    const terms = query.toLowerCase().split(/\s+/).filter(t => t.length > 0);

    return scenes
      .map(scene => {
        let score = 0;
        const matchedFields: string[] = [];

        const slugLower = scene.slug.toLowerCase();
        const titleEn = (scene.title?.en || '').toLowerCase();
        const titleRu = (scene.title?.ru || '').toLowerCase();
        const category = (scene.category || '').toLowerCase();
        const tags = (scene.tags || []).map(t => t.toLowerCase());
        const aiDescEn = (scene.ai_description?.en || '').toLowerCase();
        const aiDescRu = (scene.ai_description?.ru || '').toLowerCase();
        const imagePrompt = (scene.image_prompt || '').toLowerCase();

        for (const term of terms) {
          // Exact slug match (+50)
          if (slugLower === term) {
            score += 50;
            if (!matchedFields.includes('slug')) matchedFields.push('slug');
          }
          // Slug contains (+20)
          else if (slugLower.includes(term)) {
            score += 20;
            if (!matchedFields.includes('slug')) matchedFields.push('slug');
          }

          // Category exact (+30)
          if (category === term) {
            score += 30;
            if (!matchedFields.includes('category')) matchedFields.push('category');
          }
          // Category contains (+15)
          else if (category.includes(term)) {
            score += 15;
            if (!matchedFields.includes('category')) matchedFields.push('category');
          }

          // Tag exact match (+25)
          if (tags.includes(term)) {
            score += 25;
            if (!matchedFields.includes('tags')) matchedFields.push('tags');
          }
          // Tag partial match (+10)
          else if (tags.some(tag => tag.includes(term) || term.includes(tag))) {
            score += 10;
            if (!matchedFields.includes('tags')) matchedFields.push('tags');
          }

          // Title match (+15)
          if (titleEn.includes(term) || titleRu.includes(term)) {
            score += 15;
            if (!matchedFields.includes('title')) matchedFields.push('title');
          }

          // AI description match (+8)
          if (aiDescEn.includes(term) || aiDescRu.includes(term)) {
            score += 8;
            if (!matchedFields.includes('description')) matchedFields.push('description');
          }

          // Image prompt match (+5)
          if (imagePrompt.includes(term)) {
            score += 5;
            if (!matchedFields.includes('prompt')) matchedFields.push('prompt');
          }
        }

        return { ...scene, searchScore: score, matchedFields };
      })
      .filter(s => s.searchScore > 0)
      .sort((a, b) => b.searchScore - a.searchScore);
  };

  const filteredScenes = searchScenes(sceneSearch);

  // Current file for gallery mode
  const currentFile = viewMode === 'gallery' ? displayFiles[currentImageIndex] : null;
  const isCurrentFileLinked = currentFile ? allLinkedUrls.has(currentFile.url.split('?')[0]) : false;

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
        <h1 className="text-2xl font-bold">Link Storage Images to Scenes</h1>
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'gallery' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('gallery')}
          >
            <Layers className="h-4 w-4 mr-1" />
            Gallery
          </Button>
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            <Grid className="h-4 w-4 mr-1" />
            Grid
          </Button>
        </div>
      </div>

      {message && (
        <div className={`mb-4 p-3 rounded ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {message.text}
          <button onClick={() => setMessage(null)} className="ml-2">
            <X className="h-4 w-4 inline" />
          </button>
        </div>
      )}

      {/* Stats bar */}
      <div className="mb-4 p-3 bg-gray-100 rounded-lg flex items-center gap-6 text-sm">
        <span>Total images: <strong>{storageFiles.length}</strong></span>
        <span>Unlinked: <strong>{unlinkedFiles.length}</strong></span>
        <span className="text-green-600">Linked: <strong>{linkedFiles.length}</strong></span>
        {savedFiles.size > 0 && (
          <span className="text-yellow-600">
            <Star className="h-3 w-3 inline mr-1" />
            Saved: <strong>{savedFiles.size}</strong>
          </span>
        )}
        {skippedFiles.size > 0 && (
          <span className="text-orange-600">
            <Trash2 className="h-3 w-3 inline mr-1" />
            Hidden: <strong>{skippedFiles.size}</strong>
          </span>
        )}
        <span className="text-purple-600">Analyzed: <strong>{Object.keys(imageAnalysisMap).length}</strong></span>
        <span>This session: <strong>{linkedCount}</strong></span>
        <div className="ml-auto flex gap-2">
          {batchAnalyzing ? (
            <Button size="sm" variant="destructive" onClick={handleStopBatch}>
              <StopCircle className="h-4 w-4 mr-1" />
              Stop
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={handleBatchAnalyze}>
              <Zap className="h-4 w-4 mr-1" />
              Analyze All
            </Button>
          )}
          <Button
            size="sm"
            variant={showLinked ? 'default' : 'outline'}
            onClick={() => {
              setShowLinked(!showLinked);
              setCurrentImageIndex(0);
            }}
          >
            {showLinked ? <Eye className="h-4 w-4 mr-1" /> : <EyeOff className="h-4 w-4 mr-1" />}
            {showLinked ? 'Showing Linked' : 'Show Linked'}
          </Button>
          {savedFiles.size > 0 && (
            <Button
              size="sm"
              variant={showSavedFiles ? 'default' : 'outline'}
              className={showSavedFiles ? 'bg-yellow-500 hover:bg-yellow-600' : ''}
              onClick={() => {
                setShowSavedFiles(!showSavedFiles);
                setShowHiddenFiles(false);
                setShowFlagged(null);
                setCurrentImageIndex(0);
              }}
            >
              <Star className="h-4 w-4 mr-1" />
              {showSavedFiles ? `Viewing ${savedFiles.size} Saved` : `View ${savedFiles.size} Saved`}
            </Button>
          )}
          {skippedFiles.size > 0 && (
            <Button
              size="sm"
              variant={showHiddenFiles ? 'default' : 'outline'}
              className={showHiddenFiles ? 'bg-orange-500 hover:bg-orange-600' : ''}
              onClick={() => {
                setShowHiddenFiles(!showHiddenFiles);
                setShowSavedFiles(false);
                setShowFlagged(null);
                setCurrentImageIndex(0);
              }}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              {showHiddenFiles ? `Viewing ${skippedFiles.size} Hidden` : `View ${skippedFiles.size} Hidden`}
            </Button>
          )}
          {/* Flagged files dropdown */}
          {totalFlagged > 0 && (
            <div className="relative group">
              <Button
                size="sm"
                variant={showFlagged ? 'default' : 'outline'}
                className={showFlagged ? 'bg-red-500 hover:bg-red-600' : 'text-red-600 border-red-300'}
              >
                <AlertTriangle className="h-4 w-4 mr-1" />
                {showFlagged ? `Viewing Flagged` : `⚠️ ${totalFlagged} Flagged`}
              </Button>
              <div className="absolute right-0 top-full mt-1 bg-white border rounded-lg shadow-lg p-2 hidden group-hover:block z-50 min-w-[180px]">
                <div className="text-xs text-gray-500 mb-2 px-2">View flagged images:</div>
                {flaggedFiles.anatomy.length > 0 && (
                  <button
                    className={`w-full text-left px-3 py-1.5 text-sm rounded hover:bg-red-50 ${showFlagged === 'anatomy' ? 'bg-red-100' : ''}`}
                    onClick={() => {
                      setShowFlagged(showFlagged === 'anatomy' ? null : 'anatomy');
                      setShowSavedFiles(false);
                      setShowHiddenFiles(false);
                      setCurrentImageIndex(0);
                    }}
                  >
                    🖐️ Anatomy issues ({flaggedFiles.anatomy.length})
                  </button>
                )}
                {flaggedFiles.sameGender.length > 0 && (
                  <button
                    className={`w-full text-left px-3 py-1.5 text-sm rounded hover:bg-red-50 ${showFlagged === 'sameGender' ? 'bg-red-100' : ''}`}
                    onClick={() => {
                      setShowFlagged(showFlagged === 'sameGender' ? null : 'sameGender');
                      setShowSavedFiles(false);
                      setShowHiddenFiles(false);
                      setCurrentImageIndex(0);
                    }}
                  >
                    👥 Same gender only ({flaggedFiles.sameGender.length})
                  </button>
                )}
                {flaggedFiles.nonSexual.length > 0 && (
                  <button
                    className={`w-full text-left px-3 py-1.5 text-sm rounded hover:bg-red-50 ${showFlagged === 'nonSexual' ? 'bg-red-100' : ''}`}
                    onClick={() => {
                      setShowFlagged(showFlagged === 'nonSexual' ? null : 'nonSexual');
                      setShowSavedFiles(false);
                      setShowHiddenFiles(false);
                      setCurrentImageIndex(0);
                    }}
                  >
                    🚫 Non-sexual ({flaggedFiles.nonSexual.length})
                  </button>
                )}
                {showFlagged && (
                  <button
                    className="w-full text-left px-3 py-1.5 text-sm rounded hover:bg-gray-100 mt-1 border-t"
                    onClick={() => {
                      setShowFlagged(null);
                      setCurrentImageIndex(0);
                    }}
                  >
                    ✕ Clear filter
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Batch progress bar */}
      {batchAnalyzing && (
        <div className="mb-4 p-3 bg-purple-50 rounded-lg">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-purple-700">
              <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
              Analyzing images with AI...
            </span>
            <span className="text-purple-600">
              {batchProgress.analyzed} / {batchProgress.total} ({batchProgress.remaining} remaining)
            </span>
          </div>
          <div className="w-full bg-purple-200 rounded-full h-2">
            <div
              className="bg-purple-600 h-2 rounded-full transition-all duration-300"
              style={{ width: batchProgress.total > 0 ? `${(batchProgress.analyzed / batchProgress.total) * 100}%` : '0%' }}
            />
          </div>
        </div>
      )}

      {viewMode === 'gallery' ? (
        /* GALLERY MODE */
        <div className="grid grid-cols-2 gap-6">
          {/* Left: Current Image */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold flex items-center gap-1">
                  {showFlagged === 'anatomy' ? '🖐️ Anatomy' :
                   showFlagged === 'sameGender' ? '👥 Same Gender' :
                   showFlagged === 'nonSexual' ? '🚫 Non-Sexual' :
                   showSavedFiles ? '⭐ Saved' :
                   showHiddenFiles ? '🗑️ Hidden' : 'Image'}{' '}
                  {showJumpInput ? (
                    <input
                      type="number"
                      min={1}
                      max={displayFiles.length}
                      value={jumpValue}
                      onChange={(e) => setJumpValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const num = parseInt(jumpValue);
                          if (num >= 1 && num <= displayFiles.length) {
                            setCurrentImageIndex(num - 1);
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
                        if (num >= 1 && num <= displayFiles.length) {
                          setCurrentImageIndex(num - 1);
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
                        setJumpValue(String(currentImageIndex + 1));
                        setShowJumpInput(true);
                      }}
                      className="hover:bg-gray-100 px-1 rounded cursor-pointer"
                      title="Click to jump to position"
                    >
                      {currentImageIndex + 1}
                    </button>
                  )}
                  {' '}/ {displayFiles.length}
                </h2>
                {showFlagged && (
                  <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded">
                    ⚠️ Flagged: {showFlagged === 'anatomy' ? 'Anatomy Issues' : showFlagged === 'sameGender' ? 'Same Gender' : 'Non-Sexual'}
                  </span>
                )}
                {showSavedFiles && (
                  <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">
                    Viewing Saved
                  </span>
                )}
                {showHiddenFiles && (
                  <span className="text-xs bg-orange-100 text-orange-800 px-2 py-0.5 rounded">
                    Viewing Hidden
                  </span>
                )}
                {isCurrentFileLinked && !showSavedFiles && !showHiddenFiles && !showFlagged && (
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">
                    Already Linked
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={goToPrevImage}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                {showFlagged ? (
                  /* Viewing flagged files (AI analysis flags) */
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-green-600 hover:bg-green-50"
                      onClick={async () => {
                        if (currentFile) {
                          const success = await clearAnalysisFlags(currentFile.name);
                          if (success && currentImageIndex >= displayFiles.length - 1) {
                            setCurrentImageIndex(prev => Math.max(0, prev - 1));
                          }
                        }
                      }}
                      title="Clear AI flags (restore)"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Restore
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 hover:bg-red-50"
                      onClick={hideCurrentImage}
                      title="Move to trash"
                    >
                      <Trash2 className="h-4 w-4" />
                      Hide
                    </Button>
                  </>
                ) : showSavedFiles ? (
                  /* Viewing saved files */
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-gray-600 hover:bg-gray-50"
                      onClick={async () => {
                        if (currentFile) {
                          await unsaveFile(currentFile.name);
                          if (currentImageIndex >= displayFiles.length - 1) {
                            setCurrentImageIndex(prev => Math.max(0, prev - 1));
                          }
                        }
                      }}
                      title="Remove from saved"
                    >
                      <X className="h-4 w-4" />
                      Unsave
                    </Button>
                    {selectedScene && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-blue-600 hover:bg-blue-50"
                        onClick={async () => {
                          if (currentFile) {
                            await unsaveFile(currentFile.name);
                            linkImageToScene(currentFile.url, selectedScene, true);
                          }
                        }}
                        title="Link to selected scene"
                      >
                        <Link2 className="h-4 w-4" />
                        Link
                      </Button>
                    )}
                  </>
                ) : showHiddenFiles ? (
                  /* Viewing hidden files */
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-green-600 hover:bg-green-50"
                    onClick={async () => {
                      if (currentFile) {
                        await unhideFile(currentFile.name);
                        if (currentImageIndex >= displayFiles.length - 1) {
                          setCurrentImageIndex(prev => Math.max(0, prev - 1));
                        }
                      }
                    }}
                    title="Restore from trash"
                  >
                    <Eye className="h-4 w-4" />
                    Restore
                  </Button>
                ) : (
                  /* Normal view */
                  <>
                    <Button size="sm" variant="outline" onClick={skipImage}>
                      <SkipForward className="h-4 w-4" />
                      Skip
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-yellow-600 hover:bg-yellow-50"
                      onClick={async () => {
                        if (currentFile) {
                          await saveFileForLater(currentFile.name);
                          if (currentImageIndex >= displayFiles.length - 1) {
                            setCurrentImageIndex(prev => Math.max(0, prev - 1));
                          }
                          setImageAnalysis(null);
                          setAiSuggestions([]);
                        }
                      }}
                      title="Save for later"
                    >
                      <Star className="h-4 w-4" />
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 hover:bg-red-50"
                      onClick={hideCurrentImage}
                      title="Move to trash"
                    >
                      <Trash2 className="h-4 w-4" />
                      Hide
                    </Button>
                  </>
                )}

                <Button size="sm" variant="outline" onClick={goToNextImage}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {currentFile ? (
              <div>
                <div className="relative group">
                  <img
                    src={currentFile.url}
                    alt={currentFile.name}
                    className="w-full h-[600px] object-contain bg-gray-50 rounded-lg cursor-pointer"
                    onClick={() => setLightboxImage(currentFile.url)}
                  />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <div className="bg-black/50 text-white px-3 py-1.5 rounded-full text-sm">
                      Click to view full size
                    </div>
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <div className="text-xs text-gray-500 truncate flex-1">
                    {currentFile.name}
                  </div>
                  <Button
                    size="sm"
                    onClick={handleAiSuggest}
                    disabled={analyzing}
                    className="ml-2"
                  >
                    {analyzing ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    ) : (
                      <Sparkles className="h-4 w-4 mr-1" />
                    )}
                    AI Suggest
                  </Button>
                </div>

                {/* Stored Analysis Tags (from batch) */}
                {currentFile && imageAnalysisMap[currentFile.name] && !imageAnalysis && (
                  <div className="mt-3 p-2 bg-gray-50 border rounded-lg text-xs">
                    <div className="font-semibold text-gray-700 mb-1 flex items-center gap-2">
                      <Check className="h-3 w-3 text-green-500" />
                      Previously Analyzed:
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {imageAnalysisMap[currentFile.name].keywords?.map((kw: string, idx: number) => (
                        <span key={`${kw}-${idx}`} className="bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">
                          {kw}
                        </span>
                      ))}
                    </div>
                    <div className="text-gray-500 mt-1">
                      {imageAnalysisMap[currentFile.name].activity}
                    </div>
                  </div>
                )}

                {/* AI Analysis result (from current suggestion) */}
                {imageAnalysis && (
                  <div className="mt-3 p-2 bg-purple-50 rounded-lg text-xs">
                    <div className="font-semibold text-purple-800 mb-1">AI Analysis:</div>
                    <div className="text-purple-700 space-y-0.5">
                      <div><strong>Activity:</strong> {imageAnalysis.activity}</div>
                      <div><strong>Keywords:</strong> {imageAnalysis.keywords.join(', ')}</div>
                      <div><strong>Mood:</strong> {imageAnalysis.mood}</div>
                      <div><strong>Participants:</strong> {imageAnalysis.participants.count} ({imageAnalysis.participants.genders.join(', ')})</div>
                    </div>
                  </div>
                )}

                {/* Linked scenes - show which scenes this image is linked to */}
                {currentFile && (() => {
                  const linkedScenes = getScenesLinkedToImage(currentFile.url);
                  if (linkedScenes.length === 0) return null;
                  return (
                    <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded-lg text-xs">
                      <div className="font-semibold text-green-800 mb-2 flex items-center gap-2">
                        <Link2 className="h-3 w-3" />
                        Linked to {linkedScenes.length} scene{linkedScenes.length > 1 ? 's' : ''}:
                      </div>
                      <div className="space-y-1">
                        {linkedScenes.map(scene => (
                          <div key={scene.id} className="flex items-center justify-between bg-white rounded p-1.5">
                            <div className="truncate flex-1">
                              <span className="font-medium">{scene.slug}</span>
                              <span className="text-gray-500 ml-1">• {scene.category}</span>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => unlinkImageFromScene(currentFile.url, scene.id)}
                              disabled={linking === scene.id}
                            >
                              {linking === scene.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Unlink className="h-3 w-3" />
                              )}
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : (
              <div className="h-[400px] flex items-center justify-center bg-gray-50 rounded-lg">
                <div className="text-center text-gray-500">
                  <Check className="h-12 w-12 mx-auto mb-2" />
                  <div>All images processed!</div>
                </div>
              </div>
            )}

            <div className="mt-4 text-xs text-gray-500">
              <strong>Hotkeys:</strong> ← → or A/D to navigate, S or Esc to skip
            </div>
          </div>

          {/* Right: Scene Search & List */}
          <div className="border rounded-lg p-4">
            {/* AI Suggestions Section */}
            {aiSuggestions.length > 0 && (
              <div className="mb-4">
                <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-purple-500" />
                  AI Suggestions
                </h2>
                <div className="space-y-1 max-h-[200px] overflow-y-auto">
                  {aiSuggestions.map((suggestion, idx) => {
                    const scene = scenes.find(s => s.id === suggestion.id);
                    const variantCount = scene?.image_variants?.length || 0;

                    return (
                      <div
                        key={suggestion.id}
                        className={`p-2 border rounded cursor-pointer transition-colors flex items-center justify-between ${
                          idx < 3 ? 'bg-purple-50 border-purple-200 hover:bg-purple-100' : 'hover:bg-blue-50 hover:border-blue-300'
                        }`}
                        onClick={() => {
                          if (currentFile) {
                            linkImageToScene(currentFile.url, suggestion.id, true);
                          }
                        }}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate flex items-center gap-2">
                            {suggestion.slug}
                            <span className="text-xs font-normal text-purple-600">
                              ({suggestion.score} pts)
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 truncate">
                            {suggestion.category} • {suggestion.matchReasons.slice(0, 2).join(' • ')}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-2">
                          {variantCount > 0 && (
                            <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                              {variantCount} img
                            </span>
                          )}
                          {linking === suggestion.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Link2 className="h-4 w-4 text-gray-400" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="border-b my-4" />
              </div>
            )}

            <h2 className="text-lg font-semibold mb-4">
              {aiSuggestions.length > 0 ? 'All Scenes' : 'Select Scene to Link'}
            </h2>

            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Type keywords: bondage, oral, roleplay, massage..."
                value={sceneSearch}
                onChange={(e) => setSceneSearch(e.target.value)}
                className="pl-10"
                autoFocus
              />
              {sceneSearch && (
                <button
                  onClick={() => setSceneSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Search results info */}
            {sceneSearch && (
              <div className="text-xs text-gray-500 mb-2">
                Found {filteredScenes.length} scenes matching &quot;{sceneSearch}&quot;
              </div>
            )}

            <div className="space-y-1 max-h-[350px] overflow-y-auto">
              {filteredScenes.slice(0, 50).map((scene) => {
                const variantCount = scene.image_variants?.length || 0;
                const isSuggested = aiSuggestions.some(s => s.id === scene.id);
                const hasScore = scene.searchScore > 0;

                return (
                  <div
                    key={scene.id}
                    className={`p-2 border rounded cursor-pointer transition-colors flex items-center justify-between ${
                      isSuggested ? 'opacity-50' :
                      hasScore ? 'bg-blue-50 border-blue-200 hover:bg-blue-100' :
                      'hover:bg-gray-50'
                    }`}
                    onClick={() => {
                      if (currentFile && !isSuggested) {
                        linkImageToScene(currentFile.url, scene.id, true);
                      }
                    }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate flex items-center gap-2">
                        {scene.slug}
                        {hasScore && (
                          <span className="text-xs font-normal text-blue-600">
                            ({scene.searchScore} pts)
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {scene.category} • {scene.title?.en || scene.title?.ru}
                      </div>
                      {/* Show matched fields */}
                      {scene.matchedFields.length > 0 && (
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {scene.matchedFields.map(field => (
                            <span key={field} className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                              {field}
                            </span>
                          ))}
                        </div>
                      )}
                      {/* Show description if available */}
                      {(scene.user_description?.en || scene.user_description?.ru) && (
                        <div className="text-xs text-gray-600 mt-1 line-clamp-2">
                          {scene.user_description?.en || scene.user_description?.ru}
                        </div>
                      )}
                      {/* Show tags preview if searching */}
                      {sceneSearch && scene.tags && scene.tags.length > 0 && (
                        <div className="text-xs text-gray-400 mt-1 truncate">
                          Tags: {scene.tags.slice(0, 5).join(', ')}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      {variantCount > 0 && (
                        <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                          {variantCount} img
                        </span>
                      )}
                      {linking === scene.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Link2 className="h-4 w-4 text-gray-400" />
                      )}
                    </div>
                  </div>
                );
              })}
              {filteredScenes.length > 50 && (
                <div className="text-center text-sm text-gray-500 py-2">
                  +{filteredScenes.length - 50} more (refine search)
                </div>
              )}
              {sceneSearch && filteredScenes.length === 0 && (
                <div className="text-center text-sm text-gray-500 py-4">
                  No scenes found for &quot;{sceneSearch}&quot;
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* GRID MODE (original) */
        <div>
          <div className="flex gap-4 mb-6">
            <Button
              variant={showAll ? 'default' : 'outline'}
              onClick={() => setShowAll(!showAll)}
            >
              {showAll ? 'Showing All Scenes' : 'Without Images Only'}
            </Button>
            <Button
              variant={showLinked ? 'default' : 'outline'}
              onClick={() => setShowLinked(!showLinked)}
            >
              {showLinked ? <Eye className="h-4 w-4 mr-1" /> : <EyeOff className="h-4 w-4 mr-1" />}
              {showLinked ? 'Showing Linked' : 'Hide Linked'}
            </Button>
            <Button variant="outline" onClick={loadData}>
              Refresh
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-6">
            {/* Left: Scenes */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">
                  Scenes ({scenes.filter(s =>
                    showAll || !s.image_url
                  ).filter(s =>
                    !searchTerm ||
                    s.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    s.title?.en?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    s.title?.ru?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    s.category?.toLowerCase().includes(searchTerm.toLowerCase())
                  ).length})
                </h2>
              </div>
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search scenes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                {scenes
                  .filter(s => showAll || !s.image_url)
                  .filter(s =>
                    !searchTerm ||
                    s.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    s.title?.en?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    s.title?.ru?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    s.category?.toLowerCase().includes(searchTerm.toLowerCase())
                  )
                  .map((scene) => {
                    const isSelected = selectedScene === scene.id;

                    return (
                      <div
                        key={scene.id}
                        className={`border rounded transition-colors ${
                          isSelected ? 'border-blue-500 bg-blue-50' : 'hover:bg-gray-50'
                        }`}
                      >
                        <div
                          className="p-3 cursor-pointer"
                          onClick={() => setSelectedScene(isSelected ? null : scene.id)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm">{scene.slug}</div>
                              <div className="text-xs text-gray-500">
                                {scene.category}
                              </div>
                              {/* Description */}
                              <div className="text-xs text-gray-600 mt-1 line-clamp-2">
                                {scene.user_description?.ru || scene.ai_description?.ru || scene.title?.ru || scene.title?.en}
                              </div>
                              {/* Paired scene indicator */}
                              {scene.paired_scene && (
                                <div className="text-xs text-purple-600 mt-1">
                                  ↔ paired: {scene.paired_scene}
                                </div>
                              )}
                            </div>
                            {(scene.image_variants?.length || 0) > 0 && (
                              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded ml-2 shrink-0">
                                {scene.image_variants?.length} img
                              </span>
                            )}
                          </div>
                        </div>
                        {/* Show linked images when selected */}
                        {isSelected && scene.image_variants && scene.image_variants.length > 0 && (
                          <div className="px-3 pb-3 border-t border-blue-200">
                            <div className="text-xs text-gray-600 mt-2 mb-2">Linked images (click to unlink):</div>
                            <div className="grid grid-cols-4 gap-2">
                              {scene.image_variants.map((variant, idx) => (
                                <div
                                  key={variant.url}
                                  className="relative group"
                                >
                                  <img
                                    src={variant.url}
                                    alt={`Variant ${idx + 1}`}
                                    className="w-full aspect-square object-contain bg-white rounded border"
                                  />
                                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded flex items-center justify-center gap-2">
                                    <button
                                      className="p-2 bg-white/90 rounded-full hover:bg-white shadow-lg"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setLightboxImage(variant.url);
                                      }}
                                    >
                                      <Eye className="h-5 w-5 text-gray-700" />
                                    </button>
                                    <button
                                      className="p-2 bg-red-500 rounded-full hover:bg-red-600 shadow-lg"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        unlinkImageFromScene(variant.url, scene.id);
                                      }}
                                    >
                                      <Unlink className="h-5 w-5 text-white" />
                                    </button>
                                  </div>
                                  {linking === scene.id && (
                                    <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded">
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Right: Storage Files */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">
                  Storage Images ({storageFiles.filter(f => {
                    if (skippedFiles.has(f.name)) return false;
                    const baseUrl = f.url.split('?')[0];
                    const isLinked = allLinkedUrls.has(baseUrl);
                    if (isLinked && !showLinked) return false;

                    if (!imageSearchTerm) return true;
                    const terms = imageSearchTerm.toLowerCase().split(/\s+/);
                    const analysis = imageAnalysisMap[f.name];
                    if (!analysis) return f.name.toLowerCase().includes(imageSearchTerm.toLowerCase());
                    const searchableText = [
                      ...(analysis.keywords || []),
                      analysis.activity || '',
                      analysis.mood || '',
                      analysis.setting || '',
                      ...(analysis.elements || []),
                      f.name
                    ].join(' ').toLowerCase();
                    return terms.every(term => searchableText.includes(term));
                  }).length})
                </h2>
                <div className="flex gap-3">
                  {savedFiles.size > 0 && (
                    <button
                      className={`text-xs flex items-center gap-1 ${showSavedFiles ? 'text-yellow-600 font-medium' : 'text-gray-500 hover:text-gray-700'}`}
                      onClick={() => { setShowSavedFiles(!showSavedFiles); setShowHiddenFiles(false); }}
                    >
                      <Star className="h-3 w-3" />
                      {showSavedFiles ? `${savedFiles.size} saved shown` : `${savedFiles.size} saved`}
                    </button>
                  )}
                  {skippedFiles.size > 0 && (
                    <button
                      className={`text-xs flex items-center gap-1 ${showHiddenFiles ? 'text-orange-600 font-medium' : 'text-gray-500 hover:text-gray-700'}`}
                      onClick={() => { setShowHiddenFiles(!showHiddenFiles); setShowSavedFiles(false); }}
                    >
                      <Trash2 className="h-3 w-3" />
                      {showHiddenFiles ? `${skippedFiles.size} hidden shown` : `${skippedFiles.size} hidden`}
                    </button>
                  )}
                </div>
              </div>
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by AI keywords..."
                  value={imageSearchTerm}
                  onChange={(e) => setImageSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="grid grid-cols-3 gap-2 max-h-[60vh] overflow-y-auto">
                {storageFiles
                  .filter(f => {
                    const isHidden = skippedFiles.has(f.name);
                    const isSaved = savedFiles.has(f.name);

                    // Mode: viewing saved files
                    if (showSavedFiles) {
                      return isSaved;
                    }
                    // Mode: viewing hidden files
                    if (showHiddenFiles) {
                      return isHidden;
                    }
                    // Normal mode: hide hidden and saved files
                    if (isHidden || isSaved) return false;

                    // Hide already linked images (unless showLinked is true)
                    const baseUrl = f.url.split('?')[0];
                    const isLinked = allLinkedUrls.has(baseUrl);
                    if (isLinked && !showLinked) return false;

                    if (!imageSearchTerm) return true;
                    const terms = imageSearchTerm.toLowerCase().split(/\s+/);
                    const analysis = imageAnalysisMap[f.name];
                    if (!analysis) return f.name.toLowerCase().includes(imageSearchTerm.toLowerCase());
                    const searchableText = [
                      ...(analysis.keywords || []),
                      analysis.activity || '',
                      analysis.mood || '',
                      analysis.setting || '',
                      ...(analysis.elements || []),
                      f.name
                    ].join(' ').toLowerCase();
                    return terms.every(term => searchableText.includes(term));
                  })
                  .map((file) => {
                    const baseUrl = file.url.split('?')[0];
                    const isLinked = allLinkedUrls.has(baseUrl);
                    const isHidden = skippedFiles.has(file.name);
                    const isSaved = savedFiles.has(file.name);
                    return (
                    <div
                      key={file.name}
                      className={`relative group cursor-pointer ${
                        isHidden ? 'opacity-60' : ''
                      } ${
                        selectedScene && !isHidden && !isSaved ? 'hover:ring-2 ring-blue-500' : ''
                      }`}
                      onClick={() => {
                        if (selectedScene && !isHidden && !isSaved) {
                          linkImageToScene(file.url, selectedScene);
                        }
                      }}
                    >
                      <img
                        src={file.url}
                        alt={file.name}
                        className={`w-full aspect-square object-contain rounded ${
                          isHidden ? 'bg-orange-100 ring-2 ring-orange-400' :
                          isSaved ? 'bg-yellow-100 ring-2 ring-yellow-400' :
                          isLinked ? 'bg-green-100 ring-2 ring-green-400' : 'bg-gray-100'
                        }`}
                      />
                      {isSaved && (
                        <div className="absolute top-1 right-1 bg-yellow-500 text-white rounded-full p-0.5">
                          <Star className="h-3 w-3" />
                        </div>
                      )}
                      {isHidden && (
                        <div className="absolute top-1 right-1 bg-orange-500 text-white rounded-full p-0.5">
                          <EyeOff className="h-3 w-3" />
                        </div>
                      )}
                      {isLinked && !isHidden && (
                        <div className="absolute top-1 right-1 bg-green-500 text-white rounded-full p-0.5">
                          <Check className="h-3 w-3" />
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 bg-black/80 text-white text-[10px] p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {imageAnalysisMap[file.name] ? (
                          <div className="truncate">
                            {imageAnalysisMap[file.name].keywords?.slice(0, 4).join(', ')}
                          </div>
                        ) : (
                          <div className="truncate text-gray-400">{file.name}</div>
                        )}
                      </div>
                      {/* Hover overlay with actions */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                        <button
                          className="p-2.5 bg-white/90 rounded-full hover:bg-white shadow-lg"
                          onClick={(e) => {
                            e.stopPropagation();
                            setLightboxImage(file.url);
                          }}
                          title="View full size"
                        >
                          <Eye className="h-5 w-5 text-gray-700" />
                        </button>
                        {isHidden ? (
                          /* Hidden file - show restore button */
                          <button
                            className="p-2.5 bg-green-500 rounded-full hover:bg-green-600 shadow-lg"
                            onClick={(e) => {
                              e.stopPropagation();
                              unhideFile(file.name);
                            }}
                            title="Restore from trash"
                          >
                            <Eye className="h-5 w-5 text-white" />
                          </button>
                        ) : isSaved ? (
                          /* Saved file - show unsave and link buttons */
                          <>
                            <button
                              className="p-2.5 bg-gray-500 rounded-full hover:bg-gray-600 shadow-lg"
                              onClick={(e) => {
                                e.stopPropagation();
                                unsaveFile(file.name);
                              }}
                              title="Remove from saved"
                            >
                              <X className="h-5 w-5 text-white" />
                            </button>
                            {selectedScene && (
                              <button
                                className="p-2.5 bg-blue-500 rounded-full hover:bg-blue-600 shadow-lg"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  unsaveFile(file.name);
                                  linkImageToScene(file.url, selectedScene);
                                }}
                                title="Link to scene"
                              >
                                <Link2 className="h-5 w-5 text-white" />
                              </button>
                            )}
                          </>
                        ) : (
                          /* Normal file - show save, link, hide buttons */
                          <>
                            <button
                              className="p-2.5 bg-yellow-500 rounded-full hover:bg-yellow-600 shadow-lg"
                              onClick={(e) => {
                                e.stopPropagation();
                                saveFileForLater(file.name);
                              }}
                              title="Save for later"
                            >
                              <Star className="h-5 w-5 text-white" />
                            </button>
                            {selectedScene && (
                              <button className="p-2.5 bg-blue-500 rounded-full hover:bg-blue-600 shadow-lg">
                                <Link2 className="h-5 w-5 text-white" />
                              </button>
                            )}
                            <button
                              className="p-2.5 bg-red-500/90 rounded-full hover:bg-red-600 shadow-lg"
                              onClick={(e) => {
                                e.stopPropagation();
                                hideFile(file.name);
                              }}
                              title="Move to trash"
                            >
                              <Trash2 className="h-5 w-5 text-white" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                  })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg text-sm text-gray-600">
        <strong>Gallery mode (fast):</strong>
        <ol className="list-decimal ml-5 mt-2 space-y-1">
          <li>See large image on the left</li>
          <li><strong>Search by keywords</strong>: slug, category, tags, title, description, prompt</li>
          <li><strong>AI Suggest</strong>: analyzes image and finds matching scenes</li>
          <li>Click scene to link and auto-advance</li>
          <li>Use Skip or hotkeys (←→ AD S) to navigate</li>
        </ol>
        <div className="mt-3 text-xs text-gray-500">
          <strong>Search tips:</strong> Type multiple words (e.g. &quot;bondage rope&quot; or &quot;oral blowjob&quot;).
          Results are sorted by relevance score. Matching fields are highlighted.
        </div>
      </div>

      {/* Lightbox Modal */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={() => setLightboxImage(null)}
        >
          <button
            className="absolute top-4 right-4 text-white hover:text-gray-300"
            onClick={() => setLightboxImage(null)}
          >
            <X className="h-8 w-8" />
          </button>
          <img
            src={lightboxImage}
            alt="Full size"
            className="max-w-[90vw] max-h-[90vh] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
