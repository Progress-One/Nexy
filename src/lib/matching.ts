import type { MatchResult } from './types';

// Tag preference from database
export interface TagPreference {
  tag_ref: string;
  interest_level: number;
  role_preference: 'give' | 'receive' | 'both' | null;
}

// Extended match result with role info
export interface RoleMatchResult extends MatchResult {
  myRole?: 'give' | 'receive' | 'both' | null;
  partnerRole?: 'give' | 'receive' | 'both' | null;
  isComplementary?: boolean;
}

/**
 * Check if two roles are complementary (give matches receive)
 */
function areRolesComplementary(
  roleA: 'give' | 'receive' | 'both' | null,
  roleB: 'give' | 'receive' | 'both' | null
): boolean {
  // If either has 'both', they match with anyone
  if (roleA === 'both' || roleB === 'both') return true;
  // If either is null, treat as 'both' (mutual activity)
  if (roleA === null || roleB === null) return true;
  // Complementary: give matches receive
  return (roleA === 'give' && roleB === 'receive') ||
         (roleA === 'receive' && roleB === 'give');
}

/**
 * Get matches based on tag_preferences with role complementarity
 * This handles give/receive pairing correctly
 */
export function getTagBasedMatches(
  myTags: TagPreference[],
  partnerTags: TagPreference[],
  threshold = 50
): {
  matches: RoleMatchResult[];
  partnerDoesntWant: RoleMatchResult[];
  iWantButHidden: RoleMatchResult[];
} {
  const matches: RoleMatchResult[] = [];
  const partnerDoesntWant: RoleMatchResult[] = [];
  const iWantButHidden: RoleMatchResult[] = [];

  // Create maps for quick lookup
  const myTagMap = new Map(myTags.map(t => [t.tag_ref, t]));
  const partnerTagMap = new Map(partnerTags.map(t => [t.tag_ref, t]));

  // Get all unique tags
  const allTags = new Set([
    ...myTags.map(t => t.tag_ref),
    ...partnerTags.map(t => t.tag_ref),
  ]);

  for (const tagRef of allTags) {
    const myTag = myTagMap.get(tagRef);
    const partnerTag = partnerTagMap.get(tagRef);

    const myInterest = myTag?.interest_level || 0;
    const partnerInterest = partnerTag?.interest_level || 0;
    const myRole = myTag?.role_preference || null;
    const partnerRole = partnerTag?.role_preference || null;

    const iWant = myInterest >= threshold;
    const partnerWants = partnerInterest >= threshold;
    const rolesMatch = areRolesComplementary(myRole, partnerRole);

    const result: RoleMatchResult = {
      dimension: tagRef,
      myValue: myInterest,
      partnerValue: partnerInterest,
      visibility: 'hidden',
      myRole,
      partnerRole,
      isComplementary: rolesMatch,
    };

    if (iWant && partnerWants && rolesMatch) {
      // Both want AND roles are complementary → match!
      result.visibility = 'match';
      matches.push(result);
    } else if (iWant && partnerWants && !rolesMatch) {
      // Both want but roles don't match (both want to give or both want to receive)
      // Hide from user - they might want the same thing but not together
      result.visibility = 'hidden';
      iWantButHidden.push(result);
    } else if (iWant && !partnerWants) {
      // I want, partner doesn't → hide from me
      result.visibility = 'hidden';
      iWantButHidden.push(result);
    } else if (!iWant && partnerWants) {
      // Partner wants, I don't → safe to show
      result.visibility = 'partner_no';
      partnerDoesntWant.push(result);
    }
    // Both don't want → skip
  }

  return {
    matches: matches.sort((a, b) => b.myValue - a.myValue),
    partnerDoesntWant,
    iWantButHidden,
  };
}

/**
 * Match categories for the partner matching UI.
 *
 * Thresholds:
 * - An IF_PARTNER swipe stores interest_level ≈ 30 (soft yes).
 * - A clear YES swipe stores interest_level ≥ 50.
 *
 * Categories:
 * - mutual_open:   both >= 50, roles complementary
 * - mutual_hidden: one >= 50 and the other in [30, 50), roles complementary
 *                  ("you both wanted, one was shy")
 * - role_conflict: both >= 50 but roles NOT complementary (both give / both receive)
 * - partner_wants: I < 30, partner >= 50 (partner wants, I don't)
 * - you_want:      I >= 50, partner < 30 (I want, partner doesn't)
 */
export type MatchCategory =
  | 'mutual_open'
  | 'mutual_hidden'
  | 'role_conflict'
  | 'partner_wants'
  | 'you_want';

