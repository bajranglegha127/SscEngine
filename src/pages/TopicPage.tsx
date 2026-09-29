import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  FilterX,
  Play,
  RotateCcw,
  Shuffle,
} from 'lucide-react';
import {
  OrderMode,
  Question,
  QuizMode,
  QuizSessionConfig,
  ScoringConfig,
  TimerMode,
} from '../types/quiz';
import {
  QuestionRepository,
  TopicMetadataSummary,
} from '../services/questionRepository';
import { generateQuestionRanges } from '../utils/rangeUtils';
import { DEFAULT_PLATFORM_CONFIG } from '../config/quizConfig';
import { StorageService } from '../services/storageService';

interface TopicPageProps {
  topicId: string;
  onBack: () => void;
  onStartQuiz: (config: QuizSessionConfig) => void;
}

export const TopicPage: React.FC<TopicPageProps> = ({
  topicId,
  onBack,
  onStartQuiz,
}) => {
  const [summary, setSummary] = useState<TopicMetadataSummary | null>(null);
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [selectedExam, setSelectedExam] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<number>(0);
  const [selectedShift, setSelectedShift] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [rangeStart, setRangeStart] = useState<number | undefined>(undefined);
  const [rangeEnd, setRangeEnd] = useState<number | undefined>(undefined);
  const [customCount, setCustomCount] = useState<number>(0);

  // Quiz experience settings
  const [orderMode, setOrderMode] = useState<OrderMode>('original');
  const [shuffleOptions, setShuffleOptions] = useState<boolean>(false);
  const [timerMode, setTimerMode] = useState<TimerMode>('none');
  const [fullTimerMinutes, setFullTimerMinutes] = useState<number>(
    DEFAULT_PLATFORM_CONFIG.quiz.defaultTimerMinutes
  );
  const [perQuestionSeconds, setPerQuestionSeconds] = useState<number>(
    DEFAULT_PLATFORM_CONFIG.quiz.defaultPerQuestionSeconds
  );
  const [instantFeedback, setInstantFeedback] = useState<boolean>(true);
  const [allowAnswerChange, setAllowAnswerChange] = useState<boolean>(false);
  const [includeNeedsReview, setIncludeNeedsReview] = useState<boolean>(false);
  const [scoring, setScoring] = useState<ScoringConfig>(() =>
    StorageService.getScoringConfig()
  );

  const loadTopicData = async (force = false) => {
    setLoading(true);
    setError(null);
    try {
      const [meta, questions] = await Promise.all([
        QuestionRepository.getTopicMetadataSummary(topicId),
        QuestionRepository.getTopicQuestions(topicId, force),
      ]);
      setSummary(meta);
      setAllQuestions(questions);
    } catch (err: any) {
      setError(err?.message || 'Unable to load this question set.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTopicData();
  }, [topicId]);

  // Dynamically generate 1-100, 101-200, ... ranges from total questions in topic
  const ranges = useMemo(
    () => generateQuestionRanges(allQuestions.length, 100),
    [allQuestions.length]
  );

  // Dynamically derive available years and shifts based on selected exam/year
  const availableYearsForSelection = useMemo(() => {
    const years = new Set<number>();
    for (const q of allQuestions) {
      if (selectedExam !== 'all' && q.exam?.name !== selectedExam) continue;
      if (typeof q.exam?.year === 'number') years.add(q.exam.year);
    }
    return Array.from(years).sort((a, b) => b - a);
  }, [allQuestions, selectedExam]);

  const availableShiftsForSelection = useMemo(() => {
    const shifts = new Set<string>();
    for (const q of allQuestions) {
      if (selectedExam !== 'all' && q.exam?.name !== selectedExam) continue;
      if (selectedYear !== 0 && q.exam?.year !== selectedYear) continue;
      if (q.exam?.shift) shifts.add(q.exam.shift);
    }
    return Array.from(shifts).sort();
  }, [allQuestions, selectedExam, selectedYear]);

  // Calculate matching questions in real time
  const matchingQuestions = useMemo(() => {
    let pool = allQuestions.filter((q) =>
      includeNeedsReview ? true : q.correctAnswer !== null && q.verificationStatus !== 'needs_review'
    );

    if (selectedExam !== 'all') {
      pool = pool.filter((q) => q.exam?.name === selectedExam);
    }
    if (selectedYear !== 0) {
      pool = pool.filter((q) => q.exam?.year === selectedYear);
    }
    if (selectedShift !== 'all') {
      pool = pool.filter((q) => q.exam?.shift === selectedShift);
    }
    if (selectedDifficulty !== 'all') {
      pool = pool.filter((q) => q.difficulty === selectedDifficulty);
    }
    if (rangeStart !== undefined && rangeEnd !== undefined) {
      pool = pool.filter((q) => q.globalNumber >= rangeStart && q.globalNumber <= rangeEnd);
    }
    return pool;
  }, [
    allQuestions,
    includeNeedsReview,
    selectedExam,
    selectedYear,
    selectedShift,
    selectedDifficulty,
    rangeStart,
    rangeEnd,
  ]);

  const effectiveQuestionCount = useMemo(() => {
    if (customCount > 0 && customCount < matchingQuestions.length) {
      return customCount;
    }
    return matchingQuestions.length;
  }, [customCount, matchingQuestions.length]);

  const hasActiveFilters =
    selectedExam !== 'all' ||
    selectedYear !== 0 ||
    selectedShift !== 'all' ||
    selectedDifficulty !== 'all' ||
    rangeStart !== undefined ||
    customCount > 0;

  const clearFilters = () => {
    setSelectedExam('all');
    setSelectedYear(0);
    setSelectedShift('all');
    setSelectedDifficulty('all');
    setRangeStart(undefined);
    setRangeEnd(undefined);
    setCustomCount(0);
    setOrderMode('original');
  };

  const handleScoringChange = (newScoring: ScoringConfig) => {
    setScoring(newScoring);
    StorageService.setScoringConfig(newScoring);
  };

  const launchQuiz = (overrideConfig?: {
    mode?: QuizMode;
    start?: number;
    end?: number;
    order?: OrderMode;
  }) => {
    if (!summary) return;

    const rStart = overrideConfig?.start !== undefined ? overrideConfig.start : rangeStart;
    const rEnd = overrideConfig?.end !== undefined ? overrideConfig.end : rangeEnd;
    const ord = overrideConfig?.order || orderMode;

    let mode: QuizMode = overrideConfig?.mode || 'full_topic';
    if (!overrideConfig?.mode) {
      if (ord === 'random') mode = 'random';
      else if (rStart !== undefined && rEnd !== undefined) mode = 'range';
      else if (selectedExam !== 'all' && selectedYear !== 0) mode = 'exam_year';
      else if (selectedExam !== 'all') mode = 'exam';
      else if (selectedYear !== 0) mode = 'year';
      else if (customCount > 0) mode = 'custom';
    }

    const subtitleParts: string[] = [summary.topic.category];
    if (rStart !== undefined && rEnd !== undefined) {
      subtitleParts.push(`Q ${rStart}–${rEnd}`);
    }
    if (selectedExam !== 'all') subtitleParts.push(selectedExam);
    if (selectedYear !== 0) subtitleParts.push(String(selectedYear));
    if (selectedShift !== 'all') subtitleParts.push(selectedShift);
    subtitleParts.push(ord === 'random' ? 'Random Order' : 'Original Order');

    onStartQuiz({
      title: summary.topic.name,
      subtitle: subtitleParts.join(' · '),
      mode,
      filters: {
        topicId,
        examName: selectedExam !== 'all' ? selectedExam : undefined,
        year: selectedYear !== 0 ? selectedYear : undefined,
        shift: selectedShift !== 'all' ? selectedShift : undefined,
        difficulty: selectedDifficulty !== 'all' ? selectedDifficulty : undefined,
        rangeStart: rStart,
        rangeEnd: rEnd,
        customCount: customCount > 0 ? customCount : undefined,
        orderMode: ord,
        shuffleOptions,
        includeNeedsReview,
      },
      timerMode,
      totalTimeSeconds: fullTimerMinutes * 60,
      perQuestionSeconds,
      scoring,
      instantFeedback,
      allowBackNavigation: true,
      allowAnswerChange,
    });
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 space-y-4">
        <div className="text-sm text-slate-600 dark:text-slate-400">
          Loading questions for topic "{topicId}"...
        </div>
        <div className="h-48 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 animate-pulse" />
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 space-y-4">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Topics
        </button>

        <div className="rounded-xl border border-red-200 dark:border-red-900/60 bg-white dark:bg-slate-900 p-6 space-y-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Unable to load this question set.
              </h2>
              <p className="text-xs font-mono text-slate-500">Dataset ID: {topicId}</p>
              <p className="text-sm text-slate-600 dark:text-slate-400">{error}</p>
            </div>
          </div>
          <button
            onClick={() => loadTopicData(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-lg transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            Retry Loading Dataset
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Breadcrumb & Topic Header */}
      <div className="space-y-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          All Topics / {summary.topic.category}
        </button>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-slate-900 dark:text-slate-100">
              {summary.topic.name}
            </h1>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
              <span>Total Questions: {allQuestions.length}</span>
              <span aria-hidden="true">·</span>
              <span>Verified: {summary.verifiedCount}</span>
              {summary.needsReviewCount > 0 && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-amber-600 dark:text-amber-400">
                    Flagged for Review: {summary.needsReviewCount}
                  </span>
                </>
              )}
              {summary.topic.sourcePdf && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>Source PDF: {summary.topic.sourcePdf}</span>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={() =>
                launchQuiz({
                  mode: 'full_topic',
                  start: undefined,
                  end: undefined,
                  order: 'original',
                })
              }
              disabled={matchingQuestions.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-sky-600 hover:bg-sky-700 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              <Play className="w-4 h-4" />
              Full Topic Quiz ({allQuestions.length} Qs)
            </button>
            <button
              onClick={() =>
                launchQuiz({
                  mode: 'random',
                  order: 'random',
                })
              }
              disabled={matchingQuestions.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              <Shuffle className="w-4 h-4" />
              Random Quiz
            </button>
          </div>
        </div>
      </div>

      {/* Automatic Question Sets (Ranges 1-100, 101-200, ...) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Question Sets (Auto-Generated Ranges)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Click a range to filter or launch directly in original PDF sequence.
            </p>
          </div>
          {rangeStart !== undefined && (
            <button
              onClick={() => {
                setRangeStart(undefined);
                setRangeEnd(undefined);
              }}
              className="text-xs font-medium text-sky-600 dark:text-sky-400 hover:underline cursor-pointer"
            >
              Reset Range
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {ranges.map((r) => {
            const isSelected = rangeStart === r.start && rangeEnd === r.end;
            return (
              <div
                key={r.id}
                className={`rounded-xl border p-3.5 transition-colors flex flex-col justify-between gap-2.5 ${
                  isSelected
                    ? 'border-sky-600 bg-sky-50/70 dark:bg-sky-950/40'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                }`}
              >
                <div>
                  <div className="text-sm font-semibold font-mono tabular-nums text-slate-900 dark:text-slate-100">
                    {r.start}–{r.end}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                    {r.count} Questions
                  </div>
                </div>
                <div className="flex items-center gap-1.5 pt-1">
                  <button
                    onClick={() => {
                      setRangeStart(r.start);
                      setRangeEnd(r.end);
                    }}
                    className={`flex-1 py-1.5 px-2 text-xs font-medium rounded-md border transition-colors cursor-pointer ${
                      isSelected
                        ? 'border-sky-600 bg-sky-600 text-white'
                        : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {isSelected ? 'Selected' : 'Filter'}
                  </button>
                  <button
                    onClick={() =>
                      launchQuiz({
                        mode: 'range',
                        start: r.start,
                        end: r.end,
                        order: 'original',
                      })
                    }
                    title={`Start Questions ${r.start} to ${r.end}`}
                    className="py-1.5 px-2.5 text-xs font-semibold rounded-md bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:opacity-90 transition-opacity cursor-pointer"
                  >
                    Start
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Main Two-Column Filter & Quiz Configuration Deck */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Combined Filters (Exam, Year, Shift, Custom Range/Count) */}
        <div className="lg:col-span-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Combined Exam, Year, Shift & Custom Range Filters
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Filters are dynamically generated from metadata present in this dataset.
              </p>
            </div>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
              >
                <FilterX className="w-3.5 h-3.5" />
                Clear Filters
              </button>
            )}
          </div>

          {/* Exam Filter */}
          {summary.exams.length > 0 && (
            <div className="space-y-2">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                SSC Exam
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedExam('all')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                    selectedExam === 'all'
                      ? 'border-sky-600 bg-sky-600 text-white'
                      : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  All Exams
                </button>
                {summary.exams.map((exam) => (
                  <button
                    key={exam}
                    onClick={() => setSelectedExam(exam)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                      selectedExam === exam
                        ? 'border-sky-600 bg-sky-600 text-white'
                        : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {exam}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Year Filter */}
          {availableYearsForSelection.length > 0 && (
            <div className="space-y-2">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                Exam Year
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedYear(0)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                    selectedYear === 0
                      ? 'border-sky-600 bg-sky-600 text-white'
                      : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  All Years
                </button>
                {availableYearsForSelection.map((yr) => (
                  <button
                    key={yr}
                    onClick={() => setSelectedYear(yr)}
                    className={`px-3 py-1.5 text-xs font-mono tabular-nums font-medium rounded-lg border transition-colors cursor-pointer ${
                      selectedYear === yr
                        ? 'border-sky-600 bg-sky-600 text-white'
                        : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {yr}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Shift Filter */}
          {availableShiftsForSelection.length > 0 && (
            <div className="space-y-2">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                Shift
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedShift('all')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                    selectedShift === 'all'
                      ? 'border-sky-600 bg-sky-600 text-white'
                      : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  All Shifts
                </button>
                {availableShiftsForSelection.map((sh) => (
                  <button
                    key={sh}
                    onClick={() => setSelectedShift(sh)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                      selectedShift === sh
                        ? 'border-sky-600 bg-sky-600 text-white'
                        : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {sh}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Custom Question Range & Limit */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                From Question #
              </label>
              <input
                type="number"
                min={1}
                max={allQuestions.length}
                placeholder="1"
                value={rangeStart ?? ''}
                onChange={(e) => {
                  const val = e.target.value ? Number(e.target.value) : undefined;
                  setRangeStart(val);
                  if (val !== undefined && rangeEnd === undefined) {
                    setRangeEnd(allQuestions.length);
                  }
                }}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm font-mono tabular-nums"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                To Question #
              </label>
              <input
                type="number"
                min={1}
                max={allQuestions.length}
                placeholder={String(allQuestions.length)}
                value={rangeEnd ?? ''}
                onChange={(e) => {
                  const val = e.target.value ? Number(e.target.value) : undefined;
                  setRangeEnd(val);
                  if (val !== undefined && rangeStart === undefined) {
                    setRangeStart(1);
                  }
                }}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm font-mono tabular-nums"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Max Questions (0 = All)
              </label>
              <input
                type="number"
                min={0}
                max={allQuestions.length}
                value={customCount}
                onChange={(e) => setCustomCount(Math.max(0, Number(e.target.value) || 0))}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm font-mono tabular-nums"
              />
            </div>
          </div>

          {/* Order & Option Shuffling */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Question Sequence
              </label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setOrderMode('original')}
                  className={`flex-1 py-2 px-3 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                    orderMode === 'original'
                      ? 'border-sky-600 bg-sky-600 text-white'
                      : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  Original PDF Order
                </button>
                <button
                  onClick={() => setOrderMode('random')}
                  className={`flex-1 py-2 px-3 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                    orderMode === 'random'
                      ? 'border-sky-600 bg-sky-600 text-white'
                      : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  Randomize Order
                </button>
              </div>
            </div>

            <div className="flex flex-col justify-end space-y-2">
              <label className="inline-flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={shuffleOptions}
                  onChange={(e) => setShuffleOptions(e.target.checked)}
                  className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                />
                <span>Shuffle option positions (safe internal answer mapping)</span>
              </label>

              {summary.needsReviewCount > 0 && (
                <label className="inline-flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeNeedsReview}
                    onChange={(e) => setIncludeNeedsReview(e.target.checked)}
                    className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                  />
                  <span>
                    Include {summary.needsReviewCount} questions flagged for review
                  </span>
                </label>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Timer, SSC Scoring & Start Button */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 flex flex-col justify-between gap-6">
          <div className="space-y-5">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-3">
              Timer & SSC Scoring Scheme
            </h2>

            {/* Timer Mode */}
            <div className="space-y-2">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                Timer Mode
              </label>
              <select
                value={timerMode}
                onChange={(e) => setTimerMode(e.target.value as TimerMode)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm"
              >
                <option value="none">No Timer (Untimed Practice)</option>
                <option value="full_quiz">Full Quiz Countdown Timer</option>
                <option value="per_question">Per-Question Timer</option>
              </select>

              {timerMode === 'full_quiz' && (
                <div className="pt-2">
                  <label className="block text-xs text-slate-500 mb-1">
                    Total Duration (Minutes)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={240}
                    value={fullTimerMinutes}
                    onChange={(e) => setFullTimerMinutes(Math.max(1, Number(e.target.value) || 30))}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-1.5 text-sm font-mono tabular-nums"
                  />
                </div>
              )}

              {timerMode === 'per_question' && (
                <div className="pt-2">
                  <label className="block text-xs text-slate-500 mb-1">
                    Seconds per Question
                  </label>
                  <input
                    type="number"
                    min={10}
                    max={600}
                    value={perQuestionSeconds}
                    onChange={(e) =>
                      setPerQuestionSeconds(Math.max(10, Number(e.target.value) || 60))
                    }
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-1.5 text-sm font-mono tabular-nums"
                  />
                </div>
              )}
            </div>

            {/* Configurable SSC Scoring */}
            <div className="space-y-2">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                Scoring Preset
              </label>
              <div className="space-y-1.5">
                {DEFAULT_PLATFORM_CONFIG.scoringPresets.map((preset) => {
                  const active =
                    scoring.correctMarks === preset.config.correctMarks &&
                    scoring.incorrectMarks === preset.config.incorrectMarks;
                  return (
                    <button
                      key={preset.id}
                      onClick={() => handleScoringChange(preset.config)}
                      className={`w-full text-left px-3 py-2 rounded-lg border text-xs transition-colors cursor-pointer ${
                        active
                          ? 'border-sky-600 bg-sky-50/70 dark:bg-sky-950/40 font-semibold text-slate-900 dark:text-white'
                          : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Correct Marks</label>
                  <input
                    type="number"
                    step="0.5"
                    value={scoring.correctMarks}
                    onChange={(e) =>
                      handleScoringChange({
                        ...scoring,
                        correctMarks: Number(e.target.value) || 0,
                      })
                    }
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 py-1.5 text-xs font-mono tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">
                    Incorrect Marks (Negative)
                  </label>
                  <input
                    type="number"
                    step="0.25"
                    value={scoring.incorrectMarks}
                    onChange={(e) =>
                      handleScoringChange({
                        ...scoring,
                        incorrectMarks: Number(e.target.value) || 0,
                      })
                    }
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 py-1.5 text-xs font-mono tabular-nums"
                  />
                </div>
              </div>
            </div>

            {/* Answer Lock Mode */}
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <label className="inline-flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={instantFeedback}
                  onChange={(e) => setInstantFeedback(e.target.checked)}
                  className="rounded border-slate-300 text-sky-600"
                />
                <span>Show answer & explanation immediately after Submit</span>
              </label>
              <label className="inline-flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allowAnswerChange}
                  onChange={(e) => setAllowAnswerChange(e.target.checked)}
                  className="rounded border-slate-300 text-sky-600"
                />
                <span>Allow changing answer after submission (Review Mode)</span>
              </label>
            </div>
          </div>

          {/* Empty filter state vs Launch CTA */}
          {effectiveQuestionCount === 0 ? (
            <div className="rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 p-3 text-xs text-amber-800 dark:text-amber-300">
              No questions are available for the selected filters.
            </div>
          ) : (
            <button
              onClick={() => launchQuiz()}
              className="w-full py-3 px-4 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Play className="w-4 h-4" />
              <span>Start Quiz ({effectiveQuestionCount} Questions)</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
