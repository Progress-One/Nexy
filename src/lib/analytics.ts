/**
 * Track an analytics event.
 * Fire-and-forget — never blocks UI or throws.
 *
 * Migrated from direct DB write to typed server endpoint (`POST /api/analytics/track`).
 * The legacy signature (with the supabase client + userId) is kept so existing
 * call sites compile unchanged; both args are now ignored — the server uses the
 * authenticated session.
 */
export function trackEvent(
  _supabase: unknown,
  _userId: string,
  eventName: string,
  eventData: Record<string, unknown> = {},
): void {
  // Fire-and-forget; swallow errors.
  void fetch('/api/analytics/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event_name: eventName, event_data: eventData }),
  }).catch((err) => {
    console.error('[analytics] failed to track:', eventName, err);
  });
}

// ─── Event name constants ───────────────────────────

export const EVENTS = {
  // Onboarding funnel
  ONBOARDING_START: 'onboarding_start',
  ONBOARDING_STEP_GENDER: 'onboarding_step_gender',
  ONBOARDING_STEP_INTERESTED: 'onboarding_step_interested',
  ONBOARDING_STEP_OPENNESS: 'onboarding_step_openness',
  ONBOARDING_COMPLETE: 'onboarding_complete',

  // Discovery funnel
  DISCOVERY_START: 'discovery_start',
  DISCOVERY_SWIPE: 'discovery_swipe',
  DISCOVERY_BODY_MAP_COMPLETE: 'discovery_body_map_complete',

  // Invite funnel
  INVITE_PAGE_VIEW: 'invite_page_view',
  INVITE_CODE_COPIED: 'invite_code_copied',
  INVITE_EMAIL_SENT: 'invite_email_sent',
  INVITE_ACCEPTED: 'invite_accepted',

  // Proposals
  PROPOSAL_CREATED: 'proposal_created',
  PROPOSAL_SHOWN: 'proposal_shown',
  PROPOSAL_ANSWERED: 'proposal_answered',
} as const;
