import {
  ManifestData,
  Question,
  QuizFilterCriteria,
  TopicDatasetFile,
  TopicManifestEntry,
} from '../types/quiz';
import { sanitizeQuestions } from '../utils/validation';

const CUSTOM_DATASETS_STORAGE_KEY = 'ssc_pyq_custom_datasets_v1';

export interface TopicMetadataSummary {
  topic: TopicManifestEntry;
  exams: string[];
  years: number[];
  shifts: string[];
  difficulties: string[];
  verifiedCount: number;
  needsReviewCount: number;
}

/**
 * Resolves relative data file URLs safely whether hosted at domain root (/)
 * or under a GitHub Pages repository subpath (/repo-name/).
 */
export function resolveDataUrl(relativePath: string): string {
  const cleanRel = relativePath.replace(/^\/+/, '');
  const baseUrl = import.meta.env.BASE_URL || './';
  if (baseUrl === './' || baseUrl === '.') {
    return `./data/${cleanRel}`;
  }
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  return `${normalizedBase}data/${cleanRel}`;
}

class QuestionRepositoryService {
  private manifestCache: ManifestData | null = null;
  private topicQuestionsCache = new Map<string, Question[]>();
  private topicDatasetMetaCache = new Map<string, TopicDatasetFile>();

  private getCustomDatasets(): TopicDatasetFile[] {
    try {
      const raw = localStorage.getItem(CUSTOM_DATASETS_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  public saveCustomDataset(dataset: TopicDatasetFile): void {
    const existing = this.getCustomDatasets().filter((d) => d.topicId !== dataset.topicId);
    existing.push(dataset);
    localStorage.setItem(CUSTOM_DATASETS_STORAGE_KEY, JSON.stringify(existing));
    this.clearCache();
  }

  public removeCustomDataset(topicId: string): void {
    const existing = this.getCustomDatasets().filter((d) => d.topicId !== topicId);
    localStorage.setItem(CUSTOM_DATASETS_STORAGE_KEY, JSON.stringify(existing));
    this.clearCache();
  }

  public clearCache(): void {
    this.manifestCache = null;
    this.topicQuestionsCache.clear();
    this.topicDatasetMetaCache.clear();
  }

  public async getManifest(forceRefresh = false): Promise<ManifestData> {
    if (this.manifestCache && !forceRefresh) {
      return this.manifestCache;
    }

    const url = resolveDataUrl('manifest.json');
    const response = await fetch(url, { cache: forceRefresh ? 'no-cache' : 'default' });
    if (!response.ok) {
      throw new Error(`Failed to load manifest.json (HTTP ${response.status})`);
    }

    const data = (await response.json()) as ManifestData;
    if (!data || !Array.isArray(data.topics)) {
      throw new Error('Invalid manifest.json format: missing "topics" array.');
    }

    // Merge any locally imported custom JSON datasets (from the Data/Admin tool)
    const customList = this.getCustomDatasets();
    const mergedTopics = [...data.topics];

    for (const custom of customList) {
      const sanitized = sanitizeQuestions(
        custom.questions,
        custom.topicId,
        custom.topicName,
        custom.category
      );
      this.topicQuestionsCache.set(custom.topicId, sanitized);
      this.topicDatasetMetaCache.set(custom.topicId, {
        ...custom,
        questions: sanitized,
      });

      const entry: TopicManifestEntry = {
        id: custom.topicId,
        name: custom.topicName,
        category: custom.category,
        file: `custom/${custom.topicId}.json`,
        questionCount: sanitized.length,
        description: `Imported dataset (${sanitized.length} questions)`,
        sourcePdf: custom.sourcePdf || 'Custom Imported JSON',
        isSample: Boolean(custom.isSample),
        lastUpdated: custom.lastUpdated || new Date().toISOString().slice(0, 10),
      };

      const existingIdx = mergedTopics.findIndex((t) => t.id === custom.topicId);
      if (existingIdx >= 0) {
        mergedTopics[existingIdx] = entry;
      } else {
        mergedTopics.push(entry);
      }
    }

    this.manifestCache = {
      version: data.version || '1.0',
      lastUpdated: data.lastUpdated || new Date().toISOString().slice(0, 10),
      topics: mergedTopics,
    };

    return this.manifestCache;
  }

  public async getTopics(): Promise<TopicManifestEntry[]> {
    const manifest = await this.getManifest();
    return manifest.topics;
  }

  public async getTopic(topicId: string): Promise<TopicManifestEntry | undefined> {
    const topics = await this.getTopics();
    return topics.find((t) => t.id === topicId);
  }

  /**
   * Lazy-loads a single topic's question dataset only when requested.
   */
  public async getTopicQuestions(topicId: string, forceRefresh = false): Promise<Question[]> {
    if (this.topicQuestionsCache.has(topicId) && !forceRefresh) {
      return this.topicQuestionsCache.get(topicId)!;
    }

    // Check custom datasets first
    const customMatch = this.getCustomDatasets().find((d) => d.topicId === topicId);
    if (customMatch) {
      const sanitized = sanitizeQuestions(
        customMatch.questions,
        customMatch.topicId,
        customMatch.topicName,
        customMatch.category
      );
      this.topicQuestionsCache.set(topicId, sanitized);
      return sanitized;
    }

    const topicEntry = await this.getTopic(topicId);
    if (!topicEntry) {
      throw new Error(`Topic "${topicId}" not found in manifest.`);
    }

    const url = resolveDataUrl(topicEntry.file);
    const response = await fetch(url, { cache: forceRefresh ? 'no-cache' : 'default' });
    if (!response.ok) {
      throw new Error(`Unable to load dataset "${topicEntry.name}" from ${topicEntry.file} (HTTP ${response.status}).`);
    }

    const rawJson = await response.json();
    const rawQuestions = Array.isArray(rawJson)
      ? rawJson
      : Array.isArray(rawJson?.questions)
      ? rawJson.questions
      : null;

    if (!rawQuestions) {
      throw new Error(`Dataset "${topicEntry.name}" does not contain a valid questions array.`);
    }

    const questions = sanitizeQuestions(
      rawQuestions,
      topicEntry.id,
      topicEntry.name,
      topicEntry.category
    );

    this.topicQuestionsCache.set(topicId, questions);
    return questions;
  }

  /**
   * Dynamically extracts available exams, years, shifts, and difficulty levels from actual question data.
   */
  public async getTopicMetadataSummary(topicId: string): Promise<TopicMetadataSummary> {
    const topic = await this.getTopic(topicId);
    if (!topic) {
      throw new Error(`Topic "${topicId}" not found.`);
    }

    const questions = await this.getTopicQuestions(topicId);
    const examsSet = new Set<string>();
    const yearsSet = new Set<number>();
    const shiftsSet = new Set<string>();
    const diffSet = new Set<string>();
    let verifiedCount = 0;
    let needsReviewCount = 0;

    for (const q of questions) {
      if (q.exam?.name && q.exam.name.trim()) {
        examsSet.add(q.exam.name.trim());
      }
      if (typeof q.exam?.year === 'number' && !Number.isNaN(q.exam.year)) {
        yearsSet.add(q.exam.year);
      }
      if (q.exam?.shift && q.exam.shift.trim()) {
        shiftsSet.add(q.exam.shift.trim());
      }
      if (q.difficulty && q.difficulty.trim()) {
        diffSet.add(q.difficulty.trim());
      }
      if (q.verificationStatus === 'needs_review' || !q.correctAnswer) {
        needsReviewCount++;
      } else {
        verifiedCount++;
      }
    }

    return {
      topic: {
        ...topic,
        questionCount: questions.length,
      },
      exams: Array.from(examsSet).sort(),
      years: Array.from(yearsSet).sort((a, b) => b - a),
      shifts: Array.from(shiftsSet).sort(),
      difficulties: Array.from(diffSet),
      verifiedCount,
      needsReviewCount,
    };
  }

  /**
   * Filters questions across a single topic or across all loaded topics.
   * Preserves original globalNumber order unless orderMode === 'random'.
   */
  public async getQuestions(filters: QuizFilterCriteria): Promise<Question[]> {
    let pool: Question[] = [];

    if (filters.topicId && filters.topicId !== 'all') {
      pool = await this.getTopicQuestions(filters.topicId);
    } else {
      const topics = await this.getTopics();
      const targetTopics = filters.category && filters.category !== 'all'
        ? topics.filter((t) => t.category === filters.category)
        : topics;

      const loadedArrays = await Promise.all(
        targetTopics.map((t) => this.getTopicQuestions(t.id).catch(() => [] as Question[]))
      );
      pool = loadedArrays.flat();
    }

    // Specific question IDs filter (for Bookmarks / Mistakes practice)
    if (filters.questionIds && filters.questionIds.length > 0) {
      const idSet = new Set(filters.questionIds);
      pool = pool.filter((q) => idSet.has(q.id));
    }

    // Exclude questions without a verified answer unless explicitly requested
    if (!filters.includeNeedsReview) {
      pool = pool.filter((q) => q.correctAnswer !== null && q.verificationStatus !== 'needs_review');
    }

    if (filters.category && filters.category !== 'all') {
      pool = pool.filter((q) => q.category === filters.category);
    }

    if (filters.examName && filters.examName !== 'all') {
      pool = pool.filter((q) => q.exam?.name === filters.examName);
    }

    if (filters.year !== undefined && filters.year !== 0) {
      pool = pool.filter((q) => q.exam?.year === filters.year);
    }

    if (filters.shift && filters.shift !== 'all') {
      pool = pool.filter((q) => q.exam?.shift === filters.shift);
    }

    if (filters.difficulty && filters.difficulty !== 'all') {
      pool = pool.filter((q) => q.difficulty === filters.difficulty);
    }

    // Sort by original stored order / globalNumber first before applying range slicing
    const ordered = [...pool].sort((a, b) => a.globalNumber - b.globalNumber);

    let ranged = ordered;
    if (filters.rangeStart !== undefined && filters.rangeEnd !== undefined) {
      ranged = ordered.filter(
        (q, index) => {
          const num = q.globalNumber || index + 1;
          return num >= filters.rangeStart! && num <= filters.rangeEnd!;
        }
      );
    }

    // Apply ordering (never mutating source data)
    let result = [...ranged];
    if (filters.orderMode === 'random') {
      for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
      }
    }

    if (filters.customCount && filters.customCount > 0 && filters.customCount < result.length) {
      result = result.slice(0, filters.customCount);
    }

    return result;
  }

  /**
   * Global search across all topics by question text, Hindi text, ID, topic, exam, or year.
   */
  public async searchQuestions(query: string, topicFilter?: string, examFilter?: string): Promise<Question[]> {
    const trimmed = query.trim().toLowerCase();
    const topics = await this.getTopics();
    const targetTopics = topicFilter && topicFilter !== 'all'
      ? topics.filter((t) => t.id === topicFilter)
      : topics;

    const allLoaded = await Promise.all(
      targetTopics.map((t) => this.getTopicQuestions(t.id).catch(() => [] as Question[]))
    );
    const allQuestions = allLoaded.flat();

    return allQuestions.filter((q) => {
      if (examFilter && examFilter !== 'all' && q.exam?.name !== examFilter) {
        return false;
      }
      if (!trimmed) return true;

      const inQuestion = q.question.toLowerCase().includes(trimmed);
      const inHindi = q.questionHindi ? q.questionHindi.toLowerCase().includes(trimmed) : false;
      const inId = q.id.toLowerCase().includes(trimmed);
      const inTopic = q.topic.name.toLowerCase().includes(trimmed);
      const inExam = q.exam?.name ? q.exam.name.toLowerCase().includes(trimmed) : false;
      const inYear = q.exam?.year ? String(q.exam.year).includes(trimmed) : false;
      const inExplanation = q.explanation ? q.explanation.toLowerCase().includes(trimmed) : false;

      return inQuestion || inHindi || inId || inTopic || inExam || inYear || inExplanation;
    });
  }
}

export const QuestionRepository = new QuestionRepositoryService();
