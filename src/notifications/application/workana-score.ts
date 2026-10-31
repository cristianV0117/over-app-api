const PREFERRED: Record<string, number> = {
  php: 3,
  nestjs: 4,
  "nest.js": 4,
  nest: 3,
  typescript: 4,
  javascript: 2,
  node: 3,
  "node.js": 3,
  "next.js": 4,
  nextjs: 4,
  react: 3,
  "react.js": 3,
  mongodb: 3,
  mysql: 2,
  laravel: 3,
  api: 2,
  "rest api": 3,
  "system analysis": 2,
  database: 1,
  linux: 1,
  nginx: 1,
  apache: 1,
  docker: 2,
  sql: 1,
};

const PENALIZED: Record<string, number> = {
  wordpress: -3,
  woocommerce: -3,
  prestashop: -3,
  elementor: -2,
  "3d animation": -2,
  "animación 3d": -2,
};

function norm(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function parseBids(raw: string | number | null | undefined): number | null {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (!raw) return null;
  const m = String(raw).replace(/\./g, "").match(/(\d+)/);
  return m ? Number(m[1]) : null;
}

function budgetBoost(budget: string): number {
  const digits = budget.replace(/[^\d]/g, "");
  if (!digits) return 0;
  const n = Number(digits);
  if (n >= 3_000_000) return 3;
  if (n >= 1_600_000) return 2;
  if (n >= 800_000) return 1;
  return 0;
}

export type WorkanaScoreInput = {
  skills: string[];
  title: string;
  description: string;
  budget: string;
  isHourly: boolean;
  isUrgent: boolean;
  hasVerifiedPaymentMethod: boolean;
  totalBidsRaw?: string | number | null;
};

export function scoreWorkanaJob(input: WorkanaScoreInput): {
  score: number;
  matchedSkills: string[];
  bids: number | null;
  highlighted: boolean;
} {
  const matched = new Set<string>();
  let score = 0;
  const haystack = [input.title, input.description, ...input.skills]
    .map(norm)
    .join(" ");

  for (const [skill, pts] of Object.entries(PREFERRED)) {
    if (haystack.includes(skill)) {
      score += pts;
      matched.add(skill);
    }
  }
  for (const [skill, pts] of Object.entries(PENALIZED)) {
    if (haystack.includes(skill)) score += pts;
  }

  if (input.hasVerifiedPaymentMethod) score += 2;
  if (input.isUrgent) score += 1;
  if (input.isHourly) score += 1;
  score += budgetBoost(input.budget);

  const bids = parseBids(input.totalBidsRaw);
  if (bids != null) {
    if (bids < 20) score += 2;
    else if (bids < 40) score += 1;
    else if (bids > 80) score -= 2;
  }

  return {
    score,
    matchedSkills: [...matched],
    bids,
    highlighted: score >= 6,
  };
}
