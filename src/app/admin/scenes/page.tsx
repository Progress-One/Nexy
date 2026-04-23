'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Scene, SceneV2, ImageVariant } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { STYLE_VARIANTS, buildPrompt } from '@/lib/civitai-config';
import {
  Trash2,
  RefreshCw,
  Play,
  ImageIcon,
  Loader2,
  Check,
  X,
  Settings,
  ChevronDown,
  ChevronUp,
  Edit3,
  Eye,
  RotateCcw,
  ShieldCheck,
  ShieldX,
  ShieldQuestion,
  Languages,
  ThumbsUp,
  ThumbsDown,
  Copy,
  Layers,
  CheckCircle2,
  Upload,
  Wand2,
} from 'lucide-react';

type GenerationStatus = 'idle' | 'pending' | 'generating' | 'completed' | 'error';
type QAStatus = 'passed' | 'failed' | null;

// V3 fields that extend Scene (with optional overrides for admin UI)
interface SceneWithStatus extends Omit<Scene, 'ai_description' | 'user_description' | 'participants' | 'question_type'> {
  selected: boolean;
  status: GenerationStatus;
  error?: string;
  expanded?: boolean;
  // Core description fields (JSONB localized)
  ai_description?: { en: string; ru: string };
  user_description?: { en: string; ru: string };
  // Dual descriptions for M/F perspectives
  user_description_alt?: { en: string; ru: string };
  alt_for_gender?: 'male' | 'female' | null;
  // V2 fields (legacy V3/V4 fields kept for compatibility)
  slug?: string;
  priority?: number;
  ai_context?: any; // V2 uses ai_context with tests_primary/tests_secondary
  question_type?: string;
  follow_up?: any;
  // V2 fields
  version?: number;
  title?: { en: string; ru: string };
  subtitle?: { en: string; ru: string };
  category?: string;
  role_direction?: string;
  elements?: Array<{
    id: string;
    label: { en: string; ru: string };
    tag_ref: string;
  }>;
  question?: {
    type: string;
    text: { en: string; ru: string };
  };
  // Participants can be array of objects or simple count
  participants?: { count: number } | Array<{ gender: string; role: string }>;
  // Prompt fields
  image_prompt?: string; // Default prompt from JSON files
  // QA fields
  qa_status?: QAStatus;
  qa_attempts?: number;
  qa_last_assessment?: Record<string, unknown>;
  prompt_instructions?: string; // User notes for AI on how to modify prompt
  // Manual acceptance
  accepted?: boolean | null;
  // Scene visibility
  is_active?: boolean;
  // Paired scene (give/receive perspectives) - slug reference
  paired_scene?: string;
  // Scene to share images with (uses their image_variants)
  shared_images_with?: string;
  // Image variants for comparison
  image_variants?: ImageVariant[];
  // UI state
  showDefaultPrompt?: boolean; // Show image_prompt (default) for comparison
  showPromptInstructions?: boolean;
  showVariants?: boolean; // Show variants gallery
  showImg2Img?: boolean; // Show img2img controls
  img2imgStrength?: number; // Strength for img2img (0-1)
}

type ServiceType = 'civitai' | 'replicate';

// Resolution presets
const RESOLUTION_PRESETS = [
  { id: '3:2', name: '3:2 Landscape', width: 1024, height: 682 },
  { id: '2:3', name: '2:3 Portrait', width: 682, height: 1024 },
  { id: '1:1', name: '1:1 Square', width: 1024, height: 1024 },
  { id: '16:9', name: '16:9 Widescreen', width: 1344, height: 768 },
  { id: '9:16', name: '9:16 Vertical', width: 768, height: 1344 },
  { id: '4:3', name: '4:3 Standard', width: 1024, height: 768 },
  { id: '3:4', name: '3:4 Portrait', width: 768, height: 1024 },
];

type QAEvaluator = 'replicate' | 'claude';

interface GlobalSettings {
  service: ServiceType;
  styleVariant: keyof typeof STYLE_VARIANTS | 'default';
  stylePrefix: string;
  negativePrompt: string;
  modelId: string;
  aspectRatio: string;
  enableQA: boolean;
  qaEvaluator: QAEvaluator; // 'replicate' (LLaVA, NSFW-safe) or 'claude'
  useAiContext: boolean; // When false, only use generation_prompt (no ai_context)
  modelStyles: Record<string, string>; // Saved style prefix per model
}

// Civitai models
const CIVITAI_MODELS = [
  { id: '827184', name: 'WAI-illustrious v16 (NEW)' },
  { id: '439889', name: 'Prefect Pony XL v6 (NEW)' },
  { id: '795765', name: 'Illustrious XL v0.1' },
  { id: '1024144', name: 'NoobAI XL (Illustrious)' },
  { id: '2173364', name: 'CoMix v1.0 (Illustrious)' },
  { id: '1022833', name: 'WAI-NSFW-illustrious (old)' },
  { id: '4201', name: 'Realistic Vision v5.1' },
  { id: '139562', name: 'RealVisXL V5.0 Lightning' },
  { id: '312530', name: 'CyberRealistic XL v8.0' },
  { id: '277058', name: 'epiCRealism XL' },
  { id: '299933', name: 'Halcyon SDXL v1.9' },
  { id: '133005', name: 'Juggernaut XL' },
  { id: '101055', name: 'DreamShaper XL' },
  { id: '257749', name: 'Pony Diffusion XL (stylized)' },
  { id: '128713', name: 'SDXL Base 1.0' },
];

// Replicate models
const REPLICATE_MODELS = [
  { id: 'flux-pro', name: 'FLUX 2 Pro (NEW, best quality)' },
  { id: 'juggernaut', name: 'Juggernaut XI v11 (NEW)' },
  { id: 'pony-xl', name: 'Pony XL v5 (best for yaoi/bara)' },
  { id: 'pony-realism', name: 'Pony Realism v2.3 (realistic)' },
  { id: 'noobai-xl', name: 'NoobAI XL (Illustrious)' },
  { id: 'wai-illustrious-v12', name: 'WAI NSFW Illustrious v12' },
  { id: 'wai-illustrious', name: 'WAI NSFW Illustrious v11 (old)' },
  { id: 'z-image-turbo', name: 'Z Image Turbo (super fast)' },
  { id: 'flux-schnell', name: 'FLUX Schnell (fast)' },
  { id: 'flux-dev', name: 'FLUX Dev' },
  { id: 'flux-1.1-pro', name: 'FLUX 1.1 Pro (legacy)' },
  { id: 'sdxl-lightning', name: 'SDXL Lightning (fast)' },
  { id: 'sdxl', name: 'SDXL' },
  { id: 'realistic-vision', name: 'Realistic Vision v5.1' },
  { id: 'juggernaut-v9', name: 'Juggernaut XL v9 (legacy)' },
];

const SETTINGS_KEY = 'admin-scenes-settings';

const DEFAULT_SETTINGS: GlobalSettings = {
  service: 'civitai',
  styleVariant: 'default',
  stylePrefix: '',
  negativePrompt: '',
  modelId: '4201',
  aspectRatio: '3:2',
  enableQA: false,
  qaEvaluator: 'replicate', // Default to Replicate (LLaVA) for NSFW support
  useAiContext: true, // Use ai_context by default
  modelStyles: {}, // Saved style prefix per model
};

function loadSettings(): GlobalSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (saved) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.error('Failed to load settings:', e);
  }
  return DEFAULT_SETTINGS;
}

function saveSettings(settings: GlobalSettings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save settings:', e);
  }
}

interface LogEntry {
  time: string;
  message: string;
  type: 'info' | 'success' | 'error';
}

// Build QA context from scene data
function buildQAContext(scene: SceneWithStatus) {
  const aiContext = scene.ai_context;
  const keyElements: Array<{ element: string; critical: boolean; in_action: boolean }> = [];

  // V2 scenes: use user_description as essence (action-based)
  // V3 scenes: use ai_context.description
  let essence = '';

  // Priority: user_description (best for QA - action descriptions) > ai_context.description > ai_description
  if (scene.user_description?.en) {
    essence = scene.user_description.en;
  } else if (scene.user_description?.ru) {
    essence = scene.user_description.ru;
  } else if (aiContext?.description) {
    essence = aiContext.description;
  } else {
    essence = scene.ai_description?.en || scene.ai_description?.ru || '';
  }

  // Build key elements based on scene version
  if (scene.version === 2 && aiContext) {
    // V2 scenes: use tests_primary array
    const v2Context = aiContext as { tests_primary?: string[]; tests_secondary?: string[]; emotional_range?: { positive?: string[] } };

    if (v2Context.tests_primary && v2Context.tests_primary.length > 0) {
      // First primary test is critical and must be "in action"
      keyElements.push({
        element: v2Context.tests_primary[0],
        critical: true,
        in_action: true,
      });

      // Additional primary tests are critical but don't need to be in action
      for (const test of v2Context.tests_primary.slice(1)) {
        keyElements.push({
          element: test,
          critical: true,
          in_action: false,
        });
      }
    }

    if (v2Context.tests_secondary) {
      for (const test of v2Context.tests_secondary.slice(0, 2)) {
        keyElements.push({
          element: test,
          critical: false,
          in_action: false,
        });
      }
    }
  } else if (aiContext?.tests) {
    // V3 scenes: use tests.primary_kink
    const v3Context = aiContext as { tests?: { primary_kink?: string; secondary_kinks?: string[] }; description?: string; emotional_range?: { positive?: string[] } };

    if (v3Context.tests?.primary_kink) {
      keyElements.push({
        element: v3Context.tests.primary_kink,
        critical: true,
        in_action: true,
      });
    }

    if (v3Context.tests?.secondary_kinks) {
      for (const kink of v3Context.tests.secondary_kinks.slice(0, 2)) {
        keyElements.push({
          element: kink,
          critical: false,
          in_action: false,
        });
      }
    }
  }

  // Determine participants based on role_direction for V2 scenes
  let participantCount = 2;
  let genders: string[] = ['M', 'F'];

  if (scene.role_direction) {
    const roleDir = scene.role_direction;
    if (roleDir === 'solo' || roleDir === 'f_experience') {
      participantCount = 1;
      genders = roleDir === 'f_experience' ? ['F'] : ['any'];
    } else if (roleDir === 'mlm') {
      genders = ['M', 'M'];
    } else if (roleDir === 'wlw') {
      genders = ['F', 'F'];
    } else if (roleDir === 'group' || roleDir.includes('threesome') || roleDir.includes('gangbang')) {
      participantCount = 3;
      genders = ['any', 'any', 'any'];
    } else if (roleDir === 'm_to_f' || roleDir.includes('m_') || roleDir === 'cuckold') {
      genders = ['M', 'F'];
    } else if (roleDir === 'f_to_m' || roleDir.includes('f_')) {
      genders = ['F', 'M'];
    }
  } else if (scene.participants) {
    if (Array.isArray(scene.participants)) {
      participantCount = scene.participants.length;
      genders = scene.participants.map((p) => p.gender === 'male' ? 'M' : p.gender === 'female' ? 'F' : 'any');
    } else if (typeof scene.participants === 'object' && 'count' in scene.participants) {
      participantCount = scene.participants.count;
    }
  }

  // Get mood from ai_context
  let mood = 'sensual';
  if (aiContext?.emotional_range?.positive) {
    mood = aiContext.emotional_range.positive.join(', ');
  }

  // If no key elements, create from essence
  if (keyElements.length === 0 && essence) {
    keyElements.push({
      element: essence,
      critical: true,
      in_action: true,
    });
  }

  return {
    essence,
    key_elements: keyElements.length > 0 ? keyElements : [
      { element: 'main subject visible', critical: true, in_action: false },
    ],
    mood,
    participants: {
      count: participantCount,
      genders,
    },
  };
}

