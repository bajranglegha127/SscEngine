import { QuestionRange } from '../types/quiz';
import { DEFAULT_PLATFORM_CONFIG } from '../config/quizConfig';

/**
 * Dynamically calculates question ranges (e.g., 1-100, 101-200, ..., 501-548)
 * based on actual available question count. Never generates nonexistent ranges.
 */
export function generateQuestionRanges(
  totalQuestions: number,
  chunkSize: number = DEFAULT_PLATFORM_CONFIG.quiz.rangeSize
): QuestionRange[] {
  if (totalQuestions <= 0 || chunkSize <= 0) {
    return [];
  }

  const ranges: QuestionRange[] = [];
  let start = 1;

  while (start <= totalQuestions) {
    const end = Math.min(start + chunkSize - 1, totalQuestions);
    ranges.push({
      id: `range-${start}-${end}`,
      label: `Questions ${start}–${end}`,
      start,
      end,
      count: end - start + 1,
    });
    start = end + 1;
  }

  return ranges;
}

/**
 * Formats seconds into MM:SS or HH:MM:SS tabular string
 */
export function formatDuration(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  const pad = (n: number) => String(n).padStart(2, '0');
  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(minutes)}:${pad(seconds)}`;
}
