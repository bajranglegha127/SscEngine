import {
  ActiveQuizSession,
  BookmarkRecord,
  MistakeRecord,
  OptionId,
  Question,
  QuizResultSummary,
  ScoringConfig,
} from '../types/quiz';
import { DEFAULT_PLATFORM_CONFIG } from '../config/quizConfig';

const KEYS = {
  THEME: 'ssc_pyq_theme_v1',
  ACTIVE_SESSION: 'ssc_pyq_active_session_v1',
  QUIZ_HISTORY: 'ssc_pyq_history_v1',
  BOOKMARKS: 'ssc_pyq_bookmarks_v1',
  MISTAKES: 'ssc_pyq_mistakes_v1',
  SCORING_PREF: 'ssc_pyq_scoring_pref_v1',
};

function safeRead<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function safeWrite<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn(`LocalStorage write failed for ${key}:`, err);
  }
}

export const StorageService = {
  // Theme
  getTheme(): 'light' | 'dark' {
    const saved = localStorage.getItem(KEYS.THEME);
    if (saved === 'dark' || saved === 'light') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  },

  setTheme(theme: 'light' | 'dark'): void {
    try {
      localStorage.setItem(KEYS.THEME, theme);
    } catch {
      // ignore
    }
  },

  // Scoring configuration preference
  getScoringConfig(): ScoringConfig {
    return safeRead<ScoringConfig>(KEYS.SCORING_PREF, DEFAULT_PLATFORM_CONFIG.scoring);
  },

  setScoringConfig(config: ScoringConfig): void {
    safeWrite(KEYS.SCORING_PREF, config);
  },

  // Active Quiz Session (for refresh/resume)
  getActiveSession(): ActiveQuizSession | null {
    const session = safeRead<ActiveQuizSession | null>(KEYS.ACTIVE_SESSION, null);
    if (!session || session.completed || !Array.isArray(session.questions) || session.questions.length === 0) {
      return null;
    }
    return session;
  },

  saveActiveSession(session: ActiveQuizSession | null): void {
    if (!session) {
      try {
        localStorage.removeItem(KEYS.ACTIVE_SESSION);
      } catch {
        // ignore
      }
      return;
    }
    safeWrite(KEYS.ACTIVE_SESSION, session);
  },

  // Quiz History
  getHistory(): QuizResultSummary[] {
    return safeRead<QuizResultSummary[]>(KEYS.QUIZ_HISTORY, []);
  },

  addHistoryEntry(entry: QuizResultSummary): void {
    const history = this.getHistory().filter((h) => h.id !== entry.id);
    history.unshift(entry);
    safeWrite(KEYS.QUIZ_HISTORY, history.slice(0, 100));
  },

  clearHistory(): void {
    safeWrite(KEYS.QUIZ_HISTORY, []);
  },

  // Bookmarks
  getBookmarks(): BookmarkRecord[] {
    return safeRead<BookmarkRecord[]>(KEYS.BOOKMARKS, []);
  },

  isBookmarked(questionId: string): boolean {
    return this.getBookmarks().some((b) => b.questionId === questionId);
  },

  toggleBookmark(question: Question, note?: string): boolean {
    const list = this.getBookmarks();
    const exists = list.some((b) => b.questionId === question.id);
    if (exists) {
      const filtered = list.filter((b) => b.questionId !== question.id);
      safeWrite(KEYS.BOOKMARKS, filtered);
      return false;
    } else {
      const record: BookmarkRecord = {
        questionId: question.id,
        topicId: question.topic.id,
        topicName: question.topic.name,
        category: question.category,
        bookmarkedAt: new Date().toISOString(),
        note,
        questionSnapshot: question,
      };
      list.unshift(record);
      safeWrite(KEYS.BOOKMARKS, list);
      return true;
    }
  },

  removeBookmark(questionId: string): void {
    const filtered = this.getBookmarks().filter((b) => b.questionId !== questionId);
    safeWrite(KEYS.BOOKMARKS, filtered);
  },

  // Wrong Questions ("My Mistakes")
  getMistakes(): MistakeRecord[] {
    return safeRead<MistakeRecord[]>(KEYS.MISTAKES, []);
  },

  recordMistake(question: Question, selectedOption: OptionId): void {
    if (!question.correctAnswer || selectedOption === question.correctAnswer) return;
    const list = this.getMistakes();
    const existingIdx = list.findIndex((m) => m.questionId === question.id);

    if (existingIdx >= 0) {
      const prev = list[existingIdx];
      list[existingIdx] = {
        ...prev,
        wrongCount: prev.wrongCount + 1,
        lastSelectedOption: selectedOption,
        lastWrongAt: new Date().toISOString(),
        questionSnapshot: question,
      };
    } else {
      list.unshift({
        questionId: question.id,
        topicId: question.topic.id,
        topicName: question.topic.name,
        category: question.category,
        wrongCount: 1,
        lastSelectedOption: selectedOption,
        correctAnswer: question.correctAnswer,
        lastWrongAt: new Date().toISOString(),
        questionSnapshot: question,
      });
    }
    safeWrite(KEYS.MISTAKES, list);
  },

  removeMistake(questionId: string): void {
    const filtered = this.getMistakes().filter((m) => m.questionId !== questionId);
    safeWrite(KEYS.MISTAKES, filtered);
  },

  clearMistakes(): void {
    safeWrite(KEYS.MISTAKES, []);
  },
};
