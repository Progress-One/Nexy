import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { calculatePartnerArchetypes, getAverageIntensity } from '@/lib/partner-archetypes';

const openai = new OpenAI();

interface CategoryInfo {
  slug: string;
  name: string;
}

interface ExclusionRecord {
  category: CategoryInfo | null;
  excluded_tag: string | null;
  exclusion_level: string;
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const serviceClient = await createServiceClient(); // Bypass RLS for partner data
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { partnerId, message } = await req.json();

  // Check active partnership (use regular client - user's own data)
  const { data: partnership } = await supabase
    .from('partnerships')
    .select('*')
    .or(`and(user_id.eq.${user.id},partner_id.eq.${partnerId}),and(user_id.eq.${partnerId},partner_id.eq.${user.id})`)
    .eq('status', 'active')
    .single();

  if (!partnership) {
    return NextResponse.json({ error: 'No active partnership' }, { status: 403 });
  }

  // Get partner name from partnership
  const partnerName = partnership.nickname || 'Partner';

  // Get partner profile (use serviceClient to bypass RLS)
  const { data: partnerProfile } = await serviceClient
    .from('profiles')
    .select('gender')
    .eq('id', partnerId)
    .single();

  // Get partner tag preferences (V2) - serviceClient bypasses RLS
  const { data: tagPreferences } = await serviceClient
    .from('tag_preferences')
    .select('tag_ref, interest_level, role_preference, intensity_preference, experience_level')
    .eq('user_id', partnerId)
    .order('interest_level', { ascending: false })
    .limit(50); // Top 50 preferences

  // Get partner exclusions - serviceClient bypasses RLS
  const { data: partnerExclusions } = await serviceClient
    .from('excluded_preferences')
    .select('category:categories(slug, name), excluded_tag, exclusion_level')
    .eq('user_id', partnerId);

  // Get preference profile summary (includes personality description)
  const { data: preferenceProfile } = await serviceClient
    .from('preference_profiles')
    .select('preferences')
    .eq('user_id', partnerId)
    .single();

  // Get verbal preference scene response for communication style
  const { data: verbalPreference } = await serviceClient
    .from('scene_responses')
    .select('element_responses')
    .eq('user_id', partnerId)
    .eq('scene_slug', 'verbal-preference')
    .single();

  // Calculate archetypes (uses direct db access, bypasses RLS)
  const archetypes = await calculatePartnerArchetypes(partnerId);

  // Get average intensity (uses direct db access, bypasses RLS)
  const avgIntensity = await getAverageIntensity(partnerId);

  // Get chat history (last 20 messages)
  const { data: chatHistory } = await supabase
    .from('partner_chat_messages')
    .select('role, content')
    .eq('user_id', user.id)
    .eq('partner_id', partnerId)
    .order('created_at', { ascending: true })
    .limit(20);

  // Format preferences for AI
  const prefsContext = formatTagPreferencesForAI(tagPreferences || []);
  const exclusionsContext = formatExclusionsForAI((partnerExclusions || []).map(e => ({
    category: Array.isArray(e.category) ? e.category[0] : e.category,
    excluded_tag: e.excluded_tag,
    exclusion_level: e.exclusion_level,
  })) as ExclusionRecord[]);
  const archetypesContext = formatArchetypesForAI(archetypes);
  const intensityContext = avgIntensity !== null ? `Average preferred intensity: ${Math.round(avgIntensity)}/100` : null;

  // Extract profile summary and verbal preferences
  const profileSummary = preferenceProfile?.preferences?.summary as string | undefined;
  const uniqueTraits = preferenceProfile?.preferences?.unique_traits as string[] | undefined;
  const verbalStyles = extractVerbalStyles(verbalPreference?.element_responses);
  const communicationGuidance = getCommStyleGuidance(verbalStyles, archetypes);

  const genderText = partnerProfile?.gender === 'female' ? 'female' :
                     partnerProfile?.gender === 'male' ? 'male' : 'person';

