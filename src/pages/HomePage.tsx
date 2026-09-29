import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Play,
  RotateCcw,
  Shuffle,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react';
import {
  ActiveQuizSession,
  ManifestData,
  QuizSessionConfig,
  TopicManifestEntry,
} from '../types/quiz';
import { DEFAULT_PLATFORM_CONFIG } from '../config/quizConfig';
import { StorageService } from '../services/storageService';
import { formatDuration } from '../utils/rangeUtils';

interface HomePageProps {
  manifest: ManifestData | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onSelectTopic: (topicId: string) => void;
  onStartQuiz: (config: QuizSessionConfig) => void;
  activeSession: ActiveQuizSession | null;
  onResumeSession: () => void;
  onDiscardSession: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  manifest,
  loading,
  error,
  onRetry,
  onSelectTopic,
  onStartQuiz,
  activeSession,
  onResumeSession,
  onDiscardSession,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showCustomBuilder, setShowCustomBuilder] = useState(false);
  const [customTopicId, setCustomTopicId] = useState<string>('all');
  const [customCount, setCustomCount] = useState<number>(25);
  const [customOrder, setCustomOrder] = useState<'original' | 'random'>('random');
  const [customTimerMinutes, setCustomTimerMinutes] = useState<number>(0);

  const categories = useMemo(() => {
    if (!manifest?.topics) return [];
    const seen = new Set<string>();
    for (const t of manifest.topics) {
      if (t.category) seen.add(t.category);
    }
    return Array.from(seen);
  }, [manifest]);

  const groupedTopics = useMemo(() => {
    if (!manifest?.topics) return new Map<string, TopicManifestEntry[]>();
    const map = new Map<string, TopicManifestEntry[]>();
    const filtered =
      selectedCategory === 'all'
        ? manifest.topics
        : manifest.topics.filter((t) => t.category === selectedCategory);

    for (const t of filtered) {
      const cat = t.category || 'Uncategorized';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(t);
    }
    return map;
  }, [manifest, selectedCategory]);

  const totalQuestionsAcrossPlatform = useMemo(() => {
    if (!manifest?.topics) return 0;
    return manifest.topics.reduce((acc, t) => acc + (t.questionCount || 0), 0);
  }, [manifest]);

  const handleStartQuickCustomQuiz = () => {
    const scoring = StorageService.getScoringConfig();
    const targetTopic = manifest?.topics.find((t) => t.id === customTopicId);
    const title = targetTopic
      ? `${targetTopic.name} — Custom Practice`
      : 'All Topics — Combined SSC PYQ Quiz';

    onStartQuiz({
      title,
      subtitle: `${customCount} Questions · ${customOrder === 'random' ? 'Randomized' : 'Original Order'}`,
      mode: customOrder === 'random' ? 'random' : 'custom',
      filters: {
        topicId: customTopicId,
        customCount,
        orderMode: customOrder,
        shuffleOptions: false,
      },
      timerMode: customTimerMinutes > 0 ? 'full_quiz' : 'none',
      totalTimeSeconds: customTimerMinutes * 60,
      perQuestionSeconds: DEFAULT_PLATFORM_CONFIG.quiz.defaultPerQuestionSeconds,
      scoring,
      instantFeedback: true,
      allowBackNavigation: true,
      allowAnswerChange: false,
    });
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 space-y-6">
        <div className="h-8 w-64 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
        <div className="text-sm text-slate-600 dark:text-slate-400">
          Loading topics from manifest.json...
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div
              key={n}
              className="h-40 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (error || !manifest) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
        <div className="rounded-xl border border-red-200 dark:border-red-900/60 bg-white dark:bg-slate-900 p-6 space-y-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Unable to load question manifest
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {error || 'Could not fetch public/data/manifest.json.'}
              </p>
            </div>
          </div>
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-lg transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            Retry Loading Manifest
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-10">
      {/* Resume Active Session Banner if present */}
      {activeSession && (
        <section
          aria-label="Resume unfinished quiz"
          className="rounded-xl border border-sky-300 dark:border-sky-800 bg-sky-50/70 dark:bg-sky-950/30 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div className="space-y-1">
            <p className="text-xs font-medium text-sky-800 dark:text-sky-300">
              Unfinished Quiz Session Saved
            </p>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              {activeSession.config.title}
            </h2>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-400 tabular-nums">
              <span>
                Question {activeSession.currentIndex + 1} of {activeSession.questions.length}
              </span>
              <span aria-hidden="true">·</span>
              <span>
                Answered:{' '}
                {
                  Object.values(activeSession.attempts).filter(
                    (a) => a.selectedOptionId !== null
                  ).length
                }
              </span>
              <span aria-hidden="true">·</span>
              <span>Elapsed: {formatDuration(activeSession.elapsedSeconds)}</span>
            </div>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={onResumeSession}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              <Play className="w-3.5 h-3.5" />
              Resume Quiz
            </button>
            <button
              onClick={onDiscardSession}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Discard
            </button>
          </div>
        </section>
      )}

      {/* Hero / Academic Header */}
      <section className="border-b border-slate-200 dark:border-slate-800 pb-8 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div className="space-y-3 max-w-2xl">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            SSC CGL · CHSL · MTS · CPO · GD · Selection Post · Stenographer
          </p>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Previous Year Question Bank & Practice Engine
          </h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
            Select any chapter below to practice by 100-question sets, filter by SSC exam, year, and shift, or launch a custom timed mock test with configurable negative marking.
          </p>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums pt-1">
            <span>{manifest.topics.length} Topics Available</span>
            <span aria-hidden="true">·</span>
            <span>{totalQuestionsAcrossPlatform.toLocaleString()} Total Questions</span>
            <span aria-hidden="true">·</span>
            <span>Manifest v{manifest.version}</span>
            <span aria-hidden="true">·</span>
            <span>Updated {manifest.lastUpdated}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            onClick={() => onSelectTopic('algebra')}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
          >
            <span>Open Algebra PDF (548 Qs)</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowCustomBuilder((v) => !v)}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>Custom / Random Quiz</span>
          </button>
        </div>
      </section>

      {/* Quick Custom / Random Quiz Drawer */}
      {showCustomBuilder && (
        <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Quick Custom / Random Quiz Builder
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Sample questions randomly or sequentially without modifying the original dataset order.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Topic Dataset
              </label>
              <select
                value={customTopicId}
                onChange={(e) => setCustomTopicId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
              >
                <option value="all">All Topics ({totalQuestionsAcrossPlatform} Qs)</option>
                {manifest.topics.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.questionCount} Qs)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Number of Questions
              </label>
              <input
                type="number"
                min={1}
                max={548}
                value={customCount}
                onChange={(e) => setCustomCount(Math.max(1, Number(e.target.value) || 10))}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm font-mono tabular-nums text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Question Order
              </label>
              <select
                value={customOrder}
                onChange={(e) => setCustomOrder(e.target.value as 'original' | 'random')}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
              >
                <option value="random">Random Order</option>
                <option value="original">Original Stored Order</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Full Quiz Timer (Minutes, 0 = Off)
              </label>
              <input
                type="number"
                min={0}
                max={180}
                value={customTimerMinutes}
                onChange={(e) => setCustomTimerMinutes(Math.max(0, Number(e.target.value) || 0))}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm font-mono tabular-nums text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleStartQuickCustomQuiz}
              className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg transition-colors cursor-pointer"
            >
              <Shuffle className="w-4 h-4" />
              Start Custom Quiz
            </button>
          </div>
        </section>
      )}

      {/* Interactive Category Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div
          role="tablist"
          aria-label="Filter topics by SSC category"
          className="flex flex-wrap items-center gap-1 p-1 bg-slate-200/70 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800"
        >
          <button
            role="tab"
            aria-selected={selectedCategory === 'all'}
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            All Categories ({manifest.topics.length})
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              role="tab"
              aria-selected={selectedCategory === cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Dynamic Category Sections */}
      <div className="space-y-10">
        {Array.from(groupedTopics.entries()).map(([categoryName, topics]) => {
          const categoryQuestionTotal = topics.reduce(
            (sum, item) => sum + (item.questionCount || 0),
            0
          );

          return (
            <section key={categoryName} className="space-y-4">
              <div className="flex items-baseline justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                <h2 className="text-lg font-display font-semibold text-slate-900 dark:text-slate-100">
                  {categoryName}
                </h2>
                <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                  {topics.length} {topics.length === 1 ? 'Topic' : 'Topics'} ·{' '}
                  {categoryQuestionTotal.toLocaleString()} Questions
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {topics.map((topic) => {
                  const rangeCount = Math.ceil((topic.questionCount || 0) / 100);
                  return (
                    <div
                      key={topic.id}
                      onClick={() => onSelectTopic(topic.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onSelectTopic(topic.id);
                        }
                      }}
                      className="group rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 hover:border-sky-500 dark:hover:border-sky-500 transition-colors flex flex-col justify-between gap-4 cursor-pointer text-left focus-visible:outline-2 focus-visible:outline-sky-600"
                    >
                      <div className="space-y-2">
                        {/* Unboxed quiet metadata line */}
                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                          <span>{topic.questionCount} Questions</span>
                          <span aria-hidden="true">·</span>
                          <span>
                            {rangeCount} {rangeCount === 1 ? 'Set' : 'Sets'}
                          </span>
                          {topic.isSample ? (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="text-amber-600 dark:text-amber-400">Sample Data</span>
                            </>
                          ) : (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="text-emerald-600 dark:text-emerald-400">
                                PDF Verified
                              </span>
                            </>
                          )}
                        </div>

                        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                          {topic.name}
                        </h3>

                        {topic.description && (
                          <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                            {topic.description}
                          </p>
                        )}
                      </div>

                      <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                        <span className="text-slate-500 dark:text-slate-400 truncate max-w-[200px]">
                          Source: {topic.sourcePdf || topic.file}
                        </span>
                        <span className="font-semibold text-sky-600 dark:text-sky-400 inline-flex items-center gap-1 whitespace-nowrap">
                          Configure Quiz
                          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
};
