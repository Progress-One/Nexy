import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { generateWithRetry } from '@/lib/civitai';
import { generateWithReplicate } from '@/lib/replicate';
import { buildPrompt, STYLE_VARIANTS } from '@/lib/civitai-config';
import {
  evaluateImage,
  shouldApprove,
  SceneQAContext,
  QualityAssessment,
} from '@/lib/qa-evaluator';
import {
  evaluateImageWithReplicate,
  shouldApproveReplicate,
} from '@/lib/replicate-qa-evaluator';
import {
  improvePromptFromHints,
  rewritePromptWithAI,
  cleanAccumulatedEmphasis,
} from '@/lib/prompt-rewriter';
import { requireAdmin } from '@/lib/admin-auth';

type QAEvaluator = 'replicate' | 'claude';

const ATTEMPTS_PER_ROUND = 3;
const MAX_ROUNDS = 4;

// Helper: resolve paired_scene slug to ID
async function resolvePairedSceneId(supabase: any, pairedSlug: string | null): Promise<string | null> {
  if (!pairedSlug) return null;
  const { data } = await supabase
    .from('scenes')
    .select('id')
    .eq('slug', pairedSlug)
    .single();
  return data?.id || null;
}

interface GenerationResult {
  imageUrl: string;
  qaStatus: 'passed' | 'failed' | null;
  originalPrompt: string;
  finalPrompt: string;
  totalAttempts: number;
  lastAssessment: QualityAssessment | null;
  evaluationErrors: string[];
  successfulGenerations: number;
  successfulEvaluations: number;
}

async function generateImage(params: {
  prompt: string;
  negativePrompt: string;
  service: string;
  modelId: string | number;
  width: number;
  height: number;
  aspectRatio: string;
  // Img2img parameters
  sourceImage?: string;
  strength?: number;
}): Promise<string> {
  if (params.service === 'replicate') {
    return generateWithReplicate({
      prompt: params.prompt,
      negativePrompt: params.negativePrompt,
      modelId: String(params.modelId),
      width: params.width,
      height: params.height,
      aspectRatio: params.aspectRatio,
      sourceImage: params.sourceImage,
      strength: params.strength,
    });
  }
  // CivitAI SDK does not support img2img
  if (params.sourceImage) {
    throw new Error('img2img is only supported with Replicate service');
  }
  return generateWithRetry({
    prompt: params.prompt,
    negativePrompt: params.negativePrompt,
    modelId: Number(params.modelId) || 4201,
    width: params.width,
    height: params.height,
  });
}

async function uploadToStorage(
  supabase: Awaited<ReturnType<typeof createServiceClient>>,
  sceneId: string,
  imageUrl: string
): Promise<string> {
  const response = await fetch(imageUrl);
  const blob = await response.blob();
  const buffer = await blob.arrayBuffer();

  // Use unique filename with timestamp to avoid overwriting previous images
  const fileName = `${sceneId}_${Date.now()}.webp`;

  const { error: uploadError } = await supabase.storage
    .from('scenes')
    .upload(fileName, buffer, {
      contentType: 'image/webp',
      cacheControl: '0',
      upsert: false, // Don't overwrite - each generation is unique
    });

  if (uploadError) {
    throw uploadError;
  }

  const { data: { publicUrl } } = supabase.storage
    .from('scenes')
    .getPublicUrl(fileName);

  return `${publicUrl}?t=${Date.now()}`;
}

