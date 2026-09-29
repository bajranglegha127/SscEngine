import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  FileCheck2,
  FileWarning,
  PlusCircle,
  Upload,
} from 'lucide-react';
import {
  DatasetValidationReport,
  TopicDatasetFile,
  TopicManifestEntry,
} from '../types/quiz';
import { QuestionRepository } from '../services/questionRepository';
import { validateQuestionDataset } from '../utils/validation';

interface AdminDataToolsPageProps {
  topics: TopicManifestEntry[];
  onDatasetsUpdated: () => void;
}

const VALID_JSON_EXAMPLE = `{
  "version": "1.0",
  "lastUpdated": "2026-09-29",
  "topicId": "time-and-work",
  "topicName": "Time & Work",
  "category": "Quantitative Aptitude",
  "sourcePdf": "SSC_Time_And_Work_PYQ.pdf",
  "questions": [
    {
      "id": "time-work-0001",
      "globalNumber": 1,
      "topic": { "id": "time-and-work", "name": "Time & Work" },
      "category": "Quantitative Aptitude",
      "question": "A can complete a piece of work in 15 days and B in 20 days. Working together, in how many days will they complete 70% of the same work?",
      "options": [
        { "id": "A", "text": "6 days" },
        { "id": "B", "text": "7 days" },
        { "id": "C", "text": "8 days" },
        { "id": "D", "text": "5 days" }
      ],
      "correctAnswer": "A",
      "explanation": "Combined 1 day work = 1/15 + 1/20 = 7/60. Time for 70% (7/10) work = (7/10) ÷ (7/60) = 6 days.",
      "exam": { "name": "SSC CGL", "year": 2023, "shift": "Shift 1" },
      "source": { "pdf": "SSC_Time_And_Work_PYQ.pdf", "page": 4, "originalQuestionNumber": 1 },
      "verificationStatus": "verified"
    }
  ]
}`;

const INVALID_JSON_EXAMPLE = `{
  "topicId": "broken-topic",
  "questions": [
    {
      "id": "",
      "question": "",
      "options": [
        { "id": "A", "text": "Only two options" },
        { "id": "A", "text": "Duplicate option ID A" }
      ],
      "correctAnswer": "E"
    }
  ]
}`;

