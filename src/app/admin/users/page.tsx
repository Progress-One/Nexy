'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  RefreshCw,
  Loader2,
  Trash2,
  Eye,
  User,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface UserWithCounts {
  id: string;
  email: string;
  gender: string | null;
  interested_in: string | null;
  onboarding_completed: boolean;
  created_at: string;
  scene_responses_count: number;
  body_map_responses_count: number;
  seen_scenes_count: number;
  calibration_complete: boolean;
  total_responses: number;
}

interface SceneResponse {
  id: string;
  scene_id: string;
  liked: boolean | null;
  rating: number | null;
  elements_selected: string[];
  follow_up_answers: Record<string, unknown>;
  created_at: string;
  scenes: {
    slug: string;
    title: { ru: string; en: string };
    category: string;
  } | null;
}

interface BodyMapResponse {
  id: string;
  activity_id: string;
  pass: string;
  zones_selected: string[];
  created_at: string;
}

interface UserResponses {
  sceneResponses: SceneResponse[];
  bodyMapResponses: BodyMapResponse[];
  flowState: {
    tag_scores: Record<string, number>;
    preferred_intensity: number;
    give_receive_balance: number;
    calibration_complete: boolean;
    seen_scenes: string[];
    seen_categories: string[];
  } | null;
  preferenceProfile: {
    preferences: Record<string, unknown>;
  } | null;
  discoveryProfile: {
    primary_archetype: string | null;
    secondary_archetypes: string[];
    top_tags: unknown[];
    bottom_tags: unknown[];
  } | null;
  excludedPreferences: {
    excluded_tag: string;
    exclusion_level: string;
  }[];
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserWithCounts[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserWithCounts | null>(null);
  const [userResponses, setUserResponses] = useState<UserResponses | null>(null);
  const [loadingResponses, setLoadingResponses] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    sceneResponses: true,
    bodyMapResponses: false,
    flowState: false,
    preferences: false,
  });

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/users');
      const data = await response.json();
      if (data.users) {
        setUsers(data.users);
      }
    } catch (error) {
      console.error('Error loading users:', error);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount-only data fetch
    loadUsers();
  }, [loadUsers]);

  const loadUserResponses = async (userId: string) => {
    setLoadingResponses(true);
    try {
      const response = await fetch(`/api/admin/users/${userId}/responses`);
      const data = await response.json();
      setUserResponses(data);
    } catch (error) {
      console.error('Error loading user responses:', error);
    }
    setLoadingResponses(false);
  };

  const handleViewUser = (user: UserWithCounts) => {
    setSelectedUser(user);
    setUserResponses(null);
    loadUserResponses(user.id);
  };

  const handleResetUser = async (userId: string, tables?: string[]) => {
    if (!confirm('Are you sure you want to reset this user\'s responses? This cannot be undone.')) {
      return;
    }

    setResetting(true);
    try {
      const response = await fetch(`/api/admin/users/${userId}/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tables }),
      });
      const data = await response.json();

      if (data.success) {
        alert('User responses reset successfully');
        loadUsers();
        if (selectedUser?.id === userId) {
          loadUserResponses(userId);
        }
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error resetting user:', error);
      alert('Error resetting user');
    }
    setResetting(false);
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">User Management</h1>
            <p className="text-gray-400 text-sm">
              View and reset user responses
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadUsers}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RefreshCw className="size-4" />
              )}
              <span className="ml-2">Refresh</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.href = '/admin/scenes'}
            >
              Scenes Admin
            </Button>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-800">
              <tr>
                <th className="text-left p-3">Email</th>
                <th className="text-left p-3">Gender</th>
                <th className="text-left p-3">Interested In</th>
                <th className="text-center p-3">Responses</th>
                <th className="text-center p-3">Seen Scenes</th>
                <th className="text-center p-3">Calibrated</th>
                <th className="text-left p-3">Created</th>
                <th className="text-center p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center p-8">
                    <Loader2 className="size-6 animate-spin mx-auto" />
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center p-8 text-gray-500">
                    No users found
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="border-t border-gray-800 hover:bg-gray-800/50">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <User className="size-4 text-gray-500" />
                        <span className="font-mono text-xs">{user.email}</span>
                      </div>
                    </td>
                    <td className="p-3 text-gray-400">{user.gender || '-'}</td>
                    <td className="p-3 text-gray-400">{user.interested_in || '-'}</td>
                    <td className="p-3 text-center">
                      <span className={user.total_responses > 0 ? 'text-green-400' : 'text-gray-500'}>
                        {user.total_responses}
                      </span>
                    </td>
                    <td className="p-3 text-center text-gray-400">{user.seen_scenes_count}</td>
                    <td className="p-3 text-center">
                      {user.calibration_complete ? (
                        <span className="text-green-400">Yes</span>
                      ) : (
                        <span className="text-gray-500">No</span>
                      )}
                    </td>
                    <td className="p-3 text-gray-400 text-xs">{formatDate(user.created_at)}</td>
                    <td className="p-3">
                      <div className="flex justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2"
                          onClick={() => handleViewUser(user)}
                        >
                          <Eye className="size-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-red-400 hover:text-red-300"
                          onClick={() => handleResetUser(user.id)}
                          disabled={resetting}
                        >
                          <Trash2 className="size-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* User Details Dialog */}
        <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-gray-900 border-gray-700">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <User className="size-5" />
                {selectedUser?.email}
              </DialogTitle>
            </DialogHeader>

            {loadingResponses ? (
              <div className="flex justify-center p-8">
                <Loader2 className="size-8 animate-spin" />
              </div>
            ) : userResponses ? (
              <div className="space-y-4">
                {/* Stats Summary */}
                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-gray-800 rounded p-3 text-center">
                    <div className="text-2xl font-bold text-blue-400">
                      {userResponses.sceneResponses.length}
                    </div>
                    <div className="text-xs text-gray-400">Scene Responses</div>
                  </div>
                  <div className="bg-gray-800 rounded p-3 text-center">
                    <div className="text-2xl font-bold text-green-400">
                      {userResponses.bodyMapResponses.length}
                    </div>
                    <div className="text-xs text-gray-400">Body Map</div>
                  </div>
                  <div className="bg-gray-800 rounded p-3 text-center">
                    <div className="text-2xl font-bold text-purple-400">
                      {userResponses.flowState?.seen_scenes?.length || 0}
                    </div>
                    <div className="text-xs text-gray-400">Seen Scenes</div>
                  </div>
                  <div className="bg-gray-800 rounded p-3 text-center">
                    <div className="text-2xl font-bold text-orange-400">
                      {userResponses.excludedPreferences.length}
                    </div>
                    <div className="text-xs text-gray-400">Exclusions</div>
                  </div>
                </div>

                {/* Reset Buttons */}
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => selectedUser && handleResetUser(selectedUser.id)}
                    disabled={resetting}
                  >
                    {resetting ? <Loader2 className="size-4 animate-spin mr-2" /> : <Trash2 className="size-4 mr-2" />}
                    Reset All
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="border border-gray-600 hover:bg-gray-700 text-gray-200 hover:text-white"
                    onClick={() => selectedUser && handleResetUser(selectedUser.id, ['scene_responses'])}
                    disabled={resetting}
                  >
                    Reset Scene Responses
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="border border-gray-600 hover:bg-gray-700 text-gray-200 hover:text-white"
                    onClick={() => selectedUser && handleResetUser(selectedUser.id, ['user_flow_state'])}
                    disabled={resetting}
                  >
                    Reset Flow State
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="border border-gray-600 hover:bg-gray-700 text-gray-200 hover:text-white"
                    onClick={() => selectedUser && handleResetUser(selectedUser.id, ['preference_profiles', 'user_discovery_profiles'])}
                    disabled={resetting}
                  >
                    Reset Profiles
                  </Button>
                </div>

                {/* Scene Responses Section */}
                <div className="border border-gray-700 rounded">
                  <button
                    className="w-full flex items-center justify-between p-3 bg-gray-800 hover:bg-gray-700 text-white"
                    onClick={() => toggleSection('sceneResponses')}
                  >
                    <span className="font-medium">Scene Responses ({userResponses.sceneResponses.length})</span>
                    {expandedSections.sceneResponses ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                  </button>
                  {expandedSections.sceneResponses && (
                    <div className="p-3 max-h-64 overflow-y-auto">
                      {userResponses.sceneResponses.length === 0 ? (
                        <p className="text-gray-400 text-sm">No scene responses</p>
                      ) : (
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-gray-300">
                              <th className="text-left p-1">Scene</th>
                              <th className="text-left p-1">Category</th>
                              <th className="text-center p-1">Liked</th>
                              <th className="text-center p-1">Rating</th>
                              <th className="text-left p-1">Elements</th>
                              <th className="text-left p-1">Date</th>
                            </tr>
                          </thead>
                          <tbody className="text-gray-200">
                            {userResponses.sceneResponses.map((resp) => (
                              <tr key={resp.id} className="border-t border-gray-700">
                                <td className="p-1 font-mono text-white">{resp.scenes?.slug || resp.scene_id}</td>
                                <td className="p-1 text-gray-300">{resp.scenes?.category || '-'}</td>
                                <td className="p-1 text-center">
                                  {resp.liked === true ? '👍' : resp.liked === false ? '👎' : '-'}
                                </td>
                                <td className="p-1 text-center">{resp.rating || '-'}</td>
                                <td className="p-1 text-gray-300">
                                  {resp.elements_selected?.length > 0
                                    ? resp.elements_selected.slice(0, 3).join(', ') + (resp.elements_selected.length > 3 ? '...' : '')
                                    : '-'}
                                </td>
                                <td className="p-1 text-gray-400">{formatDate(resp.created_at)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}
                </div>

                {/* Flow State Section */}
                <div className="border border-gray-700 rounded">
                  <button
                    className="w-full flex items-center justify-between p-3 bg-gray-800 hover:bg-gray-700 text-white"
                    onClick={() => toggleSection('flowState')}
                  >
                    <span className="font-medium">Flow State</span>
                    {expandedSections.flowState ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                  </button>
                  {expandedSections.flowState && userResponses.flowState && (
                    <div className="p-3 text-xs space-y-2 text-gray-200">
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <span className="text-gray-400">Preferred Intensity:</span>
                          <span className="ml-2 text-white">{userResponses.flowState.preferred_intensity}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">Give/Receive Balance:</span>
                          <span className="ml-2 text-white">{userResponses.flowState.give_receive_balance}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">Calibration:</span>
                          <span className="ml-2 text-white">{userResponses.flowState.calibration_complete ? 'Complete' : 'Not complete'}</span>
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-400">Seen Categories:</span>
                        <span className="ml-2 text-white">{userResponses.flowState.seen_categories?.join(', ') || 'None'}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Tag Scores:</span>
                        <pre className="mt-1 p-2 bg-gray-950 rounded text-xs overflow-x-auto text-gray-200">
                          {JSON.stringify(userResponses.flowState.tag_scores, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>

                {/* Discovery Profile Section */}
                <div className="border border-gray-700 rounded">
                  <button
                    className="w-full flex items-center justify-between p-3 bg-gray-800 hover:bg-gray-700 text-white"
                    onClick={() => toggleSection('preferences')}
                  >
                    <span className="font-medium">Discovery Profile</span>
                    {expandedSections.preferences ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                  </button>
                  {expandedSections.preferences && userResponses.discoveryProfile && (
                    <div className="p-3 text-xs space-y-2 text-gray-200">
                      <div>
                        <span className="text-gray-400">Primary Archetype:</span>
                        <span className="ml-2 text-purple-400">{userResponses.discoveryProfile.primary_archetype || 'None'}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Secondary:</span>
                        <span className="ml-2 text-white">{userResponses.discoveryProfile.secondary_archetypes?.join(', ') || 'None'}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Top Tags:</span>
                        <pre className="mt-1 p-2 bg-gray-950 rounded text-xs overflow-x-auto text-gray-200">
                          {JSON.stringify(userResponses.discoveryProfile.top_tags, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>

                {/* Excluded Preferences */}
                {userResponses.excludedPreferences.length > 0 && (
                  <div className="border border-gray-700 rounded p-3">
                    <h4 className="font-medium mb-2 text-white">Excluded Preferences</h4>
                    <div className="flex flex-wrap gap-2">
                      {userResponses.excludedPreferences.map((excl, i) => (
                        <span
                          key={i}
                          className="px-2 py-1 bg-red-900/30 text-red-300 text-xs rounded"
                        >
                          {excl.excluded_tag} ({excl.exclusion_level})
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-500">No data loaded</p>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
