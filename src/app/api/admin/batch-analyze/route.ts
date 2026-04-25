/**
 * API Route: Batch analyze storage images
 * Processes images in batches, saves analysis to image_analysis table
 */

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { listStorageFiles, getStoragePublicUrl } from '@/lib/storage';
import { analyzeImage, ImageAnalysis } from '@/lib/image-analyzer';
import type { Json } from '@/lib/db/schema';
import { requireAdmin } from '@/lib/auth';

const DEFAULT_BATCH_SIZE = 5;

interface BatchResult {
  file_name: string;
  success: boolean;
  analysis?: ImageAnalysis;
  error?: string;
}

export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const body = await request.json().catch(() => ({}));
    const batchSize = body.batchSize || DEFAULT_BATCH_SIZE;

    // 1. Get all storage files
    let files;
    try {
      files = await listStorageFiles('scenes', { limit: 2000 });
    } catch (storageError) {
      return NextResponse.json(
        { error: `Storage error: ${(storageError as Error).message}` },
        { status: 500 }
      );
    }

    const imageFiles = (files || []).filter(f =>
      !f.name.startsWith('.') // Skip system files
    );

    // 2. Get already analyzed files (pagination to bypass 1000 row limit)
    let allAnalyzed: { file_name: string }[] = [];
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      try {
        const data = await db
          .selectFrom('image_analysis')
          .select('file_name')
          .offset(page * pageSize)
          .limit(pageSize)
          .execute();

        if (data && data.length > 0) {
          allAnalyzed = allAnalyzed.concat(data);
          page++;
          hasMore = data.length === pageSize; // Continue if we got a full page
        } else {
          hasMore = false;
        }
      } catch (dbError) {
        console.error('[batch-analyze] DB error:', dbError);
        break;
      }

      // Safety limit: don't fetch more than 20 pages (20k records)
      if (page >= 20) {
        console.warn('[batch-analyze] Hit pagination safety limit (20k records)');
        break;
      }
    }

    console.log(`[batch-analyze] SELECT returned ${allAnalyzed.length} rows across ${page} pages, last 3 files: ${allAnalyzed.slice(-3).map(a => a.file_name).join(', ')}`);

    const analyzedSet = new Set(allAnalyzed.map(a => a.file_name));

    // 3. Find files to analyze (not yet analyzed)
    const toAnalyze = imageFiles
      .filter(f => !analyzedSet.has(f.name))
      .slice(0, batchSize);

    const total = imageFiles.length;
    const alreadyAnalyzed = analyzedSet.size;

    console.log(`[batch-analyze] Total files: ${total}, Already analyzed: ${alreadyAnalyzed}, To analyze: ${imageFiles.length - alreadyAnalyzed}`);
    console.log(`[batch-analyze] Next ${toAnalyze.length} files to analyze: ${toAnalyze.map(f => f.name.substring(0, 50)).join(', ')}`);

    if (toAnalyze.length === 0) {
      console.log(`[batch-analyze] All done! ${alreadyAnalyzed} / ${total} analyzed`);
      return NextResponse.json({
        done: true,
        total,
        analyzed: alreadyAnalyzed,
        remaining: 0,
        results: []
      });
    }

    // 4. Analyze batch
    console.log(`[batch-analyze] Processing batch of ${toAnalyze.length} images (batch ${Math.floor(alreadyAnalyzed / batchSize) + 1})...`);
    const results: BatchResult[] = [];

    for (const file of toAnalyze) {
      const url = getStoragePublicUrl('scenes', file.name);

      try {
        console.log(`[batch-analyze] Analyzing: ${file.name}`);
        const analysis = await analyzeImage(url);

        // Save to DB
        try {
          const upsertData = await db
            .insertInto('image_analysis')
            .values({
              file_name: file.name,
              file_url: url,
              analysis: analysis as unknown as Json,
              updated_at: new Date(),
            })
            .onConflict(oc => oc.column('file_name').doUpdateSet({
              file_url: url,
              analysis: analysis as unknown as Json,
              updated_at: new Date(),
            }))
            .returningAll()
            .execute();

          console.log(`[batch-analyze] Saved: ${file.name}, keywords: ${analysis.keywords?.join(', ')}, upsert returned ${upsertData?.length} rows`);
          results.push({ file_name: file.name, success: true, analysis });
        } catch (upsertError) {
          console.error(`[batch-analyze] Upsert error for ${file.name}:`, upsertError);
          results.push({ file_name: file.name, success: false, error: (upsertError as Error).message });
        }
      } catch (error) {
        console.error(`[batch-analyze] Error analyzing ${file.name}:`, error);
        results.push({
          file_name: file.name,
          success: false,
          error: (error as Error).message
        });
      }
    }

    const successCount = results.filter(r => r.success).length;

    return NextResponse.json({
      done: false,
      total,
      analyzed: alreadyAnalyzed + successCount,
      remaining: total - alreadyAnalyzed - successCount,
      results
    });
  } catch (error) {
    console.error('[batch-analyze] Unexpected error:', error);
    return NextResponse.json(
      { error: `Unexpected error: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}

// GET - retrieve all analysis data
export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const data = await db
      .selectFrom('image_analysis')
      .select(['file_name', 'file_url', 'analysis', 'created_at'])
      .orderBy('created_at', 'desc')
      .execute();

    return NextResponse.json({ data: data || [] });
  } catch (error) {
    // Table might not exist yet — handle gracefully
    const err = error as Error & { code?: string };
    if (err.code === '42P01') {
      return NextResponse.json({ data: [] });
    }
    console.error('[batch-analyze] GET error:', error);
    return NextResponse.json(
      { error: `Unexpected error: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}
