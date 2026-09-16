import * as cheerio from 'cheerio';
import { categorize } from '../categorize.mjs';
import { matchCompany, makeJobId, politeDelay } from '../util.mjs';

const KEYWORDS = ['QA', 'QA Automation', 'Product Manager', 'Product Owner', 'Business Analyst'];
const MAX_PAGES_PER_KEYWORD = 2;
const BASE_URL = 'https://djinni.co/jobs/';
const HEADERS = { 'User-Agent': 'Mozilla/5.0 (compatible; PaymentsJobBoardBot/1.0)' };

async function fetchPage(keyword, page) {
  const url = `${BASE_URL}?primary_keyword=${encodeURIComponent(keyword)}&page=${page}`;
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

function parseJobs(html) {
  const $ = cheerio.load(html);
  const jobs = [];

  $('.job-item').each((_, el) => {
    const $el = $(el);
    const rawId = ($el.attr('id') || '').replace('job-item-', '');
    const link = $el.find('a.job_item__header-link').first();
    const href = link.attr('href');
    const title = $el.find('.job-item__position').first().text().trim();
    const company = $el
      .find('.small.text-gray-800.opacity-75.font-weight-500')
      .first()
      .text()
      .trim();
    const location = $el
      .find('div.fw-medium.d-flex')
      .first()
      .text()
      .replace(/\s+/g, ' ')
      .trim();

    if (!rawId || !title || !href) return;
    jobs.push({ rawId, title, company, location, href });
  });

  return jobs;
}

export async function scrapeDjinni(companies) {
  const results = [];
  const errors = [];
  const seenIds = new Set();

  for (const keyword of KEYWORDS) {
    for (let page = 1; page <= MAX_PAGES_PER_KEYWORD; page += 1) {
      try {
        const html = await fetchPage(keyword, page);
        const jobs = parseJobs(html);
        if (jobs.length === 0) break;

        for (const job of jobs) {
          if (seenIds.has(job.rawId)) continue;
          seenIds.add(job.rawId);

          const company = matchCompany(job.company, companies);
          if (!company) continue;

          const category = categorize(job.title);
          if (category === 'other') continue;

          results.push({
            id: makeJobId('djinni', job.rawId),
            title: job.title,
            company: company.name,
            companySlug: company.slug,
            location: job.location || null,
            url: new URL(job.href, 'https://djinni.co').toString(),
            source: 'djinni',
            category,
            isCyprus: !!company.isCyprus,
            postedDate: null,
            scrapedAt: new Date().toISOString(),
          });
        }
      } catch (err) {
        errors.push(`djinni:${keyword}:page${page}: ${err.message}`);
      }
      await politeDelay(400);
    }
  }

  return { jobs: results, errors };
}
