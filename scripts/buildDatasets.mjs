import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

const rootDir = process.cwd();
const publicDataDir = path.join(rootDir, 'public', 'data');
const topicsDir = path.join(publicDataDir, 'topics');

fs.mkdirSync(topicsDir, { recursive: true });

// --- 1. Minimal valid PNG generator (using built-in zlib) ---
function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) {
    c = (c >>> 8) ^ crcTable[(c ^ buf[i]) & 0xff];
  }
  return (c ^ -1) >>> 0;
}
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c >>> 0;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function createSolidPng(width, height, bgRgb, accentRgb) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const stride = width * 4 + 1;
  const raw = Buffer.alloc(stride * height);
  const pad = Math.floor(width * 0.22);

  for (let y = 0; y < height; y++) {
    const rowStart = y * stride;
    raw[rowStart] = 0; // filter type 0
    for (let x = 0; x < width; x++) {
      const idx = rowStart + 1 + x * 4;
      const inBox = x >= pad && x < width - pad && y >= pad && y < height - pad;
      const inBar =
        inBox &&
        ((y >= Math.floor(height * 0.34) && y <= Math.floor(height * 0.40)) ||
          (y >= Math.floor(height * 0.47) && y <= Math.floor(height * 0.53)) ||
          (y >= Math.floor(height * 0.60) && y <= Math.floor(height * 0.66)));
      const [r, g, b] = inBar ? [248, 250, 252] : inBox ? accentRgb : bgRgb;
      raw[idx] = r;
      raw[idx + 1] = g;
      raw[idx + 2] = b;
      raw[idx + 3] = 255;
    }
  }

  const idat = zlib.deflateSync(raw);
  return Buffer.concat([
    signature,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', idat),
    makeChunk('IEND', Buffer.alloc(0)),
  ]);
}

fs.writeFileSync(path.join(rootDir, 'public', 'pwa-192x192.png'), createSolidPng(192, 192, [15, 23, 42], [2, 132, 199]));
fs.writeFileSync(path.join(rootDir, 'public', 'pwa-512x512.png'), createSolidPng(512, 512, [15, 23, 42], [2, 132, 199]));
fs.writeFileSync(path.join(rootDir, 'public', 'pwa-maskable-512x512.png'), createSolidPng(512, 512, [15, 23, 42], [2, 132, 199]));
fs.writeFileSync(path.join(rootDir, 'public', 'apple-touch-icon.png'), createSolidPng(180, 180, [15, 23, 42], [2, 132, 199]));

// --- 2. Content Hash utility ---
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

// --- 3. Parse 548 Algebra Questions from OCR files ---
const part1 = fs.readFileSync(path.join(rootDir, 'scripts', 'ocr_part1.txt'), 'utf8');
const part2 = fs.readFileSync(path.join(rootDir, 'scripts', 'ocr_part2.txt'), 'utf8');
const part3 = fs.readFileSync(path.join(rootDir, 'scripts', 'ocr_part3.txt'), 'utf8');

const combinedText = `${part1}\n${part2}\n${part3}`;
const [questionsPart, answersPart] = combinedText.split('===ANSWERS===');

// Parse Answer Key
const answerMap = new Map();
const ansMatches = answersPart.matchAll(/(\d+)\.\s*([A-D1*])/gi);
for (const match of ansMatches) {
  const qNum = Number(match[1]);
  const rawAns = match[2].toUpperCase();
  answerMap.set(qNum, rawAns);
}

// Parse pages and questions
const lines = questionsPart.split(/\r?\n/);
let currentPage = 1;
const rawQuestionsMap = new Map();
let currentQ = null;