export const AdminDataToolsPage: React.FC<AdminDataToolsPageProps> = ({
  topics,
  onDatasetsUpdated,
}) => {
  const [selectedTopicId, setSelectedTopicId] = useState<string>(
    topics[0]?.id || 'algebra'
  );
  const [report, setReport] = useState<DatasetValidationReport | null>(null);
  const [loadingReport, setLoadingReport] = useState<boolean>(false);
  const [jsonInput, setJsonInput] = useState<string>(VALID_JSON_EXAMPLE);
  const [customValidationReport, setCustomValidationReport] =
    useState<DatasetValidationReport | null>(null);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  useEffect(() => {
    const inspectSelectedTopic = async () => {
      if (!selectedTopicId) return;
      setLoadingReport(true);
      try {
        const questions = await QuestionRepository.getTopicQuestions(selectedTopicId);
        const topicMeta = topics.find((t) => t.id === selectedTopicId);
        const validation = validateQuestionDataset(
          questions,
          topicMeta ? `${topicMeta.name} (${topicMeta.file})` : selectedTopicId
        );
        setReport(validation);
      } catch (err) {
        console.error('Validation error:', err);
      } finally {
        setLoadingReport(false);
      }
    };
    inspectSelectedTopic();
  }, [selectedTopicId, topics]);

  const handleValidateCustomJson = () => {
    setImportMessage(null);
    setImportError(null);
    try {
      const parsed = JSON.parse(jsonInput);
      const qArray = Array.isArray(parsed) ? parsed : parsed.questions;
      const result = validateQuestionDataset(
        qArray,
        parsed.topicName || 'Custom JSON Input'
      );
      setCustomValidationReport(result);
    } catch (err: any) {
      setImportError(`Invalid JSON syntax: ${err.message}`);
      setCustomValidationReport(null);
    }
  };

  const handleRegisterCustomDataset = () => {
    setImportMessage(null);
    setImportError(null);
    try {
      const parsed = JSON.parse(jsonInput) as TopicDatasetFile;
      const qArray = Array.isArray(parsed) ? parsed : parsed.questions;
      if (!Array.isArray(qArray) || qArray.length === 0) {
        setImportError('JSON must contain a non-empty "questions" array.');
        return;
      }

      const firstQ = qArray[0] as any;
      const topicId = parsed.topicId || firstQ?.topic?.id || `custom-${Date.now()}`;
      const topicName = parsed.topicName || firstQ?.topic?.name || 'Custom Topic';
      const category = parsed.category || firstQ?.category || 'Quantitative Aptitude';

      const validation = validateQuestionDataset(qArray, topicName);
      setCustomValidationReport(validation);

      QuestionRepository.saveCustomDataset({
        version: parsed.version || '1.0',
        lastUpdated: new Date().toISOString().slice(0, 10),
        topicId,
        topicName,
        category,
        sourcePdf: parsed.sourcePdf || firstQ?.source?.pdf || 'Imported_JSON.pdf',
        isSample: false,
        questions: qArray,
      });

      setImportMessage(
        `Topic "${topicName}" (${qArray.length} questions) registered dynamically! Open Topics Dashboard to practice it immediately.`
      );
      onDatasetsUpdated();
    } catch (err: any) {
      setImportError(`Failed to parse or register JSON: ${err.message}`);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-10">
      <div className="border-b border-slate-200 dark:border-slate-800 pb-6 space-y-2">
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-slate-900 dark:text-slate-100">
          Data Validation, Duplicate Detection & PDF Import Tools
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 max-w-3xl">
          Audit existing topic datasets for missing answers, duplicate IDs, duplicate PYQ content hashes, and items flagged for manual verification — or test and import new PDF-derived JSON chapters without changing application code.
        </p>
      </div>

      {/* Section 1: Live Dataset Audit */}
      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              1. Live Topic Dataset Audit & Duplicate PYQ Detector
            </h2>
            <p className="text-xs text-slate-500">
              Select any registered dataset from manifest.json to inspect its health and source traceability.
            </p>
          </div>

          <select
            value={selectedTopicId}
            onChange={(e) => setSelectedTopicId(e.target.value)}
            aria-label="Select dataset to audit"
            className="rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm font-medium"
          >
            {topics.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.questionCount} Qs — {t.file})
              </option>
            ))}
          </select>
        </div>

        {loadingReport || !report ? (
          <div className="py-8 text-sm text-slate-500">Running validation checks...</div>
        ) : (
          <div className="space-y-6">
            {/* Audit Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 font-mono tabular-nums">
              <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                <div className="text-xs font-sans text-slate-500">Total Questions</div>
                <div className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                  {report.totalQuestions}
                </div>
              </div>
              <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                <div className="text-xs font-sans text-slate-500">Schema Valid</div>
                <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {report.validQuestions}
                </div>
              </div>
              <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                <div className="text-xs font-sans text-slate-500">Needs Review</div>
                <div className="text-lg font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                  {report.needsReviewCount}
                </div>
              </div>
              <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                <div className="text-xs font-sans text-slate-500">Missing Answers</div>
                <div className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                  {report.missingAnswersCount}
                </div>
              </div>
              <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                <div className="text-xs font-sans text-slate-500">Duplicate IDs</div>
                <div className="text-lg font-bold text-red-600 dark:text-red-400 mt-0.5">
                  {report.duplicateIds.length}
                </div>
              </div>
              <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                <div className="text-xs font-sans text-slate-500">Duplicate PYQ Hashes</div>
                <div className="text-lg font-bold text-sky-600 dark:text-sky-400 mt-0.5">
                  {report.duplicateContentGroups.length}
                </div>
              </div>
            </div>

            {/* Issues / Needs Review List */}
            {report.issues.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Flagged Questions & Validation Notices ({report.issues.length})
                </h3>
                <div className="max-h-52 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-800 divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                  {report.issues.map((issue, idx) => (
                    <div
                      key={`${issue.questionId}-${idx}`}
                      className="p-3 flex items-start gap-2.5 bg-slate-50/50 dark:bg-slate-950/50"
                    >
                      {issue.severity === 'error' ? (
                        <FileWarning className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                      )}
                      <div className="font-mono">
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {issue.questionId} (Q#{issue.globalNumber}) [{issue.field}]:
                        </span>{' '}
                        <span className="font-sans text-slate-600 dark:text-slate-400">
                          {issue.message}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Duplicate Content Hashes Table */}
            {report.duplicateContentGroups.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Detected Repeated PYQs by Normalized Content Hash ({report.duplicateContentGroups.length} groups — preserved per non-deletion rule)
                </h3>
                <div className="max-h-60 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-800 divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                  {report.duplicateContentGroups.map((grp) => (
                    <div key={grp.hash} className="p-3 space-y-1">
                      <div className="flex items-center justify-between font-mono text-slate-500">
                        <span>Hash: {grp.hash}</span>
                        <span>
                          Appears in:{' '}
                          {grp.questions.map((q) => `${q.id} (p.${q.page || '?'})`).join(', ')}
                        </span>
                      </div>
                      <p className="text-slate-800 dark:text-slate-200 truncate">
                        {grp.normalizedText}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Section 2: Interactive JSON Validator & Dynamic Importer */}
      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              2. Validate or Dynamically Add a New JSON Topic Dataset
            </h2>
            <p className="text-xs text-slate-500">
              Paste a JSON dataset below to test schema validation or register it directly in the platform without code changes.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setJsonInput(VALID_JSON_EXAMPLE)}
              className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              Load Valid Example
            </button>
            <button
              onClick={() => setJsonInput(INVALID_JSON_EXAMPLE)}
              className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              Load Invalid Example (Test Validator)
            </button>
          </div>
        </div>

        <textarea
          rows={12}
          value={jsonInput}
          onChange={(e) => setJsonInput(e.target.value)}
          aria-label="JSON dataset input"
          className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-4 font-mono text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-600"
        />

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleValidateCustomJson}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <FileCheck2 className="w-4 h-4" />
            Validate JSON Schema
          </button>

          <button
            onClick={handleRegisterCustomDataset}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            Register Topic in Quiz Engine
          </button>
        </div>

        {importError && (
          <div className="p-3.5 rounded-lg border border-red-300 bg-red-50 dark:bg-red-950/40 text-xs text-red-700 dark:text-red-300">
            {importError}
          </div>
        )}

        {importMessage && (
          <div className="p-3.5 rounded-lg border border-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{importMessage}</span>
          </div>
        )}

        {customValidationReport && (
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 space-y-2 text-xs">
            <div className="font-semibold text-slate-900 dark:text-white">
              Validation Result for "{customValidationReport.datasetName}":{' '}
              {customValidationReport.errorCount === 0
                ? 'PASSED (0 Errors)'
                : `FAILED (${customValidationReport.errorCount} Errors, ${customValidationReport.warningCount} Warnings)`}
            </div>
            {customValidationReport.issues.map((iss, i) => (
              <div key={i} className="font-mono text-slate-600 dark:text-slate-400">
                [{iss.severity.toUpperCase()}] {iss.questionId} · {iss.field}: {iss.message}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Section 3: PDF-to-JSON Workflow & GitHub Pages Documentation */}
      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-3">
          3. Standardized PDF-to-JSON Pipeline & GitHub Pages Workflow
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          <div className="space-y-2">
            <h3 className="font-semibold text-slate-900 dark:text-white text-sm">
              Adding a New PDF Chapter (Zero Engine Changes)
            </h3>
            <ol className="list-decimal list-inside space-y-1.5">
              <li>
                Extract questions, options (A–D), official answer key, and page numbers from the source SSC PYQ PDF.
              </li>
              <li>
                Never invent missing exam years, shifts, or unclear answers — set{' '}
                <code className="font-mono text-amber-600">"verificationStatus": "needs_review"</code>{' '}
                when any item in the source PDF is ambiguous.
              </li>
              <li>
                Save the standardized file to{' '}
                <code className="font-mono">public/data/topics/&lt;topic-id&gt;.json</code>.
              </li>
              <li>
                Add an entry to <code className="font-mono">public/data/manifest.json</code> with{' '}
                <code className="font-mono">id, name, category, file, questionCount</code>.
              </li>
              <li>
                The quiz engine automatically generates 100-question sets, exam/year/shift filters, and scoring.
              </li>
            </ol>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold text-slate-900 dark:text-white text-sm">
              Deploying to GitHub Pages
            </h3>
            <ol className="list-decimal list-inside space-y-1.5">
              <li>
                Vite is configured with relative base paths (<code className="font-mono">base: './'</code>) and{' '}
                <code className="font-mono">resolveDataUrl()</code> so the app works both at root domains and under{' '}
                <code className="font-mono">https://username.github.io/repo-name/</code>.
              </li>
              <li>
                Push changes to the <code className="font-mono">main</code> branch. The included{' '}
                <code className="font-mono">.github/workflows/deploy.yml</code> workflow automatically builds and deploys <code className="font-mono">./dist</code> to GitHub Pages.
              </li>
              <li>
                In your GitHub Repository settings, navigate to{' '}
                <strong>Settings → Pages → Build and deployment</strong> and select{' '}
                <strong>GitHub Actions</strong> as the source.
              </li>
            </ol>
          </div>
        </div>
      </section>
    </div>
  );
};
