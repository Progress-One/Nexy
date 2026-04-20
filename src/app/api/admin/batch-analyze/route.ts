/**
 * API Route: Batch analyze storage images
 * Processes images in batches, saves analysis to image_analysis table
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/compat-types';
import { analyzeImage, ImageAnalysis } from '@/lib/image-analyzer';
import { requireAdmin } from '@/lib/admin-auth';

const DEFAULT_BATCH_SIZE = 5;

interface BatchResult {
  file_name: string;
  success: boolean;
  analysis?: ImageAnalysis;
  error?: string;
}

export async function POST(request: Request) {
  const authError = await requireAdmin();
  if (authError) return authError;

  try {
    const body = await request.json().catch(() => ({}));
    const batchSize = body.batchSize || DEFAULT_BATCH_SIZE;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: 'Missing Supabase configuration' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Get all storage files
    const { data: files, error: storageError } = await supabase.storage
      .from('scenes')
      .list('', { limit: 2000, sortBy: { column: 'created_at', order: 'desc' } });

    if (storageError) {
      return NextResponse.json(
        { error: `Storage error: ${storageError.message}` },
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
      const { data, error: dbError, count } = await supabase
        .from('image_analysis')
        .select('file_name', { count: 'exact' })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (dbError) {
        console.error('[batch-analyze] DB error:', dbError);
        break;
      }

      if (data && data.length > 0) {
        allAnalyzed = allAnalyzed.concat(data);
        page++;
        hasMore = data.length === pageSize; // Continue if we got a full page
      } else {
        hasMore = false;
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
      const url = supabase.storage.from('scenes').getPublicUrl(file.name).data.publicUrl;

      try {
        console.log(`[batch-analyze] Analyzing: ${file.name}`);
        const analysis = await analyzeImage(url);

        // Save to DB
        const { data: upsertData, error: upsertError } = await supabase
          .from('image_analysis')
          .upsert({
            file_name: file.name,
            file_url: url,
            analysis,
            updated_at: new Date().toISOString()
          }, { onConflict: 'file_name' })
          .select();

        if (upsertError) {
          console.error(`[batch-analyze] Upsert error for ${file.name}:`, upsertError);
          results.push({ file_name: file.name, success: false, error: upsertError.message });
        } else {
          console.log(`[batch-analyze] ✓ Saved: ${file.name}, keywords: ${analysis.keywords?.join(', ')}, upsert returned ${upsertData?.length} rows`);
          results.push({ file_name: file.name, success: true, analysis });
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
  const authError = await requireAdmin();
  if (authError) return authError;

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: 'Missing Supabase configuration' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase
      .from('image_analysis')
      .select('file_name, file_url, analysis, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      // Table might not exist yet
      if (error.code === '42P01') {
        return NextResponse.json({ data: [] });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: data || [] });
  } catch (error) {
    console.error('[batch-analyze] GET error:', error);
    return NextResponse.json(
      { error: `Unexpected error: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}
