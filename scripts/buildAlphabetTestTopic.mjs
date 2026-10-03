import fs from 'fs';
import path from 'path';

const rootDir = process.cwd();
const publicDataDir = path.join(rootDir, 'public', 'data');
const topicsDir = path.join(publicDataDir, 'topics');
const manifestPath = path.join(publicDataDir, 'manifest.json');

function computeHash(text) {
  const norm = (text || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\u0900-\u097F√±²³⁴⁵⁶⁷⁸⁹⁰+\-*/=().,]/g, '')
    .trim();
  let hash = 2166136261;
  for (let i = 0; i < norm.length; i++) {
    hash ^= norm.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `qh-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

const part1 = JSON.parse(fs.readFileSync(path.join(rootDir, 'scripts', 'alphabetTestData_part1.json'), 'utf-8'));
const part2 = JSON.parse(fs.readFileSync(path.join(rootDir, 'scripts', 'alphabetTestData_part2.json'), 'utf-8'));
const part3 = JSON.parse(fs.readFileSync(path.join(rootDir, 'scripts', 'alphabetTestData_part3.json'), 'utf-8'));

const rawList = [...part1, ...part2, ...part3];
console.log(`Loaded ${rawList.length} raw questions.`);

const questions = rawList.map((item) => {
  const numStr = String(item.num).padStart(4, '0');
  const optionLetters = ['A', 'B', 'C', 'D'];
  const formattedOptions = item.options.map((opt, idx) => ({
    id: optionLetters[idx],
    text: String(opt).trim()
  }));

  return {
    id: `alphabet-test-${numStr}`,
    globalNumber: item.num,
    topic: {
      id: 'english-alphabet-test',
      name: 'English Alphabet Test'
    },
    category: 'Reasoning',
    question: item.q,
    questionHindi: item.qHindi,
    options: formattedOptions,
    correctAnswer: item.ans,
    explanation: item.sol,
    exam: {
      name: item.exam,
      year: item.year,
      shift: item.shift
    },
    difficulty: item.num <= 40 ? 'Easy' : item.num <= 90 ? 'Moderate' : 'Moderate',
    source: {
      pdf: 'Careerwill_Reasoning_English_Alphabet_Test.pdf',
      page: item.page,
      originalQuestionNumber: item.num
    },
    verificationStatus: 'verified',
    isSample: false,
    contentHash: computeHash(item.q)
  };
});

const topicDataset = {
  version: '1.0',
  lastUpdated: '2026-10-03',
  topicId: 'english-alphabet-test',
  topicName: 'English Alphabet Test',
  category: 'Reasoning',
  sourcePdf: 'Careerwill_Reasoning_English_Alphabet_Test.pdf',
  isSample: false,
  questions
};

// Write topic JSON file
const topicFilePath = path.join(topicsDir, 'english-alphabet-test.json');
fs.writeFileSync(topicFilePath, JSON.stringify(topicDataset, null, 2), 'utf-8');
console.log(`Wrote topic dataset to ${topicFilePath} with ${questions.length} questions.`);

// Update manifest.json
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

const newEntry = {
  id: 'english-alphabet-test',
  name: 'English Alphabet Test',
  category: 'Reasoning',
  file: 'topics/english-alphabet-test.json',
  questionCount: questions.length,
  description: 'Complete 125-question bilingual English Alphabet Test chapter from Careerwill Reasoning (Piyush Varshney Sir) with official Answer Key & step-by-step solutions.',
  sourcePdf: 'Careerwill_Reasoning_English_Alphabet_Test.pdf',
  isSample: false,
  lastUpdated: '2026-10-03'
};

const existingIndex = manifest.topics.findIndex(t => t.id === 'english-alphabet-test');
if (existingIndex >= 0) {
  manifest.topics[existingIndex] = newEntry;
} else {
  // Insert right before or after other reasoning topics
  const reasoningIdx = manifest.topics.findIndex(t => t.category === 'Reasoning');
  if (reasoningIdx >= 0) {
    manifest.topics.splice(reasoningIdx + 1, 0, newEntry);
  } else {
    manifest.topics.push(newEntry);
  }
}

manifest.lastUpdated = '2026-10-03';
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
console.log(`Updated manifest.json with English Alphabet Test topic.`);