export interface CategorizedMatch {
  /** Raw tag reference, e.g. "impact-pain" */
  tag: string;
  category: MatchCategory;
  myInterest: number;
  partnerInterest: number;
  myRole?: 'give' | 'receive' | 'both' | null;
  partnerRole?: 'give' | 'receive' | 'both' | null;
}

export interface CategorizedMatches {
  mutual_open: CategorizedMatch[];
  mutual_hidden: CategorizedMatch[];
  role_conflict: CategorizedMatch[];
  partner_wants: CategorizedMatch[];
  you_want: CategorizedMatch[];
  /** Total number of shared tags that have any data (for % calculations) */
  totalAnswered: number;
}

/**
 * Categorize every shared tag into one of five buckets.
 * Does NOT replace getTagBasedMatches — pure addition, safe to call alongside.
 *
 * Thresholds:
 * - OPEN_THRESHOLD   = 50 (explicit YES / VERY answer)
 * - HIDDEN_THRESHOLD = 30 (IF_PARTNER swipe-down answer)
 */
export function getCategorizedMatches(
  myTags: TagPreference[],
  partnerTags: TagPreference[]
): CategorizedMatches {
  const OPEN_THRESHOLD = 50;
  const HIDDEN_THRESHOLD = 30;

  const myTagMap = new Map(myTags.map((t) => [t.tag_ref, t]));
  const partnerTagMap = new Map(partnerTags.map((t) => [t.tag_ref, t]));

  const allTags = new Set<string>([
    ...myTags.map((t) => t.tag_ref),
    ...partnerTags.map((t) => t.tag_ref),
  ]);

  const result: CategorizedMatches = {
    mutual_open: [],
    mutual_hidden: [],
    role_conflict: [],
    partner_wants: [],
    you_want: [],
    totalAnswered: 0,
  };

  for (const tag of allTags) {
    const mine = myTagMap.get(tag);
    const partner = partnerTagMap.get(tag);

    const myInterest = mine?.interest_level ?? 0;
    const partnerInterest = partner?.interest_level ?? 0;
    const myRole = mine?.role_preference ?? null;
    const partnerRole = partner?.role_preference ?? null;

    // Skip tags neither side has touched.
    if (myInterest === 0 && partnerInterest === 0) continue;

    result.totalAnswered += 1;

    const myOpen = myInterest >= OPEN_THRESHOLD;
    const partnerOpen = partnerInterest >= OPEN_THRESHOLD;
    const myHidden = myInterest >= HIDDEN_THRESHOLD && myInterest < OPEN_THRESHOLD;
    const partnerHidden = partnerInterest >= HIDDEN_THRESHOLD && partnerInterest < OPEN_THRESHOLD;
    const rolesMatch = areRolesComplementary(myRole, partnerRole);

    const entry: CategorizedMatch = {
      tag,
      category: 'mutual_open', // overwritten below
      myInterest,
      partnerInterest,
      myRole,
      partnerRole,
    };

    if (myOpen && partnerOpen && rolesMatch) {
      entry.category = 'mutual_open';
      result.mutual_open.push(entry);
    } else if (myOpen && partnerOpen && !rolesMatch) {
      entry.category = 'role_conflict';
      result.role_conflict.push(entry);
    } else if (
      rolesMatch &&
      (myOpen || partnerOpen) &&
      (myHidden || partnerHidden)
    ) {
      // Exactly one side has a hidden "if partner asks" signal, the other is open.
      entry.category = 'mutual_hidden';
      result.mutual_hidden.push(entry);
    } else if (myInterest < HIDDEN_THRESHOLD && partnerOpen) {
      entry.category = 'partner_wants';
      result.partner_wants.push(entry);
    } else if (myOpen && partnerInterest < HIDDEN_THRESHOLD) {
      entry.category = 'you_want';
      result.you_want.push(entry);
    }
    // Anything left over (e.g. both only 30-49 with no opener) is intentionally dropped.
  }

  // Sort each bucket by combined intensity, descending.
  const byCombined = (a: CategorizedMatch, b: CategorizedMatch) =>
    b.myInterest + b.partnerInterest - (a.myInterest + a.partnerInterest);

  result.mutual_open.sort(byCombined);
  result.mutual_hidden.sort(byCombined);
  result.role_conflict.sort(byCombined);
  result.partner_wants.sort((a, b) => b.partnerInterest - a.partnerInterest);
  result.you_want.sort((a, b) => b.myInterest - a.myInterest);

  return result;
}

export function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}
