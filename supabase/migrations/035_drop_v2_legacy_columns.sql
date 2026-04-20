-- Migration: 035_drop_v2_legacy_columns.sql
-- Description: Drop V2-only columns from scenes table after V3 migration.
--              V3 scenes use scene_type + text_options/image_options/paired_questions
--              instead of nested follow_ups and multi-select elements.
--
-- Safe to run once all active scenes have been converted to V3 format
-- (scene_type = 'main_question' | 'clarification' | 'multi_choice_text' | ...)
-- and no V2 reading paths remain in the application code.

-- ============================================
-- PART 1: ARCHIVE LEGACY V2 DATA
-- ============================================

-- Archive any remaining V2 data before dropping columns.
-- Creates a snapshot table for rollback purposes.
CREATE TABLE IF NOT EXISTS v2_scenes_archive AS
SELECT id, slug, elements, follow_up, question, ai_context, version, updated_at
FROM scenes
WHERE elements IS NOT NULL
   OR follow_up IS NOT NULL
   OR question IS NOT NULL;

COMMENT ON TABLE v2_scenes_archive IS
  'Snapshot of V2 scene payload (elements/follow_up/question) before 035 dropped the columns.';

-- ============================================
-- PART 2: DROP LEGACY COLUMNS
-- ============================================

ALTER TABLE scenes DROP COLUMN IF EXISTS elements;
ALTER TABLE scenes DROP COLUMN IF EXISTS follow_up;
ALTER TABLE scenes DROP COLUMN IF EXISTS question;

-- elements_selected in scene_responses was the V2 answer payload.
-- V3 uses the `answer` JSONB (already present) for everything.
ALTER TABLE scene_responses DROP COLUMN IF EXISTS elements_selected;
ALTER TABLE scene_responses DROP COLUMN IF EXISTS element_responses;

-- paired_with (UUID FK) was a transitional duplicate of paired_scene (TEXT slug).
-- 033 kept it pending admin-code migration — now it is safe to drop.
ALTER TABLE scenes DROP COLUMN IF EXISTS paired_with;

-- ============================================
-- PART 3: CLEAN UP UNUSED INDEXES
-- ============================================

DROP INDEX IF EXISTS idx_scenes_elements;
DROP INDEX IF EXISTS idx_scene_responses_elements_selected;

-- ============================================
-- PART 4: DEACTIVATE RESIDUAL V2 SCENES
-- ============================================

-- Any remaining scenes without scene_type cannot be rendered by V3 runtime.
-- Mark them inactive (admin can review or migrate them manually).
UPDATE scenes
SET is_active = FALSE
WHERE scene_type IS NULL
  AND is_active = TRUE;

-- ============================================
-- PART 5: VERIFICATION QUERIES (run manually)
-- ============================================

-- Check remaining scene columns:
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'scenes' ORDER BY ordinal_position;

-- Count active scenes by scene_type:
-- SELECT scene_type, COUNT(*) FROM scenes WHERE is_active = TRUE GROUP BY scene_type;

-- Check archive size:
-- SELECT COUNT(*) FROM v2_scenes_archive;
