import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, Play, Trash2 } from 'lucide-react';
import { MistakeRecord, QuizSessionConfig } from '../types/quiz';
import { StorageService } from '../services/storageService';
import { DEFAULT_PLATFORM_CONFIG } from '../config/quizConfig';

interface MistakesPageProps {
  onStartQuiz: (config: QuizSessionConfig) => void;
  onMistakesChanged: () => void;
}

export const MistakesPage: React.FC<MistakesPageProps> = ({
  onStartQuiz,
  onMistakesChanged,
}) => {
  const [mistakes, setMistakes] = useState<MistakeRecord[]>(() =>
    StorageService.getMistakes()
  );

  const handleRemoveMistake = (questionId: string) => {
    StorageService.removeMistake(questionId);
    setMistakes(StorageService.getMistakes());
    onMistakesChanged();
  };

  const handleClearAll = () => {
    StorageService.clearMistakes();
    setMistakes([]);
    onMistakesChanged();
  };

  const handlePracticeMistakes = () => {
    if (mistakes.length === 0) return;
    onStartQuiz({
      title: 'My Mistakes — Targeted Re-Practice',
      subtitle: `${mistakes.length} Previously Incorrect Questions`,
      mode: 'mistakes',
      filters: {
        topicId: 'all',
        questionIds: mistakes.map((m) => m.questionId),
        orderMode: 'random',
      },
      timerMode: 'none',
      totalTimeSeconds: 0,
      perQuestionSeconds: DEFAULT_PLATFORM_CONFIG.quiz.defaultPerQuestionSeconds,
      scoring: StorageService.getScoringConfig(),
      instantFeedback: true,
      allowBackNavigation: true,
      allowAnswerChange: false,
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-slate-900 dark:text-slate-100">
            My Mistakes (Wrong Questions Bank)
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Questions answered incorrectly during quizzes are automatically recorded here so you can practice them until mastered.
          </p>
        </div>

        {mistakes.length > 0 && (
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={handlePracticeMistakes}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              <Play className="w-3.5 h-3.5" />
              Practice All {mistakes.length} Mistakes
            </button>
            <button
              onClick={handleClearAll}
              className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear All
            </button>
          </div>
        )}
      </div>

      {mistakes.length === 0 ? (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center space-y-2">
          <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Zero Pending Mistakes
          </h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Whenever you answer a question wrong in any quiz, it will automatically appear here for targeted revision.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {mistakes.map((item) => {
            const q = item.questionSnapshot;
            return (
              <div
                key={item.questionId}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 font-mono tabular-nums">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-slate-900 dark:text-white">{q.id}</span>
                    <span aria-hidden="true">·</span>
                    <span>{item.topicName}</span>
                    <span aria-hidden="true">·</span>
                    <span className="text-red-600 dark:text-red-400">
                      Missed {item.wrongCount} {item.wrongCount === 1 ? 'time' : 'times'} (Last chose{' '}
                      {item.lastSelectedOption})
                    </span>
                  </div>

                  <button
                    onClick={() => handleRemoveMistake(item.questionId)}
                    className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Mark Mastered & Remove
                  </button>
                </div>

                <p className="text-sm sm:text-base font-medium text-slate-900 dark:text-slate-100">
                  {q.question}
                </p>
                {q.questionHindi && (
                  <p className="text-sm text-slate-600 dark:text-slate-400">{q.questionHindi}</p>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
                  {q.options.map((opt) => {
                    const isCorrect = q.correctAnswer === opt.id;
                    const isLastWrong = item.lastSelectedOption === opt.id && !isCorrect;
                    return (
                      <div
                        key={opt.id}
                        className={`p-2.5 rounded-lg border ${
                          isCorrect
                            ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200 font-semibold'
                            : isLastWrong
                            ? 'border-red-500 bg-red-50 dark:bg-red-950/30 text-red-900 dark:text-red-200'
                            : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <span className="font-mono font-bold mr-1.5">{opt.id})</span>
                        {opt.text}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
