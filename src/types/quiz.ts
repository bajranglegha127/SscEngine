export type OptionId = 'A' | 'B' | 'C' | 'D';

export interface QuestionOption {
  id: OptionId;
  text: string;
}

export interface QuestionTopicRef {
  id: string;
  name: string;
}

export interface QuestionExamMeta {
  name?: string;
  year?: number;
  shift?: string;
  tier?: string;
  date?: string;
}

export interface QuestionSourceMeta {
  pdf?: string;
  page?: number;
  originalQuestionNumber?: number;
}

export type VerificationStatus = 'verified' | 'needs_review';

export interface Question {
  id: string;
  globalNumber: number;
  topic: QuestionTopicRef;
  category: string;
  question: string;
  questionHindi?: string;
  options: QuestionOption[];
  correctAnswer: OptionId | null;
  explanation?: string;
  exam?: QuestionExamMeta;
  source?: QuestionSourceMeta;
  verificationStatus?: VerificationStatus;
  verificationNotes?: string;
  contentHash?: string;
  difficulty?: 'Easy' | 'Moderate' | 'Hard';
  language?: string;
  subtopic?: string;
  tags?: string[];
  isSample?: boolean;
  [key: string]: unknown;
}

export interface TopicManifestEntry {
  id: string;
  name: string;
  category: string;
  file: string;
  questionCount: number;
  description?: string;
  sourcePdf?: string;
  isSample?: boolean;
  lastUpdated?: string;
}

export interface ManifestData {
  version: string;
  lastUpdated: string;
  topics: TopicManifestEntry[];
}

export interface TopicDatasetFile {
  version?: string;
  lastUpdated?: string;
  topicId: string;
  topicName: string;
  category: string;
  sourcePdf?: string;
  isSample?: boolean;
  questions: Question[];
}

export interface QuestionRange {
  id: string;
  label: string;
  start: number;
  end: number;
  count: number;
}

export type QuizMode =
  | 'full_topic'
  | 'range'
  | 'exam'
  | 'year'
  | 'exam_year'
  | 'custom'
  | 'random'
  | 'mistakes'
  | 'bookmarks';

export type TimerMode = 'none' | 'full_quiz' | 'per_question';

export type OrderMode = 'original' | 'random';

export interface QuizFilterCriteria {
  topicId?: string;
  category?: string;
  examName?: string;
  year?: number;
  shift?: string;
  difficulty?: string;
  rangeStart?: number;
  rangeEnd?: number;
  customCount?: number;
  orderMode?: OrderMode;
  shuffleOptions?: boolean;
  includeNeedsReview?: boolean;
  questionIds?: string[];
}

export interface ScoringConfig {
  correctMarks: number;
  incorrectMarks: number;
  unansweredMarks: number;
}

export interface QuizSessionConfig {
  title: string;
  subtitle?: string;
  mode: QuizMode;
  filters: QuizFilterCriteria;
  timerMode: TimerMode;
  totalTimeSeconds: number;
  perQuestionSeconds: number;
  scoring: ScoringConfig;
  instantFeedback: boolean;
  allowBackNavigation: boolean;
  allowAnswerChange: boolean;
}

export interface QuestionAttemptState {
  questionId: string;
  visited: boolean;
  selectedOptionId: OptionId | null;
  locked: boolean;
  markedForReview: boolean;
  timeSpentSeconds: number;
  shuffledOptionIds?: OptionId[];
}

export interface ActiveQuizSession {
  sessionId: string;
  startedAt: string;
  updatedAt: string;
  config: QuizSessionConfig;
  questions: Question[];
  attempts: Record<string, QuestionAttemptState>;
  currentIndex: number;
  elapsedSeconds: number;
  remainingSeconds: number;
  completed: boolean;
}

export interface QuizResultSummary {
  id: string;
  sessionId: string;
  title: string;
  subtitle?: string;
  topicId?: string;
  topicName?: string;
  category?: string;
  examName?: string;
  year?: number;
  shift?: string;
  mode: QuizMode;
  completedAt: string;
  totalQuestions: number;
  attempted: number;
  correct: number;
  incorrect: number;
  unanswered: number;
  markedForReviewCount: number;
  score: number;
  maxScore: number;
  accuracy: number;
  timeTakenSeconds: number;
  scoring: ScoringConfig;
  questionResults: {
    questionId: string;
    globalNumber: number;
    selectedOptionId: OptionId | null;
    correctAnswer: OptionId | null;
    isCorrect: boolean;
    isUnanswered: boolean;
    timeSpentSeconds: number;
    markedForReview: boolean;
  }[];
}

export interface MistakeRecord {
  questionId: string;
  topicId: string;
  topicName: string;
  category: string;
  wrongCount: number;
  lastSelectedOption: OptionId;
  correctAnswer: OptionId | null;
  lastWrongAt: string;
  questionSnapshot: Question;
}

export interface BookmarkRecord {
  questionId: string;
  topicId: string;
  topicName: string;
  category: string;
  bookmarkedAt: string;
  note?: string;
  questionSnapshot: Question;
}

export interface ValidationIssue {
  severity: 'error' | 'warning';
  questionId: string;
  globalNumber?: number;
  field: string;
  message: string;
}

export interface DuplicateGroup {
  hash: string;
  normalizedText: string;
  questions: {
    id: string;
    globalNumber: number;
    topicId: string;
    sourcePdf?: string;
    page?: number;
    exam?: string;
    year?: number;
  }[];
}

export interface DatasetValidationReport {
  datasetName: string;
  totalQuestions: number;
  validQuestions: number;
  errorCount: number;
  warningCount: number;
  needsReviewCount: number;
  missingAnswersCount: number;
  duplicateIds: string[];
  duplicateContentGroups: DuplicateGroup[];
  issues: ValidationIssue[];
}
