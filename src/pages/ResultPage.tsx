import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Bookmark,
  CheckCircle2,
  RotateCcw,
  XCircle,
} from 'lucide-react';
import { Question, QuizResultSummary } from '../types/quiz';
import { QuestionRepository } from '../services/questionRepository';
import { StorageService } from '../services/storageService';
import { formatDuration } from '../utils/rangeUtils';

interface ResultPageProps {
  result: QuizResultSummary;
  onRetakeQuiz: () => void;
  onPracticeMistakes: (questionIds: string[]) => void;
  onBackToDashboard: () => void;
  onBookmarksChanged: () => void;
}

export const ResultPage: React.FC<ResultPageProps> = ({
  result,
  onRetakeQuiz,
  onPracticeMistakes,
  onBackToDashboard,
  onBookmarksChanged,
}) => {
  const [questionMap, setQuestionMap] = useState<Map<string, Question>>(new Map());
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(
    result.questionResults[0]?.questionId || null
  );
  const [filterStatus, setFilterStatus] = useState<'all' | 'correct' | 'incorrect' | 'unanswered'>(
    'all'
  );
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(() => {
    return new Set(StorageService.getBookmarks().map((b) => b.questionId));
  });

  useEffect(() => {
    const loadQuestions = async () => {
      try {
        const topics = await QuestionRepository.getTopics();
        const targetTopics = result.topicId && result.topicId !== 'all'
          ? topics.filter((t) => t.id === result.topicId)
          : topics;
        const arrays = await Promise.all(
          targetTopics.map((t) => QuestionRepository.getTopicQuestions(t.id).catch(() => []))
        );
        const map = new Map<string, Question>();
        for (const q of arrays.flat()) {
          map.set(q.id, q);
        }
        setQuestionMap(map);
      } catch (err) {
        console.warn('Could not load question details for review:', err);
      }
    };
    loadQuestions();
  }, [result.topicId]);

  const wrongQuestionIds = result.questionResults
    .filter((r) => !r.isCorrect && !r.isUnanswered)
    .map((r) => r.questionId);

  const filteredResults = result.questionResults.filter((r) => {
    if (filterStatus === 'correct') return r.isCorrect;
    if (filterStatus === 'incorrect') return !r.isCorrect && !r.isUnanswered;
    if (filterStatus === 'unanswered') return r.isUnanswered;
    return true;
  });

  const activeResultItem =
    result.questionResults.find((r) => r.questionId === selectedQuestionId) ||
    filteredResults[0];
  const activeQuestion = activeResultItem
    ? questionMap.get(activeResultItem.questionId)
    : undefined;

  const handleToggleBookmark = (q: Question) => {
    const added = StorageService.toggleBookmark(q);
    setBookmarkedIds((prev) => {
      const next = new Set(prev);
      if (added) next.add(q.id);
      else next.delete(q.id);
      return next;
    });
    onBookmarksChanged();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Top Action & Summary Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div className="space-y-1">
          <button
            onClick={onBackToDashboard}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Topics Dashboard
          </button>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-slate-900 dark:text-slate-100">
            Quiz Result: {result.title}
          </h1>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
            {result.subtitle && <span>{result.subtitle}</span>}
            <span aria-hidden="true">·</span>
            <span>Completed {new Date(result.completedAt).toLocaleString()}</span>
            <span aria-hidden="true">·</span>
            <span>
              Scoring: +{result.scoring.correctMarks} / {result.scoring.incorrectMarks}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {wrongQuestionIds.length > 0 && (
            <button
              onClick={() => onPracticeMistakes(wrongQuestionIds)}
              className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              Practice {wrongQuestionIds.length} Wrong Questions
            </button>
          )}
          <button
            onClick={onRetakeQuiz}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Retake Quiz
          </button>
        </div>
      </div>

      {/* Quantitative Performance Grid (Tabular Numerals, Single Elevation) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400">Net Score</div>
          <div className="mt-1 text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
            {result.score} / {result.maxScore}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400">Correct (✓)</div>
          <div className="mt-1 text-xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
            {result.correct}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400">Incorrect (✗)</div>
          <div className="mt-1 text-xl font-bold font-mono tabular-nums text-red-600 dark:text-red-400">
            {result.incorrect}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400">Unanswered (—)</div>
          <div className="mt-1 text-xl font-bold font-mono tabular-nums text-slate-700 dark:text-slate-300">
            {result.unanswered}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400">Accuracy</div>
          <div className="mt-1 text-xl font-bold font-mono tabular-nums text-sky-600 dark:text-sky-400">
            {result.accuracy}%
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400">Time Taken</div>
          <div className="mt-1 text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
            {formatDuration(result.timeTakenSeconds)}
          </div>
        </div>
      </div>

      {/* Question-Wise Interactive Review Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 5 Columns: Question Grid & Status Filter */}
        <div className="lg:col-span-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Question-Wise Review
            </h2>
            <span className="text-xs font-mono tabular-nums text-slate-500">
              Click any question to inspect
            </span>
          </div>

          {/* Interactive Filter Tabs */}
          <div className="flex flex-wrap gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
            {(
              [
                { id: 'all', label: `All (${result.totalQuestions})` },
                { id: 'correct', label: `✓ (${result.correct})` },
                { id: 'incorrect', label: `✗ (${result.incorrect})` },
                { id: 'unanswered', label: `— (${result.unanswered})` },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterStatus(tab.id)}
                className={`flex-1 py-1.5 px-2 text-xs font-mono tabular-nums font-medium rounded-md transition-colors cursor-pointer ${
                  filterStatus === tab.id
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-5 gap-2 max-h-[420px] overflow-y-auto pr-1">
            {filteredResults.map((item, idx) => {
              const isSelected = activeResultItem?.questionId === item.questionId;
              let style =
                'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300';
              let symbol = '—';

              if (item.isCorrect) {
                style = 'border-emerald-600 bg-emerald-600 text-white';
                symbol = '✓';
              } else if (!item.isUnanswered) {
                style = 'border-red-600 bg-red-600 text-white';
                symbol = '✗';
              }

              return (
                <button
                  key={item.questionId}
                  onClick={() => setSelectedQuestionId(item.questionId)}
                  className={`h-10 rounded-lg border text-xs font-mono tabular-nums font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer ${style} ${
                    isSelected ? 'ring-2 ring-offset-2 ring-sky-500 dark:ring-offset-slate-900' : ''
                  }`}
                >
                  <span>Q{item.globalNumber || idx + 1}</span>
                  <span>{symbol}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right 7 Columns: Detailed Question Inspection */}
        <div className="lg:col-span-7 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-5">
          {activeResultItem && activeQuestion ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 text-sm font-mono font-bold text-slate-900 dark:text-white">
                    <span>Question #{activeQuestion.globalNumber}</span>
                    <span className="text-slate-400">·</span>
                    <span className="text-xs font-normal text-slate-500">{activeQuestion.id}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span>{activeQuestion.topic.name}</span>
                    {activeQuestion.exam?.name && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>{activeQuestion.exam.name}</span>
                      </>
                    )}
                    {activeQuestion.exam?.year && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>{activeQuestion.exam.year}</span>
                      </>
                    )}
                    {activeQuestion.exam?.shift && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>{activeQuestion.exam.shift}</span>
                      </>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => handleToggleBookmark(activeQuestion)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium cursor-pointer ${
                    bookmarkedIds.has(activeQuestion.id)
                      ? 'border-sky-600 bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <Bookmark className="w-3.5 h-3.5" />
                  {bookmarkedIds.has(activeQuestion.id) ? 'Bookmarked' : 'Bookmark'}
                </button>
              </div>

              <div className="space-y-2">
                <p className="text-base font-medium text-slate-900 dark:text-slate-100 leading-relaxed">
                  {activeQuestion.question}
                </p>
                {activeQuestion.questionHindi && (
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed border-l-2 border-slate-200 dark:border-slate-700 pl-3">
                    {activeQuestion.questionHindi}
                  </p>
                )}
              </div>

              <div className="space-y-2.5">
                {activeQuestion.options.map((opt) => {
                  const isUserChoice = activeResultItem.selectedOptionId === opt.id;
                  const isCorrectOpt = activeQuestion.correctAnswer === opt.id;

                  let rowStyle =
                    'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50';
                  if (isCorrectOpt) {
                    rowStyle =
                      'border-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-950 dark:text-emerald-100 font-medium';
                  } else if (isUserChoice && !isCorrectOpt) {
                    rowStyle =
                      'border-red-600 bg-red-50/70 dark:bg-red-950/30 text-red-950 dark:text-red-100 font-medium';
                  }

                  return (
                    <div
                      key={opt.id}
                      className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 text-sm ${rowStyle}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold">{opt.id}.</span>
                        <span>{opt.text}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs font-semibold shrink-0">
                        {isCorrectOpt && (
                          <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                            <CheckCircle2 className="w-4 h-4" />
                            Correct Answer
                          </span>
                        )}
                        {isUserChoice && !isCorrectOpt && (
                          <span className="inline-flex items-center gap-1 text-red-700 dark:text-red-400">
                            <XCircle className="w-4 h-4" />
                            Your Answer
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-4 space-y-2 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-slate-500">
                  <span>
                    Your Answer: {activeResultItem.selectedOptionId || 'Unanswered (—)'} · Correct
                    Answer: {activeQuestion.correctAnswer || 'N/A'}
                  </span>
                  <span>Time Spent: {formatDuration(activeResultItem.timeSpentSeconds)}</span>
                </div>
                {activeQuestion.explanation && (
                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed pt-1">
                    <strong>Explanation: </strong>
                    {activeQuestion.explanation}
                  </p>
                )}
                {activeQuestion.source?.pdf && (
                  <p className="text-xs font-mono text-slate-500 pt-1">
                    Source PDF: {activeQuestion.source.pdf} · Page {activeQuestion.source.page || '?'} ·
                    Original Q#{activeQuestion.source.originalQuestionNumber || activeQuestion.globalNumber}
                  </p>
                )}
              </div>
            </>
          ) : (
            <div className="py-12 text-center text-sm text-slate-500">
              Select a question from the review panel on the left to inspect its solution and metadata.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
