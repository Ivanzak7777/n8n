import * as cheerio from 'cheerio';
import { categorize } from '../categorize.mjs';
import { detectLevels, detectRegionBucket, estimateSalary } from '../enrich.mjs';
import { matchCompany, makeJobId } from '../util.mjs';

const CATEGORIES = ['QA', 'Product Manager'];
const BASE_URL = 'https://jobs.dou.ua/vacancies/';
const HEADERS = { 'User-Agent': 'Mozilla/5.0 (compatible; PaymentsJobBoardBot/1.0)' };

async function fetchCategory(category) {
  const url = `${BASE_URL}?category=${encodeURIComponent(category)}`;
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

function parseJobs(html) {
  const $ = cheerio.load(html);
  const jobs = [];

  $('li.l-vacancy').each((_, el) => {
    const $el = $(el);
    const titleLink = $el.find('a.vt').first();
    const title = titleLink.text().trim();
    const href = titleLink.attr('href');
    const company = $el.find('a.company').first().text().trim();
    const location = $el.find('.cities').first().text().trim();

    if (!title || !href) return;
    const idMatch = href.match(/\/vacancies\/(\d+)/);
    jobs.push({ rawId: idMatch ? idMatch[1] : href, title, company, location, href });
  });

  return jobs;
}

export async function scrapeDou(companies) {
  const results = [];
  const errors = [];
  const seenIds = new Set();

  for (const category of CATEGORIES) {
    try {
      const html = await fetchCategory(category);
      const jobs = parseJobs(html);

      for (const job of jobs) {
        if (seenIds.has(job.rawId)) continue;
        seenIds.add(job.rawId);

        const company = matchCompany(job.company, companies);
        if (!company) continue;

        const category2 = categorize(job.title);
        if (category2 === 'other') continue;

        const levels = detectLevels(job.title);
        const region = detectRegionBucket(job.location, company.hqCountry);

        results.push({
          id: makeJobId('dou', job.rawId),
          title: job.title,
          company: company.name,
          companySlug: company.slug,
          location: job.location || null,
          url: job.href,
          source: 'dou',
          category: category2,
          levels,
          region,
          salaryEstimate: estimateSalary(category2, levels, region),
          isCyprus: !!company.isCyprus,
          postedDate: null,
          scrapedAt: new Date().toISOString(),
        });
      }
    } catch (err) {
      errors.push(`dou:${category}: ${err.message}`);
    }
  }

  return { jobs: results, errors };
}
