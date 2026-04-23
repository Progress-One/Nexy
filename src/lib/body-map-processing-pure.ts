/**
 * Body map processing — pure (non-DB) helpers.
 *
 * Extracted from `body-map-processing.ts` so client-side callers can import
 * gate helpers without dragging the server-only `db` module into the browser
 * bundle.
 */

/**
 * Check if a gate is open based on body map
 */
export function isBodyMapGateOpen(
  bodyMapGates: Record<string, boolean> | null,
  gateKey: string
): boolean {
  if (!bodyMapGates) return false;
  return bodyMapGates[gateKey] === true;
}

/**
 * Get all open gates from body map
 */
export function getOpenBodyMapGates(
  bodyMapGates: Record<string, boolean> | null
): string[] {
  if (!bodyMapGates) return [];
  return Object.entries(bodyMapGates)
    .filter(([_, isOpen]) => isOpen)
    .map(([gate]) => gate);
}
