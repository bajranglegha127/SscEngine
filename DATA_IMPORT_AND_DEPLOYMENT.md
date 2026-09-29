# SSC PYQ MCQ Quiz Platform — Data Import Specification & GitHub Pages Guide

## 1. Architecture Overview

The **SSC PYQ MCQ Quiz Platform** is a **data-driven quiz engine** where application logic is completely decoupled from question datasets:

```text
public/
  data/
    manifest.json           # Master registry of available topics/chapters
    topics/
      algebra.json          # 548 real PYQ questions extracted from your Algebra PDF
      percentage.json       # Topic dataset
      profit-loss.json      # Topic dataset
      coding-decoding.json  # Topic dataset
      error-detection.json  # Topic dataset
      indian-polity.json    # Topic dataset
```

---

## 2. Master Manifest Schema (`public/data/manifest.json`)

```json
{
  "version": "1.0",
  "lastUpdated": "2026-09-29",
  "topics": [
    {
      "id": "algebra",
      "name": "Algebra",
      "category": "Quantitative Aptitude",
      "file": "topics/algebra.json",
      "questionCount": 548,
      "description": "Complete 548-question bilingual Algebra chapter.",
      "sourcePdf": "Algebra_e1_Coaching_Center.pdf",
      "isSample": false,
      "lastUpdated": "2026-09-29"
    }
  ]
}
```

---

## 3. Standardized Question Schema (`public/data/topics/<topic-id>.json`)

```json
{
  "version": "1.0",
  "lastUpdated": "2026-09-29",
  "topicId": "algebra",
  "topicName": "Algebra",
  "category": "Quantitative Aptitude",
  "sourcePdf": "Algebra_e1_Coaching_Center.pdf",
  "questions": [
    {
      "id": "algebra-0001",
      "globalNumber": 1,
      "topic": {
        "id": "algebra",
        "name": "Algebra"
      },
      "category": "Quantitative Aptitude",
      "question": "If a + b = 12, ab = 22, then (a² + b²) is equal to",
      "questionHindi": "अगर a + b = 12, ab = 22, तो (a² + b²):",
      "options": [
        { "id": "A", "text": "188" },
        { "id": "B", "text": "144" },
        { "id": "C", "text": "34" },
        { "id": "D", "text": "100" }
      ],
      "correctAnswer": "D",
      "explanation": "a² + b² = (a + b)² - 2ab = 144 - 44 = 100.",
      "exam": {
        "name": "SSC CGL",
        "year": 2023,
        "shift": "Shift 2"
      },
      "source": {
        "pdf": "Algebra_e1_Coaching_Center.pdf",
        "page": 1,
        "originalQuestionNumber": 1
      },
      "verificationStatus": "verified",
      "contentHash": "qh-8f91a20c"
    }
  ]
}
```

### Validation & PDF Accuracy Rules

1. **Stable IDs**: Question IDs (`<topic>-0001`) must never rely on array indexes at runtime.
2. **Never Invent Metadata**: If an answer key in the PDF is marked `*` (such as Algebra Q134 and Q165) or if exam/year/shift is not printed in the PDF, set `"verificationStatus": "needs_review"` and `"correctAnswer": null` instead of guessing.
3. **Extensibility**: Future optional fields (`difficulty`, `language`, `subtopic`, `examTier`, `date`, `paper`, `section`, `image`, `tags`) are preserved by the repository and never break the quiz engine.

---

## 4. How to Add Future PDFs / Topics

1. Convert your new PDF chapter into `public/data/topics/<new-topic>.json` following the schema above.
2. Validate it using the in-app **Data Tools** tab (which checks for missing options, duplicate IDs, duplicate content hashes, and missing answers).
3. Add a single entry for `<new-topic>` in `public/data/manifest.json`.
4. Commit and push — no React component or quiz engine code changes are required. The platform automatically generates `1–100`, `101–200`, etc. ranges and populates all exam/year/shift filters.

---

## 5. GitHub Pages Deployment Instructions

1. Push this repository to GitHub.
2. In your GitHub repository, open **Settings → Pages**.
3. Under **Build and deployment → Source**, select **GitHub Actions**.
4. The workflow `.github/workflows/deploy.yml` runs `npm run build` with `VITE_BASE_PATH="./"` so all asset and JSON data fetches resolve relatively whether hosted at `https://username.github.io/repo-name/` or a custom root domain.
