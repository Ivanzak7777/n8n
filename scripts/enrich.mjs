const SENIOR_PATTERN = /\b(senior|sr\.?|lead|head of|principal|staff)\b/i;
const MIDDLE_PATTERN = /\b(middle|mid[\s-]?level)\b/i;
const JUNIOR_PATTERN = /\b(junior|jr\.?|intern|trainee)\b/i;

export function detectLevels(title) {
  if (!title) return [];
  const levels = [];
  if (JUNIOR_PATTERN.test(title)) levels.push('junior');
  if (MIDDLE_PATTERN.test(title)) levels.push('middle');
  if (SENIOR_PATTERN.test(title)) levels.push('senior');
  return levels;
}

const REGION_KEYWORDS = [
  { region: 'ua', pattern: /ukraine|kyiv|kiev|lviv|kharkiv|odesa|odessa/i },
  { region: 'uk', pattern: /united kingdom|\buk\b|london|england/i },
  { region: 'us', pattern: /united states|\busa\b|jacksonville|new york|california/i },
  {
    region: 'eu',
    pattern:
      /portugal|lisbon|cyprus|limassol|poland|malta|lithuania|latvia|estonia|germany|spain|netherlands|\beu\b|european union|riga|vilnius|warsaw|tallinn/i,
  },
];

const COUNTRY_REGION = {
  Ukraine: 'ua',
  UK: 'uk',
  US: 'us',
  Cyprus: 'eu',
  Malta: 'eu',
  Lithuania: 'eu',
  Latvia: 'eu',
  Estonia: 'eu',
  Portugal: 'eu',
  Poland: 'eu',
  Germany: 'eu',
};

export function detectRegionBucket(locationText, hqCountry) {
  for (const { region, pattern } of REGION_KEYWORDS) {
    if (locationText && pattern.test(locationText)) return region;
  }
  if (hqCountry && COUNTRY_REGION[hqCountry]) return COUNTRY_REGION[hqCountry];
  return 'other';
}

const BASE_SALARY_USD_MONTH = {
  qa: {
    junior: [700, 1100],
    middle: [1600, 2400],
    senior: [2800, 4000],
  },
  product: {
    junior: [700, 1100],
    middle: [1800, 2800],
    senior: [3200, 5000],
  },
};

const REGION_MULTIPLIER = { ua: 1, eu: 1.3, uk: 1.6, us: 2.3, other: 1 };

function roundTo(value, step) {
  return Math.round(value / step) * step;
}

function formatUsd(value) {
  return `$${Math.round(value).toLocaleString('en-US')}`;
}

export function estimateSalary(category, levels, region) {
  const table = BASE_SALARY_USD_MONTH[category];
  if (!table) return null;

  let range;
  if (levels.length === 0) {
    range = [table.junior[0], table.senior[1]];
  } else {
    const mins = levels.map((level) => table[level][0]);
    const maxes = levels.map((level) => table[level][1]);
    range = [Math.min(...mins), Math.max(...maxes)];
  }

  const multiplier = REGION_MULTIPLIER[region] ?? 1;
  const min = roundTo(range[0] * multiplier, 100);
  const max = roundTo(range[1] * multiplier, 100);

  return `${formatUsd(min)}–${formatUsd(max)}/міс`;
}