for (const rawLine of lines) {
  const line = rawLine.trim();
  if (!line) continue;

  const pageMatch = line.match(/^===PAGE\s+(\d+)===$/);
  if (pageMatch) {
    currentPage = Number(pageMatch[1]);
    continue;
  }

  const qStartMatch = line.match(/^(\d+)\.\s+(.*)$/);
  if (qStartMatch) {
    const qNum = Number(qStartMatch[1]);
    if (qNum >= 1 && qNum <= 548 && !line.startsWith('1. (a') && !line.startsWith('2. (b')) {
      currentQ = {
        num: qNum,
        page: currentPage,
        enLines: [qStartMatch[2]],
        hiLines: [],
        optionLine: '',
      };
      rawQuestionsMap.set(qNum, currentQ);
      continue;
    }
  }

  if (!currentQ) continue;

  if (/^a\)/i.test(line)) {
    currentQ.optionLine = (currentQ.optionLine ? currentQ.optionLine + ' ' : '') + line;
  } else if (/[\u0900-\u097F]/.test(line)) {
    currentQ.hiLines.push(line);
  } else {
    currentQ.enLines.push(line);
  }
}

function parseOptions(optionLine) {
  // Split by a), b), c), d)
  const regex = /\b([a-d])\)\s*(.*?)(?=\s+\b[a-d]\)|$)/gi;
  const matches = [...optionLine.matchAll(regex)];
  const ids = ['A', 'B', 'C', 'D'];
  if (matches.length >= 4) {
    return ids.map((id, idx) => ({
      id,
      text: matches[idx][2].trim(),
    }));
  }
  return ids.map((id) => ({ id, text: `Option ${id}` }));
}

const algebraQuestions = [];
for (let num = 1; num <= 548; num++) {
  const item = rawQuestionsMap.get(num);
  if (!item) {
    throw new Error(`Missing question ${num} in parsed OCR!`);
  }
  const enText = item.enLines.join(' ').trim();
  const hiText = item.hiLines.join(' ').trim();
  const options = parseOptions(item.optionLine);
  const rawKey = answerMap.get(num);

  let correctAnswer = null;
  let verificationStatus = 'verified';
  let verificationNotes = undefined;

  if (rawKey === '*') {
    correctAnswer = null;
    verificationStatus = 'needs_review';
    verificationNotes = `Source PDF Answer Key (page 48) marks Question ${num} with '*' (discrepancy/bonus in source key). Flagged for manual verification per PDF accuracy rule.`;
  } else if (rawKey === '1') {
    // Question 405 has "405. 1" in the PDF answer key table
    correctAnswer = 'A';
    verificationStatus = 'verified';
    verificationNotes = 'Source PDF Answer Key (page 49) prints "405. 1" which corresponds to Option A (value 1).';
  } else if (['A', 'B', 'C', 'D'].includes(rawKey)) {
    correctAnswer = rawKey;
  } else {
    verificationStatus = 'needs_review';
    verificationNotes = 'Answer key missing or unclear in source PDF.';
  }

  const correctOptText = correctAnswer
    ? options.find((o) => o.id === correctAnswer)?.text || correctAnswer
    : 'Needs Review';

  const explanation =
    verificationStatus === 'needs_review'
      ? `Flagged for manual verification: ${verificationNotes}`
      : `Official Answer Key from source PDF (Algebra, Page ${item.page >= 47 ? 47 : '47–49'}, Q#${num}): Option ${correctAnswer} (${correctOptText}). Apply standard algebraic identities to simplify the given expression.`;

  algebraQuestions.push({
    id: `algebra-${String(num).padStart(4, '0')}`,
    globalNumber: num,
    topic: {
      id: 'algebra',
      name: 'Algebra',
    },
    category: 'Quantitative Aptitude',
    question: enText,
    questionHindi: hiText || undefined,
    options,
    correctAnswer,
    explanation,
    exam: {
      name: 'SSC CGL Tier-II PYQ',
    },
    source: {
      pdf: 'Algebra_e1_Coaching_Center.pdf',
      page: item.page,
      originalQuestionNumber: num,
    },
    verificationStatus,
    verificationNotes,
    contentHash: computeHash(enText),
  });
}

const algebraDataset = {
  version: '1.0',
  lastUpdated: '2026-09-29',
  topicId: 'algebra',
  topicName: 'Algebra',
  category: 'Quantitative Aptitude',
  sourcePdf: 'Algebra_e1_Coaching_Center.pdf',
  isSample: false,
  questions: algebraQuestions,
};

fs.writeFileSync(
  path.join(topicsDir, 'algebra.json'),
  JSON.stringify(algebraDataset, null, 2),
  'utf8'
);

console.log(`Generated algebra.json with ${algebraQuestions.length} questions.`);
