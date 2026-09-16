import * as cheerio from 'cheerio';
import { categorize } from '../categorize.mjs';
import { matchCompany, makeJobId } from '../util.mjs';

// Best-effort only: Indeed actively blocks plain HTTP scraping (confirmed HTTP 403 in testing),
// so this source frequently returns zero results. It is isolated so a block here never affects
// the other sources or wipes previously-collected data.
const QUERIES = ['QA Engineer payments', 'Product Manager payments fintech'];
const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml',
};

function parseJsonLd(html) {
  const $ = cheerio.load(html);
  const jobs = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const data = JSON.parse($(el).text());
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        if (item['@type'] === 'JobPosting' && item.title) {
          jobs.push({
            rawId: item.identifier?.value || item.url || item.title,
            title: item.title,
            company: item.hiringOrganization?.name || '',
            location: item.jobLocation?.address?.addressLocality || null,
            url: item.url || null,
          });
        }
      }
    } catch {
      // not valid JSON-LD, skip
    }
  });
  return jobs;
}

async function fetchQuery(query) {
  const url = `https://www.indeed.com/jobs?q=${encodeURIComponent(query)}`;
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`HTTP ${res.status} for query "${query}"`);
  return res.text();
}

export async function scrapeIndeed(companies) {
  const results = [];
  const errors = [];
  const seenIds = new Set();

  for (const query of QUERIES) {
    try {
      const html = await fetchQuery(query);
      const jobs = parseJsonLd(html);

      for (const job of jobs) {
        if (!job.url || seenIds.has(job.rawId)) continue;
        seenIds.add(job.rawId);

        const company = matchCompany(job.company, companies);
        if (!company) continue;

        const category = categorize(job.title);
        if (category === 'other') continue;

        results.push({
          id: makeJobId('indeed', job.rawId),
          title: job.title,
          company: company.name,
          companySlug: company.slug,
          location: job.location,
          url: job.url,
          source: 'indeed',
          category,
          isCyprus: !!company.isCyprus,
          postedDate: null,
          scrapedAt: new Date().toISOString(),
        });
      }
    } catch (err) {
      errors.push(`indeed:${query}: ${err.message}`);
    }
  }

  return { jobs: results, errors };
}
