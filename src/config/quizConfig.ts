import { ScoringConfig } from '../types/quiz';

export interface PlatformConfig {
  quiz: {
    defaultQuestions: number;
    rangeSize: number;
    allowBackNavigation: boolean;
    showExplanationAfterAnswer: boolean;
    allowMarkForReview: boolean;
    allowTimer: boolean;
    defaultTimerMinutes: number;
    defaultPerQuestionSeconds: number;
  };
  scoring: ScoringConfig;
  scoringPresets: {
    id: string;
    label: string;
    description: string;
    config: ScoringConfig;
  }[];
}

export const DEFAULT_PLATFORM_CONFIG: PlatformConfig = {
  quiz: {
    defaultQuestions: 25,
    rangeSize: 100,
    allowBackNavigation: true,
    showExplanationAfterAnswer: true,
    allowMarkForReview: true,
    allowTimer: true,
    defaultTimerMinutes: 30,
    defaultPerQuestionSeconds: 60,
  },
  scoring: {
    correctMarks: 2,
    incorrectMarks: -0.5,
    unansweredMarks: 0,
  },
  scoringPresets: [
    {
      id: 'ssc_tier1',
      label: 'SSC Tier-I Standard (+2 / -0.5)',
      description: '2 marks for each correct answer, 0.50 negative marking for wrong answers.',
      config: { correctMarks: 2, incorrectMarks: -0.5, unansweredMarks: 0 },
    },
    {
      id: 'ssc_tier2',
      label: 'SSC Tier-II Mains (+3 / -1)',
      description: '3 marks for each correct answer, 1 mark negative marking for wrong answers.',
      config: { correctMarks: 3, incorrectMarks: -1, unansweredMarks: 0 },
    },
    {
      id: 'practice_no_negative',
      label: 'Practice Mode (+1 / 0)',
      description: '1 mark per correct answer with no negative marking.',
      config: { correctMarks: 1, incorrectMarks: 0, unansweredMarks: 0 },
    },
  ],
};
