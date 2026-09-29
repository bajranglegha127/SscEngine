import React, { useEffect, useState } from 'react';
import { Bookmark, Eye, EyeOff, Play, Search } from 'lucide-react';
import { Question, QuizSessionConfig, TopicManifestEntry } from '../types/quiz';
import { QuestionRepository } from '../services/questionRepository';
import { StorageService } from '../services/storageService';
import { DEFAULT_PLATFORM_CONFIG } from '../config/quizConfig';

interface SearchPageProps {
  topics: TopicManifestEntry[];
  onStartQuiz: (config: QuizSessionConfig) => void;
  onBookmarksChanged: () => void;
}

export const SearchPage: React.FC<SearchPageProps> = ({
  topics,
  onStartQuiz,
  onBookmarksChanged,
}) => {
  const [query, setQuery] = useState('');
  const [topicFilter, setTopicFilter] = useState('all');
  const [results, setResults] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(() => {
    return new Set(StorageService.getBookmarks().map((b) => b.questionId));
  });
  const [visibleLimit, setVisibleLimit] = useState(25);

  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const matched = await QuestionRepository.searchQuestions(query, topicFilter);
        if (active) {
          setResults(matched);
          setVisibleLimit(25);
        }
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        if (active) setLoading(false);
      }
    }, 150);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query, topicFilter]);

  const toggleReveal = (id: string) => {
    setRevealedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

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

  const handleStartQuizFromSearch = () => {
    const validIds = results
      .filter((q) => q.correctAnswer !== null && q.verificationStatus !== 'needs_review')
      .slice(0, 100)
      .map((q) => q.id);

    if (validIds.length === 0) return;

    onStartQuiz({
      title: query ? `Search Quiz: "${query}"` : 'Filtered Question Set Quiz',
      subtitle: `${validIds.length} Matching Questions`,
      mode: 'custom',
      filters: {
        topicId: topicFilter,
        questionIds: validIds,
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
            Global Question Search
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Search across all loaded SSC PYQ datasets by question text (English or Hindi), ID, topic, exam, or year.
          </p>
        </div>

        {results.length > 0 && (
          <button
            onClick={handleStartQuizFromSearch}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5" />
            Practice Top {Math.min(100, results.length)} Matches as Quiz
          </button>
        )}
      </div>

      {/* Search Controls */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-3 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder='Search e.g. "perfect square", "algebra-0045", "SSC CGL", "2023", or "पूर्ण वर्ग"...'
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-600"
          />
        </div>

        <div>
          <select
            value={topicFilter}
            onChange={(e) => setTopicFilter(e.target.value)}
            aria-label="Filter by topic"
            className="w-full py-2.5 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-slate-100"
          >
            <option value="all">All Topics</option>
            {topics.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.questionCount})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between text-xs text-slate-500 font-mono tabular-nums">
        <span>
          {loading
            ? 'Searching datasets...'
            : `Showing ${Math.min(visibleLimit, results.length)} of ${results.length} matching questions`}
        </span>
      </div>

      {/* Results List */}
      {results.length === 0 && !loading ? (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-10 text-center space-y-2">
          <p className="text-base font-medium text-slate-900 dark:text-slate-100">
            No questions match your search query.
          </p>
          <p className="text-xs text-slate-500">
            Try searching for a mathematical expression, topic name, exam name, or question ID.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {results.slice(0, visibleLimit).map((q) => {
            const isRevealed = revealedIds.has(q.id);
            const isBookmarked = bookmarkedIds.has(q.id);
            return (
              <div
                key={q.id}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 font-mono tabular-nums">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-slate-900 dark:text-white">{q.id}</span>
                    <span aria-hidden="true">·</span>
                    <span>{q.topic.name}</span>
                    {q.exam?.name && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>{q.exam.name}</span>
                      </>
                    )}
                    {q.exam?.year && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>{q.exam.year}</span>
                      </>
                    )}
                    {q.source?.pdf && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>
                          {q.source.pdf} (p.{q.source.page || '?'})
                        </span>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleReveal(q.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      <span>{isRevealed ? 'Hide Answer' : 'Show Answer'}</span>
                    </button>
                    <button
                      onClick={() => handleToggleBookmark(q)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md border cursor-pointer ${
                        isBookmarked
                          ? 'border-sky-600 text-sky-600 dark:text-sky-400'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <Bookmark className="w-3.5 h-3.5" />
                      <span>{isBookmarked ? 'Saved' : 'Bookmark'}</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <p className="text-sm sm:text-base font-medium text-slate-900 dark:text-slate-100">
                    {q.question}
                  </p>
                  {q.questionHindi && (
                    <p className="text-sm text-slate-600 dark:text-slate-400">{q.questionHindi}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
                  {q.options.map((opt) => {
                    const isCorrect = isRevealed && q.correctAnswer === opt.id;
                    return (
                      <div
                        key={opt.id}
                        className={`p-2.5 rounded-lg border font-medium ${
                          isCorrect
                            ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200'
                            : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <span className="font-mono font-bold mr-1.5">{opt.id})</span>
                        {opt.text}
                      </div>
                    );
                  })}
                </div>

                {isRevealed && (
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
                    <strong className="text-emerald-700 dark:text-emerald-400">
                      Correct Answer: {q.correctAnswer || 'Flagged for Review'}
                    </strong>
                    {q.explanation && <span className="ml-2">— {q.explanation}</span>}
                  </div>
                )}
              </div>
            );
          })}

          {visibleLimit < results.length && (
            <div className="text-center pt-4">
              <button
                onClick={() => setVisibleLimit((v) => v + 50)}
                className="px-5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                Load More Questions ({results.length - visibleLimit} remaining)
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
