'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { SwipeableSceneCard } from '@/components/discovery/SwipeableSceneCard';
import { BodyMapAnswer } from '@/components/discovery/BodyMapAnswer';
import { SceneRendererV3 } from '@/components/discovery/SceneRendererV3';
import { OnboardingIntroScreen } from '@/components/discovery/OnboardingIntroScreen';
import { OnboardingResultsScreen } from '@/components/discovery/OnboardingResultsScreen';
import { InsightsReveal } from '@/components/discovery/InsightsReveal';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw } from 'lucide-react';
import { t } from '@/lib/locale';
import { useDiscovery } from '@/hooks/useDiscovery';
import { useInsightsReveal } from '@/hooks/useInsightsReveal';

export default function DiscoverPage() {
  const {
    stage,
    loading,
    submitting,
    locale,
    currentScene,
    currentSceneExtended,
    isBodyMapScene,
    isSpecialSceneType,
    onboardingScenes,
    currentOnboardingIndex,
    onboardingResults,
    startOnboarding,
    finishOnboarding,
    handleOnboardingResponse,
    bodyMapActivities,
    currentBodyMapIndex,
    bodyMapConfig,
    bodyMapMainQuestion,
    bodyGenderForMap,
    skipBodyMap,
    handleBodyMapSubmit,
    scenes,
    answeredCount,
    handleSwipeResponse,
    handleV3Response,
    experience,
    setExperience,
    refreshScenes,
    isProposedScene,
    userGender,
    partnerGender,
    moveToNextScene,
  } = useDiscovery();

  // Aha-moment: показываем reveal один раз после 15 ответов
  const { shouldShow: showInsights, insights, acknowledge: ackInsights } =
    useInsightsReveal(answeredCount, locale);

  // ─── Loading ────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // ─── Aha-moment reveal (один раз после 15 ответов) ──

  if (showInsights && insights) {
    return (
      <InsightsReveal
        topTags={insights.topTags}
        archetype={insights.archetype ?? undefined}
        roleBalance={insights.roleBalance ?? undefined}
        onContinue={ackInsights}
        locale={locale}
      />
    );
  }

  // ─── Empty states ───────────────────────────────────

  if (stage === 'scenes' && scenes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 text-center">
        <p className="text-muted-foreground mb-4">{t('allScenesAnswered', locale)}</p>
        <Button onClick={refreshScenes} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          {t('checkForNew', locale)}
        </Button>
      </div>
    );
  }

  if (stage === 'body_map' && bodyMapActivities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 text-center">
        <p className="text-muted-foreground mb-4">
          {locale === 'ru' ? 'Body Map не найден' : 'Body Map not found'}
        </p>
        <Button onClick={skipBodyMap} variant="outline">
          {locale === 'ru' ? 'Перейти к сценам' : 'Go to scenes'}
        </Button>
      </div>
    );
  }

  if (stage === 'onboarding' && onboardingScenes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 text-center">
        <p className="text-muted-foreground mb-4">
          {locale === 'ru' ? 'Загрузка...' : 'Loading...'}
        </p>
        <Button onClick={finishOnboarding} variant="outline">
          {locale === 'ru' ? 'Продолжить' : 'Continue'}
        </Button>
      </div>
    );
  }

  // ─── Onboarding intro ──────────────────────────────

  if (stage === 'onboarding_intro') {
    return (
      <OnboardingIntroScreen
        locale={locale}
        sceneCount={onboardingScenes.length}
        onStart={startOnboarding}
      />
    );
  }

  // ─── Onboarding results ────────────────────────────

  if (stage === 'onboarding_results') {
    return (
      <OnboardingResultsScreen
        locale={locale}
        results={onboardingResults}
        loading={loading}
        onContinue={finishOnboarding}
      />
    );
  }

  // ─── Main flow (onboarding swipes / body map / scenes) ─

  return (
    <div className="p-4 space-y-4">
      {/* Progress indicator */}
      <div className="text-center text-sm text-muted-foreground">
        {stage === 'onboarding' ? (
          <span>
            {locale === 'ru'
              ? `Знакомство: ${currentOnboardingIndex + 1} из ${onboardingScenes.length}`
              : `Getting to know you: ${currentOnboardingIndex + 1} of ${onboardingScenes.length}`}
          </span>
        ) : stage === 'body_map' ? (
          <span>
            {locale === 'ru'
              ? `Body Map: ${currentBodyMapIndex + 1} из ${bodyMapActivities.length}`
              : `Body Map: ${currentBodyMapIndex + 1} of ${bodyMapActivities.length}`}
          </span>
        ) : (
          <span>{t('questionsAnswered', locale, { count: answeredCount })}</span>
        )}
      </div>

      {/* Skip Body Map button */}
      {stage === 'body_map' && (
        <div className="flex justify-end">
          <Button onClick={skipBodyMap} variant="ghost" size="sm" className="text-muted-foreground">
            {locale === 'ru' ? 'Пропустить Body Map' : 'Skip Body Map'}
          </Button>
        </div>
      )}

      {/* Main content */}
      <AnimatePresence mode="wait">
        {/* Onboarding scenes */}
        {stage === 'onboarding' && onboardingScenes[currentOnboardingIndex] && (
          <motion.div
            key={`onboarding-${onboardingScenes[currentOnboardingIndex].id}`}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
          >
            <SwipeableSceneCard
              scene={onboardingScenes[currentOnboardingIndex]}
              locale={locale}
              onResponse={handleOnboardingResponse}
              showExperienceSelector={false}
              loading={submitting}
            />
          </motion.div>
        )}

        {/* Regular scenes (body_map, scenes stages) */}
        {stage !== 'onboarding' && currentScene && (
          <motion.div
            key={currentScene.id}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
          >
            {/* Body Map */}
            {isBodyMapScene && bodyMapConfig && (
              <BodyMapAnswer
                key={`body-map-${currentScene.id}`}
                mainQuestion={bodyMapMainQuestion}
                config={bodyMapConfig}
                partnerGender={bodyGenderForMap}
                userGender={bodyGenderForMap}
                onSubmit={handleBodyMapSubmit}
                loading={submitting}
                locale={locale}
                zoneFirstMode={true}
              />
            )}

            {/* Proposal badge */}
            {!isBodyMapScene && currentScene && isProposedScene(currentScene.id) && (
              <div className="flex justify-center mb-2">
                <span className="text-xs bg-purple-500/20 text-purple-300 px-3 py-1 rounded-full">
                  {t('partnerSuggested', locale)}
                </span>
              </div>
            )}

            {/* V3 Special Scene Types */}
            {!isBodyMapScene && isSpecialSceneType && currentSceneExtended && (
              <SceneRendererV3
                scene={currentSceneExtended}
                locale={locale}
                userGender={userGender}
                partnerGender={partnerGender}
                loading={submitting}
                onSubmit={handleV3Response}
              />
            )}

            {/* Regular Swipe Scene */}
            {!isBodyMapScene && !isSpecialSceneType && (
              <SwipeableSceneCard
                scene={currentScene}
                locale={locale}
                onResponse={handleSwipeResponse}
                experience={experience}
                onExperienceChange={setExperience}
                loading={submitting}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Skip onboarding button */}
      {stage === 'onboarding' && (
        <div className="flex justify-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={finishOnboarding}
            disabled={submitting}
            className="text-muted-foreground"
          >
            {locale === 'ru' ? 'Пропустить' : 'Skip'}
          </Button>
        </div>
      )}

      {/* Skip button (only for body map) */}
      {stage === 'body_map' && (
        <div className="flex justify-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={moveToNextScene}
            disabled={submitting}
          >
            {t('skip', locale)}
          </Button>
        </div>
      )}

    </div>
  );
}
