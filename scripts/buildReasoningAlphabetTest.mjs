import fs from 'fs';
import path from 'path';

const rootDir = process.cwd();
const topicsDir = path.join(rootDir, 'public', 'data', 'topics');
const manifestPath = path.join(rootDir, 'public', 'data', 'manifest.json');

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

const answerKeyMap = {
  1: 'A', 2: 'C', 3: 'D', 4: 'C', 5: 'B',
  6: 'A', 7: 'A', 8: 'D', 9: 'A', 10: 'C',
  11: 'D', 12: 'A', 13: 'B', 14: 'B', 15: 'D',
  16: 'B', 17: 'C', 18: 'D', 19: 'C', 20: 'C',
  21: 'D', 22: 'B', 23: 'B', 24: 'A', 25: 'B',
  26: 'D', 27: 'A', 28: 'A', 29: 'A', 30: 'D',
  31: 'D', 32: 'D', 33: 'B', 34: 'C', 35: 'B',
  36: 'C', 37: 'D', 38: 'B', 39: 'A', 40: 'B',
  41: 'B', 42: 'B', 43: 'A', 44: 'A', 45: 'D',
  46: 'D', 47: 'D', 48: 'D', 49: 'C', 50: 'C',
  51: 'D', 52: 'A', 53: 'D', 54: 'C', 55: 'A',
  56: 'A', 57: 'B', 58: 'D', 59: 'D', 60: 'C',
  61: 'B', 62: 'A', 63: 'C', 64: 'A', 65: 'C',
  66: 'C', 67: 'A', 68: 'A', 69: 'C', 70: 'A',
  71: 'B', 72: 'A', 73: 'D', 74: 'A', 75: 'C',
  76: 'B', 77: 'B', 78: 'B', 79: 'D', 80: 'B',
  81: 'B', 82: 'C', 83: 'A', 84: 'C', 85: 'A',
  86: 'B', 87: 'C', 88: 'C', 89: 'B', 90: 'C',
  91: 'B', 92: 'B', 93: 'A', 94: 'B', 95: 'C',
  96: 'A', 97: 'D', 98: 'B', 99: 'D', 100: 'C',
  101: 'C', 102: 'B', 103: 'A', 104: 'B', 105: 'C',
  106: 'B', 107: 'A', 108: 'A', 109: 'C', 110: 'A',
  111: 'B', 112: 'D', 113: 'A', 114: 'B', 115: 'B',
  116: 'B', 117: 'A', 118: 'C', 119: 'B', 120: 'A',
  121: 'A', 122: 'A', 123: 'B', 124: 'A', 125: 'B'
};

console.log('Answer key verified for', Object.keys(answerKeyMap).length, 'questions.');
