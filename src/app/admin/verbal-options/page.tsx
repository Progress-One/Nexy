'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { OptionEditor } from '@/components/admin/OptionEditor';
import { LocalizedTextInput } from '@/components/admin/LocalizedTextInput';
import {
  Loader2,
  Save,
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
  RefreshCw,
  Check,
  AlertCircle,
} from 'lucide-react';
import type { LocalizedString } from '@/lib/types';

interface QuestionOption {
  id: string;
  label: LocalizedString;
}

interface SceneQuestion {
  type: string;
  text: LocalizedString;
  options?: QuestionOption[];
  allow_other?: boolean;
  other_placeholder?: LocalizedString;
  min_selections?: number;
}

interface VerbalScene {
  id: string;
  slug: string;
  title: LocalizedString;
  subtitle?: LocalizedString;
  category: string;
  for_gender: 'male' | 'female' | null;
  is_active: boolean;
  question: SceneQuestion;
  // UI state
  expanded?: boolean;
  saving?: boolean;
  saved?: boolean;
  error?: string;
  hasChanges?: boolean;
}

type FilterGender = 'all' | 'male' | 'female';
type FilterCategory = 'all' | string;

export default function VerbalOptionsPage() {
  const [scenes, setScenes] = useState<VerbalScene[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterGender, setFilterGender] = useState<FilterGender>('all');
  const [filterCategory, setFilterCategory] = useState<FilterCategory>('all');
  const [categories, setCategories] = useState<string[]>([]);

  const supabase = createClient();

  // Load scenes with multi_select questions
  const loadScenes = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('scenes')
        .select('id, slug, title, subtitle, category, for_gender, is_active, question')
        .eq('version', 2)
        .not('question', 'is', null)
        .order('category')
        .order('slug');

      if (error) {
        console.error('Error loading scenes:', error);
        return;
      }

      // Filter scenes with multi_select questions
      const multiSelectScenes = (data || [])
        .filter((s: any) => s.question?.type === 'multi_select')
        .map((s: any) => ({
          ...s,
          expanded: false,
          saving: false,
          saved: false,
          hasChanges: false,
        })) as VerbalScene[];

      setScenes(multiSelectScenes);

      // Extract unique categories
      const uniqueCategories = [...new Set(multiSelectScenes.map(s => s.category))].sort();
      setCategories(uniqueCategories);
    } catch (err) {
      console.error('Error loading scenes:', err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadScenes();
  }, [loadScenes]);

  // Filter scenes
  const filteredScenes = scenes.filter(scene => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSlug = scene.slug.toLowerCase().includes(query);
      const matchesTitle =
        scene.title.ru.toLowerCase().includes(query) ||
        scene.title.en.toLowerCase().includes(query);
      if (!matchesSlug && !matchesTitle) return false;
    }

    // Gender filter
    if (filterGender !== 'all') {
      if (scene.for_gender !== filterGender) return false;
    }

    // Category filter
    if (filterCategory !== 'all') {
      if (scene.category !== filterCategory) return false;
    }

    return true;
  });

  // Toggle scene expansion
  const toggleExpand = (sceneId: string) => {
    setScenes(prev => prev.map(s =>
      s.id === sceneId ? { ...s, expanded: !s.expanded } : s
    ));
  };

  // Update scene options
  const updateOptions = (sceneId: string, options: QuestionOption[]) => {
    setScenes(prev => prev.map(s => {
      if (s.id !== sceneId) return s;
      return {
        ...s,
        question: { ...s.question, options },
        hasChanges: true,
        saved: false,
      };
    }));
  };

  // Update allow_other
  const updateAllowOther = (sceneId: string, allowOther: boolean) => {
    setScenes(prev => prev.map(s => {
      if (s.id !== sceneId) return s;
      return {
        ...s,
        question: { ...s.question, allow_other: allowOther },
        hasChanges: true,
        saved: false,
      };
    }));
  };

  // Update other_placeholder
  const updateOtherPlaceholder = (sceneId: string, placeholder: LocalizedString) => {
    setScenes(prev => prev.map(s => {
      if (s.id !== sceneId) return s;
      return {
        ...s,
        question: { ...s.question, other_placeholder: placeholder },
        hasChanges: true,
        saved: false,
      };
    }));
  };

  // Update question text
  const updateQuestionText = (sceneId: string, text: LocalizedString) => {
    setScenes(prev => prev.map(s => {
      if (s.id !== sceneId) return s;
      return {
        ...s,
        question: { ...s.question, text },
        hasChanges: true,
        saved: false,
      };
    }));
  };

  // Save scene
  const saveScene = async (sceneId: string) => {
    const scene = scenes.find(s => s.id === sceneId);
    if (!scene) return;

    setScenes(prev => prev.map(s =>
      s.id === sceneId ? { ...s, saving: true, error: undefined } : s
    ));

    try {
      const { error } = await supabase
        .from('scenes')
        .update({ question: scene.question })
        .eq('id', sceneId);

      if (error) throw error;

      setScenes(prev => prev.map(s =>
        s.id === sceneId ? { ...s, saving: false, saved: true, hasChanges: false } : s
      ));

      // Clear saved indicator after 2 seconds
      setTimeout(() => {
        setScenes(prev => prev.map(s =>
          s.id === sceneId ? { ...s, saved: false } : s
        ));
      }, 2000);
    } catch (err: any) {
      console.error('Error saving scene:', err);
      setScenes(prev => prev.map(s =>
        s.id === sceneId ? { ...s, saving: false, error: err.message } : s
      ));
    }
  };

  // Save all changed scenes
  const saveAllChanges = async () => {
    const changedScenes = scenes.filter(s => s.hasChanges);
    for (const scene of changedScenes) {
      await saveScene(scene.id);
    }
  };

  const hasAnyChanges = scenes.some(s => s.hasChanges);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-gray-900 border-b border-gray-800 p-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold">Verbal Options Editor</h1>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.location.href = '/admin/scenes'}
                className="text-gray-400 hover:text-white"
              >
                ← Back to Scenes
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={loadScenes}
                className="gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </Button>
              {hasAnyChanges && (
                <Button
                  size="sm"
                  onClick={saveAllChanges}
                  className="gap-2 bg-green-600 hover:bg-green-700"
                >
                  <Save className="w-4 h-4" />
                  Save All Changes
                </Button>
              )}
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-4">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <Input
                type="text"
                placeholder="Search by slug or title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-gray-800 border-gray-700"
              />
            </div>

            {/* Gender filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <select
                value={filterGender}
                onChange={(e) => setFilterGender(e.target.value as FilterGender)}
                className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm"
              >
                <option value="all">All Genders</option>
                <option value="male">Male only</option>
                <option value="female">Female only</option>
              </select>
            </div>

            {/* Category filter */}
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm"
            >
              <option value="all">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            {/* Stats */}
            <div className="text-sm text-gray-500">
              {filteredScenes.length} / {scenes.length} scenes
            </div>
          </div>
        </div>
      </div>

      {/* Scene list */}
      <div className="max-w-6xl mx-auto p-4 space-y-3">
        {filteredScenes.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No scenes found matching your filters
          </div>
        ) : (
          filteredScenes.map(scene => (
            <div
              key={scene.id}
              className={`bg-gray-800 rounded-lg border ${
                scene.hasChanges
                  ? 'border-yellow-600'
                  : scene.saved
                    ? 'border-green-600'
                    : 'border-gray-700'
              }`}
            >
              {/* Scene header */}
              <button
                onClick={() => toggleExpand(scene.id)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-750"
              >
                <div className="flex items-center gap-3">
                  {scene.expanded ? (
                    <ChevronUp className="w-5 h-5 text-gray-500" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-500" />
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm text-blue-400">{scene.slug}</span>
                      {scene.hasChanges && (
                        <span className="px-1.5 py-0.5 text-xs bg-yellow-600/20 text-yellow-400 rounded">
                          unsaved
                        </span>
                      )}
                      {scene.saved && (
                        <span className="px-1.5 py-0.5 text-xs bg-green-600/20 text-green-400 rounded flex items-center gap-1">
                          <Check className="w-3 h-3" /> saved
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-400">
                      {scene.title.ru} • {scene.question.options?.length || 0} options
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className={`px-2 py-1 rounded ${
                    scene.for_gender === 'male'
                      ? 'bg-blue-600/20 text-blue-400'
                      : scene.for_gender === 'female'
                        ? 'bg-pink-600/20 text-pink-400'
                        : 'bg-gray-600/20 text-gray-400'
                  }`}>
                    {scene.for_gender || 'both'}
                  </span>
                  <span className="px-2 py-1 bg-gray-700 rounded">
                    {scene.category}
                  </span>
                  {!scene.is_active && (
                    <span className="px-2 py-1 bg-red-600/20 text-red-400 rounded">
                      inactive
                    </span>
                  )}
                </div>
              </button>

              {/* Expanded content */}
              {scene.expanded && (
                <div className="border-t border-gray-700 p-4 space-y-4">
                  {/* Error message */}
                  {scene.error && (
                    <div className="flex items-center gap-2 p-3 bg-red-900/30 border border-red-700 rounded text-red-400 text-sm">
                      <AlertCircle className="w-4 h-4" />
                      {scene.error}
                    </div>
                  )}

                  {/* Question text */}
                  <LocalizedTextInput
                    label="Question Text"
                    value={scene.question.text}
                    onChange={(text) => updateQuestionText(scene.id, text)}
                    placeholder={{ ru: 'Вопрос (RU)', en: 'Question (EN)' }}
                  />

                  {/* Options editor */}
                  <OptionEditor
                    options={scene.question.options || []}
                    onChange={(options) => updateOptions(scene.id, options)}
                  />

                  {/* Allow other input */}
                  <div className="flex items-start gap-4">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`allow-other-${scene.id}`}
                        checked={scene.question.allow_other || false}
                        onCheckedChange={(checked) => updateAllowOther(scene.id, !!checked)}
                      />
                      <label
                        htmlFor={`allow-other-${scene.id}`}
                        className="text-sm text-gray-300 cursor-pointer"
                      >
                        Allow custom input (&quot;Other...&quot;)
                      </label>
                    </div>
                  </div>

                  {/* Other placeholder */}
                  {scene.question.allow_other && (
                    <LocalizedTextInput
                      label="Custom Input Placeholder"
                      value={scene.question.other_placeholder || { ru: '', en: '' }}
                      onChange={(placeholder) => updateOtherPlaceholder(scene.id, placeholder)}
                      placeholder={{ ru: 'Своё слово...', en: 'Your own word...' }}
                    />
                  )}

                  {/* Save button */}
                  <div className="flex justify-end pt-2">
                    <Button
                      onClick={() => saveScene(scene.id)}
                      disabled={scene.saving || !scene.hasChanges}
                      className="gap-2"
                    >
                      {scene.saving ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          Save
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