export default function AdminScenesPage() {
  const [scenes, setScenes] = useState<SceneWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [settings, setSettings] = useState<GlobalSettings>(DEFAULT_SETTINGS);
  const [showSettings, setShowSettings] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive' | 'no_image' | 'has_image' | 'qa_failed' | 'v2_only' | 'accepted' | 'rejected' | 'not_reviewed' | 'paired'>('active');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [qaDetailScene, setQaDetailScene] = useState<SceneWithStatus | null>(null);
  const [showV3Creator, setShowV3Creator] = useState(false);
  const [v3CreatorLoading, setV3CreatorLoading] = useState(false);

  // Ref to access current scenes in callbacks (avoids stale closure)
  const scenesRef = useRef<SceneWithStatus[]>([]);
  scenesRef.current = scenes;

  const supabase = createClient();

  // Ref to track if we've synced with server
  const serverSyncedRef = useRef(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load settings from localStorage first, then sync with server
  useEffect(() => {
    // Load from localStorage immediately
    const localSettings = loadSettings();
    setSettings(localSettings);

    // Then load from server and merge
    fetch('/api/admin/settings')
      .then((res) => res.json())
      .then(({ settings: serverSettings }) => {
        if (serverSettings?.modelStyles) {
          // Merge server modelStyles with local (server takes priority)
          const mergedStyles = { ...localSettings.modelStyles, ...serverSettings.modelStyles };
          const merged = { ...localSettings, modelStyles: mergedStyles };
          setSettings(merged);
          saveSettings(merged); // Update localStorage with merged data
          console.log('[Settings] Synced with server:', Object.keys(mergedStyles).length, 'model styles');
        }
        serverSyncedRef.current = true;
      })
      .catch((err) => {
        console.error('[Settings] Failed to load from server:', err);
        serverSyncedRef.current = true; // Still mark as synced to allow saves
      });
  }, []);

  // Save settings when they change (debounced save to server)
  const updateSettings = (newSettings: GlobalSettings) => {
    setSettings(newSettings);
    saveSettings(newSettings); // Save to localStorage immediately

    // Debounced save to server (only modelStyles)
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: { modelStyles: newSettings.modelStyles } }),
      })
        .then(() => console.log('[Settings] Saved to server'))
        .catch((err) => console.error('[Settings] Failed to save to server:', err));
    }, 1000); // 1 second debounce
  };

  const addLog = (message: string, type: LogEntry['type'] = 'info') => {
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev.slice(-50), { time, message, type }]);
  };

  // Get effective image variants (from shared_images_with source if set, otherwise own)
  const getEffectiveVariants = useCallback((scene: SceneWithStatus): ImageVariant[] => {
    // If scene shares images with another scene, ALWAYS use source variants
    if (scene.shared_images_with) {
      const linkedScene = scenes.find(s => s.id === scene.shared_images_with);
      if (linkedScene?.image_variants && linkedScene.image_variants.length > 0) {
        return linkedScene.image_variants;
      }
    }
    // Otherwise use own variants
    if (scene.image_variants && scene.image_variants.length > 0) {
      return scene.image_variants;
    }
    return [];
  }, [scenes]);

  // Get the source scene slug for shared images
  const getSharedSourceSlug = useCallback((scene: SceneWithStatus): string | null => {
    if (scene.shared_images_with) {
      const linkedScene = scenes.find(s => s.id === scene.shared_images_with);
      return linkedScene?.slug || null;
    }
    return null;
  }, [scenes]);

  const loadScenes = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('scenes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading scenes:', error);
      return;
    }

    // Debug: log scenes with QA status
    const qaScenes = (data || []).filter(s => s.qa_status);
    if (qaScenes.length > 0) {
      console.log('[LoadScenes] Scenes with QA status:', qaScenes.map(s => ({
        slug: s.slug,
        qa_status: s.qa_status,
        image_url: s.image_url,
        has_assessment: !!s.qa_last_assessment,
      })));
    }

    // Debug: log accepted status
    const acceptedScenes = (data || []).filter(s => s.accepted !== null && s.accepted !== undefined);
    console.log('[LoadScenes] Scenes with accepted status:', acceptedScenes.length, acceptedScenes.map(s => ({
      slug: s.slug,
      accepted: s.accepted,
    })));

    // Debug: compare generation_prompt vs image_prompt
    const promptCompare = (data || []).slice(0, 3).map(s => ({
      slug: s.slug,
      generation_prompt: s.generation_prompt?.substring(0, 60) + '...',
      image_prompt: s.image_prompt?.substring(0, 60) + '...',
      are_same: s.generation_prompt === s.image_prompt,
    }));
    console.log('[LoadScenes] Prompt comparison (first 3):', promptCompare);

    // Check if 'accepted' field exists in first scene
    if (data && data.length > 0) {
      console.log('[LoadScenes] First scene keys:', Object.keys(data[0]));
      console.log('[LoadScenes] First scene accepted value:', data[0].accepted);
    }

    setScenes(
      (data || []).map((scene) => ({
        ...scene,
        selected: false,
        status: 'idle' as GenerationStatus,
      }))
    );
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadScenes();
  }, [loadScenes]);

  const filteredScenes = scenes.filter((scene) => {
    const isActive = scene.is_active !== false;
    if (filter === 'active') return isActive;
    if (filter === 'inactive') return !isActive;
    if (filter === 'all') return true;
    // All other filters only show active scenes
    if (!isActive) return false;
    if (filter === 'paired') return !!scene.paired_scene;
    if (filter === 'no_image') return !scene.image_url;
    if (filter === 'has_image') return !!scene.image_url;
    if (filter === 'qa_failed') return scene.qa_status === 'failed';
    if (filter === 'v2_only') return scene.version === 2;
    if (filter === 'accepted') return scene.accepted === true;
    if (filter === 'rejected') return scene.accepted === false;
    if (filter === 'not_reviewed') return scene.image_url && scene.accepted === null;
    return true;
  });

  const selectedCount = scenes.filter((s) => s.selected).length;

  const toggleSelect = (id: string) => {
    setScenes((prev) =>
      prev.map((s) => (s.id === id ? { ...s, selected: !s.selected } : s))
    );
  };

  const selectAll = () => {
    const allSelected = filteredScenes.every((s) => s.selected);
    const filteredIds = new Set(filteredScenes.map((s) => s.id));
    setScenes((prev) =>
      prev.map((s) =>
        filteredIds.has(s.id) ? { ...s, selected: !allSelected } : s
      )
    );
  };

  const deselectAll = () => {
    setScenes((prev) => prev.map((s) => ({ ...s, selected: false })));
  };

  const selectNext10WithoutImage = () => {
    // Find first 10 scenes without image from filtered list
    const withoutImage = filteredScenes
      .filter((s) => !s.image_url)
      .slice(0, 10)
      .map((s) => s.id);

    if (withoutImage.length === 0) {
      addLog('No scenes without images found', 'info');
      return;
    }

    const idsToSelect = new Set(withoutImage);
    setScenes((prev) =>
      prev.map((s) => ({
        ...s,
        selected: idsToSelect.has(s.id) ? true : s.selected,
      }))
    );
    addLog(`Selected ${withoutImage.length} scenes without images`, 'success');
  };

  // Track original prompts to detect changes (since state is updated on every keystroke)
  const originalPromptsRef = useRef<Record<string, string>>({});

  const updatePrompt = (id: string, prompt: string) => {
    // Store original value on first edit
    if (!(id in originalPromptsRef.current)) {
      const scene = scenes.find((s) => s.id === id);
      originalPromptsRef.current[id] = scene?.generation_prompt || '';
    }
    setScenes((prev) =>
      prev.map((s) => (s.id === id ? { ...s, generation_prompt: prompt } : s))
    );
  };

  const savePrompt = async (id: string, newPrompt: string) => {
    const originalPrompt = originalPromptsRef.current[id];

    // If no original tracked or prompt hasn't changed - skip save
    if (originalPrompt === undefined || originalPrompt === newPrompt) {
      delete originalPromptsRef.current[id]; // Clean up
      return;
    }

    // Save to generation_prompt via API route (bypasses RLS)
    try {
      const res = await fetch('/api/admin/update-scene', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sceneId: id,
          field: 'generation_prompt',
          value: newPrompt,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        addLog(`Failed to save prompt: ${data.error || 'Unknown error'}`, 'error');
      } else {
        addLog(`Prompt saved`, 'success');
      }
    } catch (err) {
      addLog(`Failed to save prompt: ${(err as Error).message}`, 'error');
    }

    // Clean up tracked original
    delete originalPromptsRef.current[id];
  };

  // V3: Toggle expand row
  const toggleExpand = (id: string) => {
    setScenes((prev) =>
      prev.map((s) => (s.id === id ? { ...s, expanded: !s.expanded } : s))
    );
  };

  // V3: Update priority
  const updatePriority = (id: string, priority: number) => {
    setScenes((prev) =>
      prev.map((s) => (s.id === id ? { ...s, priority } : s))
    );
  };

  const savePriority = async (id: string, priority: number) => {
    await supabase.from('scenes').update({ priority }).eq('id', id);
    addLog(`Priority updated for scene`, 'success');
  };

  // V3: Save user_description (uncontrolled inputs - no onChange needed)
  const saveUserDescription = async (id: string, locale: 'en' | 'ru', value: string) => {
    const scene = scenesRef.current.find(s => s.id === id);
    const user_description = {
      ...(scene?.user_description || { en: '', ru: '' }),
      [locale]: value,
    };

    // Update local state
    setScenes((prev) =>
      prev.map((s) => (s.id === id ? { ...s, user_description } : s))
    );

    try {
      const response = await fetch('/api/admin/update-scene', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sceneId: id,
          field: 'user_description',
          value: user_description,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        addLog(`Error saving: ${result.error}`, 'error');
      } else {
        addLog(`User description updated`, 'success');
      }
    } catch (error) {
      addLog(`Error: ${(error as Error).message}`, 'error');
    }
  };

  // Translate RU description to EN using AI
  const translateDescription = async (id: string) => {
    const scene = scenes.find(s => s.id === id);
    const ruText = scene?.user_description?.ru;

    if (!ruText) {
      addLog('No Russian text to translate', 'error');
      return;
    }

    addLog('Translating...', 'info');

    try {
      const response = await fetch('/api/admin/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: ruText, targetLang: 'en' }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Translation failed');
      }

      const newDescription = {
        ru: ruText,
        en: result.translation,
      };

      // Update local state
      setScenes((prev) =>
        prev.map((s) => (s.id === id ? { ...s, user_description: newDescription } : s))
      );

      // Save to DB via API (bypasses RLS)
      const saveResponse = await fetch('/api/admin/update-scene', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sceneId: id,
          field: 'user_description',
          value: newDescription,
        }),
      });

      if (!saveResponse.ok) {
        const saveResult = await saveResponse.json();
        throw new Error(saveResult.error || 'Save failed');
      }

      addLog('Translation complete', 'success');
    } catch (error) {
      addLog(`Translation error: ${(error as Error).message}`, 'error');
    }
  };

  // Save user_description_alt (alternative description for other gender)
  const saveUserDescriptionAlt = async (id: string, locale: 'en' | 'ru', value: string) => {
    const scene = scenesRef.current.find(s => s.id === id);
    const user_description_alt = {
      ...(scene?.user_description_alt || { en: '', ru: '' }),
      [locale]: value,
    };

    // Update local state
    setScenes((prev) =>
      prev.map((s) => (s.id === id ? { ...s, user_description_alt } : s))
    );

    try {
      const response = await fetch('/api/admin/update-scene', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sceneId: id,
          field: 'user_description_alt',
          value: user_description_alt,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        addLog(`Error saving alt description: ${result.error}`, 'error');
      } else {
        addLog(`Alt description updated`, 'success');
      }
    } catch (error) {
      addLog(`Error: ${(error as Error).message}`, 'error');
    }
  };

  // Translate alt RU description to EN
  const translateDescriptionAlt = async (id: string) => {
    const scene = scenes.find(s => s.id === id);
    const ruText = scene?.user_description_alt?.ru;

    if (!ruText) {
      addLog('No Russian alt text to translate', 'error');
      return;
    }

    addLog('Translating alt description...', 'info');

    try {
      const response = await fetch('/api/admin/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: ruText, targetLang: 'en' }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Translation failed');
      }

      const newDescription = {
        ru: ruText,
        en: result.translation,
      };

      // Update local state
      setScenes((prev) =>
        prev.map((s) => (s.id === id ? { ...s, user_description_alt: newDescription } : s))
      );

      // Save to DB
      const saveResponse = await fetch('/api/admin/update-scene', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sceneId: id,
          field: 'user_description_alt',
          value: newDescription,
        }),
      });

      if (!saveResponse.ok) {
        const saveResult = await saveResponse.json();
        throw new Error(saveResult.error || 'Save failed');
      }

      addLog('Alt translation complete', 'success');
    } catch (error) {
      addLog(`Translation error: ${(error as Error).message}`, 'error');
    }
  };

  // Save alt_for_gender (which gender sees the alt description)
  const saveAltForGender = async (id: string, value: 'male' | 'female' | null) => {
    // Update local state
    setScenes((prev) =>
      prev.map((s) => (s.id === id ? { ...s, alt_for_gender: value } : s))
    );

    try {
      const response = await fetch('/api/admin/update-scene', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sceneId: id,
          field: 'alt_for_gender',
          value,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        addLog(`Error saving alt_for_gender: ${result.error}`, 'error');
      } else {
        addLog(`Alt gender target updated to ${value || 'none'}`, 'success');
      }
    } catch (error) {
      addLog(`Error: ${(error as Error).message}`, 'error');
    }
  };

  // V3: Update ai_context (JSON)
  const saveAiContext = async (id: string, jsonString: string) => {
    try {
      const ai_context = JSON.parse(jsonString);
      await supabase.from('scenes').update({ ai_context }).eq('id', id);
      setScenes((prev) =>
        prev.map((s) => (s.id === id ? { ...s, ai_context } : s))
      );
      addLog(`AI Context updated`, 'success');
    } catch (e) {
      addLog(`Invalid JSON: ${(e as Error).message}`, 'error');
    }
  };

  // V3: Update follow_up (JSON)
  const saveFollowUp = async (id: string, jsonString: string) => {
    try {
      const follow_up = jsonString.trim() ? JSON.parse(jsonString) : null;
      await supabase.from('scenes').update({ follow_up }).eq('id', id);
      setScenes((prev) =>
        prev.map((s) => (s.id === id ? { ...s, follow_up } : s))
      );
      addLog(`Follow-up updated`, 'success');
    } catch (e) {
      addLog(`Invalid JSON: ${(e as Error).message}`, 'error');
    }
  };

  // Toggle default prompt visibility (show image_prompt for comparison)
  const toggleShowDefaultPrompt = (id: string) => {
    setScenes((prev) =>
      prev.map((s) => (s.id === id ? { ...s, showDefaultPrompt: !s.showDefaultPrompt } : s))
    );
  };

  // Toggle prompt instructions visibility
  const toggleShowPromptInstructions = (id: string) => {
    setScenes((prev) =>
      prev.map((s) => (s.id === id ? { ...s, showPromptInstructions: !s.showPromptInstructions } : s))
    );
  };

  // Reset generation_prompt to image_prompt (default)
  const resetToDefaultPrompt = async (id: string) => {
    const scene = scenes.find((s) => s.id === id);
    console.log('[Reset] Full scene data:', {
      slug: scene?.slug,
      image_prompt: scene?.image_prompt,
      generation_prompt: scene?.generation_prompt,
      are_same: scene?.image_prompt === scene?.generation_prompt,
    });

    if (!scene?.image_prompt) {
      addLog('No default prompt (image_prompt) to reset to. Run: npx tsx scripts/update-prompts-in-db.ts', 'error');
      return;
    }

    try {
      console.log('[Reset] Sending to API - will set generation_prompt to:', scene.image_prompt);
      const response = await fetch('/api/admin/reset-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sceneId: id,
          imagePrompt: scene.image_prompt,
        }),
      });

      const result = await response.json();
      console.log('[Reset] API response:', result);
      console.log('[Reset] After update - prompts_match:', result.data?.generation_prompt === result.data?.image_prompt);

      if (!response.ok) {
        addLog(`Error resetting prompt: ${result.error}`, 'error');
        return;
      }

      setScenes((prev) =>
        prev.map((s) =>
          s.id === id
            ? {
                ...s,
                generation_prompt: s.image_prompt,
                qa_status: null,
                qa_attempts: undefined,
                qa_last_assessment: undefined,
              }
            : s
        )
      );
      addLog('Prompt reset to default', 'success');
    } catch (error) {
      console.error('[Reset] Error:', error);
      addLog(`Error: ${(error as Error).message}`, 'error');
    }
  };

  // Update prompt instructions locally
  const updatePromptInstructions = (id: string, instructions: string) => {
    setScenes((prev) =>
      prev.map((s) => (s.id === id ? { ...s, prompt_instructions: instructions } : s))
    );
  };

  // Save prompt instructions and apply them to the prompt immediately
  const savePromptInstructions = async (id: string, instructions: string) => {
    if (!instructions?.trim()) {
      // If empty, just clear instructions
      await supabase
        .from('scenes')
        .update({ prompt_instructions: null })
        .eq('id', id);
      addLog(`Cleared prompt instructions`, 'success');
      return;
    }

    addLog(`Applying instructions to prompt...`, 'info');

    try {
      const response = await fetch('/api/admin/apply-instructions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sceneId: id, instructions }),
      });

      const result = await response.json();

      if (!response.ok) {
        addLog(`Error: ${result.error}`, 'error');
        return;
      }

      // Update local state with new prompt
      setScenes((prev) =>
        prev.map((s) =>
          s.id === id
            ? { ...s, generation_prompt: result.newPrompt, prompt_instructions: instructions }
            : s
        )
      );

      addLog(`Instructions applied. Changes: ${result.changes?.join(', ') || 'updated'}`, 'success');
    } catch (error) {
      addLog(`Error: ${(error as Error).message}`, 'error');
    }
  };

  // Set accepted status (manual approval) - syncs to paired scene too
  const setAccepted = async (id: string, accepted: boolean | null) => {
    // Use API route to bypass RLS
    try {
      const response = await fetch('/api/admin/update-scene', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sceneId: id,
          field: 'accepted',
          value: accepted,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        addLog(`Error saving accepted: ${result.error}`, 'error');
        return;
      }

      // Update local state for both the scene and its paired scene
      const scene = scenes.find(s => s.id === id);
      const pairedScene = scene?.paired_scene ? scenes.find(s => s.slug === scene.paired_scene) : null;
      const pairedId = pairedScene?.id;

      setScenes((prev) =>
        prev.map((s) => {
          if (s.id === id || s.id === pairedId) {
            return { ...s, accepted };
          }
          return s;
        })
      );
      const statusText = accepted === true ? 'accepted' : accepted === false ? 'rejected' : 'cleared';
      addLog(`Scene ${statusText}${pairedId ? ' (+ paired)' : ''}`, 'success');
    } catch (error) {
      addLog(`Error: ${(error as Error).message}`, 'error');
    }
  };

  // Toggle variants gallery visibility
  const toggleShowVariants = (id: string) => {
    setScenes((prev) =>
      prev.map((s) => (s.id === id ? { ...s, showVariants: !s.showVariants } : s))
    );
  };

  // Save current image as variant
  const saveAsVariant = async (id: string, imageUrl?: string, prompt?: string) => {
    const scene = scenes.find((s) => s.id === id);
    const urlToSave = imageUrl || scene?.image_url;
    const promptToSave = prompt || scene?.generation_prompt;

    if (!urlToSave) {
      addLog('No image to save as variant', 'error');
      return;
    }

    try {
      const response = await fetch('/api/admin/save-variant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sceneId: id, action: 'save', imageUrl: urlToSave, prompt: promptToSave }),
      });

      const result = await response.json();

      if (!response.ok) {
        addLog(`Error: ${result.error}`, 'error');
        return;
      }

      setScenes((prev) =>
        prev.map((s) => (s.id === id ? { ...s, image_variants: result.variants } : s))
      );
      addLog(`Image saved as variant (${result.variants.length} total)`, 'success');
    } catch (error) {
      addLog(`Error: ${(error as Error).message}`, 'error');
    }
  };

  // Select a variant as main image
  const selectVariant = async (sceneId: string, variantUrl: string) => {
    try {
      const response = await fetch('/api/admin/save-variant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sceneId, action: 'select', variantUrl }),
      });

      const result = await response.json();

      if (!response.ok) {
        addLog(`Error: ${result.error}`, 'error');
        return;
      }

      // Update current scene and its paired scene (API syncs to paired)
      setScenes((prev) => {
        const currentScene = prev.find(s => s.id === sceneId);
        const pairedScene = currentScene?.paired_scene ? prev.find(s => s.slug === currentScene.paired_scene) : null;
        const pairedId = pairedScene?.id;
        return prev.map((s) => {
          if (s.id === sceneId || s.id === pairedId) {
            return { ...s, image_url: variantUrl };
          }
          return s;
        });
      });
      addLog('Variant selected as main image', 'success');
    } catch (error) {
      addLog(`Error: ${(error as Error).message}`, 'error');
    }
  };

  // Delete a variant
  const deleteVariant = async (sceneId: string, variantUrl: string) => {
    try {
      const response = await fetch('/api/admin/save-variant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sceneId, action: 'delete', variantUrl }),
      });

      const result = await response.json();

      if (!response.ok) {
        addLog(`Error: ${result.error}`, 'error');
        return;
      }

      // Update the scene that was actually modified (may be source scene for shared images)
      const modifiedId = result.modifiedSceneId || sceneId;
      setScenes((prev) =>
        prev.map((s) => (s.id === modifiedId ? { ...s, image_variants: result.variants } : s))
      );
      addLog('Variant deleted', 'success');
    } catch (error) {
      addLog(`Error: ${(error as Error).message}`, 'error');
    }
  };

  // Update QA status of a variant (for restore/reject)
  const updateVariantQaStatus = async (sceneId: string, variantUrl: string, qaStatus: 'passed' | 'failed' | null) => {
    try {
      const response = await fetch('/api/admin/save-variant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sceneId, action: 'update_qa_status', variantUrl, qa_status: qaStatus }),
      });

      const result = await response.json();

      if (!response.ok) {
        addLog(`Error: ${result.error}`, 'error');
        return;
      }

      setScenes((prev) =>
        prev.map((s) => (s.id === sceneId ? { ...s, image_variants: result.variants } : s))
      );
      addLog(`QA status updated to ${qaStatus || 'none'}`, 'success');
    } catch (error) {
      addLog(`Error: ${(error as Error).message}`, 'error');
    }
  };

  // Save current image to gallery
  const saveToGallery = async (scene: SceneWithStatus) => {
    const currentUrl = scene.image_url;
    const currentPrompt = scene.generation_prompt;

    if (currentUrl) {
      await saveAsVariant(scene.id, currentUrl, currentPrompt);
    }
  };

  // Generate new image and add to gallery (without replacing current)
  const generateToGallery = async (scene: SceneWithStatus) => {
    if (!scene.generation_prompt) {
      addLog('No generation prompt', 'error');
      return;
    }

    setScenes((prev) =>
      prev.map((s) => (s.id === scene.id ? { ...s, status: 'generating' } : s))
    );
    addLog(`Generating new image for gallery...`, 'info');

    try {
      // Generate image
      const generateResponse = await fetch('/api/admin/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: scene.generation_prompt,
          sceneId: scene.id,
          service: settings.service,
          modelId: settings.modelId,
          aspectRatio: settings.aspectRatio,
        }),
      });

      const generateResult = await generateResponse.json();

      if (!generateResponse.ok) {
        throw new Error(generateResult.error || 'Generation failed');
      }

      // Save generated image as variant
      const saveResponse = await fetch('/api/admin/save-variant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sceneId: scene.id,
          action: 'save',
          imageUrl: generateResult.imageUrl,
          prompt: scene.generation_prompt,
        }),
      });

      const saveResult = await saveResponse.json();

      if (!saveResponse.ok) {
        throw new Error(saveResult.error || 'Failed to save to gallery');
      }

      setScenes((prev) =>
        prev.map((s) => (s.id === scene.id ? {
          ...s,
          status: 'completed',
          image_variants: saveResult.variants,
        } : s))
      );
      addLog(`Image added to gallery (${saveResult.variants.length} total)`, 'success');
    } catch (error) {
      setScenes((prev) =>
        prev.map((s) => (s.id === scene.id ? { ...s, status: 'error', error: (error as Error).message } : s))
      );
      addLog(`Error: ${(error as Error).message}`, 'error');
    }
  };

  // Upload image directly
  const uploadImage = async (sceneId: string, file: File) => {
    addLog(`Uploading image for scene...`, 'info');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('sceneId', sceneId);

      const response = await fetch('/api/admin/upload-image', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        addLog(`Upload error: ${result.error}`, 'error');
        return;
      }

      setScenes((prev) =>
        prev.map((s) => (s.id === sceneId ? {
          ...s,
          image_url: result.imageUrl,
          image_variants: result.variants,
        } : s))
      );
      addLog('Image uploaded successfully', 'success');
    } catch (error) {
      addLog(`Upload error: ${(error as Error).message}`, 'error');
    }
  };

  // Toggle img2img controls visibility
  const toggleImg2Img = (id: string) => {
    setScenes((prev) =>
      prev.map((s) => (s.id === id ? { ...s, showImg2Img: !s.showImg2Img } : s))
    );
  };

  // Update img2img strength
  const updateImg2ImgStrength = (id: string, strength: number) => {
    setScenes((prev) =>
      prev.map((s) => (s.id === id ? { ...s, img2imgStrength: strength } : s))
    );
  };

  // Generate with img2img
  const generateImg2Img = async (scene: SceneWithStatus) => {
    if (!scene.image_url) {
      addLog('No source image for img2img', 'error');
      return;
    }

    if (settings.service !== 'replicate') {
      addLog('img2img is only supported with Replicate service', 'error');
      return;
    }

    const strength = scene.img2imgStrength ?? 0.7;
    addLog(`Starting img2img (strength: ${strength})...`, 'info');

    setScenes((prev) =>
      prev.map((s) => (s.id === scene.id ? { ...s, status: 'generating' } : s))
    );

    try {
      const prompt = scene.generation_prompt;
      const models = REPLICATE_MODELS;
      const modelName = models.find(m => m.id === settings.modelId)?.name || settings.modelId;
      const resolution = RESOLUTION_PRESETS.find(p => p.id === settings.aspectRatio) || RESOLUTION_PRESETS[0];

      addLog(`Model: ${modelName}, Strength: ${strength}`, 'info');

      const { prompt: fullPrompt, negativePrompt } = buildPrompt(
        settings.stylePrefix ? `${settings.stylePrefix}, ${prompt}` : prompt || '',
        settings.styleVariant as keyof typeof STYLE_VARIANTS | 'default'
      );

      const finalNegative = settings.negativePrompt
        ? `${negativePrompt}, ${settings.negativePrompt}`
        : negativePrompt;

      const response = await fetch('/api/admin/generate-scene', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sceneId: scene.id,
          prompt: fullPrompt,
          styleVariant: settings.styleVariant,
          negativePrompt: finalNegative,
          modelId: settings.modelId,
          service: 'replicate',
          width: resolution.width,
          height: resolution.height,
          aspectRatio: settings.aspectRatio,
          enableQA: false,
          sourceImage: scene.image_url,
          strength,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'img2img generation failed');
      }

      setScenes((prev) =>
        prev.map((s) =>
          s.id === scene.id
            ? { ...s, status: 'completed', image_url: result.imageUrl || s.image_url }
            : s
        )
      );
      addLog('img2img completed', 'success');
    } catch (error) {
      const errorMsg = (error as Error).message;
      addLog(`img2img error: ${errorMsg}`, 'error');
      setScenes((prev) =>
        prev.map((s) =>
          s.id === scene.id ? { ...s, status: 'error', error: errorMsg } : s
        )
      );
    }
  };

  const deleteScene = async (id: string) => {
    if (!confirm('Delete this scene?')) return;

    try {
      const res = await fetch('/api/admin/delete-scene', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();

      if (!res.ok || data.error) {
        addLog(`Ошибка удаления: ${data.error}`, 'error');
        return;
      }

      addLog('Сцена удалена', 'success');
      setScenes((prev) => prev.filter((s) => s.id !== id));
    } catch (e) {
      addLog(`Ошибка: ${(e as Error).message}`, 'error');
    }
  };

  const deleteSelected = async () => {
    const selected = scenes.filter((s) => s.selected);
    if (!confirm(`Delete ${selected.length} scenes?`)) return;

    let deleted = 0;
    for (const scene of selected) {
      try {
        const res = await fetch('/api/admin/delete-scene', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: scene.id }),
        });
        if (res.ok) deleted++;
      } catch (e) {
        console.error('Delete error:', e);
      }
    }
    addLog(`Удалено ${deleted} из ${selected.length} сцен`, deleted === selected.length ? 'success' : 'error');
    setScenes((prev) => prev.filter((s) => !s.selected));
  };

  const generateScene = async (scene: SceneWithStatus) => {
    const sceneSlug = scene.slug || scene.id.substring(0, 8);
    const qaEnabled = settings.enableQA;
    const useContext = settings.useAiContext;

    const modeLabel = qaEnabled
      ? (useContext ? ' (QA + ai_context)' : ' (QA, prompt only)')
      : (useContext ? '' : ' (prompt only)');
    addLog(`Starting generation: ${sceneSlug}${modeLabel}`, 'info');

    setScenes((prev) =>
      prev.map((s) => (s.id === scene.id ? { ...s, status: 'generating' } : s))
    );

    try {
      // Don't mix stylePrefix with prompt - send separately
      const prompt = scene.generation_prompt;

      const models = settings.service === 'replicate' ? REPLICATE_MODELS : CIVITAI_MODELS;
      const modelName = models.find(m => m.id === settings.modelId)?.name || settings.modelId;
      const resolution = RESOLUTION_PRESETS.find(p => p.id === settings.aspectRatio) || RESOLUTION_PRESETS[0];
      addLog(`Service: ${settings.service}, Model: ${modelName}, ${resolution.name}`, 'info');

      // Build QA context only if QA is enabled AND useAiContext is true
      let qaContext: ReturnType<typeof buildQAContext> | null = null;
      if (qaEnabled) {
        if (useContext) {
          qaContext = buildQAContext(scene);
          if (!qaContext) {
            addLog(`Warning: useAiContext=true but no ai_context found, using prompt-based context`, 'info');
          }
        }
        // If no context (either useAiContext=false or ai_context missing), use prompt-based minimal context
        if (!qaContext) {
          qaContext = {
            essence: prompt || '', // Use the prompt itself as essence
            key_elements: [{ element: 'scene content', critical: true, in_action: false }],
            mood: 'as described in prompt',
            participants: { count: 0, genders: [] as string[] }, // Unknown from prompt alone
          };
        }
      }

      const response = await fetch('/api/admin/generate-scene', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sceneId: scene.id,
          prompt,
          // promptInstructions removed - now applied via Apply button only
          stylePrefix: settings.stylePrefix || undefined, // Send separately
          styleVariant: settings.styleVariant,
          negativePrompt: settings.negativePrompt || undefined,
          modelId: settings.service === 'civitai' ? parseInt(settings.modelId) : settings.modelId,
          service: settings.service,
          width: resolution.width,
          height: resolution.height,
          aspectRatio: settings.aspectRatio,
          enableQA: qaEnabled,
          qaEvaluator: settings.qaEvaluator, // 'replicate' or 'claude'
          qaContext: qaContext,
        }),
      });

      const result = await response.json();
      console.log('[Admin] API Response:', result);

      // Debug info for database update
      if (result.debug) {
        console.log('=== DB UPDATE DEBUG ===');
        console.log('Scene ID:', result.debug.sceneId);
        console.log('Scene Found:', result.debug.sceneFound);
        console.log('Scene Slug:', result.debug.sceneSlug);
        console.log('Storage URL:', result.debug.storageUrl);
        console.log('Update Error:', result.debug.updateError);
        console.log('Rows Updated:', result.debug.rowsUpdated);
        console.log('Updated image_url:', result.debug.updatedImageUrl);
        console.log('Has Assessment:', result.debug.hasAssessment);
        console.log('Essence Score:', result.debug.essenceScore);
        console.log('Successful Generations:', result.debug.successfulGenerations);
        console.log('Successful Evaluations:', result.debug.successfulEvaluations);
        console.log('Evaluation Errors Count:', result.debug.evaluationErrorsCount);
        console.log('======================');
      }

      // Log evaluation errors if any
      if (result.evaluationErrors && result.evaluationErrors.length > 0) {
        console.log('=== EVALUATION ERRORS ===');
        result.evaluationErrors.forEach((err: string) => console.log(err));
        console.log('=========================');
      }

      if (!response.ok) {
        throw new Error(result.error || 'Generation failed');
      }

      if (!result.imageUrl) {
        addLog(`Warning: No imageUrl in response`, 'error');
      }

      if (qaEnabled) {
        const gens = result.debug?.successfulGenerations || 0;
        const evals = result.debug?.successfulEvaluations || 0;
        const evalErrors = result.evaluationErrors?.length || 0;

        if (result.qaStatus === 'passed') {
          addLog(`Completed: ${sceneSlug} - QA PASSED (${result.totalAttempts} attempts, ${gens} gens, ${evals} evals)`, 'success');
        } else {
          addLog(`Completed: ${sceneSlug} - QA FAILED (${result.totalAttempts} attempts, ${gens} gens, ${evals} evals)`, 'error');
          if (evalErrors > 0) {
            result.evaluationErrors.slice(0, 3).forEach((err: string) => {
              addLog(`  Eval error: ${err}`, 'error');
            });
            if (evalErrors > 3) {
              addLog(`  ... and ${evalErrors - 3} more errors`, 'error');
            }
          }
          if (gens > 0 && evals === 0) {
            addLog(`  WARNING: Images generated but evaluations failed!`, 'error');
          }
        }
      } else {
        addLog(`Completed: ${sceneSlug}`, 'success');
      }

      console.log('[Admin] Updating scene with imageUrl:', result.imageUrl);
      console.log('[Admin] Assessment from API:', result.assessment);
      console.log('[Admin] Assessment keys:', result.assessment ? Object.keys(result.assessment) : 'null');
      setScenes((prev) => {
        const updated = prev.map((s) =>
          s.id === scene.id
            ? {
                ...s,
                status: 'completed' as GenerationStatus,
                image_url: result.imageUrl || s.image_url,
                qa_status: result.qaStatus || null,
                qa_attempts: result.totalAttempts,
                qa_last_assessment: result.assessment,
              }
            : s
        );
        console.log('[Admin] Updated scene:', updated.find(s => s.id === scene.id));
        return updated;
      });
    } catch (error) {
      const errorMsg = (error as Error).message;
      addLog(`Error: ${sceneSlug} - ${errorMsg}`, 'error');

      setScenes((prev) =>
        prev.map((s) =>
          s.id === scene.id
            ? { ...s, status: 'error', error: errorMsg }
            : s
        )
      );
    }
  };

  const generateSelected = async () => {
    const selected = scenes.filter((s) => s.selected && s.generation_prompt);
    if (selected.length === 0) return;

    setGenerating(true);

    // Mark all as pending
    setScenes((prev) =>
      prev.map((s) => (s.selected ? { ...s, status: 'pending' } : s))
    );

    // Generate strictly one by one - wait for each to fully complete
    for (const scene of selected) {
      try {
        await generateScene(scene);
      } catch (e) {
        console.error('Generation error:', e);
      }
      // Longer delay between scenes to avoid rate limits
      await new Promise((r) => setTimeout(r, 2000));
    }

    setGenerating(false);
  };

  const StatusIcon = ({ status }: { status: GenerationStatus }) => {
    switch (status) {
      case 'pending':
        return <Loader2 className="size-4 text-yellow-500 animate-pulse" />;
      case 'generating':
        return <Loader2 className="size-4 text-blue-500 animate-spin" />;
      case 'completed':
        return <Check className="size-4 text-green-500" />;
      case 'error':
        return <X className="size-4 text-red-500" />;
      default:
        return null;
    }
  };

  const QAStatusIcon = ({ status, onClick }: { status: QAStatus; onClick?: () => void }) => {
    const baseClass = onClick ? 'cursor-pointer hover:scale-110 transition-transform' : '';
    switch (status) {
      case 'passed':
        return <span title="QA Passed - Click for details" onClick={onClick} className={baseClass}><ShieldCheck className="size-5 text-green-500" /></span>;
      case 'failed':
        return <span title="QA Failed - Click for details" onClick={onClick} className={baseClass}><ShieldX className="size-5 text-red-500" /></span>;
      default:
        return <span title="Not checked"><ShieldQuestion className="size-5 text-gray-400" /></span>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="size-8 animate-spin" />
      </div>
    );
  }


  return (
    <div className="container mx-auto px-4 max-w-6xl">
      {/* Sticky Header Panel */}
      <div className="sticky top-0 z-40 bg-background pt-8 pb-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Scene Generation Manager</h1>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                addLog('Importing V2 scenes...', 'info');
                try {
                  const res = await fetch('/api/admin/import-scenes-v2', { method: 'POST' });
                  const data = await res.json();
                  if (data.success) {
                    addLog(`Imported ${data.imported} V2 scenes (${data.errors} errors)`, 'success');
                    loadScenes();
                  } else {
                    addLog(`Import failed: ${data.error}`, 'error');
                  }
                } catch (e) {
                  addLog(`Import error: ${(e as Error).message}`, 'error');
                }
              }}
            >
              Import V2
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowV3Creator(true)}
            >
              <Wand2 className="size-4 mr-1" />
              V3 Scenes
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open('/admin/link-images', '_blank')}
            >
              <ImageIcon className="size-4 mr-1" />
              Link Images
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.href = '/admin/users'}
            >
              Users Admin
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.href = '/admin/scene-structure'}
            >
              Scene Tree
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.href = '/admin/body-map-calibration'}
            >
              Body Map
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.href = '/admin/verbal-options'}
            >
              Verbal Options
            </Button>
          </div>
        </div>

        {/* Global Settings */}
        <div className="mb-4 border rounded-lg bg-background">
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="w-full flex items-center justify-between p-4 hover:bg-muted/50"
        >
          <div className="flex items-center gap-2">
            <Settings className="size-5" />
            <span className="font-medium">Global Style Settings</span>
            {settings.enableQA && (
              <span className="ml-2 px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full">
                QA: {settings.qaEvaluator === 'replicate' ? 'LLaVA' : 'Claude'}
              </span>
            )}
          </div>
          {showSettings ? <ChevronUp className="size-5" /> : <ChevronDown className="size-5" />}
        </button>

        {showSettings && (
          <div className="p-4 border-t space-y-4">
            {/* QA Toggle + Evaluator + Use ai_context */}
            <div className="flex gap-4">
              <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30 flex-1">
                <Checkbox
                  id="enableQA"
                  checked={settings.enableQA}
                  onCheckedChange={(checked) =>
                    updateSettings({ ...settings, enableQA: checked as boolean })
                  }
                />
                <label htmlFor="enableQA" className="flex-1 cursor-pointer">
                  <div className="font-medium">Enable QA Validation</div>
                  <div className="text-sm text-muted-foreground">
                    AI evaluates images and retries up to 12 times
                  </div>
                </label>
                <ShieldCheck className={`size-6 ${settings.enableQA ? 'text-green-500' : 'text-gray-300'}`} />
              </div>

              {/* QA Evaluator selector - only show when QA is enabled */}
              {settings.enableQA && (
                <div className="p-3 border rounded-lg bg-muted/30">
                  <label className="text-sm font-medium mb-2 block">QA Evaluator</label>
                  <select
                    value={settings.qaEvaluator}
                    onChange={(e) =>
                      updateSettings({ ...settings, qaEvaluator: e.target.value as QAEvaluator })
                    }
                    className="w-full h-9 rounded-md border px-3 text-sm"
                  >
                    <option value="replicate">LLaVA (Replicate) - NSFW OK</option>
                    <option value="claude">Claude Vision - SFW only</option>
                  </select>
                </div>
              )}

              <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30 flex-1">
                <Checkbox
                  id="useAiContext"
                  checked={settings.useAiContext}
                  onCheckedChange={(checked) =>
                    updateSettings({ ...settings, useAiContext: checked as boolean })
                  }
                />
                <label htmlFor="useAiContext" className="flex-1 cursor-pointer">
                  <div className="font-medium">Use ai_context</div>
                  <div className="text-sm text-muted-foreground">
                    Use essence, key_elements, mood from ai_context
                  </div>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Service</label>
                <select
                  value={settings.service}
                  onChange={(e) => {
                    const newService = e.target.value as ServiceType;
                    const defaultModel = newService === 'replicate' ? 'flux-schnell' : '4201';
                    // Load saved style for new model
                    const savedStyle = settings.modelStyles[defaultModel] || '';
                    updateSettings({ ...settings, service: newService, modelId: defaultModel, stylePrefix: savedStyle });
                  }}
                  className="w-full h-9 rounded-md border px-3 text-sm"
                >
                  <option value="civitai">Civitai</option>
                  <option value="replicate">Replicate</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Model</label>
                <select
                  value={settings.modelId}
                  onChange={(e) => {
                    const newModelId = e.target.value;
                    // Load saved style for new model
                    const savedStyle = settings.modelStyles[newModelId] || '';
                    updateSettings({ ...settings, modelId: newModelId, stylePrefix: savedStyle });
                  }}
                  className="w-full h-9 rounded-md border px-3 text-sm"
                >
                  {(settings.service === 'replicate' ? REPLICATE_MODELS : CIVITAI_MODELS).map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Aspect Ratio</label>
                <select
                  value={settings.aspectRatio}
                  onChange={(e) =>
                    updateSettings({ ...settings, aspectRatio: e.target.value })
                  }
                  className="w-full h-9 rounded-md border px-3 text-sm"
                >
                  {RESOLUTION_PRESETS.map((preset) => (
                    <option key={preset.id} value={preset.id}>
                      {preset.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Style Variant</label>
                <select
                  value={settings.styleVariant}
                  onChange={(e) =>
                    updateSettings({ ...settings, styleVariant: e.target.value as GlobalSettings['styleVariant'] })
                  }
                  className="w-full h-9 rounded-md border px-3 text-sm"
                >
                  <option value="none">None (raw prompt only)</option>
                  <option value="default">Default (Photorealistic)</option>
                  <option value="artistic">Artistic</option>
                  <option value="noir">Noir</option>
                  <option value="soft">Soft/Dreamy</option>
                  <option value="editorial">Editorial</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Style Prefix for {(settings.service === 'replicate' ? REPLICATE_MODELS : CIVITAI_MODELS).find(m => m.id === settings.modelId)?.name || settings.modelId}
              </label>
              <Input
                placeholder="e.g., warm lighting, cozy bedroom..."
                value={settings.stylePrefix}
                onChange={(e) => {
                  const newPrefix = e.target.value;
                  // Save style for current model
                  updateSettings({
                    ...settings,
                    stylePrefix: newPrefix,
                    modelStyles: { ...settings.modelStyles, [settings.modelId]: newPrefix }
                  });
                }}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Saved per model. Switch model to use different style.
              </p>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Additional Negative Prompt</label>
              <Input
                placeholder="e.g., harsh shadows, overexposed..."
                value={settings.negativePrompt}
                onChange={(e) => updateSettings({ ...settings, negativePrompt: e.target.value })}
              />
            </div>
          </div>
        )}
      </div>

      {/* Activity Log */}
      <div className="mb-6 border rounded-lg">
        <div
          className="p-3 border-b bg-muted/50 flex items-center justify-between cursor-pointer"
          onClick={() => setShowLogs(!showLogs)}
        >
          <div className="flex items-center gap-2">
            {showLogs ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
            <span className="font-medium text-sm">Activity Log</span>
            {logs.length > 0 && (
              <span className="text-xs text-muted-foreground">({logs.length})</span>
            )}
          </div>
          {showLogs && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => { e.stopPropagation(); setLogs([]); }}
            >
              Clear
            </Button>
          )}
        </div>
        {showLogs && (
          <div className="h-32 overflow-y-auto p-3 font-mono text-xs space-y-1 bg-black/5">
            {logs.length === 0 ? (
              <p className="text-muted-foreground">No activity yet. Select scenes and click Generate.</p>
            ) : (
              logs.map((log, i) => (
                <div
                  key={i}
                  className={
                    log.type === 'error'
                      ? 'text-red-600'
                      : log.type === 'success'
                      ? 'text-green-600'
                      : 'text-foreground'
                  }
                >
                  <span className="text-muted-foreground">[{log.time}]</span> {log.message}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-4 mb-4">
        <div className="flex items-center gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as typeof filter)}
            className="h-9 rounded-md border px-3 text-sm"
          >
            <option value="active">Active ({scenes.filter((s) => s.is_active !== false).length})</option>
            <option value="inactive">Inactive ({scenes.filter((s) => s.is_active === false).length})</option>
            <option value="all">All scenes ({scenes.length})</option>
            <option value="paired">Paired ({scenes.filter((s) => s.is_active !== false && !!s.paired_scene).length})</option>
            <option value="v2_only">V2 scenes ({scenes.filter((s) => s.is_active !== false && s.version === 2).length})</option>
            <option value="no_image">Without images ({scenes.filter((s) => s.is_active !== false && !s.image_url).length})</option>
            <option value="has_image">With images ({scenes.filter((s) => s.is_active !== false && s.image_url).length})</option>
            <option value="qa_failed">QA Failed ({scenes.filter((s) => s.is_active !== false && s.qa_status === 'failed').length})</option>
            <option value="accepted">✓ Accepted ({scenes.filter((s) => s.is_active !== false && s.accepted === true).length})</option>
            <option value="rejected">✗ Rejected ({scenes.filter((s) => s.is_active !== false && s.accepted === false).length})</option>
            <option value="not_reviewed">⏳ Not reviewed ({scenes.filter((s) => s.is_active !== false && s.image_url && s.accepted === null).length})</option>
          </select>
        </div>

        <div className="flex-1" />

        <span className="text-sm text-muted-foreground">
          {selectedCount} selected
        </span>

        <Button variant="outline" size="sm" onClick={selectAll}>
          Select All
        </Button>

        <Button variant="outline" size="sm" onClick={deselectAll} disabled={selectedCount === 0}>
          Deselect All
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={selectNext10WithoutImage}
          title="Select first 10 scenes without images"
        >
          +10 ✕img
        </Button>

        <Button
          variant="default"
          size="sm"
          onClick={generateSelected}
          disabled={selectedCount === 0 || generating}
        >
          {generating ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Play className="size-4" />
          )}
          Generate Selected
        </Button>

        <Button
          variant="destructive"
          size="sm"
          onClick={deleteSelected}
          disabled={selectedCount === 0}
        >
          <Trash2 className="size-4" />
          Delete Selected
        </Button>
        </div>
      </div>

      {/* Scenes Table */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full table-fixed">
          <thead className="bg-muted/50">
            <tr>
              <th className="w-10 p-3" />
              <th className="w-52 p-3 text-left text-sm font-medium">Preview</th>
              <th className="p-3 text-left text-sm font-medium">Prompt</th>
              <th className="w-20 p-3 text-left text-sm font-medium">Status</th>
              <th className="w-24 p-3 text-left text-sm font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredScenes
              .filter((scene) => {
                // Skip one of paired scenes to avoid duplicates - they'll be shown together
                // When both scenes reference each other, show only the one with alphabetically smaller slug
                if (scene.paired_scene) {
                  const pairedSceneInList = filteredScenes.find(s => s.slug === scene.paired_scene);
                  if (pairedSceneInList) {
                    // Both are in the list - show only the one with smaller slug
                    if (scene.slug && scene.slug > scene.paired_scene) {
                      return false; // Skip this one, the other will be shown
                    }
                  }
                }
                return true;
              })
              .map((scene) => (
              <React.Fragment key={scene.id}>
              <tr className="border-t hover:bg-muted/30">
                <td className="p-3">
                  <Checkbox
                    checked={scene.selected}
                    onCheckedChange={() => toggleSelect(scene.id)}
                  />
                </td>
                <td className="p-3">
                  <div className="relative">
                    {scene.image_url ? (
                      <>
                        <img
                          src={scene.image_url}
                          alt={scene.ai_description?.en || scene.title?.en || scene.slug || ''}
                          className="w-48 h-32 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => setLightboxImage(scene.image_url)}
                          onError={(e) => {
                            console.error('[IMG] Failed to load:', scene.image_url);
                            (e.target as HTMLImageElement).style.display = 'none';
                            (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                        <div
                          className="hidden w-48 h-32 bg-red-100 rounded flex items-center justify-center text-xs text-red-500 cursor-pointer"
                          onClick={() => {
                            navigator.clipboard.writeText(scene.image_url || '');
                            alert(`URL скопирован!\n\n${scene.image_url}\n\nПроверь что bucket 'scenes' публичный в Supabase Dashboard:\nStorage → scenes → Edit bucket → Make public`);
                          }}
                          title="Клик чтобы скопировать URL"
                        >
                          Error
                        </div>
                        {/* QA Status Badge */}
                        {scene.qa_status && (
                          <div className="absolute -top-2 -right-2">
                            <QAStatusIcon
                              status={scene.qa_status}
                              onClick={() => setQaDetailScene(scene)}
                            />
                          </div>
                        )}
                        {/* Accepted/Rejected Badge */}
                        {scene.accepted !== null && scene.accepted !== undefined && (
                          <div className="absolute -bottom-1 -right-1">
                            {scene.accepted ? (
                              <div className="bg-green-500 rounded-full p-0.5" title="Accepted">
                                <ThumbsUp className="size-3 text-white" />
                              </div>
                            ) : (
                              <div className="bg-red-500 rounded-full p-0.5" title="Rejected">
                                <ThumbsDown className="size-3 text-white" />
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="w-48 h-32 bg-muted rounded flex items-center justify-center">
                        <ImageIcon className="size-8 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                </td>
                <td className="p-3 overflow-hidden">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-xs text-muted-foreground">Priority:</span>
                    <Input
                      type="number"
                      value={scene.priority ?? 50}
                      onChange={(e) => updatePriority(scene.id, parseInt(e.target.value) || 50)}
                      onBlur={(e) => savePriority(scene.id, parseInt(e.target.value) || 50)}
                      className="w-16 h-6 text-xs"
                    />
                    {/* Prompt instructions button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`h-6 px-2 text-xs ${scene.prompt_instructions ? 'text-blue-600' : ''}`}
                      onClick={() => toggleShowPromptInstructions(scene.id)}
                      title="Edit prompt instructions for AI"
                    >
                      <Edit3 className="size-3 mr-1" />
                      {scene.prompt_instructions ? 'Instructions ✓' : 'Instructions'}
                    </Button>
                    {/* Show default prompt and Reset buttons - when generation_prompt differs from image_prompt */}
                    {scene.image_prompt && scene.generation_prompt !== scene.image_prompt && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs"
                          onClick={() => toggleShowDefaultPrompt(scene.id)}
                          title="View default prompt (from JSON)"
                        >
                          <Eye className="size-3 mr-1" />
                          Default
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs text-orange-600"
                          onClick={() => resetToDefaultPrompt(scene.id)}
                          title="Reset prompt to default (from JSON)"
                        >
                          <RotateCcw className="size-3 mr-1" />
                          Reset
                        </Button>
                      </>
                    )}
                  </div>

                  {/* Show default prompt if toggled */}
                  {scene.showDefaultPrompt && scene.image_prompt && (
                    <div className="mb-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                      <div className="font-medium text-yellow-700 mb-1">Default Prompt (image_prompt):</div>
                      <div className="text-yellow-900">{scene.image_prompt}</div>
                    </div>
                  )}

                  {/* Prompt instructions editor */}
                  {scene.showPromptInstructions && (
                    <div className="mb-2 p-2 bg-blue-50 border border-blue-200 rounded">
                      <div className="font-medium text-blue-700 mb-1 text-xs">
                        Инструкции для AI (что изменить в промпте):
                      </div>
                      <textarea
                        value={scene.prompt_instructions || ''}
                        onChange={(e) => updatePromptInstructions(scene.id, e.target.value)}
                        placeholder="Например: убрать масло, оставить только лёд..."
                        className="w-full min-h-[50px] text-xs p-2 rounded border resize-none bg-white"
                      />
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-xs text-blue-600">
                          Нажми Apply чтобы применить к промпту
                        </p>
                        <Button
                          variant="default"
                          size="sm"
                          className="h-6 px-2 text-xs"
                          onClick={() => savePromptInstructions(scene.id, scene.prompt_instructions || '')}
                          disabled={!scene.prompt_instructions?.trim()}
                        >
                          Apply
                        </Button>
                      </div>
                    </div>
                  )}

                  <textarea
                    value={scene.generation_prompt || ''}
                    onChange={(e) => updatePrompt(scene.id, e.target.value)}
                    onBlur={(e) => savePrompt(scene.id, e.target.value)}
                    placeholder="Enter generation prompt..."
                    className="w-full min-h-[60px] text-sm p-2 rounded border resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                  />

                  {/* AI Description (read-only info) */}
                  <p className="text-xs text-muted-foreground mt-1 truncate" title={scene.ai_description?.ru || scene.ai_description?.en || ''}>
                    {scene.version === 2 ? (
                      <>
                        <span className="px-1 py-0.5 rounded bg-blue-100 text-blue-700 text-[10px] mr-1">V2</span>
                        <span className="font-medium">{scene.title?.ru}</span>
                        {scene.category && <span className="ml-1 text-muted-foreground">• {scene.category}</span>}
                        {scene.paired_scene && <span className="ml-1 px-1 py-0.5 rounded bg-purple-100 text-purple-700 text-[10px]">Paired</span>}
                      </>
                    ) : (
                      scene.ai_description?.ru || scene.ai_description?.en || scene.slug || ''
                    )}
                  </p>

                  {/* User Description RU/EN */}
                  {(() => {
                    const pairedScene = scene.paired_scene ? scenes.find(s => s.slug === scene.paired_scene) : null;
                    // Check patterns for scene labels
                    const getLabel = (slug: string | undefined) => {
                      if (slug?.includes('-give')) return 'GIVE';
                      if (slug?.includes('-receive')) return 'RECEIVE';
                      if (slug?.includes('-watch')) return 'WATCH';
                      if (slug?.includes('-know')) return 'KNOW';
                      if (slug?.startsWith('dom-')) return 'DOM';
                      if (slug?.startsWith('sub-')) return 'SUB';
                      if (slug?.includes('-leads')) return 'LEADS';
                      if (slug?.includes('-follows')) return 'FOLLOWS';
                      return 'DESC';
                    };
                    const thisLabel = getLabel(scene.slug);
                    const pairedLabel = getLabel(pairedScene?.slug) === 'DESC' ? 'RECEIVE' : getLabel(pairedScene?.slug);

                    return (
                      <div className="mt-2 space-y-2 max-w-full overflow-hidden">
                        {/* This scene's description */}
                        <div className={`space-y-1 ${pairedScene ? 'p-2 border rounded bg-green-50/50' : ''}`}>
                          {pairedScene && (
                            <div className="text-xs font-medium text-green-700 mb-1">{thisLabel} ({scene.role_direction === 'm_to_f' ? 'HIM' : scene.role_direction === 'f_to_m' ? 'HER' : scene.role_direction?.toUpperCase() || '?'})</div>
                          )}
                          <div className="flex gap-2 items-start">
                            <span className="text-xs text-muted-foreground font-medium w-6 shrink-0 pt-1">RU:</span>
                            <textarea
                              key={`ru-${scene.id}`}
                              defaultValue={scene.user_description?.ru || ''}
                              onBlur={(e) => saveUserDescription(scene.id, 'ru', e.target.value)}
                              className="flex-1 min-w-0 text-xs p-1 rounded border bg-muted/30 resize-none min-h-[40px]"
                              placeholder="Описание для пользователя (RU)..."
                              rows={2}
                            />
                          </div>
                          <div className="flex gap-2 items-start">
                            <span className="text-xs text-muted-foreground font-medium w-6 shrink-0 pt-1">EN:</span>
                            <textarea
                              key={`en-${scene.id}-${scene.user_description?.en || ''}`}
                              defaultValue={scene.user_description?.en || ''}
                              onBlur={(e) => saveUserDescription(scene.id, 'en', e.target.value)}
                              className="flex-1 min-w-0 text-xs p-1 rounded border bg-muted/30 resize-none min-h-[40px]"
                              placeholder="User description (EN)..."
                              rows={2}
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-xs shrink-0"
                              onClick={() => translateDescription(scene.id)}
                              disabled={!scene.user_description?.ru}
                              title="Translate RU → EN"
                            >
                              <Languages className="size-3" />
                            </Button>
                          </div>
                        </div>

                        {/* Paired scene's description */}
                        {pairedScene && (
                          <div className="space-y-1 p-2 border rounded bg-purple-50/50">
                            <div className="text-xs font-medium text-purple-700 mb-1">{pairedLabel} ({pairedScene.role_direction === 'm_to_f' ? 'HIM' : pairedScene.role_direction === 'f_to_m' ? 'HER' : pairedScene.role_direction?.toUpperCase() || '?'})</div>
                            <div className="flex gap-2 items-start">
                              <span className="text-xs text-muted-foreground font-medium w-6 shrink-0 pt-1">RU:</span>
                              <textarea
                                key={`ru-${pairedScene.id}`}
                                defaultValue={pairedScene.user_description?.ru || ''}
                                onBlur={(e) => saveUserDescription(pairedScene.id, 'ru', e.target.value)}
                                className="flex-1 min-w-0 text-xs p-1 rounded border bg-muted/30 resize-none min-h-[40px]"
                                placeholder="Описание для пользователя (RU)..."
                                rows={2}
                              />
                            </div>
                            <div className="flex gap-2 items-start">
                              <span className="text-xs text-muted-foreground font-medium w-6 shrink-0 pt-1">EN:</span>
                              <textarea
                                key={`en-${pairedScene.id}-${pairedScene.user_description?.en || ''}`}
                                defaultValue={pairedScene.user_description?.en || ''}
                                onBlur={(e) => saveUserDescription(pairedScene.id, 'en', e.target.value)}
                                className="flex-1 min-w-0 text-xs p-1 rounded border bg-muted/30 resize-none min-h-[40px]"
                                placeholder="User description (EN)..."
                                rows={2}
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-xs shrink-0"
                                onClick={() => translateDescription(pairedScene.id)}
                                disabled={!pairedScene.user_description?.ru}
                                title="Translate RU → EN"
                              >
                                <Languages className="size-3" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* QA Info */}
                  {scene.qa_attempts && (
                    <div className="mt-1 text-xs text-muted-foreground">
                      QA: {scene.qa_attempts} attempts
                      {scene.qa_last_assessment && (
                        <span className="ml-2">
                          (Score: {(scene.qa_last_assessment as { essenceScore?: number }).essenceScore}/10)
                        </span>
                      )}
                    </div>
                  )}
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <StatusIcon status={scene.status} />
                    <span className="text-xs capitalize">{scene.status}</span>
                  </div>
                  {scene.error && (
                    <p className="text-xs text-red-500 mt-1">{scene.error}</p>
                  )}
                  {scene.ai_context && (
                    <span className="text-xs text-green-600 block mt-1">V3</span>
                  )}
                </td>
                <td className="p-3">
                  <div className="grid grid-cols-2 gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => toggleExpand(scene.id)}
                      title="Edit V3 Fields"
                    >
                      <Edit3 className={`size-4 ${scene.expanded ? 'text-primary' : ''}`} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => generateScene(scene)}
                      disabled={!scene.generation_prompt || generating}
                      title="Generate"
                    >
                      {scene.status === 'generating' ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Play className="size-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => generateScene(scene)}
                      disabled={!scene.image_url || generating}
                      title="Regenerate"
                    >
                      <RefreshCw className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => saveToGallery(scene)}
                      disabled={!scene.image_url || generating}
                      title="Save to gallery"
                      className="text-blue-600"
                    >
                      <Copy className="size-4" />
                    </Button>
                    {(() => {
                      const variants = getEffectiveVariants(scene);
                      const variantUrls = new Set(variants.map(v => v.url));
                      const count = variants.filter(v => !v.is_placeholder).length +
                        (scene.image_url && !variantUrls.has(scene.image_url) ? 1 : 0);
                      const isShared = !!scene.shared_images_with;
                      return (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => toggleShowVariants(scene.id)}
                          title={`Show gallery (${count}${isShared ? ' shared' : ''})`}
                          className={scene.showVariants ? 'text-primary' : ''}
                        >
                          <Layers className="size-4" />
                          {count > 0 && (
                            <span className={`absolute -top-1 -right-1 text-[10px] ${isShared ? 'bg-purple-500' : 'bg-primary'} text-primary-foreground rounded-full w-4 h-4 flex items-center justify-center`}>
                              {count}
                            </span>
                          )}
                        </Button>
                      );
                    })()}
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => deleteScene(scene.id)}
                      title="Delete"
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                    {/* Upload image button */}
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            uploadImage(scene.id, file);
                            e.target.value = ''; // Reset input
                          }
                        }}
                      />
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        title="Upload image"
                        asChild
                      >
                        <span>
                          <Upload className="size-4 text-purple-600" />
                        </span>
                      </Button>
                    </label>
                    {/* Img2img button */}
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => toggleImg2Img(scene.id)}
                      title="img2img (use current image as base)"
                      className={scene.showImg2Img ? 'text-primary bg-primary/10' : ''}
                      disabled={!scene.image_url || settings.service !== 'replicate'}
                    >
                      <Wand2 className="size-4" />
                    </Button>
                    {/* Accept/Reject buttons */}
                    {scene.image_url && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setAccepted(scene.id, scene.accepted === true ? null : true)}
                          title={scene.accepted === true ? "Clear acceptance" : "Accept"}
                          className={scene.accepted === true ? "bg-green-100 dark:bg-green-900/30" : ""}
                        >
                          <ThumbsUp className={`size-4 ${scene.accepted === true ? 'text-green-600' : 'text-muted-foreground'}`} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setAccepted(scene.id, scene.accepted === false ? null : false)}
                          title={scene.accepted === false ? "Clear rejection" : "Reject"}
                          className={scene.accepted === false ? "bg-red-100 dark:bg-red-900/30" : ""}
                        >
                          <ThumbsDown className={`size-4 ${scene.accepted === false ? 'text-red-600' : 'text-muted-foreground'}`} />
                        </Button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
              {/* Img2img Controls Row */}
              {scene.showImg2Img && (
                <tr className="border-t bg-purple-50/50 dark:bg-purple-950/20">
                  <td colSpan={5} className="p-4">
                    <div className="flex items-center gap-4">
                      <Wand2 className="size-5 text-purple-600" />
                      <span className="font-medium text-sm">img2img</span>
                      <span className="text-xs text-muted-foreground">
                        Use current image as base, modify with prompt
                      </span>
                      <div className="flex items-center gap-2 ml-4">
                        <span className="text-xs text-muted-foreground">Strength:</span>
                        <input
                          type="range"
                          min="0.1"
                          max="1"
                          step="0.05"
                          value={scene.img2imgStrength ?? 0.7}
                          onChange={(e) => updateImg2ImgStrength(scene.id, parseFloat(e.target.value))}
                          className="w-32 h-2"
                        />
                        <span className="text-xs font-mono w-8">
                          {(scene.img2imgStrength ?? 0.7).toFixed(2)}
                        </span>
                      </div>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => generateImg2Img(scene)}
                        disabled={!scene.image_url || generating || settings.service !== 'replicate'}
                        className="ml-auto"
                      >
                        {scene.status === 'generating' ? (
                          <Loader2 className="size-4 animate-spin mr-1" />
                        ) : (
                          <Wand2 className="size-4 mr-1" />
                        )}
                        Generate img2img
                      </Button>
                    </div>
                    {settings.service !== 'replicate' && (
                      <p className="text-xs text-orange-600 mt-2">
                        img2img requires Replicate service. Switch to Replicate in settings.
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      Lower strength (0.3-0.5) keeps more of original image, higher (0.7-0.9) allows more changes.
                    </p>
                  </td>
                </tr>
              )}
              {/* V3 Expanded Row */}
              {scene.expanded && (
                <tr className="border-t bg-muted/20">
                  <td colSpan={5} className="p-4">
                    {/* Dual Descriptions Section */}
                    <div className="mb-6">
                      <div className="flex items-center gap-4 mb-3">
                        <h4 className="text-sm font-semibold">Dual Descriptions</h4>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-muted-foreground">Alt показывается для:</span>
                          <select
                            value={scene.alt_for_gender || ''}
                            onChange={(e) => saveAltForGender(scene.id, e.target.value as 'male' | 'female' | null || null)}
                            className="h-7 px-2 text-xs rounded border bg-background"
                          >
                            <option value="">Не используется</option>
                            <option value="male">👨 Мужчины</option>
                            <option value="female">👩 Женщины</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-6">
                        {/* Main Description (default) */}
                        <div className="space-y-3 p-3 rounded-lg border bg-background">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{scene.alt_for_gender === 'male' ? '👩' : '👨'}</span>
                            <span className="text-sm font-medium">
                              Основное описание {scene.alt_for_gender === 'male' ? '(для Ж)' : scene.alt_for_gender === 'female' ? '(для М)' : '(по умолчанию)'}
                            </span>
                          </div>
                          <div className="space-y-2">
                            <div className="flex gap-2 items-center">
                              <span className="text-xs text-muted-foreground w-6">RU:</span>
                              <textarea
                                key={`exp-ru-${scene.id}`}
                                defaultValue={scene.user_description?.ru || ''}
                                onBlur={(e) => saveUserDescription(scene.id, 'ru', e.target.value)}
                                placeholder="Описание (RU)..."
                                className="flex-1 min-h-[60px] text-sm p-2 rounded border resize-none"
                              />
                            </div>
                            <div className="flex gap-2 items-center">
                              <span className="text-xs text-muted-foreground w-6">EN:</span>
                              <textarea
                                key={`exp-en-${scene.id}-${scene.user_description?.en || ''}`}
                                defaultValue={scene.user_description?.en || ''}
                                onBlur={(e) => saveUserDescription(scene.id, 'en', e.target.value)}
                                placeholder="Description (EN)..."
                                className="flex-1 min-h-[60px] text-sm p-2 rounded border resize-none"
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2"
                                onClick={() => translateDescription(scene.id)}
                                disabled={!scene.user_description?.ru}
                                title="Translate RU → EN"
                              >
                                <Languages className="size-4" />
                              </Button>
                            </div>
                          </div>
                        </div>

                        {/* Alt Description */}
                        <div className={`space-y-3 p-3 rounded-lg border ${scene.alt_for_gender ? 'bg-background' : 'bg-muted/30 opacity-60'}`}>
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{scene.alt_for_gender === 'female' ? '👩' : '👨'}</span>
                            <span className="text-sm font-medium">
                              Альтернативное описание {scene.alt_for_gender === 'female' ? '(для Ж)' : scene.alt_for_gender === 'male' ? '(для М)' : '(не активно)'}
                            </span>
                          </div>
                          <div className="space-y-2">
                            <div className="flex gap-2 items-center">
                              <span className="text-xs text-muted-foreground w-6">RU:</span>
                              <textarea
                                key={`exp-alt-ru-${scene.id}`}
                                defaultValue={scene.user_description_alt?.ru || ''}
                                onBlur={(e) => saveUserDescriptionAlt(scene.id, 'ru', e.target.value)}
                                placeholder="Альт. описание (RU)..."
                                className="flex-1 min-h-[60px] text-sm p-2 rounded border resize-none"
                                disabled={!scene.alt_for_gender}
                              />
                            </div>
                            <div className="flex gap-2 items-center">
                              <span className="text-xs text-muted-foreground w-6">EN:</span>
                              <textarea
                                key={`exp-alt-en-${scene.id}-${scene.user_description_alt?.en || ''}`}
                                defaultValue={scene.user_description_alt?.en || ''}
                                onBlur={(e) => saveUserDescriptionAlt(scene.id, 'en', e.target.value)}
                                placeholder="Alt description (EN)..."
                                className="flex-1 min-h-[60px] text-sm p-2 rounded border resize-none"
                                disabled={!scene.alt_for_gender}
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2"
                                onClick={() => translateDescriptionAlt(scene.id)}
                                disabled={!scene.alt_for_gender || !scene.user_description_alt?.ru}
                                title="Translate RU → EN"
                              >
                                <Languages className="size-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Divider */}
                    <hr className="my-4 border-border" />

                    <div className="grid grid-cols-2 gap-4">
                      {/* AI Context */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium">AI Context (JSON)</label>
                        <textarea
                          defaultValue={scene.ai_context ? JSON.stringify(scene.ai_context, null, 2) : '{}'}
                          onBlur={(e) => saveAiContext(scene.id, e.target.value)}
                          placeholder='{"tests": {...}, "question_angles": {...}}'
                          className="w-full min-h-[200px] text-xs p-2 rounded border resize-none font-mono"
                        />
                      </div>
                      {/* Follow Up */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Follow Up (JSON)</label>
                        <textarea
                          defaultValue={scene.follow_up ? JSON.stringify(scene.follow_up, null, 2) : ''}
                          onBlur={(e) => saveFollowUp(scene.id, e.target.value)}
                          placeholder='{"trigger": "if_positive", "question": {...}}'
                          className="w-full min-h-[200px] text-xs p-2 rounded border resize-none font-mono"
                        />
                      </div>
                    </div>
                  </td>
                </tr>
              )}
              {/* Image Variants Gallery */}
              {scene.showVariants && (() => {
                // Get effective variants (own or from shared scene)
                const effectiveVariants = getEffectiveVariants(scene);
                const sharedSource = getSharedSourceSlug(scene);

                // Build gallery images: variants + current image_url if not in variants
                const variantUrls = new Set(effectiveVariants.map(v => v.url));
                const galleryImages = [...effectiveVariants.filter(v => !v.is_placeholder)];

                // Add current image_url if it exists and isn't already in variants
                if (scene.image_url && !variantUrls.has(scene.image_url)) {
                  galleryImages.unshift({
                    url: scene.image_url,
                    prompt: scene.generation_prompt || '',
                    created_at: new Date().toISOString(),
                  });
                }

                return (
                <tr className="border-t bg-blue-50/50 dark:bg-blue-950/20">
                  <td colSpan={5} className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Layers className="size-4 text-blue-600" />
                      <span className="font-medium text-sm">Gallery</span>
                      <span className="text-xs text-muted-foreground">
                        ({galleryImages.length} images)
                      </span>
                      {sharedSource && (
                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                          shared from: {sharedSource}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-4 gap-3">
                      {/* Real images */}
                      {galleryImages.map((variant, idx) => (
                        <div
                          key={variant.url}
                          className={`relative rounded-lg border-2 overflow-hidden group ${
                            variant.url === scene.image_url
                              ? 'border-primary ring-2 ring-primary/30'
                              : 'border-transparent hover:border-muted-foreground/30'
                          }`}
                        >
                          <img
                            src={variant.url}
                            alt={`Image ${idx + 1}`}
                            className="w-full h-24 object-cover cursor-pointer"
                            onClick={() => setLightboxImage(variant.url)}
                          />
                          {/* Current indicator */}
                          {variant.url === scene.image_url && (
                            <div className="absolute top-1 left-1 bg-primary text-primary-foreground rounded-full p-0.5">
                              <CheckCircle2 className="size-4" />
                            </div>
                          )}
                          {/* QA status */}
                          {variant.qa_status && (
                            <div className="absolute top-1 right-1">
                              {variant.qa_status === 'passed' ? (
                                <ShieldCheck className="size-4 text-green-500" />
                              ) : (
                                <ShieldX className="size-4 text-red-500" />
                              )}
                            </div>
                          )}
                          {/* Hover overlay with actions */}
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            {variant.url !== scene.image_url && (
                              <Button
                                variant="secondary"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => selectVariant(scene.id, variant.url)}
                              >
                                <Check className="size-3 mr-1" />
                                Use
                              </Button>
                            )}
                            <Button
                              variant="secondary"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => setLightboxImage(variant.url)}
                            >
                              <Eye className="size-3" />
                            </Button>
                            {/* Restore button for failed QA variants */}
                            {variant.qa_status === 'failed' && (
                              <Button
                                variant="secondary"
                                size="sm"
                                className="h-7 text-xs bg-green-600 hover:bg-green-700 text-white"
                                onClick={() => updateVariantQaStatus(scene.id, variant.url, null)}
                                title="Restore (clear QA failed status)"
                              >
                                <RotateCcw className="size-3" />
                              </Button>
                            )}
                            <Button
                              variant="destructive"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => deleteVariant(scene.id, variant.url)}
                            >
                              <Trash2 className="size-3" />
                            </Button>
                          </div>
                          {/* Info */}
                          <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-[10px] px-1 py-0.5 truncate">
                            {variant.qa_score ? `Score: ${variant.qa_score}/10` : `#${idx + 1}`}
                          </div>
                        </div>
                      ))}

                      {/* Add image button (upload) */}
                      <label className="rounded-lg border-2 border-dashed border-muted-foreground/20 h-24 flex items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              uploadImage(scene.id, file);
                              e.target.value = '';
                            }
                          }}
                        />
                        <div className="flex flex-col items-center text-muted-foreground">
                          <Upload className="size-5" />
                          <span className="text-xs">Add image</span>
                        </div>
                      </label>
                    </div>
                  </td>
                </tr>
                );
              })()}
              </React.Fragment>
            ))}
          </tbody>
        </table>

        {filteredScenes.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">
            No scenes found
          </div>
        )}
      </div>

      {/* Lightbox Modal */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setLightboxImage(null)}
        >
          <button
            className="absolute top-4 right-4 text-white hover:text-gray-300"
            onClick={() => setLightboxImage(null)}
          >
            <X className="size-8" />
          </button>
          <img
            src={lightboxImage}
            alt="Full size preview"
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* QA Details Dialog */}
      <Dialog open={!!qaDetailScene} onOpenChange={(open) => !open && setQaDetailScene(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {qaDetailScene?.qa_status === 'passed' ? (
                <ShieldCheck className="size-5 text-green-500" />
              ) : (
                <ShieldX className="size-5 text-red-500" />
              )}
              QA Assessment - {qaDetailScene?.slug || qaDetailScene?.id?.slice(0, 8)}
            </DialogTitle>
          </DialogHeader>

          {qaDetailScene?.qa_last_assessment && (() => {
            const assessment = qaDetailScene.qa_last_assessment as {
              essenceScore?: number;
              essenceComment?: string;
              failReason?: string;
              regenerationHints?: { emphasize?: string; add?: string[]; remove?: string[] };
              keyElementsCheck?: Array<{ element: string; present: boolean; critical: boolean; comment?: string }>;
              technicalQuality?: { score: number; fatalFlaws?: string[] };
            };
            return (
            <div className="space-y-4 text-sm">
              {/* Essence Score */}
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">Essence Score</span>
                  <span className={`text-lg font-bold ${
                    (assessment.essenceScore ?? 0) >= 7
                      ? 'text-green-600'
                      : (assessment.essenceScore ?? 0) >= 5
                        ? 'text-yellow-600'
                        : 'text-red-600'
                  }`}>
                    {assessment.essenceScore ?? 0}/10
                  </span>
                </div>
                {assessment.essenceComment && (
                  <p className="text-muted-foreground">
                    {assessment.essenceComment}
                  </p>
                )}
              </div>

              {/* Fail Reason */}
              {assessment.failReason && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900">
                  <span className="font-medium text-red-700 dark:text-red-400">Причина отклонения:</span>
                  <p className="mt-1 text-red-600 dark:text-red-300">
                    {assessment.failReason}
                  </p>
                </div>
              )}

              {/* Regeneration Hints */}
              {assessment.regenerationHints && (
                <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900">
                  <span className="font-medium text-blue-700 dark:text-blue-400">Рекомендации для улучшения:</span>
                  <div className="mt-2 space-y-1">
                    {assessment.regenerationHints.emphasize && (
                      <p><strong>Усилить:</strong> {assessment.regenerationHints.emphasize}</p>
                    )}
                    {assessment.regenerationHints.add && assessment.regenerationHints.add.length > 0 && (
                      <p><strong>Добавить:</strong> {assessment.regenerationHints.add.join(', ')}</p>
                    )}
                    {assessment.regenerationHints.remove && assessment.regenerationHints.remove.length > 0 && (
                      <p><strong>Убрать:</strong> {assessment.regenerationHints.remove.join(', ')}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Key Elements Check */}
              {assessment.keyElementsCheck && assessment.keyElementsCheck.length > 0 && (
                <div className="p-3 rounded-lg bg-muted/50">
                  <span className="font-medium">Ключевые элементы:</span>
                  <div className="mt-2 space-y-1">
                    {assessment.keyElementsCheck.map((el, i) => (
                      <div key={i} className="flex items-center gap-2">
                        {el.present ? (
                          <Check className="size-4 text-green-500" />
                        ) : (
                          <X className="size-4 text-red-500" />
                        )}
                        <span className={el.critical ? 'font-medium' : ''}>
                          {el.element}
                          {el.critical && <span className="text-xs text-red-500 ml-1">(критично)</span>}
                        </span>
                        {el.comment && <span className="text-muted-foreground text-xs">- {el.comment}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Technical Quality */}
              {assessment.technicalQuality && (
                <div className="p-3 rounded-lg bg-muted/50">
                  <span className="font-medium">Техническое качество: </span>
                  <span className="font-bold">{assessment.technicalQuality.score}/10</span>
                  {assessment.technicalQuality.fatalFlaws && assessment.technicalQuality.fatalFlaws.length > 0 && (
                    <div className="mt-2">
                      <span className="text-red-600 text-xs font-medium">Критические дефекты:</span>
                      <ul className="list-disc list-inside text-xs text-red-500">
                        {assessment.technicalQuality.fatalFlaws.map((f, i) => (
                          <li key={i}>{f}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Attempts Info */}
              <div className="text-xs text-muted-foreground border-t pt-3">
                <span>Всего попыток: {qaDetailScene.qa_attempts || 0}</span>
              </div>
            </div>
            );
          })()}

          {!qaDetailScene?.qa_last_assessment && (
            <div className="space-y-2">
              <p className="text-muted-foreground">Нет данных об оценке</p>
              {qaDetailScene?.qa_attempts && qaDetailScene.qa_attempts > 0 && (
                <p className="text-xs text-red-500">
                  QA выполнил {qaDetailScene.qa_attempts} попыток, но все оценки изображений провалились.
                  Возможно Claude Vision отказался анализировать NSFW контент.
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* V3 Scene Creator Dialog */}
      <Dialog open={showV3Creator} onOpenChange={setShowV3Creator}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wand2 className="size-5" />
              Создание V3 сцен
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Создайте новые сцены из готовых шаблонов с image_prompt для генерации картинок.
            </p>

            {/* Template Groups */}
            <div className="space-y-4">
              {/* Bondage Type */}
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h3 className="font-medium">Типы бондажа</h3>
                    <p className="text-xs text-muted-foreground">6 свайп-карточек для выбора типа связывания</p>
                  </div>
                  <Button
                    size="sm"
                    disabled={v3CreatorLoading}
                    onClick={async () => {
                      setV3CreatorLoading(true);
                      try {
                        const res = await fetch('/api/admin/create-v3-scenes', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ groupId: 'bondage-type' }),
                        });
                        const data = await res.json();
                        if (data.success) {
                          addLog(`Создано ${data.created} сцен bondage-type (пропущено: ${data.skipped})`, 'success');
                          loadScenes();
                        } else {
                          addLog(`Ошибка: ${data.error}`, 'error');
                        }
                      } catch (e) {
                        addLog(`Ошибка: ${(e as Error).message}`, 'error');
                      }
                      setV3CreatorLoading(false);
                    }}
                  >
                    Создать 6 сцен
                  </Button>
                </div>
                <p className="text-xs">Restrain, Шибари, St. Andrew&apos;s Cross, Spreader bar, Подвешивание, Цепи</p>
              </div>

              {/* Positions */}
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h3 className="font-medium">Любимые позы</h3>
                    <p className="text-xs text-muted-foreground">8 свайп-карточек для выбора поз</p>
                  </div>
                  <Button
                    size="sm"
                    disabled={v3CreatorLoading}
                    onClick={async () => {
                      setV3CreatorLoading(true);
                      try {
                        const res = await fetch('/api/admin/create-v3-scenes', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ groupId: 'positions-favorite' }),
                        });
                        const data = await res.json();
                        if (data.success) {
                          addLog(`Создано ${data.created} сцен positions (пропущено: ${data.skipped})`, 'success');
                          loadScenes();
                        } else {
                          addLog(`Ошибка: ${data.error}`, 'error');
                        }
                      } catch (e) {
                        addLog(`Ошибка: ${(e as Error).message}`, 'error');
                      }
                      setV3CreatorLoading(false);
                    }}
                  >
                    Создать 8 сцен
                  </Button>
                </div>
                <p className="text-xs">Миссионерская, Догги, Наездница, Обратная наездница, 69, Спуны, Стоя, Сидя</p>
              </div>

              {/* Lingerie */}
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h3 className="font-medium">Стиль белья</h3>
                    <p className="text-xs text-muted-foreground">8 маленьких картинок для grid-выбора</p>
                  </div>
                  <Button
                    size="sm"
                    disabled={v3CreatorLoading}
                    onClick={async () => {
                      setV3CreatorLoading(true);
                      try {
                        const res = await fetch('/api/admin/create-v3-scenes', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ groupId: 'lingerie-style' }),
                        });
                        const data = await res.json();
                        if (data.success) {
                          addLog(`Создано ${data.created} сцен lingerie (пропущено: ${data.skipped})`, 'success');
                          loadScenes();
                        } else {
                          addLog(`Ошибка: ${data.error}`, 'error');
                        }
                      } catch (e) {
                        addLog(`Ошибка: ${(e as Error).message}`, 'error');
                      }
                      setV3CreatorLoading(false);
                    }}
                  >
                    Создать 8 сцен
                  </Button>
                </div>
                <p className="text-xs">Кружево, Сеточка, Полупрозрачное, Чулки, Атлас, Латекс, Кожа, Корсет</p>
              </div>

              {/* Locations */}
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h3 className="font-medium">Любимые места</h3>
                    <p className="text-xs text-muted-foreground">6 маленьких картинок для grid-выбора</p>
                  </div>
                  <Button
                    size="sm"
                    disabled={v3CreatorLoading}
                    onClick={async () => {
                      setV3CreatorLoading(true);
                      try {
                        const res = await fetch('/api/admin/create-v3-scenes', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ groupId: 'locations-favorite' }),
                        });
                        const data = await res.json();
                        if (data.success) {
                          addLog(`Создано ${data.created} сцен locations (пропущено: ${data.skipped})`, 'success');
                          loadScenes();
                        } else {
                          addLog(`Ошибка: ${data.error}`, 'error');
                        }
                      } catch (e) {
                        addLog(`Ошибка: ${(e as Error).message}`, 'error');
                      }
                      setV3CreatorLoading(false);
                    }}
                  >
                    Создать 6 сцен
                  </Button>
                </div>
                <p className="text-xs">Спальня, Душ, Кухня, Машина, Природа, Отель</p>
              </div>

              {/* Toys Type */}
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h3 className="font-medium">Игрушки (image_selection)</h3>
                    <p className="text-xs text-muted-foreground">11 картинок с парными plug/clamps/beads</p>
                  </div>
                  <Button
                    size="sm"
                    disabled={v3CreatorLoading}
                    onClick={async () => {
                      setV3CreatorLoading(true);
                      try {
                        const res = await fetch('/api/admin/create-v3-scenes', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ groupId: 'toys-type' }),
                        });
                        const data = await res.json();
                        if (data.success) {
                          addLog(`Создано ${data.created} сцен (пропущено: ${data.skipped})`, 'success');
                          loadScenes();
                        } else {
                          addLog(`Ошибка: ${data.error}`, 'error');
                        }
                      } catch (e) {
                        addLog(`Ошибка: ${(e as Error).message}`, 'error');
                      }
                      setV3CreatorLoading(false);
                    }}
                  >
                    Создать 11 сцен
                  </Button>
                </div>
                <p className="text-xs">Вибратор, Дилдо, Пробка×2, Wand, Зажимы×2, Cock ring, Шарики×2, Клиторальная</p>
              </div>

              {/* Single Scenes */}
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h3 className="font-medium">Отдельные сцены</h3>
                    <p className="text-xs text-muted-foreground">Sex swing, Anal hook, Body writing + Finish preference (M/F paired)</p>
                  </div>
                  <Button
                    size="sm"
                    disabled={v3CreatorLoading}
                    onClick={async () => {
                      setV3CreatorLoading(true);
                      try {
                        const res = await fetch('/api/admin/create-v3-scenes', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ groupId: 'single-scenes' }),
                        });
                        const data = await res.json();
                        if (data.success) {
                          addLog(`Создано ${data.created} сцен (пропущено: ${data.skipped})`, 'success');
                          loadScenes();
                        } else {
                          addLog(`Ошибка: ${data.error}`, 'error');
                        }
                      } catch (e) {
                        addLog(`Ошибка: ${(e as Error).message}`, 'error');
                      }
                      setV3CreatorLoading(false);
                    }}
                  >
                    Создать 5 сцен
                  </Button>
                </div>
                <p className="text-xs">sex-swing, anal-hook, body-writing, finish-preference-m, finish-preference-f</p>
              </div>

              {/* Create All */}
              <div className="border-t pt-4 space-y-3">
                <Button
                  className="w-full"
                  disabled={v3CreatorLoading}
                  onClick={async () => {
                    setV3CreatorLoading(true);
                    try {
                      const res = await fetch('/api/admin/create-v3-scenes', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ all: true }),
                      });
                      const data = await res.json();
                      if (data.success) {
                        addLog(`Создано ${data.created} V3 сцен (пропущено: ${data.skipped})`, 'success');
                        loadScenes();
                      } else {
                        addLog(`Ошибка: ${data.error}`, 'error');
                      }
                    } catch (e) {
                      addLog(`Ошибка: ${(e as Error).message}`, 'error');
                    }
                    setV3CreatorLoading(false);
                  }}
                >
                  {v3CreatorLoading ? (
                    <Loader2 className="size-4 animate-spin mr-2" />
                  ) : (
                    <Wand2 className="size-4 mr-2" />
                  )}
                  Создать ВСЕ (44 сцены)
                </Button>

                {/* Generate Images */}
                <Button
                  className="w-full"
                  variant="secondary"
                  disabled={v3CreatorLoading}
                  onClick={async () => {
                    setV3CreatorLoading(true);
                    try {
                      // First check status
                      const statusRes = await fetch('/api/admin/generate-v3-batch');
                      const status = await statusRes.json();

                      if (status.needsCreation?.length > 0) {
                        addLog(`Сначала создайте сцены: ${status.needsCreation.length} не созданы`, 'error');
                        setV3CreatorLoading(false);
                        return;
                      }

                      if (status.withoutImages === 0) {
                        addLog('Все сцены уже имеют картинки!', 'info');
                        setV3CreatorLoading(false);
                        return;
                      }

                      addLog(`Генерация ${status.withoutImages} картинок... Это займёт время.`, 'info');

                      const res = await fetch('/api/admin/generate-v3-batch', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ all: true }),
                      });
                      const data = await res.json();
                      if (data.success) {
                        addLog(`Сгенерировано ${data.generated} картинок (ошибок: ${data.failed})`, data.failed > 0 ? 'info' : 'success');
                        loadScenes();
                        setShowV3Creator(false);
                      } else {
                        addLog(`Ошибка: ${data.error}`, 'error');
                      }
                    } catch (e) {
                      addLog(`Ошибка: ${(e as Error).message}`, 'error');
                    }
                    setV3CreatorLoading(false);
                  }}
                >
                  {v3CreatorLoading ? (
                    <Loader2 className="size-4 animate-spin mr-2" />
                  ) : (
                    <ImageIcon className="size-4 mr-2" />
                  )}
                  Сгенерировать картинки для всех
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