  // DEBUG: Log what we're sending to AI
  console.log('=== PARTNER CHAT DEBUG ===');
  console.log('partnerId:', partnerId);
  console.log('partnerName:', partnerName);
  console.log('profileSummary:', profileSummary);
  console.log('uniqueTraits:', uniqueTraits);
  console.log('verbalStyles:', verbalStyles);
  console.log('archetypes:', archetypes);
  console.log('tagPreferences count:', tagPreferences?.length || 0);
  console.log('communicationGuidance:', communicationGuidance);
  console.log('=== END DEBUG ===');

  const systemPrompt = `You are an AI avatar of the user's partner named "${partnerName}". Your task is to answer questions about intimate preferences as ${partnerName} would.

PARTNER PROFILE:
- Name: ${partnerName}
- Gender: ${genderText}
${profileSummary ? `- Summary: ${profileSummary}` : ''}
${uniqueTraits?.length ? `- Unique traits: ${uniqueTraits.join(', ')}` : ''}
${archetypesContext ? `\nPERSONALITY ARCHETYPES:\n${archetypesContext}` : ''}
${intensityContext ? `\n${intensityContext}` : ''}

PREFERENCES (based on discovery responses):
${prefsContext}

DISLIKES:
${exclusionsContext}

COMMUNICATION STYLE:
${communicationGuidance}

RULES:
1. You ARE ${partnerName}. Answer in first person as ${partnerName}
2. KEEP RESPONSES SHORT - 1-3 sentences max, like real chat
3. Sound NATURAL, not literary or elaborate
4. If submissive archetype: YOU are submissive, USER is dominant - never reverse this
5. If user commands you to say something about yourself, comply from YOUR perspective
6. Match the energy - if user is direct, be direct back
7. Don't over-explain or make lists unless asked
8. Respond in the same language as the user
9. NO emojis unless personality specifically likes them`;

  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    ...(chatHistory || []).map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content
    })),
    { role: 'user', content: message }
  ];

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages,
    max_tokens: 300,
    temperature: 0.8
  });

  const assistantMessage = completion.choices[0].message.content || '';

  // Save both messages
  await supabase.from('partner_chat_messages').insert([
    { user_id: user.id, partner_id: partnerId, role: 'user', content: message },
    { user_id: user.id, partner_id: partnerId, role: 'assistant', content: assistantMessage }
  ]);

  return NextResponse.json({ message: assistantMessage });
}

interface TagPreference {
  tag_ref: string;
  interest_level: number | null;
  role_preference: 'give' | 'receive' | 'both' | null;
  intensity_preference: number | null;
  experience_level: 'tried' | 'want_to_try' | 'not_interested' | 'curious' | null;
}

function formatTagPreferencesForAI(tagPrefs: TagPreference[]): string {
  if (!tagPrefs || tagPrefs.length === 0) {
    return 'Limited preference data available';
  }

  const lines: string[] = [];
  
  // Group by interest level
  const highInterest = tagPrefs.filter(p => (p.interest_level || 0) >= 70);
  const moderateInterest = tagPrefs.filter(p => (p.interest_level || 0) >= 50 && (p.interest_level || 0) < 70);
  const lowInterest = tagPrefs.filter(p => (p.interest_level || 0) < 50 && (p.interest_level || 0) > 0);

  if (highInterest.length > 0) {
    lines.push('Really likes:');
    for (const pref of highInterest.slice(0, 15)) {
      const parts: string[] = [pref.tag_ref];
      
      if (pref.role_preference) {
        parts.push(`role: ${pref.role_preference}`);
      }
      
      if (pref.intensity_preference !== null) {
        parts.push(`intensity: ${pref.intensity_preference}/100`);
      }
      
      if (pref.experience_level) {
        const expText = pref.experience_level === 'tried' ? 'has tried' :
                       pref.experience_level === 'want_to_try' ? 'wants to try' :
                       pref.experience_level === 'curious' ? 'curious about' :
                       'not interested';
        parts.push(expText);
      }
      
      lines.push(`  - ${parts.join(', ')}`);
    }
  }

  if (moderateInterest.length > 0) {
    lines.push('\nLikes:');
    for (const pref of moderateInterest.slice(0, 10)) {
      lines.push(`  - ${pref.tag_ref}${pref.role_preference ? ` (${pref.role_preference})` : ''}`);
    }
  }

  if (lowInterest.length > 0 && lowInterest.length <= 5) {
    lines.push('\nNeutral or low interest:');
    for (const pref of lowInterest) {
      lines.push(`  - ${pref.tag_ref}`);
    }
  }

  return lines.join('\n') || 'Limited preference data available';
}

