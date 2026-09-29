import React, { useState } from 'react';
import { Clock, Eye, Trash2 } from 'lucide-react';
import { QuizResultSummary } from '../types/quiz';
import { StorageService } from '../services/storageService';
import { formatDuration } from '../utils/rangeUtils';

interface HistoryPageProps {
  onSelectResult: (result: QuizResultSummary) => void;
}

export const HistoryPage: React.FC<HistoryPageProps> = ({ onSelectResult }) => {
  const [history, setHistory] = useState<QuizResultSummary[]>(() =>
    StorageService.getHistory()
  );

  const handleClearHistory = () => {
    StorageService.clearHistory();
    setHistory([]);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-slate-900 dark:text-slate-100">
            Local Quiz Attempt History
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Review your past attempts, accuracy trends, and question-by-question breakdowns.
          </p>
        </div>

        {history.length > 0 && (
          <button
            onClick={handleClearHistory}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear History
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center space-y-2">
          <Clock className="w-8 h-8 text-slate-400 mx-auto" />
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            No Completed Quizzes Yet
          </h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Complete any topic, range, or custom quiz to track your scores and review previous attempts here.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-xs font-semibold text-slate-600 dark:text-slate-400">
                  <th className="py-3 px-4">Quiz / Topic</th>
                  <th className="py-3 px-4">Questions</th>
                  <th className="py-3 px-4">Score</th>
                  <th className="py-3 px-4">✓ / ✗ / —</th>
                  <th className="py-3 px-4">Accuracy</th>
                  <th className="py-3 px-4">Time</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono tabular-nums text-xs">
                {history.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3.5 px-4 font-sans">
                      <div className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                        {item.title}
                      </div>
                      {item.subtitle && (
                        <div className="text-xs text-slate-500">{item.subtitle}</div>
                      )}
                    </td>
                    <td className="py-3.5 px-4">{item.totalQuestions}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                      {item.score} / {item.maxScore}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="text-emerald-600 dark:text-emerald-400">{item.correct}✓</span>{' '}
                      · <span className="text-red-600 dark:text-red-400">{item.incorrect}✗</span> ·{' '}
                      <span className="text-slate-500">{item.unanswered}—</span>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-sky-600 dark:text-sky-400">
                      {item.accuracy}%
                    </td>
                    <td className="py-3.5 px-4">{formatDuration(item.timeTakenSeconds)}</td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {new Date(item.completedAt).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-right font-sans">
                      <button
                        onClick={() => onSelectResult(item)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-sky-600 hover:text-white transition-colors font-medium cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
