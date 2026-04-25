import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { uploadToStorage, getStoragePublicUrl } from '@/lib/storage';
import { generateWithRetry } from '@/lib/civitai';
import { generateWithReplicate } from '@/lib/replicate';
import { buildPrompt, STYLE_VARIANTS } from '@/lib/civitai-config';
import { requireAdmin } from '@/lib/auth';
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
import type { Json } from '@/lib/db/schema';

type QAEvaluator = 'replicate' | 'claude';

const ATTEMPTS_PER_ROUND = 3;
const MAX_ROUNDS = 4;

// Helper: resolve paired_scene slug to ID
async function resolvePairedSceneId(pairedSlug: string | null | undefined): Promise<string | null> {
  if (!pairedSlug) return null;
  const row = await db
    .selectFrom('scenes')
    .select('id')
    .where('slug', '=', pairedSlug)
    .executeTakeFirst();
  return row?.id || null;
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

async function uploadImageToStorage(
  sceneId: string,
  imageUrl: string
): Promise<string> {
  const response = await fetch(imageUrl);
  const blob = await response.blob();
  const buffer = Buffer.from(await blob.arrayBuffer());

  // Use unique filename with timestamp to avoid overwriting previous images
  const fileName = `${sceneId}_${Date.now()}.webp`;

  await uploadToStorage('scenes', fileName, buffer, { contentType: 'image/webp' });
  const publicUrl = getStoragePublicUrl('scenes', fileName);
  return `${publicUrl}?t=${Date.now()}`;
}

async function generateWithQA(params: {
  originalPrompt: string;
  qaContext: SceneQAContext;
  stylePrefix?: string;
  styleVariant: string;
  customNegative?: string;
  promptInstructions?: string;
  service: string;
  modelId: string | number;
  width: number;
  height: number;
  aspectRatio: string;
  sourceImage?: string;
  strength?: number;
  qaEvaluator?: QAEvaluator;
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
    qaEvaluator = 'replicate',
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

      const promptForGeneration = stylePrefix ? `${stylePrefix}, ${currentPrompt}` : currentPrompt;
      const { prompt: fullPrompt, negativePrompt } = buildPrompt(
        promptForGeneration,
        styleVariant as keyof typeof STYLE_VARIANTS | 'default'
      );

      const finalNegative = customNegative
        ? `${negativePrompt}, ${customNegative}`
        : negativePrompt;

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

      try {
        console.log(`[QA] Calling ${qaEvaluator} evaluator...`);
        lastAssessment = await evaluate(lastImageUrl, qaContext);
        console.log('[QA] Evaluation returned:', !!lastAssessment);
        successfulEvaluations++;
        const approved = checkApproval(lastAssessment, qaContext);

        onProgress(`[QA] Essence: ${lastAssessment.essenceScore}/10, Approved: ${approved}`);

        if (approved) {
          onProgress(`[QA] PASSED on round ${round}, attempt ${attempt}`);
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

        if (attempt < ATTEMPTS_PER_ROUND && lastAssessment.regenerationHints) {
          currentPrompt = improvePromptFromHints(currentPrompt, lastAssessment.regenerationHints);
          onProgress(`[QA] Improved prompt: ${currentPrompt.substring(0, 50)}...`);
        }
      } catch (error) {
        const errMsg = (error as Error).message;
        onProgress(`[QA] Evaluation failed: ${errMsg}`);
        console.error('[QA] Full evaluation error:', error);
        evaluationErrors.push(`Attempt ${totalAttempts}: ${errMsg}`);

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
      }

      await new Promise(r => setTimeout(r, 500));
    }

    if (round < MAX_ROUNDS) {
      onProgress(`[QA] Round ${round} failed, rewriting prompt with AI...`);

      try {
        const rewritten = await rewritePromptWithAI(
          originalPrompt,
          qaContext.essence,
          failReasons.slice(-4),
          qaContext.participants,
          promptInstructions
        );

        currentPrompt = rewritten.newPrompt;
        onProgress(`[QA] New prompt: ${currentPrompt.substring(0, 80)}...`);
        onProgress(`[QA] Changes: ${rewritten.changes.join(', ')}`);
      } catch (error) {
        onProgress(`[QA] Prompt rewrite failed: ${(error as Error).message}`);
      }
    }
  }

  onProgress(`[QA] FAILED after ${totalAttempts} attempts across ${MAX_ROUNDS} rounds`);

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
  const denied = await requireAdmin();
  if (denied) return denied;

  const {
    sceneId,
    prompt,
    stylePrefix,
    styleVariant,
    negativePrompt: customNegative,
    promptInstructions,
    modelId,
    service = 'civitai',
    width = 1024,
    height = 682,
    aspectRatio = '3:2',
    enableQA = false,
    qaContext,
    qaEvaluator = 'replicate',
    sourceImage,
    strength = 0.7,
  } = await req.json();

  if (!prompt) {
    return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
  }

  try {
    // Simple generation without QA
    if (!enableQA || !qaContext) {
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
        const storageUrl = await uploadImageToStorage(sceneId, imageUrl);
        console.log('[Generate] Public URL:', storageUrl);

        // Check if scene exists and get linked scenes
        const existingScene = await db
          .selectFrom('scenes')
          .select(['id', 'slug', 'image_url', 'paired_scene', 'shared_images_with'])
          .where('id', '=', sceneId)
          .executeTakeFirst();

        console.log('[Generate] Scene lookup:', {
          sceneId,
          found: !!existingScene,
          slug: existingScene?.slug,
          currentImageUrl: existingScene?.image_url,
        });

        const updateData = await db
          .updateTable('scenes')
          .set({ image_url: storageUrl })
          .where('id', '=', sceneId)
          .returningAll()
          .execute();

        const debug = {
          sceneId,
          sceneFound: !!existingScene,
          sceneSlug: existingScene?.slug,
          storageUrl,
          updateError: null,
          rowsUpdated: updateData.length,
          updatedImageUrl: updateData[0]?.image_url || null,
        };

        console.log('[Generate] DB update success, rows:', updateData.length);
        if (updateData[0]) {
          console.log('[Generate] Updated image_url:', updateData[0].image_url);
        }

        // Sync image_url to paired and shared scenes
        const pairedId = await resolvePairedSceneId(existingScene?.paired_scene);
        const linkedIds = [
          pairedId,
          existingScene?.shared_images_with,
        ].filter(Boolean) as string[];

        if (linkedIds.length > 0) {
          console.log('[Generate] Syncing image_url to linked scenes:', linkedIds);
          await db
            .updateTable('scenes')
            .set({ image_url: storageUrl })
            .where('id', 'in', linkedIds)
            .execute();
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
      stylePrefix,
      styleVariant: styleVariant || 'default',
      customNegative,
      promptInstructions,
      service,
      modelId: service === 'civitai' ? (modelId || 4201) : (modelId || 'sdxl'),
      width,
      height,
      aspectRatio,
      sourceImage,
      strength,
      qaEvaluator: qaEvaluator as QAEvaluator,
      onProgress: console.log,
    });

    console.log('[Generate+QA] Result:', {
      qaStatus: result.qaStatus,
      totalAttempts: result.totalAttempts,
      essenceScore: result.lastAssessment?.essenceScore,
    });

    if (sceneId && result.imageUrl) {
      const storageUrl = await uploadImageToStorage(sceneId, result.imageUrl);

      console.log('[Generate+QA] Saving to DB:', {
        sceneId,
        storageUrl,
        qaStatus: result.qaStatus,
        hasAssessment: !!result.lastAssessment,
      });

      const existingScene = await db
        .selectFrom('scenes')
        .select(['id', 'slug', 'paired_scene', 'shared_images_with'])
        .where('id', '=', sceneId)
        .executeTakeFirst();

      if (!existingScene) {
        console.error('[Generate+QA] Scene not found:', sceneId);
      } else {
        console.log('[Generate+QA] Found scene:', existingScene.slug);
      }

      const updateData = await db
        .updateTable('scenes')
        .set({
          image_url: storageUrl,
          generation_prompt: result.finalPrompt,
          qa_status: result.qaStatus,
          qa_attempts: result.totalAttempts,
          qa_last_assessment: result.lastAssessment as unknown as Json,
        })
        .where('id', '=', sceneId)
        .returningAll()
        .execute();

      const debug = {
        sceneId,
        sceneFound: !!existingScene,
        sceneSlug: existingScene?.slug,
        storageUrl,
        updateError: null,
        rowsUpdated: updateData.length,
        updatedImageUrl: updateData[0]?.image_url || null,
        qaStatus: result.qaStatus,
        hasAssessment: !!result.lastAssessment,
        essenceScore: result.lastAssessment?.essenceScore,
        successfulGenerations: result.successfulGenerations,
        successfulEvaluations: result.successfulEvaluations,
        evaluationErrorsCount: result.evaluationErrors.length,
      };

      console.log('[Generate+QA] DB update success, rows affected:', updateData.length);

      // Sync image_url to paired and shared scenes
      const pairedId = await resolvePairedSceneId(existingScene?.paired_scene);
      const linkedIds = [
        pairedId,
        existingScene?.shared_images_with,
      ].filter(Boolean) as string[];

      if (linkedIds.length > 0) {
        console.log('[Generate+QA] Syncing image_url to linked scenes:', linkedIds);
        await db
          .updateTable('scenes')
          .set({ image_url: storageUrl })
          .where('id', 'in', linkedIds)
          .execute();
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
