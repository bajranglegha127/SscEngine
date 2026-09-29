/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  ActiveQuizSession,
  ManifestData,
  QuizResultSummary,
  QuizSessionConfig,
} from './types/quiz';
import { QuestionRepository } from './services/questionRepository';
import { StorageService } from './services/storageService';
import { DEFAULT_PLATFORM_CONFIG } from './config/quizConfig';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Navbar, NavTab } from './components/Navbar';
import { OfflineIndicator } from './components/OfflineIndicator';
import { HomePage } from './pages/HomePage';
import { TopicPage } from './pages/TopicPage';
import { QuizPage } from './pages/QuizPage';
import { ResultPage } from './pages/ResultPage';
import { SearchPage } from './pages/SearchPage';
import { BookmarksPage } from './pages/BookmarksPage';
import { MistakesPage } from './pages/MistakesPage';
import { HistoryPage } from './pages/HistoryPage';
import { AdminDataToolsPage } from './pages/AdminDataToolsPage';

type ViewState =
  | { type: 'tab'; tab: NavTab }
  | { type: 'topic'; topicId: string }
  | { type: 'quiz'; session: ActiveQuizSession }
  | { type: 'result'; result: QuizResultSummary; lastConfig?: QuizSessionConfig };

export default function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => StorageService.getTheme());
  const [manifest, setManifest] = useState<ManifestData | null>(null);
  const [manifestLoading, setManifestLoading] = useState<boolean>(true);
  const [manifestError, setManifestError] = useState<string | null>(null);

  const [view, setView] = useState<ViewState>({ type: 'tab', tab: 'dashboard' });
  const [savedActiveSession, setSavedActiveSession] = useState<ActiveQuizSession | null>(() =>
    StorageService.getActiveSession()
  );
  const [bookmarksCount, setBookmarksCount] = useState<number>(
    () => StorageService.getBookmarks().length
  );
  const [mistakesCount, setMistakesCount] = useState<number>(
    () => StorageService.getMistakes().length
  );
  const [preparingQuiz, setPreparingQuiz] = useState<boolean>(false);
  const [quizLoadError, setQuizLoadError] = useState<string | null>(null);

  // Sync dark mode class on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    StorageService.setTheme(theme);
  }, [theme]);

  const loadManifest = useCallback(async (force = false) => {
    setManifestLoading(true);
    setManifestError(null);
    try {
      const data = await QuestionRepository.getManifest(force);
      setManifest(data);
    } catch (err: any) {
      setManifestError(err?.message || 'Failed to load manifest.json.');
    } finally {
      setManifestLoading(false);
    }
  }, []);

  useEffect(() => {
    loadManifest();
  }, [loadManifest]);

  const refreshCounts = useCallback(() => {
    setBookmarksCount(StorageService.getBookmarks().length);
    setMistakesCount(StorageService.getMistakes().length);
  }, []);

  const handleStartQuiz = async (config: QuizSessionConfig) => {
    setPreparingQuiz(true);
    setQuizLoadError(null);
    try {
      const questions = await QuestionRepository.getQuestions(config.filters);
      if (questions.length === 0) {
        setQuizLoadError('No questions matched the selected filters.');
        return;
      }

      const newSession: ActiveQuizSession = {
        sessionId: `quiz-${Date.now()}`,
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        config,
        questions,
        attempts: {},
        currentIndex: 0,
        elapsedSeconds: 0,
        remainingSeconds: config.totalTimeSeconds || 0,
        completed: false,
      };

      StorageService.saveActiveSession(newSession);
      setSavedActiveSession(newSession);
      setView({ type: 'quiz', session: newSession });
    } catch (err: any) {
      setQuizLoadError(err?.message || 'Unable to prepare quiz questions.');
    } finally {
      setPreparingQuiz(false);
    }
  };

  const activeNavTab: NavTab = view.type === 'tab' ? view.tab : 'dashboard';

  return (
    <ErrorBoundary>
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
        <Navbar
          activeTab={activeNavTab}
          onSelectTab={(tab) => setView({ type: 'tab', tab })}
          theme={theme}
          onToggleTheme={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
          bookmarksCount={bookmarksCount}
          mistakesCount={mistakesCount}
        />

        {preparingQuiz && (
          <div className="bg-sky-600 text-white text-xs font-medium py-2 px-4 text-center">
            Preparing quiz session...
          </div>
        )}

        {quizLoadError && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-4 w-full">
            <div className="rounded-lg border border-red-300 bg-red-50 dark:bg-red-950/40 p-3 text-xs text-red-700 dark:text-red-300 flex items-center justify-between">
              <span>{quizLoadError}</span>
              <button
                onClick={() => setQuizLoadError(null)}
                className="underline font-semibold ml-4 cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        <main className="flex-1">
          {view.type === 'tab' && view.tab === 'dashboard' && (
            <HomePage
              manifest={manifest}
              loading={manifestLoading}
              error={manifestError}
              onRetry={() => loadManifest(true)}
              onSelectTopic={(topicId) => setView({ type: 'topic', topicId })}
              onStartQuiz={handleStartQuiz}
              activeSession={savedActiveSession}
              onResumeSession={() => {
                if (savedActiveSession) {
                  setView({ type: 'quiz', session: savedActiveSession });
                }
              }}
              onDiscardSession={() => {
                StorageService.saveActiveSession(null);
                setSavedActiveSession(null);
              }}
            />
          )}

          {view.type === 'tab' && view.tab === 'search' && (
            <SearchPage
              topics={manifest?.topics || []}
              onStartQuiz={handleStartQuiz}
              onBookmarksChanged={refreshCounts}
            />
          )}

          {view.type === 'tab' && view.tab === 'bookmarks' && (
            <BookmarksPage
              onStartQuiz={handleStartQuiz}
              onBookmarksChanged={refreshCounts}
            />
          )}

          {view.type === 'tab' && view.tab === 'mistakes' && (
            <MistakesPage
              onStartQuiz={handleStartQuiz}
              onMistakesChanged={refreshCounts}
            />
          )}

          {view.type === 'tab' && view.tab === 'history' && (
            <HistoryPage
              onSelectResult={(result) => setView({ type: 'result', result })}
            />
          )}

          {view.type === 'tab' && view.tab === 'admin' && (
            <AdminDataToolsPage
              topics={manifest?.topics || []}
              onDatasetsUpdated={() => loadManifest(true)}
            />
          )}

          {view.type === 'topic' && (
            <TopicPage
              topicId={view.topicId}
              onBack={() => setView({ type: 'tab', tab: 'dashboard' })}
              onStartQuiz={handleStartQuiz}
            />
          )}

          {view.type === 'quiz' && (
            <QuizPage
              session={view.session}
              onUpdateSession={(updated) => setSavedActiveSession(updated)}
              onFinishQuiz={(result) => {
                setSavedActiveSession(null);
                setView({
                  type: 'result',
                  result,
                  lastConfig: view.session.config,
                });
              }}
              onExitQuiz={() => {
                setSavedActiveSession(StorageService.getActiveSession());
                setView({ type: 'tab', tab: 'dashboard' });
              }}
              onBookmarksChanged={refreshCounts}
              onMistakesChanged={refreshCounts}
            />
          )}

          {view.type === 'result' && (
            <ResultPage
              result={view.result}
              onRetakeQuiz={() => {
                if (view.lastConfig) {
                  handleStartQuiz(view.lastConfig);
                } else if (view.result.topicId) {
                  setView({ type: 'topic', topicId: view.result.topicId });
                } else {
                  setView({ type: 'tab', tab: 'dashboard' });
                }
              }}
              onPracticeMistakes={(questionIds) => {
                handleStartQuiz({
                  title: `${view.result.title} — Retry Incorrect Questions`,
                  subtitle: `${questionIds.length} Questions`,
                  mode: 'mistakes',
                  filters: {
                    topicId: view.result.topicId || 'all',
                    questionIds,
                    orderMode: 'original',
                  },
                  timerMode: 'none',
                  totalTimeSeconds: 0,
                  perQuestionSeconds: DEFAULT_PLATFORM_CONFIG.quiz.defaultPerQuestionSeconds,
                  scoring: view.result.scoring,
                  instantFeedback: true,
                  allowBackNavigation: true,
                  allowAnswerChange: false,
                });
              }}
              onBackToDashboard={() => setView({ type: 'tab', tab: 'dashboard' })}
              onBookmarksChanged={refreshCounts}
            />
          )}
        </main>

        <footer className="border-t border-slate-200 dark:border-slate-800 py-5 px-4 sm:px-6 text-xs text-slate-500 dark:text-slate-400">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>SSC PYQ MCQ Quiz Platform · Data-Driven Static Architecture</span>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setView({ type: 'tab', tab: 'admin' })}
                className="hover:text-slate-900 dark:hover:text-white cursor-pointer"
              >
                Data Validation & PDF Import Guide
              </button>
            </div>
          </div>
        </footer>

        <OfflineIndicator />
      </div>
    </ErrorBoundary>
  );
}
