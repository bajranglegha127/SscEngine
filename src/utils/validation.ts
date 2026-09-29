import {
  DatasetValidationReport,
  DuplicateGroup,
  OptionId,
  Question,
  ValidationIssue,
} from '../types/quiz';

const VALID_OPTION_IDS: OptionId[] = ['A', 'B', 'C', 'D'];

/**
 * Computes a normalized content hash for duplicate PYQ detection across PDFs.
 */
export function normalizeQuestionText(text: string): string {
  return (text || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\u0900-\u097F√±²³⁴⁵⁶⁷⁸⁹⁰+\-*/=().,]/g, '')
    .trim();
}

export function computeQuestionHash(text: string): string {
  const normalized = normalizeQuestionText(text);
  let hash = 2166136261;
  for (let i = 0; i < normalized.length; i++) {
    hash ^= normalized.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `qh-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

/**
 * Validates an array of questions and returns a comprehensive report without throwing.
 */
export function validateQuestionDataset(
  questions: unknown[],
  datasetName: string = 'Dataset'
): DatasetValidationReport {
  const issues: ValidationIssue[] = [];
  const seenIds = new Set<string>();
  const duplicateIds = new Set<string>();
  const hashGroups = new Map<string, DuplicateGroup>();

  let validQuestions = 0;
  let needsReviewCount = 0;
  let missingAnswersCount = 0;

  if (!Array.isArray(questions)) {
    return {
      datasetName,
      totalQuestions: 0,
      validQuestions: 0,
      errorCount: 1,
      warningCount: 0,
      needsReviewCount: 0,
      missingAnswersCount: 0,
      duplicateIds: [],
      duplicateContentGroups: [],
      issues: [
        {
          severity: 'error',
          questionId: 'ROOT',
          field: 'questions',
          message: 'Dataset questions property is not a valid array.',
        },
      ],
    };
  }

  questions.forEach((rawItem, idx) => {
    if (!rawItem || typeof rawItem !== 'object') {
      issues.push({
        severity: 'error',
        questionId: `index-${idx}`,
        field: 'object',
        message: `Question at index ${idx} is not a valid object.`,
      });
      return;
    }

    const q = rawItem as Partial<Question>;
    const qId = typeof q.id === 'string' && q.id.trim() ? q.id.trim() : `missing-id-${idx + 1}`;
    const gNum = typeof q.globalNumber === 'number' ? q.globalNumber : idx + 1;
    let hasError = false;

    // 1. Check ID stability and uniqueness
    if (!q.id || typeof q.id !== 'string' || !q.id.trim()) {
      hasError = true;
      issues.push({
        severity: 'error',
        questionId: qId,
        globalNumber: gNum,
        field: 'id',
        message: 'Missing stable string question ID.',
      });
    } else if (seenIds.has(qId)) {
      hasError = true;
      duplicateIds.add(qId);
      issues.push({
        severity: 'error',
        questionId: qId,
        globalNumber: gNum,
        field: 'id',
        message: `Duplicate question ID "${qId}" detected.`,
      });
    } else {
      seenIds.add(qId);
    }

    // 2. Check question text
    if (!q.question || typeof q.question !== 'string' || !q.question.trim()) {
      hasError = true;
      issues.push({
        severity: 'error',
        questionId: qId,
        globalNumber: gNum,
        field: 'question',
        message: 'Question text is empty or missing.',
      });
    }

    // 3. Check topic metadata
    if (!q.topic || typeof q.topic !== 'object' || !q.topic.id || !q.topic.name) {
      hasError = true;
      issues.push({
        severity: 'error',
        questionId: qId,
        globalNumber: gNum,
        field: 'topic',
        message: 'Missing topic.id or topic.name metadata.',
      });
    }

    // 4. Check options
    if (!Array.isArray(q.options) || q.options.length < 4) {
      hasError = true;
      issues.push({
        severity: 'error',
        questionId: qId,
        globalNumber: gNum,
        field: 'options',
        message: `Expected 4 options, found ${Array.isArray(q.options) ? q.options.length : 0}.`,
      });
    } else {
      const optIds = new Set<string>();
      q.options.forEach((opt, optIdx) => {
        if (!opt || !VALID_OPTION_IDS.includes(opt.id as OptionId)) {
          hasError = true;
          issues.push({
            severity: 'error',
            questionId: qId,
            globalNumber: gNum,
            field: `options[${optIdx}].id`,
            message: `Invalid option ID "${opt?.id}". Must be A, B, C, or D.`,
          });
        } else if (optIds.has(opt.id)) {
          hasError = true;
          issues.push({
            severity: 'error',
            questionId: qId,
            globalNumber: gNum,
            field: `options[${optIdx}].id`,
            message: `Duplicate option ID "${opt.id}" in question.`,
          });
        } else {
          optIds.add(opt.id);
        }

        if (typeof opt?.text !== 'string' || !opt.text.trim()) {
          issues.push({
            severity: 'warning',
            questionId: qId,
            globalNumber: gNum,
            field: `options[${optIdx}].text`,
            message: `Option ${opt?.id || optIdx} has empty text.`,
          });
        }
      });
    }

    // 5. Check correctAnswer & verificationStatus
    if (q.verificationStatus === 'needs_review') {
      needsReviewCount++;
      issues.push({
        severity: 'warning',
        questionId: qId,
        globalNumber: gNum,
        field: 'verificationStatus',
        message: q.verificationNotes || 'Flagged as needs_review from source PDF.',
      });
    }

    if (!q.correctAnswer || !VALID_OPTION_IDS.includes(q.correctAnswer as OptionId)) {
      missingAnswersCount++;
      if (q.verificationStatus !== 'needs_review') {
        hasError = true;
        issues.push({
          severity: 'error',
          questionId: qId,
          globalNumber: gNum,
          field: 'correctAnswer',
          message: `Invalid or missing correctAnswer "${String(q.correctAnswer)}".`,
        });
      }
    }

    // 6. Check exam metadata if present
    if (q.exam) {
      if (q.exam.year !== undefined) {
        const yr = Number(q.exam.year);
        if (!Number.isInteger(yr) || yr < 1990 || yr > 2035) {
          issues.push({
            severity: 'warning',
            questionId: qId,
            globalNumber: gNum,
            field: 'exam.year',
            message: `Unusual exam year "${String(q.exam.year)}".`,
          });
        }
      }
    }

    // 7. Duplicate content hash tracking
    if (q.question && typeof q.question === 'string') {
      const hash = q.contentHash || computeQuestionHash(q.question);
      const existing = hashGroups.get(hash);
      const entry = {
        id: qId,
        globalNumber: gNum,
        topicId: q.topic?.id || 'unknown',
        sourcePdf: q.source?.pdf,
        page: q.source?.page,
        exam: q.exam?.name,
        year: q.exam?.year,
      };
      if (existing) {
        existing.questions.push(entry);
      } else {
        hashGroups.set(hash, {
          hash,
          normalizedText: q.question.slice(0, 140),
          questions: [entry],
        });
      }
    }

    if (!hasError) {
      validQuestions++;
    }
  });

  const duplicateContentGroups = Array.from(hashGroups.values()).filter(
    (g) => g.questions.length > 1
  );

  const errorCount = issues.filter((i) => i.severity === 'error').length;
  const warningCount = issues.filter((i) => i.severity === 'warning').length;

  return {
    datasetName,
    totalQuestions: questions.length,
    validQuestions,
    errorCount,
    warningCount,
    needsReviewCount,
    missingAnswersCount,
    duplicateIds: Array.from(duplicateIds),
    duplicateContentGroups,
    issues,
  };
}

/**
 * Sanitizes and normalizes raw question objects loaded from JSON so malformed items never crash the UI.
 */
export function sanitizeQuestions(rawQuestions: unknown[], fallbackTopicId: string, fallbackTopicName: string, fallbackCategory: string): Question[] {
  if (!Array.isArray(rawQuestions)) return [];

  return rawQuestions
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
    .map((item, idx) => {
      const globalNumber = typeof item.globalNumber === 'number' ? item.globalNumber : idx + 1;
      const id = typeof item.id === 'string' && item.id.trim() ? item.id.trim() : `${fallbackTopicId}-${String(globalNumber).padStart(4, '0')}`;
      const questionText = typeof item.question === 'string' && item.question.trim() ? item.question : `[Question ${globalNumber} text unavailable]`;

      const rawOptions = Array.isArray(item.options) ? item.options : [];
      const normalizedOptions: { id: OptionId; text: string }[] = VALID_OPTION_IDS.map((optId, i) => {
        const match = rawOptions.find((o: any) => o && String(o.id).toUpperCase() === optId) || rawOptions[i];
        return {
          id: optId,
          text: match && typeof (match as any).text === 'string' && (match as any).text.trim()
            ? (match as any).text.trim()
            : `Option ${optId}`,
        };
      });

      const rawCorrect = typeof item.correctAnswer === 'string' ? item.correctAnswer.toUpperCase() : null;
      const correctAnswer: OptionId | null = VALID_OPTION_IDS.includes(rawCorrect as OptionId)
        ? (rawCorrect as OptionId)
        : null;

      const topicObj = item.topic && typeof item.topic === 'object'
        ? {
            id: String((item.topic as any).id || fallbackTopicId),
            name: String((item.topic as any).name || fallbackTopicName),
          }
        : { id: fallbackTopicId, name: fallbackTopicName };

      return {
        ...item,
        id,
        globalNumber,
        topic: topicObj,
        category: typeof item.category === 'string' ? item.category : fallbackCategory,
        question: questionText,
        questionHindi: typeof item.questionHindi === 'string' ? item.questionHindi : undefined,
        options: normalizedOptions,
        correctAnswer,
        explanation: typeof item.explanation === 'string' ? item.explanation : undefined,
        verificationStatus: item.verificationStatus === 'needs_review' || !correctAnswer ? 'needs_review' : 'verified',
        contentHash: typeof item.contentHash === 'string' ? item.contentHash : computeQuestionHash(questionText),
      } as Question;
    });
}