async function generateWithQA(params: {
  originalPrompt: string;
  qaContext: SceneQAContext;
  stylePrefix?: string; // Added only at generation, not saved to DB
  styleVariant: string;
  customNegative?: string;
  promptInstructions?: string; // User instructions for AI prompt rewriting
  service: string;
  modelId: string | number;
  width: number;
  height: number;
  aspectRatio: string;
  // Img2img parameters
  sourceImage?: string;
  strength?: number;
  qaEvaluator?: QAEvaluator; // 'replicate' (default, NSFW-safe) or 'claude'
  onProgress?: (message: string) => void;
}): Promise<GenerationResult> {
  const {
    originalPrompt,
    qaContext,
    stylePrefix,
    styleVariant,
    customNegative,
    promptInstructions,
    service,
    modelId,
    width,
    height,
    aspectRatio,
    sourceImage,
    strength,
    qaEvaluator = 'replicate', // Default to Replicate for NSFW support
    onProgress = console.log,
  } = params;

  // Choose evaluator functions
  const evaluate = qaEvaluator === 'claude' ? evaluateImage : evaluateImageWithReplicate;
  const checkApproval = qaEvaluator === 'claude' ? shouldApprove : shouldApproveReplicate;
  onProgress(`[QA] Using ${qaEvaluator} evaluator`);

  let currentPrompt = originalPrompt;
  let lastImageUrl = '';
  let lastAssessment: QualityAssessment | null = null;
  let totalAttempts = 0;
  const failReasons: string[] = [];
  const evaluationErrors: string[] = [];
  let successfulGenerations = 0;
  let successfulEvaluations = 0;

  for (let round = 1; round <= MAX_ROUNDS; round++) {
    onProgress(`[QA] Round ${round}/${MAX_ROUNDS}, prompt: ${currentPrompt.substring(0, 50)}...`);

    for (let attempt = 1; attempt <= ATTEMPTS_PER_ROUND; attempt++) {
      totalAttempts++;
      onProgress(`[QA] Round ${round}, Attempt ${attempt}/${ATTEMPTS_PER_ROUND}`);

      // Build full prompt with styles (stylePrefix added only for generation, not saved)
      const promptForGeneration = stylePrefix ? `${stylePrefix}, ${currentPrompt}` : currentPrompt;
      const { prompt: fullPrompt, negativePrompt } = buildPrompt(
        promptForGeneration,
        styleVariant as keyof typeof STYLE_VARIANTS | 'default'
      );

      const finalNegative = customNegative
        ? `${negativePrompt}, ${customNegative}`
        : negativePrompt;

      // Generate image
      try {
        onProgress(`[QA] Generating image with ${service}${sourceImage ? ' (img2img)' : ''}...`);
        lastImageUrl = await generateImage({
          prompt: fullPrompt,
          negativePrompt: finalNegative,
          service,
          modelId,
          width,
          height,
          aspectRatio,
          sourceImage,
          strength,
        });
        onProgress(`[QA] Generated image URL: ${lastImageUrl?.substring(0, 80)}...`);
        successfulGenerations++;
      } catch (error) {
        onProgress(`[QA] Generation failed: ${(error as Error).message}`);
        console.error('[QA] Generation error:', error);
        continue;
      }

      if (!lastImageUrl) {
        onProgress(`[QA] No image URL returned, skipping...`);
        continue;
      }

      onProgress(`[QA] Generated image, evaluating with ${qaEvaluator}...`);
      console.log('[QA] qaContext:', JSON.stringify(qaContext, null, 2));

      // Evaluate image with chosen evaluator
      try {
        console.log(`[QA] Calling ${qaEvaluator} evaluator...`);
        lastAssessment = await evaluate(lastImageUrl, qaContext);
        console.log('[QA] Evaluation returned:', !!lastAssessment);
        successfulEvaluations++;
        const approved = checkApproval(lastAssessment, qaContext);

        onProgress(`[QA] Essence: ${lastAssessment.essenceScore}/10, Approved: ${approved}`);

        if (approved) {
          onProgress(`[QA] PASSED on round ${round}, attempt ${attempt}`);
          // Clean the prompt from QA iteration artifacts before saving
          const cleanedPrompt = cleanAccumulatedEmphasis(currentPrompt);
          return {
            imageUrl: lastImageUrl,
            qaStatus: 'passed',
            originalPrompt,
            finalPrompt: cleanedPrompt,
            totalAttempts,
            lastAssessment,
            evaluationErrors,
            successfulGenerations,
            successfulEvaluations,
          };
        }

        if (lastAssessment.failReason) {
          failReasons.push(lastAssessment.failReason);
          onProgress(`[QA] Fail reason: ${lastAssessment.failReason}`);
        }

        // Improve prompt for next attempt within same round
        if (attempt < ATTEMPTS_PER_ROUND && lastAssessment.regenerationHints) {
          currentPrompt = improvePromptFromHints(currentPrompt, lastAssessment.regenerationHints);
          onProgress(`[QA] Improved prompt: ${currentPrompt.substring(0, 50)}...`);
        }
      } catch (error) {
        const errMsg = (error as Error).message;
        onProgress(`[QA] Evaluation failed: ${errMsg}`);
        console.error('[QA] Full evaluation error:', error);
        evaluationErrors.push(`Attempt ${totalAttempts}: ${errMsg}`);

        // Create fallback assessment so we have data to show
        // Only if we don't have any assessment yet
        if (!lastAssessment) {
          lastAssessment = {
            essenceCaptured: false,
            essenceScore: 0,
            essenceComment: `Evaluation failed: ${errMsg}`,
            keyElementsCheck: [],
            participantsCorrect: false,
            technicalQuality: {
              score: 0,
              fatalFlaws: [`Evaluation error: ${errMsg}`],
              minorIssues: [],
            },
            moodMatch: false,
            APPROVED: false,
            failReason: `QA evaluation failed: ${errMsg}`,
            regenerationHints: {
              emphasize: '',
              add: [],
              remove: [],
            },
          };
        }
        // Continue to next attempt
      }

      // Small delay between attempts
      await new Promise(r => setTimeout(r, 500));
    }

    // After failing all attempts in a round, rewrite prompt completely
    if (round < MAX_ROUNDS) {
      onProgress(`[QA] Round ${round} failed, rewriting prompt with AI...`);

      try {
        const rewritten = await rewritePromptWithAI(
          originalPrompt,
          qaContext.essence,
          failReasons.slice(-4), // Last 4 fail reasons
          qaContext.participants, // Pass participants for gender info
          promptInstructions // User instructions for prompt changes
        );

        currentPrompt = rewritten.newPrompt;
        onProgress(`[QA] New prompt: ${currentPrompt.substring(0, 80)}...`);
        onProgress(`[QA] Changes: ${rewritten.changes.join(', ')}`);
      } catch (error) {
        onProgress(`[QA] Prompt rewrite failed: ${(error as Error).message}`);
        // Continue with improved prompt from hints
      }
    }
  }

  // All rounds failed
  onProgress(`[QA] FAILED after ${totalAttempts} attempts across ${MAX_ROUNDS} rounds`);

  // Clean the prompt from QA iteration artifacts before saving
  const cleanedPrompt = cleanAccumulatedEmphasis(currentPrompt);

  return {
    imageUrl: lastImageUrl,
    qaStatus: 'failed',
    originalPrompt,
    finalPrompt: cleanedPrompt,
    totalAttempts,
    lastAssessment,
    evaluationErrors,
    successfulGenerations,
    successfulEvaluations,
  };
}

