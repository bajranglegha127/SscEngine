import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Bookmark,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Flag,
  LayoutGrid,
  Lock,
  Unlock,
  X,
  XCircle,
} from 'lucide-react';
import {
  ActiveQuizSession,
  OptionId,
  QuestionAttemptState,
  QuizResultSummary,
} from '../types/quiz';
import { StorageService } from '../services/storageService';
import { formatDuration } from '../utils/rangeUtils';

interface QuizPageProps {
  session: ActiveQuizSession;
  onUpdateSession: (updated: ActiveQuizSession) => void;
  onFinishQuiz: (result: QuizResultSummary) => void;
  onExitQuiz: () => void;
  onBookmarksChanged: () => void;
  onMistakesChanged: () => void;
}

const DISPLAY_LABELS: OptionId[] = ['A', 'B', 'C', 'D'];

export const QuizPage: React.FC<QuizPageProps> = ({
  session,
  onUpdateSession,
  onFinishQuiz,
  onExitQuiz,
  onBookmarksChanged,
  onMistakesChanged,
}) => {
  const [currentIndex, setCurrentIndex] = useState<number>(session.currentIndex || 0);
  const [attempts, setAttempts] = useState<Record<string, QuestionAttemptState>>(
    session.attempts || {}
  );
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(
    session.elapsedSeconds || 0
  );
  const [remainingSeconds, setRemainingSeconds] = useState<number>(
    session.remainingSeconds || session.config.totalTimeSeconds || 0
  );
  const [questionTimerLeft, setQuestionTimerLeft] = useState<number>(
    session.config.perQuestionSeconds || 60
  );
  const [reviewChangeEnabled, setReviewChangeEnabled] = useState<boolean>(
    session.config.allowAnswerChange
  );
  const [langView, setLangView] = useState<'both' | 'en' | 'hi'>('both');
  const [mobilePaletteOpen, setMobilePaletteOpen] = useState<boolean>(false);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(() => {
    return new Set(StorageService.getBookmarks().map((b) => b.questionId));
  });

  const questions = session.questions;
  const currentQuestion = questions[currentIndex];

  // Ensure current question has an initialized attempt state
  useEffect(() => {
    if (!currentQuestion) return;
    setAttempts((prev) => {
      const existing = prev[currentQuestion.id];
      if (existing && existing.visited) return prev;

      let shuffledOptionIds: OptionId[] | undefined = existing?.shuffledOptionIds;
      if (!shuffledOptionIds && session.config.filters.shuffleOptions) {
        const copy: OptionId[] = ['A', 'B', 'C', 'D'];
        for (let i = copy.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [copy[i], copy[j]] = [copy[j], copy[i]];
        }
        shuffledOptionIds = copy;
      }

      return {
        ...prev,
        [currentQuestion.id]: {
          questionId: currentQuestion.id,
          visited: true,
          selectedOptionId: existing?.selectedOptionId ?? null,
          locked: existing?.locked ?? false,
          markedForReview: existing?.markedForReview ?? false,
          timeSpentSeconds: existing?.timeSpentSeconds ?? 0,
          shuffledOptionIds,
        },
      };
    });

    if (session.config.timerMode === 'per_question') {
      setQuestionTimerLeft(session.config.perQuestionSeconds || 60);
    }
  }, [currentIndex, currentQuestion, session.config.filters.shuffleOptions, session.config.timerMode, session.config.perQuestionSeconds]);

  // Persist active session on state changes
  useEffect(() => {
    const updated: ActiveQuizSession = {
      ...session,
      updatedAt: new Date().toISOString(),
      currentIndex,
      attempts,
      elapsedSeconds,
      remainingSeconds,
    };
    onUpdateSession(updated);
    StorageService.saveActiveSession(updated);
  }, [currentIndex, attempts, elapsedSeconds, remainingSeconds]);

  // Finalize & compute quiz results
  const handleCompleteQuiz = useCallback(() => {
    const scoring = session.config.scoring;
    let correct = 0;
    let incorrect = 0;
    let unanswered = 0;
    let markedForReviewCount = 0;

    const questionResults = questions.map((q) => {
      const att = attempts[q.id];
      const selected = att?.selectedOptionId ?? null;
      const isMarked = Boolean(att?.markedForReview);
      if (isMarked) markedForReviewCount++;

      const isUnanswered = selected === null;
      const isCorrect = !isUnanswered && q.correctAnswer !== null && selected === q.correctAnswer;

      if (isUnanswered) {
        unanswered++;
      } else if (isCorrect) {
        correct++;
      } else {
        incorrect++;
        if (selected) {
          StorageService.recordMistake(q, selected);
        }
      }

      return {
        questionId: q.id,
        globalNumber: q.globalNumber,
        selectedOptionId: selected,
        correctAnswer: q.correctAnswer,
        isCorrect,
        isUnanswered,
        timeSpentSeconds: att?.timeSpentSeconds ?? 0,
        markedForReview: isMarked,
      };
    });

    onMistakesChanged();

    const rawScore =
      correct * scoring.correctMarks +
      incorrect * scoring.incorrectMarks +
      unanswered * scoring.unansweredMarks;
    const score = Math.round(rawScore * 100) / 100;
    const maxScore = questions.length * scoring.correctMarks;
    const attempted = correct + incorrect;
    const accuracy = attempted > 0 ? Math.round((correct / attempted) * 1000) / 10 : 0;

    const summary: QuizResultSummary = {
      id: `result-${Date.now()}`,
      sessionId: session.sessionId,
      title: session.config.title,
      subtitle: session.config.subtitle,
      topicId: session.config.filters.topicId,
      topicName: questions[0]?.topic.name,
      category: questions[0]?.category,
      examName: session.config.filters.examName,
      year: session.config.filters.year,
      shift: session.config.filters.shift,
      mode: session.config.mode,
      completedAt: new Date().toISOString(),
      totalQuestions: questions.length,
      attempted,
      correct,
      incorrect,
      unanswered,
      markedForReviewCount,
      score,
      maxScore,
      accuracy,
      timeTakenSeconds: elapsedSeconds,
      scoring,
      questionResults,
    };

    StorageService.saveActiveSession(null);
    StorageService.addHistoryEntry(summary);
    onFinishQuiz(summary);
  }, [attempts, elapsedSeconds, onFinishQuiz, onMistakesChanged, questions, session]);

  // 1-second interval timer
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);

      if (currentQuestion) {
        setAttempts((prev) => {
          const cur = prev[currentQuestion.id];
          if (!cur) return prev;
          return {
            ...prev,
            [currentQuestion.id]: {
              ...cur,
              timeSpentSeconds: (cur.timeSpentSeconds || 0) + 1,
            },
          };
        });
      }

      if (session.config.timerMode === 'full_quiz') {
        setRemainingSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            handleCompleteQuiz();
            return 0;
          }
          return prev - 1;
        });
      } else if (session.config.timerMode === 'per_question') {
        setQuestionTimerLeft((prev) => {
          if (prev <= 1) {
            if (currentIndex < questions.length - 1) {
              setCurrentIndex((idx) => idx + 1);
            } else {
              handleCompleteQuiz();
            }
            return session.config.perQuestionSeconds || 60;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [
    currentQuestion,
    currentIndex,
    questions.length,
    session.config.timerMode,
    session.config.perQuestionSeconds,
    handleCompleteQuiz,
  ]);

  const currentAttempt: QuestionAttemptState = useMemo(() => {
    if (!currentQuestion) {
      return {
        questionId: '',
        visited: true,
        selectedOptionId: null,
        locked: false,
        markedForReview: false,
        timeSpentSeconds: 0,
      };
    }
    return (
      attempts[currentQuestion.id] || {
        questionId: currentQuestion.id,
        visited: true,
        selectedOptionId: null,
        locked: false,
        markedForReview: false,
        timeSpentSeconds: 0,
      }
    );
  }, [attempts, currentQuestion]);

  // Determine ordered options for display (preserving original OptionId for accurate checking)
  const displayedOptions = useMemo(() => {
    if (!currentQuestion) return [];
    const order = currentAttempt.shuffledOptionIds;
    if (!order || order.length !== 4) return currentQuestion.options;
    return order
      .map((id) => currentQuestion.options.find((o) => o.id === id)!)
      .filter(Boolean);
  }, [currentQuestion, currentAttempt.shuffledOptionIds]);

  const handleSelectOption = (optionId: OptionId) => {
    if (!currentQuestion) return;
    if (currentAttempt.locked && !reviewChangeEnabled) return;

    setAttempts((prev) => ({
      ...prev,
      [currentQuestion.id]: {
        ...currentAttempt,
        selectedOptionId: optionId,
      },
    }));
  };

  const handleSubmitCurrentAnswer = () => {
    if (!currentQuestion || !currentAttempt.selectedOptionId) return;

    if (
      currentQuestion.correctAnswer &&
      currentAttempt.selectedOptionId !== currentQuestion.correctAnswer
    ) {
      StorageService.recordMistake(currentQuestion, currentAttempt.selectedOptionId);
      onMistakesChanged();
    }

    setAttempts((prev) => ({
      ...prev,
      [currentQuestion.id]: {
        ...currentAttempt,
        locked: true,
      },
    }));
  };

  const handleToggleMarkForReview = () => {
    if (!currentQuestion) return;
    setAttempts((prev) => ({
      ...prev,
      [currentQuestion.id]: {
        ...currentAttempt,
        markedForReview: !currentAttempt.markedForReview,
      },
    }));
  };

  const handleToggleBookmark = () => {
    if (!currentQuestion) return;
    const nowBookmarked = StorageService.toggleBookmark(currentQuestion);
    setBookmarkedIds((prev) => {
      const next = new Set(prev);
      if (nowBookmarked) next.add(currentQuestion.id);
      else next.delete(currentQuestion.id);
      return next;
    });
    onBookmarksChanged();
  };

  // Keyboard navigation support
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === 'ArrowRight' && currentIndex < questions.length - 1) {
        setCurrentIndex((i) => i + 1);
      } else if (
        e.key === 'ArrowLeft' &&
        session.config.allowBackNavigation &&
        currentIndex > 0
      ) {
        setCurrentIndex((i) => i - 1);
      } else if (['1', '2', '3', '4'].includes(e.key)) {
        const idx = Number(e.key) - 1;
        const opt = displayedOptions[idx];
        if (opt) handleSelectOption(opt.id);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  if (!currentQuestion) {
    return null;
  }

  const isSubmitted = currentAttempt.locked;
  const isBookmarked = bookmarkedIds.has(currentQuestion.id);
  const showFeedback = isSubmitted && session.config.instantFeedback;
  const isCurrentCorrect =
    currentAttempt.selectedOptionId !== null &&
    currentAttempt.selectedOptionId === currentQuestion.correctAnswer;

  const answeredCount = Object.values(attempts).filter(
    (a) => a.selectedOptionId !== null
  ).length;

  const renderPaletteGrid = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Question Palette
        </h3>
        <span className="text-xs font-mono tabular-nums text-slate-500">
          {answeredCount} / {questions.length} Answered
        </span>
      </div>

      {/* Accessible Legend */}
      <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-400">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-xs bg-emerald-600 inline-block" />
          <span>Correct (✓)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-xs bg-red-600 inline-block" />
          <span>Incorrect (✗)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-xs bg-sky-600 inline-block" />
          <span>Answered</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-xs bg-amber-500 inline-block" />
          <span>Marked (★)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-xs border border-slate-400 dark:border-slate-600 inline-block" />
          <span>Visited</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-xs bg-slate-100 dark:bg-slate-800 inline-block" />
          <span>Not Visited</span>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-2 max-h-[380px] overflow-y-auto pr-1 pt-1">
        {questions.map((q, idx) => {
          const att = attempts[q.id];
          const isCurrent = idx === currentIndex;
          const hasSelection = Boolean(att?.selectedOptionId);
          const locked = Boolean(att?.locked);
          const marked = Boolean(att?.markedForReview);
          const visited = Boolean(att?.visited);

          let btnStyle =
            'bg-slate-100 dark:bg-slate-800/70 text-slate-600 dark:text-slate-400 border-transparent';
          let statusSymbol = '';

          if (locked && session.config.instantFeedback && q.correctAnswer) {
            if (att.selectedOptionId === q.correctAnswer) {
              btnStyle = 'bg-emerald-600 text-white border-emerald-600';
              statusSymbol = '✓';
            } else {
              btnStyle = 'bg-red-600 text-white border-red-600';
              statusSymbol = '✗';
            }
          } else if (marked) {
            btnStyle = 'bg-amber-500 text-white border-amber-500';
            statusSymbol = '★';
          } else if (hasSelection) {
            btnStyle = 'bg-sky-600 text-white border-sky-600';
          } else if (visited) {
            btnStyle =
              'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700';
          }

          return (
            <button
              key={q.id}
              onClick={() => {
                setCurrentIndex(idx);
                setMobilePaletteOpen(false);
              }}
              aria-label={`Jump to question ${idx + 1}`}
              className={`h-9 rounded-lg border text-xs font-mono tabular-nums font-medium flex items-center justify-center gap-0.5 transition-all cursor-pointer ${btnStyle} ${
                isCurrent ? 'ring-2 ring-offset-2 ring-sky-500 dark:ring-offset-slate-900' : ''
              }`}
            >
              <span>{idx + 1}</span>
              {statusSymbol && <span className="text-[10px]">{statusSymbol}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Quiz Top Bar */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <button
              onClick={onExitQuiz}
              className="hover:text-slate-900 dark:hover:text-white underline cursor-pointer"
            >
              Save & Exit
            </button>
            <span aria-hidden="true">·</span>
            <span className="truncate max-w-[260px] sm:max-w-md">{session.config.subtitle}</span>
          </div>
          <h1 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-slate-100">
            {session.config.title}
          </h1>
        </div>

        {/* Timer & Submit Quiz Controls */}
        <div className="flex items-center gap-3">
          {session.config.timerMode === 'full_quiz' && (
            <div
              className={`flex items-center gap-1.5 font-mono text-sm tabular-nums font-semibold px-3 py-1.5 rounded-lg border ${
                remainingSeconds < 60
                  ? 'border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/50 dark:text-red-300'
                  : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100'
              }`}
            >
              <Clock className="w-4 h-4 text-sky-600" />
              <span>Time remaining: {formatDuration(remainingSeconds)}</span>
            </div>
          )}

          {session.config.timerMode === 'per_question' && (
            <div className="flex items-center gap-1.5 font-mono text-sm tabular-nums font-semibold px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
              <Clock className="w-4 h-4 text-sky-600" />
              <span>Q Timer: {formatDuration(questionTimerLeft)}</span>
            </div>
          )}

          {session.config.timerMode === 'none' && (
            <div className="hidden sm:flex items-center gap-1.5 font-mono text-xs tabular-nums text-slate-500">
              <Clock className="w-3.5 h-3.5" />
              <span>Elapsed: {formatDuration(elapsedSeconds)}</span>
            </div>
          )}

          <button
            onClick={() => setMobilePaletteOpen(true)}
            className="lg:hidden inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            Palette
          </button>

          <button
            onClick={handleCompleteQuiz}
            className="px-4 py-2 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold hover:opacity-90 transition-opacity whitespace-nowrap cursor-pointer"
          >
            Finish & Submit Quiz
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-sky-600 transition-transform duration-150 origin-left"
          style={{
            transform: `scaleX(${(currentIndex + 1) / Math.max(1, questions.length)})`,
          }}
        />
      </div>

      {/* Main Quiz Stage + Right Question Palette */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 8 Columns: Active Question Card */}
        <div className="lg:col-span-8 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-7 space-y-6">
          {/* Question Header & Metadata */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-base font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                  Question {currentIndex + 1} / {questions.length}
                </span>
                <span className="text-xs text-slate-400" aria-hidden="true">
                  ·
                </span>
                <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                  ID: {currentQuestion.id} (#{currentQuestion.globalNumber})
                </span>
              </div>

              {/* Clean unboxed exam/source metadata */}
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span>{currentQuestion.topic.name}</span>
                {currentQuestion.exam?.name && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {currentQuestion.exam.name}
                    </span>
                  </>
                )}
                {currentQuestion.exam?.year && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">{currentQuestion.exam.year}</span>
                  </>
                )}
                {currentQuestion.exam?.shift && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>{currentQuestion.exam.shift}</span>
                  </>
                )}
                {currentQuestion.source?.pdf && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono">
                      {currentQuestion.source.pdf}
                      {currentQuestion.source.page ? ` (p.${currentQuestion.source.page})` : ''}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Action Controls: Language, Mark for Review, Bookmark */}
            <div className="flex flex-wrap items-center gap-2">
              {currentQuestion.questionHindi && (
                <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-xs">
                  {(['both', 'en', 'hi'] as const).map((l) => (
                    <button
                      key={l}
                      onClick={() => setLangView(l)}
                      className={`px-2 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                        langView === l
                          ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {l === 'both' ? 'EN+HI' : l.toUpperCase()}
                    </button>
                  ))}
                </div>
              )}

              <button
                onClick={handleToggleMarkForReview}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                  currentAttempt.markedForReview
                    ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <Flag className="w-3.5 h-3.5" />
                <span>
                  {currentAttempt.markedForReview ? 'Marked for Review' : 'Mark for Review'}
                </span>
              </button>

              <button
                onClick={handleToggleBookmark}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                  isBookmarked
                    ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <Bookmark className="w-3.5 h-3.5" />
                <span>{isBookmarked ? 'Bookmarked' : 'Bookmark'}</span>
              </button>
            </div>
          </div>

          {/* Needs Review Notice if applicable */}
          {currentQuestion.verificationStatus === 'needs_review' && (
            <div className="rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50/80 dark:bg-amber-950/40 p-3 flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
              <div>
                <strong>Flagged for Manual Verification:</strong>{' '}
                {currentQuestion.verificationNotes ||
                  'Source PDF answer key or option text requires verification.'}
              </div>
            </div>
          )}

          {/* Question Stem (English & Hindi) */}
          <div className="space-y-3 py-1">
            {(langView === 'both' || langView === 'en') && (
              <p className="text-base sm:text-lg font-medium text-slate-900 dark:text-slate-100 leading-relaxed whitespace-pre-line">
                {currentQuestion.question}
              </p>
            )}
            {(langView === 'both' || langView === 'hi') && currentQuestion.questionHindi && (
              <p className="text-base text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line border-l-2 border-slate-200 dark:border-slate-700 pl-3">
                {currentQuestion.questionHindi}
              </p>
            )}
          </div>

          {/* Four Options */}
          <div className="space-y-3" role="radiogroup" aria-label="Answer options">
            {displayedOptions.map((opt, idx) => {
              const displayLabel = DISPLAY_LABELS[idx] || opt.id;
              const isSelected = currentAttempt.selectedOptionId === opt.id;
              const isCorrectOption = currentQuestion.correctAnswer === opt.id;

              let containerClass =
                'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700';
              let badgeClass =
                'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300';
              let statusNode: React.ReactNode = null;

              if (showFeedback) {
                if (isCorrectOption) {
                  containerClass =
                    'border-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-950 dark:text-emerald-100';
                  badgeClass = 'border-emerald-600 bg-emerald-600 text-white';
                  statusNode = (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                      <CheckCircle2 className="w-4 h-4" />
                      Correct Answer
                    </span>
                  );
                } else if (isSelected && !isCorrectOption) {
                  containerClass =
                    'border-red-600 bg-red-50/70 dark:bg-red-950/30 text-red-950 dark:text-red-100';
                  badgeClass = 'border-red-600 bg-red-600 text-white';
                  statusNode = (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 dark:text-red-400">
                      <XCircle className="w-4 h-4" />
                      Your Answer
                    </span>
                  );
                }
              } else if (isSelected) {
                containerClass =
                  'border-sky-600 bg-sky-50/60 dark:bg-sky-950/40 text-slate-900 dark:text-white';
                badgeClass = 'border-sky-600 bg-sky-600 text-white';
              }

              return (
                <button
                  key={opt.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  disabled={isSubmitted && !reviewChangeEnabled}
                  onClick={() => handleSelectOption(opt.id)}
                  className={`w-full text-left p-4 rounded-xl border transition-colors flex items-center justify-between gap-4 cursor-pointer disabled:cursor-default ${containerClass}`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <span
                      className={`w-7 h-7 rounded-lg border text-xs font-mono font-bold flex items-center justify-center shrink-0 ${badgeClass}`}
                    >
                      {displayLabel}
                    </span>
                    <span className="text-sm sm:text-base font-medium break-words">
                      {opt.text}
                    </span>
                  </div>
                  {statusNode && <div className="shrink-0">{statusNode}</div>}
                </button>
              );
            })}
          </div>

          {/* Submit / Check Answer Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-3">
              {!isSubmitted ? (
                <button
                  onClick={handleSubmitCurrentAnswer}
                  disabled={!currentAttempt.selectedOptionId}
                  className="px-5 py-2.5 rounded-lg bg-sky-600 hover:bg-sky-700 disabled:opacity-40 text-white text-sm font-semibold transition-colors cursor-pointer"
                >
                  Submit / Check Answer
                </button>
              ) : (
                <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                  <Lock className="w-3.5 h-3.5 text-slate-500" />
                  <span>Answer locked</span>
                  <button
                    onClick={() => setReviewChangeEnabled((v) => !v)}
                    className="inline-flex items-center gap-1 text-sky-600 dark:text-sky-400 hover:underline ml-2 cursor-pointer"
                  >
                    <Unlock className="w-3 h-3" />
                    {reviewChangeEnabled ? 'Disable Change Mode' : 'Enable Change Mode'}
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {session.config.allowBackNavigation && (
                <button
                  onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                  disabled={currentIndex === 0}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </button>
              )}

              {currentIndex < questions.length - 1 ? (
                <button
                  onClick={() => setCurrentIndex((i) => Math.min(questions.length - 1, i + 1))}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-sm font-semibold hover:opacity-90 transition-opacity cursor-pointer"
                >
                  Next Question
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={handleCompleteQuiz}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors cursor-pointer"
                >
                  Complete Quiz
                </button>
              )}
            </div>
          </div>

          {/* Post-Submission Explanation & Source Traceability Box */}
          {showFeedback && (
            <div
              className={`rounded-xl border p-5 space-y-3 ${
                isCurrentCorrect
                  ? 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/40 dark:bg-emerald-950/20'
                  : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {isCurrentCorrect ? (
                    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                      <CheckCircle2 className="w-4 h-4" />
                      Correct (+{session.config.scoring.correctMarks} marks)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-red-700 dark:text-red-400">
                      <XCircle className="w-4 h-4" />
                      Incorrect ({session.config.scoring.incorrectMarks} marks) · Correct Option:{' '}
                      {currentQuestion.correctAnswer || 'Needs Review'}
                    </span>
                  )}
                </div>

                <span className="text-xs font-mono tabular-nums text-slate-500">
                  Time spent: {formatDuration(currentAttempt.timeSpentSeconds)}
                </span>
              </div>

              {currentQuestion.explanation && (
                <div className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                  <strong className="text-slate-900 dark:text-white">Explanation: </strong>
                  {currentQuestion.explanation}
                </div>
              )}

              {/* Source Traceability Metadata */}
              <div className="pt-2 border-t border-slate-200/70 dark:border-slate-800 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-mono">
                <span>Topic: {currentQuestion.topic.name}</span>
                {currentQuestion.exam?.name && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>Exam: {currentQuestion.exam.name}</span>
                  </>
                )}
                {currentQuestion.exam?.year && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>Year: {currentQuestion.exam.year}</span>
                  </>
                )}
                {currentQuestion.exam?.shift && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>Shift: {currentQuestion.exam.shift}</span>
                  </>
                )}
                {currentQuestion.source?.pdf && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>
                      Source: {currentQuestion.source.pdf} (Page{' '}
                      {currentQuestion.source.page || '?'}, Q#
                      {currentQuestion.source.originalQuestionNumber || currentQuestion.globalNumber})
                    </span>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right 4 Columns: Desktop Question Palette */}
        <aside className="hidden lg:block lg:col-span-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sticky top-20">
          {renderPaletteGrid()}
        </aside>
      </div>

      {/* Mobile Palette Modal */}
      {mobilePaletteOpen && (
        <div className="fixed inset-0 z-50 lg:hidden bg-black/60 flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-md rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-4">
            <div className="flex justify-end">
              <button
                onClick={() => setMobilePaletteOpen(false)}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {renderPaletteGrid()}
          </div>
        </div>
      )}
    </div>
  );
};
