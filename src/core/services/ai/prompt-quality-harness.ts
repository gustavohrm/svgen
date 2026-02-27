interface PromptQualityDimension {
  id: PromptQualityDimensionId;
  label: string;
  score: number;
  maxScore: number;
  passed: boolean;
}

type PromptQualityDimensionId =
  | "subject"
  | "style"
  | "composition"
  | "color"
  | "motion"
  | "constraints";

export interface PromptQualityReport {
  score: number;
  maxScore: number;
  percentage: number;
  passedDimensions: PromptQualityDimensionId[];
  missingDimensions: PromptQualityDimensionId[];
  dimensions: PromptQualityDimension[];
  recommendations: string[];
}

export interface PromptQualityComparison {
  before: PromptQualityReport;
  after: PromptQualityReport;
  scoreDelta: number;
  improved: boolean;
  newlyCoveredDimensions: PromptQualityDimensionId[];
}

interface PromptDimensionRule {
  id: PromptQualityDimensionId;
  label: string;
  maxScore: number;
  matcher: (normalizedPrompt: string, promptWords: string[]) => boolean;
  recommendation: string;
}

const SUBJECT_MIN_WORDS = 3;

const STYLE_PATTERN =
  /\b(style|minimal|isometric|flat|3d|geometric|organic|bold|line-art|illustrative|retro|futuristic|brutalist|skeuomorphic)\b/i;
const COMPOSITION_PATTERN =
  /\b(composition|layout|centered|asymmetric|symmetry|foreground|midground|background|diagonal|radial|stacked|framing|negative space)\b/i;
const COLOR_PATTERN =
  /\b(color|colour|palette|monochrome|duotone|gradient|contrast|hue|saturation|warm|cool|accent|hex)\b|#[0-9a-f]{3,8}\b/i;
const MOTION_PATTERN =
  /\b(motion|animate|animation|loop|pulse|drift|orbit|rotate|timing|easing|stagger|static)\b/i;
const CONSTRAINT_PATTERN =
  /\b(must|avoid|without|include|exclude|only|exactly|do not|dont|no\b|keep|limit|constraint)\b/i;

const PROMPT_DIMENSION_RULES: readonly PromptDimensionRule[] = [
  {
    id: "subject",
    label: "Subject",
    maxScore: 20,
    matcher: (_prompt, words) => words.length >= SUBJECT_MIN_WORDS,
    recommendation: "Describe the subject clearly (what should be drawn).",
  },
  {
    id: "style",
    label: "Style",
    maxScore: 16,
    matcher: (prompt) => STYLE_PATTERN.test(prompt),
    recommendation:
      "Add style direction (for example: geometric, minimal, illustrative, brutalist).",
  },
  {
    id: "composition",
    label: "Composition",
    maxScore: 16,
    matcher: (prompt) => COMPOSITION_PATTERN.test(prompt),
    recommendation:
      "Specify composition/layout intent (centered mark, layered scene, diagonal flow, etc.).",
  },
  {
    id: "color",
    label: "Color",
    maxScore: 16,
    matcher: (prompt) => COLOR_PATTERN.test(prompt),
    recommendation: "Describe color intent or palette constraints.",
  },
  {
    id: "motion",
    label: "Motion",
    maxScore: 16,
    matcher: (prompt) => MOTION_PATTERN.test(prompt),
    recommendation: "State motion behavior (or explicitly say static/no animation).",
  },
  {
    id: "constraints",
    label: "Constraints",
    maxScore: 16,
    matcher: (prompt) => CONSTRAINT_PATTERN.test(prompt),
    recommendation: "Add concrete constraints (must include/avoid, limits, non-goals).",
  },
] as const;

/**
 * Score a user prompt for SVG generation quality using lightweight heuristics.
 *
 * The harness checks whether core prompt dimensions are present: subject, style, composition,
 * color direction, motion intent, and constraints. It returns a normalized score and actionable
 * recommendations for missing dimensions.
 */
export function scorePromptQuality(prompt: string): PromptQualityReport {
  const normalizedPrompt = prompt.trim();
  const promptWords = getPromptWords(normalizedPrompt);
  const dimensions = PROMPT_DIMENSION_RULES.map((rule) => {
    const passed = rule.matcher(normalizedPrompt, promptWords);

    return {
      id: rule.id,
      label: rule.label,
      score: passed ? rule.maxScore : 0,
      maxScore: rule.maxScore,
      passed,
    } satisfies PromptQualityDimension;
  });

  const score = dimensions.reduce((total, dimension) => total + dimension.score, 0);
  const maxScore = dimensions.reduce((total, dimension) => total + dimension.maxScore, 0);
  const percentage = maxScore === 0 ? 0 : Math.round((score / maxScore) * 100);
  const passedDimensions = dimensions
    .filter((dimension) => dimension.passed)
    .map((dimension) => dimension.id);
  const missingDimensions = dimensions
    .filter((dimension) => !dimension.passed)
    .map((dimension) => dimension.id);

  const recommendations = PROMPT_DIMENSION_RULES.filter((rule) =>
    missingDimensions.includes(rule.id),
  )
    .map((rule) => rule.recommendation)
    .slice(0, 4);

  return {
    score,
    maxScore,
    percentage,
    passedDimensions,
    missingDimensions,
    dimensions,
    recommendations,
  };
}

/**
 * Compare two prompts and report whether the "after" prompt improved quality.
 */
export function comparePromptQuality(
  beforePrompt: string,
  afterPrompt: string,
): PromptQualityComparison {
  const before = scorePromptQuality(beforePrompt);
  const after = scorePromptQuality(afterPrompt);
  const beforePassed = new Set(before.passedDimensions);
  const newlyCoveredDimensions = after.passedDimensions.filter(
    (dimension) => !beforePassed.has(dimension),
  );
  const scoreDelta = after.score - before.score;

  return {
    before,
    after,
    scoreDelta,
    improved: scoreDelta > 0,
    newlyCoveredDimensions,
  };
}

function getPromptWords(prompt: string): string[] {
  if (!prompt) {
    return [];
  }

  const matches = prompt.match(/[a-z0-9#-]+/gi);
  return matches ?? [];
}