function formatArchetypesForAI(archetypes: Array<{ id: string; name: { ru: string; en: string }; description: { ru: string; en: string }; score: number }>): string {
  if (!archetypes || archetypes.length === 0) {
    return '';
  }

  const lines: string[] = [];
  
  for (const arch of archetypes) {
    // Use English for AI, but could detect language from user message
    const name = arch.name.en || arch.name.ru;
    const desc = arch.description.en || arch.description.ru;
    const confidence = arch.score >= 0.7 ? 'strongly' : arch.score >= 0.5 ? 'moderately' : 'somewhat';
    lines.push(`- ${name} (${confidence} matches): ${desc}`);
  }

  return lines.join('\n');
}

function formatExclusionsForAI(exclusions: ExclusionRecord[]): string {
  if (!exclusions.length) return 'No explicit exclusions';

  return exclusions.map(e => {
    const name = e.category?.name || e.excluded_tag;
    const level = e.exclusion_level === 'hard' ? 'absolutely not' : 'not really';
    return `- ${name}: ${level}`;
  }).join('\n');
}

interface VerbalResponses {
  general?: { preference?: string };
  type?: { which?: string[] };
  role?: { who_talks?: string };
}

function extractVerbalStyles(elementResponses: VerbalResponses | null): string[] {
  if (!elementResponses?.type?.which) return [];
  return elementResponses.type.which;
}

function getCommStyleGuidance(
  verbalStyles: string[],
  archetypes: Array<{ id: string; score: number }>
): string {
  const lines: string[] = [];

  // Check if submissive archetype is strong
  const isSubmissive = archetypes.some(a => a.id === 'submissive' && a.score >= 0.6);
  const isDominant = archetypes.some(a => a.id === 'dominant' && a.score >= 0.6);
  const isMasochist = archetypes.some(a => a.id === 'masochist' && a.score >= 0.5);

  // Verbal style preferences
  const likesDegradation = verbalStyles.includes('degradation');
  const likesCommands = verbalStyles.includes('commands');
  const likesDirty = verbalStyles.includes('dirty');
  const likesPraise = verbalStyles.includes('praise');
  const likesNarration = verbalStyles.includes('narration');

  if (verbalStyles.length === 0) {
    lines.push('- No specific verbal preferences detected, be natural');
  } else {
    if (likesDegradation) {
      lines.push('- Enjoys degrading language - NOT sweet romantic talk');
      lines.push('- Would prefer being called rough names over pet names');
    }
    if (likesCommands) {
      lines.push('- Responds well to commanding tone');
    }
    if (likesDirty) {
      lines.push('- Enjoys explicit, dirty talk');
    }
    if (likesPraise && !likesDegradation) {
      lines.push('- Enjoys praise and affirmation');
    }
    if (likesNarration) {
      lines.push('- Likes verbal narration of what is happening');
    }
  }

  // Archetype-based guidance
  if (isSubmissive && likesDegradation) {
    lines.push('- As a submissive who likes degradation: speak from that mindset');
    lines.push('- Would NOT want sweet nicknames like "солнышко" - prefers being used/owned');
  } else if (isSubmissive && likesPraise) {
    lines.push('- As a submissive who likes praise: may enjoy being called "good girl/boy"');
  } else if (isDominant) {
    lines.push('- As a dominant: speaks with confidence and authority');
  }

  if (isMasochist) {
    lines.push('- As someone who enjoys pain: may speak about wanting to be hurt/used');
  }

  return lines.length > 0 ? lines.join('\n') : '- Be natural and in character';
}
