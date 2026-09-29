import fs from 'fs';
import path from 'path';

const rootDir = process.cwd();
const publicDataDir = path.join(rootDir, 'public', 'data');
const topicsDir = path.join(publicDataDir, 'topics');

function computeHash(text) {
  const norm = (text || '').toLowerCase().replace(/\s+/g, ' ').trim();
  let hash = 2166136261;
  for (let i = 0; i < norm.length; i++) {
    hash ^= norm.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `qh-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

const sampleTopicsSpec = [
  {
    id: 'percentage',
    name: 'Percentage',
    category: 'Quantitative Aptitude',
    description: 'Sample dataset demonstrating Exam, Year, and Shift filters (replace with your Percentage PDF JSON).',
    questions: [
      {
        q: '[Sample] If the price of sugar increases by 25%, by what percentage must a household reduce its consumption so that expenditure remains unchanged?',
        hi: '[नमूना] यदि चीनी की कीमत में 25% की वृद्धि होती है, तो खपत में कितने प्रतिशत की कमी करनी चाहिए ताकि खर्च अपरिवर्तित रहे?',
        opts: ['18%', '20%', '22.5%', '25%'],
        ans: 'B',
        exp: 'Reduction % = [R / (100 + R)] × 100 = (25 / 125) × 100 = 20%.',
        exam: 'SSC CGL',
        year: 2024,
        shift: 'Shift 1',
        diff: 'Easy',
      },
      {
        q: '[Sample] A number is first increased by 20% and then decreased by 15%. What is the net percentage change in the number?',
        hi: '[नमूना] एक संख्या को पहले 20% बढ़ाया जाता है और फिर 15% घटाया जाता है। संख्या में शुद्ध प्रतिशत परिवर्तन क्या है?',
        opts: ['+2% increase', '−2% decrease', '+5% increase', '+3% increase'],
        ans: 'A',
        exp: 'Net change = 20 − 15 − (20 × 15)/100 = 5 − 3 = +2% increase.',
        exam: 'SSC CGL',
        year: 2023,
        shift: 'Shift 2',
        diff: 'Easy',
      },
      {
        q: '[Sample] In an election between two candidates, 10% of the voters did not cast their votes. The winning candidate secured 54% of the total voters in the voter list and won by 1,440 votes. Find the total number of voters.',
        hi: '[नमूना] दो उम्मीदवारों के बीच एक चुनाव में 10% मतदाताओं ने मतदान नहीं किया। विजयी उम्मीदवार को कुल मतदाता सूची के 54% मत मिले और वह 1,440 मतों से जीता। कुल मतदाताओं की संख्या ज्ञात कीजिए।',
        opts: ['7,500', '8,000', '9,000', '10,000'],
        ans: 'B',
        exp: 'Votes cast = 90%. Winner = 54%, Loser = 90% − 54% = 36%. Margin = 18% of total = 1440 => Total = 8000.',
        exam: 'SSC CHSL',
        year: 2023,
        shift: 'Shift 1',
        diff: 'Moderate',
      },
      {
        q: '[Sample] If 35% of A is equal to 50% of B, and B is 2x% of A, then what is the value of x?',
        hi: '[नमूना] यदि A का 35%, B के 50% के बराबर है, और B, A का 2x% है, तो x का मान क्या है?',
        opts: ['35', '70', '25', '40'],
        ans: 'A',
        exp: 'B/A = 35/50 = 70/100 = 70%. Since 2x = 70, x = 35.',
        exam: 'SSC MTS',
        year: 2023,
        shift: 'Shift 3',
        diff: 'Easy',
      },
      {
        q: '[Sample] A student has to secure 40% marks to pass an examination. He gets 178 marks and fails by 22 marks. What are the maximum marks of the examination?',
        hi: '[नमूना] एक परीक्षा उत्तीर्ण करने के लिए छात्र को 40% अंक प्राप्त करने होते हैं। वह 178 अंक प्राप्त करता है और 22 अंकों से अनुत्तीर्ण हो जाता है। अधिकतम अंक क्या हैं?',
        opts: ['450', '500', '550', '600'],
        ans: 'B',
        exp: 'Passing marks = 178 + 22 = 200. Since 40% = 200, Maximum marks (100%) = 500.',
        exam: 'SSC GD',
        year: 2024,
        shift: 'Shift 2',
        diff: 'Easy',
      },
      {
        q: '[Sample] The population of a town increases by 10% annually. If its present population is 60,500, what was its population 2 years ago?',
        hi: '[नमूना] एक कस्बे की जनसंख्या सालाना 10% बढ़ जाती है। यदि इसकी वर्तमान जनसंख्या 60,500 है, तो 2 वर्ष पहले इसकी जनसंख्या क्या थी?',
        opts: ['48,000', '50,000', '52,000', '55,000'],
        ans: 'B',
        exp: 'P × (1.1)² = 60500 => P × 1.21 = 60500 => P = 50,000.',
        exam: 'SSC CPO',
        year: 2022,
        shift: 'Shift 1',
        diff: 'Moderate',
      },
      {
        q: '[Sample] Fresh fruit contains 68% water and dry fruit contains 20% water. How much dry fruit can be obtained from 100 kg of fresh fruits?',
        hi: '[नमूना] ताजे फल में 68% पानी होता है और सूखे फल में 20% पानी होता है। 100 किग्रा ताजे फलों से कितना सूखा फल प्राप्त किया जा सकता है?',
        opts: ['32 kg', '40 kg', '42 kg', '48 kg'],
        ans: 'B',
        exp: 'Solid pulp remains constant: 32% of 100 kg = 80% of Dry fruit => Dry fruit = 32 / 0.8 = 40 kg.',
        exam: 'SSC CGL',
        year: 2022,
        shift: 'Shift 3',
        diff: 'Moderate',
      },
      {
        q: '[Sample] Renu saves 20% of her income. If her expenditure increases by 20% and income increases by 29%, then her savings increase by:',
        hi: '[नमूना] रेनू अपनी आय का 20% बचाती है। यदि उसका व्यय 20% बढ़ जाता है और आय 29% बढ़ जाती है, तो उसकी बचत में कितनी वृद्धि होती है?',
        opts: ['60%', '65%', '55%', '70%'],
        ans: 'B',
        exp: 'Let Income = 100, Exp = 80, Saving = 20. New Income = 129, New Exp = 96, New Saving = 33. Increase = (13/20)×100 = 65%.',
        exam: 'SSC Selection Post',
        year: 2024,
        shift: 'Shift 1',
        diff: 'Hard',
      },
    ],
  },
  {
    id: 'profit-loss',
    name: 'Profit & Loss',
    category: 'Quantitative Aptitude',
    description: 'Sample dataset for Profit, Loss & Discount calculations across SSC exams.',
    questions: [
      {
        q: '[Sample] A shopkeeper marks his goods 30% above the cost price and allows a discount of 10%. What is his net profit percentage?',
        hi: '[नमूना] एक दुकानदार अपने माल को क्रय मूल्य से 30% अधिक अंकित करता है और 10% की छूट देता है। उसका शुद्ध लाभ प्रतिशत क्या है?',
        opts: ['15%', '17%', '20%', '18%'],
        ans: 'B',
        exp: 'Profit % = 30 − 10 − (30 × 10)/100 = 17%.',
        exam: 'SSC CGL',
        year: 2024,
        shift: 'Shift 1',
        diff: 'Easy',
      },
      {
        q: '[Sample] By selling 36 oranges, a vendor loses the selling price of 4 oranges. His loss percentage is:',
        hi: '[नमूना] 36 संतरे बेचने पर एक विक्रेता को 4 संतरों के विक्रय मूल्य के बराबर हानि होती है। उसका हानि प्रतिशत है:',
        opts: ['10%', '11 1/9%', '9%', '12.5%'],
        ans: 'A',
        exp: 'Loss = 4 SP, SP = 36 => CP = 36 + 4 = 40. Loss % = (4/40) × 100 = 10%.',
        exam: 'SSC CHSL',
        year: 2023,
        shift: 'Shift 2',
        diff: 'Easy',
      },
      {
        q: '[Sample] Successive discounts of 20% and 15% are equivalent to a single discount of:',
        hi: '[नमूना] 20% और 15% की क्रमिक छूट किस एकल छूट के बराबर है?',
        opts: ['32%', '33%', '35%', '30%'],
        ans: 'A',
        exp: 'Equivalent discount = 20 + 15 − (20 × 15)/100 = 35 − 3 = 32%.',
        exam: 'SSC MTS',
        year: 2024,
        shift: 'Shift 1',
        diff: 'Easy',
      },
      {
        q: '[Sample] A dishonest dealer professes to sell his goods at cost price but uses a false weight of 900 grams for 1 kg. Find his gain percentage.',
        hi: '[नमूना] एक बेईमान व्यापारी अपने माल को क्रय मूल्य पर बेचने का दावा करता है लेकिन 1 किग्रा के लिए 900 ग्राम के गलत बाट का उपयोग करता है। उसका लाभ प्रतिशत ज्ञात कीजिए।',
        opts: ['10%', '11 1/9%', '9 1/11%', '12%'],
        ans: 'B',
        exp: 'Gain % = (100 / 900) × 100 = 11 1/9%.',
        exam: 'SSC CPO',
        year: 2023,
        shift: 'Shift 2',
        diff: 'Moderate',
      },
    ],
  },
  {
    id: 'coding-decoding',
    name: 'Coding-Decoding',
    category: 'Reasoning',
    description: 'Sample General Intelligence & Reasoning dataset with exam/year/shift tags.',
    questions: [
      {
        q: '[Sample] In a certain code language, if "PRACTICE" is written as "16-18-1-3-20-9-3-5", how will "SUCCESS" be written in that code?',
        hi: '[नमूना] एक निश्चित कूट भाषा में यदि "PRACTICE" को "16-18-1-3-20-9-3-5" लिखा जाता है, तो "SUCCESS" को कैसे लिखा जाएगा?',
        opts: [
          '19-21-3-3-5-19-19',
          '19-20-3-3-5-19-19',
          '18-21-3-3-5-18-18',
          '19-21-4-4-5-19-19',
        ],
        ans: 'A',
        exp: 'Each letter is represented by its standard alphabetical position: S=19, U=21, C=3, C=3, E=5, S=19, S=19.',
        exam: 'SSC CGL',
        year: 2024,
        shift: 'Shift 1',
        diff: 'Easy',
      },
      {
        q: '[Sample] If in a code language, "MIND" is coded as "KGLB", then how is "DIAGRAM" coded in the same language?',
        hi: '[नमूना] यदि किसी कूट भाषा में "MIND" को "KGLB" के रूप में कोडित किया जाता है, तो "DIAGRAM" को कैसे कोडित किया जाएगा?',
        opts: ['BGYEPYK', 'BGYEPYL', 'CGYEPYK', 'BGYFQYK'],
        ans: 'A',
        exp: 'Each letter is shifted backward by 2 positions (−2): D→B, I→G, A→Y, G→E, R→P, A→Y, M→K.',
        exam: 'SSC CHSL',
        year: 2023,
        shift: 'Shift 3',
        diff: 'Easy',
      },
      {
        q: '[Sample] In a certain code, "253" means "books are old", "546" means "man is old", and "378" means "buy good books". What digit stands for "are"?',
        hi: '[नमूना] एक निश्चित कूट में "253" का अर्थ "books are old", "546" का अर्थ "man is old" और "378" का अर्थ "buy good books" है। "are" के लिए कौन सा अंक है?',
        opts: ['2', '5', '3', '4'],
        ans: 'A',
        exp: '5 = "old" (common in 253 and 546), 3 = "books" (common in 253 and 378). Remaining in 253 is 2 = "are".',
        exam: 'SSC Stenographer',
        year: 2023,
        shift: 'Shift 1',
        diff: 'Moderate',
      },
    ],
  },
  {
    id: 'error-detection',
    name: 'Error Detection & Grammar',
    category: 'English',
    description: 'Sample English Language & Comprehension dataset for subject-verb agreement and modifiers.',
    questions: [
      {
        q: '[Sample] Identify the segment in the sentence which contains a grammatical error: "Neither the manager nor his assistants was present at the annual review meeting."',
        opts: [
          'Neither the manager',
          'nor his assistants',
          'was present',
          'at the annual review meeting',
        ],
        ans: 'C',
        exp: 'With "Neither ... nor", the verb agrees with the closer subject ("assistants", plural). Replace "was present" with "were present".',
        exam: 'SSC CGL',
        year: 2024,
        shift: 'Shift 2',
        diff: 'Easy',
      },
      {
        q: '[Sample] Identify the segment with an error: "One of the most important factor that leads to success is consistent practice."',
        opts: [
          'One of the most',
          'important factor',
          'that leads to success',
          'is consistent practice',
        ],
        ans: 'B',
        exp: 'After "One of the...", the noun must be plural ("important factors").',
        exam: 'SSC CPO',
        year: 2023,
        shift: 'Shift 1',
        diff: 'Easy',
      },
      {
        q: '[Sample] Choose the correct improvement for the bracketed part: "Hardly had we stepped out of the building (than it began) to pour heavily."',
        opts: ['when it began', 'then it began', 'as soon as it began', 'No improvement'],
        ans: 'A',
        exp: '"Hardly / Scarcely ... when" is the correct correlative conjunction pair.',
        exam: 'SSC CHSL',
        year: 2024,
        shift: 'Shift 1',
        diff: 'Moderate',
      },
    ],
  },
  {
    id: 'indian-polity',
    name: 'Polity & Constitution',
    category: 'General Awareness',
    description: 'Sample General Awareness dataset covering Constitutional Articles, Schedules, and Amendments.',
    questions: [
      {
        q: '[Sample] Which Article of the Constitution of India deals with the "Abolition of Untouchability"?',
        hi: '[नमूना] भारतीय संविधान का कौन सा अनुच्छेद "अस्पृश्यता के उन्मूलन" से संबंधित है?',
        opts: ['Article 15', 'Article 16', 'Article 17', 'Article 18'],
        ans: 'C',
        exp: 'Article 17 abolishes untouchability and forbids its practice in any form.',
        exam: 'SSC CGL',
        year: 2023,
        shift: 'Shift 1',
        diff: 'Easy',
      },
      {
        q: '[Sample] Fundamental Duties were incorporated into Part IV-A of the Indian Constitution on the recommendation of which committee?',
        hi: '[नमूना] किस समिति की सिफारिश पर भारतीय संविधान के भाग IV-A में मौलिक कर्तव्यों को शामिल किया गया था?',
        opts: [
          'Sarkaria Commission',
          'Swaran Singh Committee',
          'Kothari Commission',
          'Balwant Rai Mehta Committee',
        ],
        ans: 'B',
        exp: 'The Swaran Singh Committee recommended the inclusion of Fundamental Duties via the 42nd Constitutional Amendment Act, 1976.',
        exam: 'SSC MTS',
        year: 2023,
        shift: 'Shift 2',
        diff: 'Easy',
      },
      {
        q: '[Sample] Which Schedule of the Indian Constitution contains provisions regarding disqualification of legislators on the ground of defection (Anti-Defection Law)?',
        hi: '[नमूना] भारतीय संविधान की किस अनुसूची में दल-बदल के आधार पर विधायकों की अयोग्यता (दल-बदल विरोधी कानून) से संबंधित प्रावधान हैं?',
        opts: ['Eighth Schedule', 'Ninth Schedule', 'Tenth Schedule', 'Eleventh Schedule'],
        ans: 'C',
        exp: 'The Tenth Schedule was added by the 52nd Amendment Act of 1985 and deals with Anti-Defection provisions.',
        exam: 'SSC CHSL',
        year: 2024,
        shift: 'Shift 3',
        diff: 'Moderate',
      },
    ],
  },
];

// Read already-generated algebra.json
const algebraJson = JSON.parse(
  fs.readFileSync(path.join(topicsDir, 'algebra.json'), 'utf8')
);

const manifestTopics = [
  {
    id: 'algebra',
    name: 'Algebra',
    category: 'Quantitative Aptitude',
    file: 'topics/algebra.json',
    questionCount: algebraJson.questions.length,
    description: 'Complete 548-question bilingual Algebra chapter extracted from the provided e1 Coaching Center PDF with official Answer Key.',
    sourcePdf: 'Algebra_e1_Coaching_Center.pdf',
    isSample: false,
    lastUpdated: '2026-09-29',
  },
];

for (const spec of sampleTopicsSpec) {
  const questions = spec.questions.map((item, idx) => {
    const num = idx + 1;
    return {
      id: `${spec.id}-${String(num).padStart(4, '0')}`,
      globalNumber: num,
      topic: {
        id: spec.id,
        name: spec.name,
      },
      category: spec.category,
      question: item.q,
      questionHindi: item.hi || undefined,
      options: [
        { id: 'A', text: item.opts[0] },
        { id: 'B', text: item.opts[1] },
        { id: 'C', text: item.opts[2] },
        { id: 'D', text: item.opts[3] },
      ],
      correctAnswer: item.ans,
      explanation: item.exp,
      exam: {
        name: item.exam,
        year: item.year,
        shift: item.shift,
      },
      difficulty: item.diff,
      source: {
        pdf: `Sample_${spec.id}.pdf`,
        page: 1,
        originalQuestionNumber: num,
      },
      verificationStatus: 'verified',
      isSample: true,
      contentHash: computeHash(item.q),
    };
  });

  const dataset = {
    version: '1.0',
    lastUpdated: '2026-09-29',
    topicId: spec.id,
    topicName: spec.name,
    category: spec.category,
    sourcePdf: `Sample_${spec.id}.pdf`,
    isSample: true,
    questions,
  };

  fs.writeFileSync(
    path.join(topicsDir, `${spec.id}.json`),
    JSON.stringify(dataset, null, 2),
    'utf8'
  );

  manifestTopics.push({
    id: spec.id,
    name: spec.name,
    category: spec.category,
    file: `topics/${spec.id}.json`,
    questionCount: questions.length,
    description: spec.description,
    sourcePdf: `Sample_${spec.id}.pdf`,
    isSample: true,
    lastUpdated: '2026-09-29',
  });
}

const manifest = {
  version: '1.0',
  lastUpdated: '2026-09-29',
  topics: manifestTopics,
};

fs.writeFileSync(
  path.join(publicDataDir, 'manifest.json'),
  JSON.stringify(manifest, null, 2),
  'utf8'
);

console.log(`Generated manifest.json with ${manifestTopics.length} topics.`);