export async function POST(req: Request) {
  const authError = await requireAdmin();
  if (authError) return authError;

  const supabase = await createServiceClient();

  const {
    sceneId,
    prompt,
    stylePrefix, // Additional style prefix (added only at generation time, not saved)
    styleVariant,
    negativePrompt: customNegative,
    promptInstructions, // User instructions for AI prompt rewriting
    modelId,
    service = 'civitai',
    width = 1024,
    height = 682,
    aspectRatio = '3:2',
    enableQA = false,
    qaContext,
    qaEvaluator = 'replicate', // 'replicate' (default, NSFW-safe) or 'claude'
    // Img2img parameters
    sourceImage, // URL of source image for img2img
    strength = 0.7, // 0-1, how much to deviate from source
  } = await req.json();

  if (!prompt) {
    return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
  }

  try {
    // Simple generation without QA
    if (!enableQA || !qaContext) {
      // Add stylePrefix only at generation time
      const promptWithPrefix = stylePrefix ? `${stylePrefix}, ${prompt}` : prompt;
      const { prompt: fullPrompt, negativePrompt } = buildPrompt(
        promptWithPrefix,
        styleVariant as keyof typeof STYLE_VARIANTS | 'default'
      );

      const finalNegative = customNegative
        ? `${negativePrompt}, ${customNegative}`
        : negativePrompt;

      console.log('[Generate] Starting generation for scene:', sceneId);
      console.log('[Generate] Service:', service);
      console.log('[Generate] Model:', modelId);
      console.log('[Generate] Resolution:', `${width}x${height} (${aspectRatio})`);
      console.log('[Generate] Mode:', sourceImage ? `img2img (strength: ${strength})` : 'txt2img');
      console.log('[Generate] Prompt:', fullPrompt.substring(0, 100) + '...');

      let imageUrl: string;

      if (service === 'replicate') {
        imageUrl = await generateWithReplicate({
          prompt: fullPrompt,
          negativePrompt: finalNegative,
          modelId: modelId || 'sdxl',
          width,
          height,
          aspectRatio,
          sourceImage,
          strength,
        });
      } else {
        // CivitAI SDK does not support img2img
        if (sourceImage) {
          return NextResponse.json(
            { error: 'img2img is only supported with Replicate service' },
            { status: 400 }
          );
        }
        imageUrl = await generateWithRetry({
          prompt: fullPrompt,
          negativePrompt: finalNegative,
          modelId: modelId || 4201,
          width,
          height,
        });
      }

      console.log('[Generate] Image URL:', imageUrl);

      if (sceneId) {
        console.log('[Generate] Downloading image...');
        const storageUrl = await uploadToStorage(supabase, sceneId, imageUrl);
        console.log('[Generate] Public URL:', storageUrl);

        // Check if scene exists and get linked scenes
        const { data: existingScene, error: selectError } = await supabase
          .from('scenes')
          .select('id, slug, image_url, paired_scene, shared_images_with')
          .eq('id', sceneId)
          .single();

        console.log('[Generate] Scene lookup:', {
          sceneId,
          found: !!existingScene,
          slug: existingScene?.slug,
          currentImageUrl: existingScene?.image_url,
          selectError: selectError?.message
        });

        const { data: updateData, error: updateError } = await supabase
          .from('scenes')
          .update({ image_url: storageUrl })
          .eq('id', sceneId)
          .select();

        const debug = {
          sceneId,
          sceneFound: !!existingScene,
          sceneSlug: existingScene?.slug,
          storageUrl,
          updateError: updateError?.message || null,
          rowsUpdated: updateData?.length || 0,
          updatedImageUrl: updateData?.[0]?.image_url || null,
        };

        if (updateError) {
          console.error('[Generate] DB update error:', updateError);
        } else {
          console.log('[Generate] DB update success, rows:', updateData?.length || 0);
          if (updateData && updateData[0]) {
            console.log('[Generate] Updated image_url:', updateData[0].image_url);
          }

          // Sync image_url to paired and shared scenes
          const pairedId = await resolvePairedSceneId(supabase, existingScene?.paired_scene);
          const linkedIds = [
            pairedId,
            existingScene?.shared_images_with,
          ].filter(Boolean) as string[];

          if (linkedIds.length > 0) {
            console.log('[Generate] Syncing image_url to linked scenes:', linkedIds);
            await supabase
              .from('scenes')
              .update({ image_url: storageUrl })
              .in('id', linkedIds);
          }
        }

        console.log('[Generate] Done!');
        return NextResponse.json({ success: true, imageUrl: storageUrl, debug });
      }

      return NextResponse.json({ success: true, imageUrl });
    }

    // Generation with QA
    console.log('[Generate+QA] Starting QA generation for scene:', sceneId);
    console.log('[Generate+QA] Service:', service);
    console.log('[Generate+QA] QA Evaluator:', qaEvaluator);
    console.log('[Generate+QA] Essence:', qaContext.essence);

    const result = await generateWithQA({
      originalPrompt: prompt,
      qaContext: qaContext as SceneQAContext,
      stylePrefix, // Added only at generation, not saved to DB
      styleVariant: styleVariant || 'default',
      customNegative,
      promptInstructions, // User instructions for AI prompt rewriting
      service,
      modelId: service === 'civitai' ? (modelId || 4201) : (modelId || 'sdxl'),
      width,
      height,
      aspectRatio,
      sourceImage,
      strength,
      qaEvaluator: qaEvaluator as QAEvaluator, // 'replicate' or 'claude'
      onProgress: console.log,
    });

    console.log('[Generate+QA] Result:', {
      qaStatus: result.qaStatus,
      totalAttempts: result.totalAttempts,
      essenceScore: result.lastAssessment?.essenceScore,
    });

    if (sceneId && result.imageUrl) {
      // Upload final image to storage
      const storageUrl = await uploadToStorage(supabase, sceneId, result.imageUrl);

      console.log('[Generate+QA] Saving to DB:', {
        sceneId,
        storageUrl,
        qaStatus: result.qaStatus,
        hasAssessment: !!result.lastAssessment,
      });

      // First check if scene exists and get linked scenes
      const { data: existingScene, error: selectError } = await supabase
        .from('scenes')
        .select('id, slug, paired_scene, shared_images_with')
        .eq('id', sceneId)
        .single();

      if (selectError || !existingScene) {
        console.error('[Generate+QA] Scene not found:', sceneId, selectError);
      } else {
        console.log('[Generate+QA] Found scene:', existingScene.slug);
      }

      // Update scene in database
      // Also update generation_prompt to finalPrompt so user sees the improved version
      const { data: updateData, error: updateError } = await supabase
        .from('scenes')
        .update({
          image_url: storageUrl,
          generation_prompt: result.finalPrompt, // Update to show improved prompt in UI
          qa_status: result.qaStatus,
          qa_attempts: result.totalAttempts,
          qa_last_assessment: result.lastAssessment,
        })
        .eq('id', sceneId)
        .select();

      const debug = {
        sceneId,
        sceneFound: !!existingScene,
        sceneSlug: existingScene?.slug,
        storageUrl,
        updateError: updateError?.message || null,
        rowsUpdated: updateData?.length || 0,
        updatedImageUrl: updateData?.[0]?.image_url || null,
        qaStatus: result.qaStatus,
        hasAssessment: !!result.lastAssessment,
        essenceScore: result.lastAssessment?.essenceScore,
        successfulGenerations: result.successfulGenerations,
        successfulEvaluations: result.successfulEvaluations,
        evaluationErrorsCount: result.evaluationErrors.length,
      };

      if (updateError) {
        console.error('[Generate+QA] DB update error:', updateError);
      } else {
        console.log('[Generate+QA] DB update success, rows affected:', updateData?.length || 0);

        // Sync image_url to paired and shared scenes
        const pairedId = await resolvePairedSceneId(supabase, existingScene?.paired_scene);
        const linkedIds = [
          pairedId,
          existingScene?.shared_images_with,
        ].filter(Boolean) as string[];

        if (linkedIds.length > 0) {
          console.log('[Generate+QA] Syncing image_url to linked scenes:', linkedIds);
          await supabase
            .from('scenes')
            .update({ image_url: storageUrl })
            .in('id', linkedIds);
        }
      }

      console.log('[Generate+QA] Done!');
      console.log('[Generate+QA] Assessment:', JSON.stringify(result.lastAssessment, null, 2));

      return NextResponse.json({
        success: true,
        imageUrl: storageUrl,
        qaStatus: result.qaStatus,
        totalAttempts: result.totalAttempts,
        originalPrompt: result.originalPrompt,
        finalPrompt: result.finalPrompt,
        assessment: result.lastAssessment,
        evaluationErrors: result.evaluationErrors,
        debug,
      });
    }

    return NextResponse.json({
      success: true,
      imageUrl: result.imageUrl,
      qaStatus: result.qaStatus,
      totalAttempts: result.totalAttempts,
    });
  } catch (error) {
    const err = error as Error & { response?: { data?: unknown; status?: number } };
    console.error('Generate scene error:', {
      message: err.message,
      stack: err.stack,
      response: err.response,
    });
    return NextResponse.json(
      {
        error: err.message,
        details: err.response?.data || null,
      },
      { status: 500 }
    );
  }
}
