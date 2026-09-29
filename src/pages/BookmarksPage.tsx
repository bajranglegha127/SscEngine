import React, { useState } from 'react';
import { Bookmark, Play, Trash2 } from 'lucide-react';
import { BookmarkRecord, QuizSessionConfig } from '../types/quiz';
import { StorageService } from '../services/storageService';
import { DEFAULT_PLATFORM_CONFIG } from '../config/quizConfig';

interface BookmarksPageProps {
  onStartQuiz: (config: QuizSessionConfig) => void;
  onBookmarksChanged: () => void;
}

export const BookmarksPage: React.FC<BookmarksPageProps> = ({
  onStartQuiz,
  onBookmarksChanged,
}) => {
  const [bookmarks, setBookmarks] = useState<BookmarkRecord[]>(() =>
    StorageService.getBookmarks()
  );

  const handleRemove = (questionId: string) => {
    StorageService.removeBookmark(questionId);
    setBookmarks(StorageService.getBookmarks());
    onBookmarksChanged();
  };

  const handlePracticeAllBookmarks = () => {
    if (bookmarks.length === 0) return;
    onStartQuiz({
      title: 'Bookmarked Questions Practice',
      subtitle: `${bookmarks.length} Saved Questions`,
      mode: 'bookmarks',
      filters: {
        topicId: 'all',
        questionIds: bookmarks.map((b) => b.questionId),
        orderMode: 'original',
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
            Bookmarked Questions
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Questions saved for revision across all SSC topics. Stored locally in your browser.
          </p>
        </div>

        {bookmarks.length > 0 && (
          <button
            onClick={handlePracticeAllBookmarks}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            <Play className="w-3.5 h-3.5" />
            Practice All {bookmarks.length} Bookmarked Questions
          </button>
        )}
      </div>

      {bookmarks.length === 0 ? (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center space-y-2">
          <Bookmark className="w-8 h-8 text-slate-400 mx-auto" />
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            No Bookmarked Questions Yet
          </h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Click the "Bookmark" button on any question during a quiz, result review, or global search to save it here for quick revision.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {bookmarks.map((item) => {
            const q = item.questionSnapshot;
            return (
              <div
                key={item.questionId}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 font-mono tabular-nums">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {q.id}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{item.topicName}</span>
                    <span aria-hidden="true">·</span>
                    <span>Saved {new Date(item.bookmarkedAt).toLocaleDateString()}</span>
                  </div>

                  <button
                    onClick={() => handleRemove(item.questionId)}
                    className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 hover:underline cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Remove
                  </button>
                </div>

                <p className="text-sm sm:text-base font-medium text-slate-900 dark:text-slate-100">
                  {q.question}
                </p>
                {q.questionHindi && (
                  <p className="text-sm text-slate-600 dark:text-slate-400">{q.questionHindi}</p>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
                  {q.options.map((opt) => (
                    <div
                      key={opt.id}
                      className={`p-2.5 rounded-lg border ${
                        q.correctAnswer === opt.id
                          ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200 font-semibold'
                          : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <span className="font-mono font-bold mr-1.5">{opt.id})</span>
                      {opt.text}
                    </div>
                  ))}
                </div>

                {q.explanation && (
                  <p className="text-xs text-slate-600 dark:text-slate-400 pt-1">
                    <strong>Explanation: </strong>
                    {q.explanation}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
