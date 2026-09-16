import { categorize } from '../categorize.mjs';
import { detectLevels, detectRegionBucket, estimateSalary } from '../enrich.mjs';
import { matchCompany, makeJobId } from '../util.mjs';

const API_URL = 'https://remoteok.com/api';
const HEADERS = { 'User-Agent': 'Mozilla/5.0 (compatible; PaymentsJobBoardBot/1.0)' };

export async function scrapeRemoteOk(companies) {
  const results = [];
  const errors = [];

  try {
    const res = await fetch(API_URL, { headers: HEADERS });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const jobs = Array.isArray(data) ? data.slice(1) : []; // first entry is RemoteOK's own legal notice

    for (const job of jobs) {
      if (!job.position || !job.company) continue;

      const company = matchCompany(job.company, companies);
      if (!company) continue;

      const category = categorize(job.position);
      if (category === 'other') continue;

      const levels = detectLevels(job.position);
      const region = detectRegionBucket(job.location, company.hqCountry);

      results.push({
        id: makeJobId('remoteok', job.id || job.slug),
        title: job.position,
        company: company.name,
        companySlug: company.slug,
        location: job.location || 'Remote',
        url: job.url,
        source: 'remoteok',
        category,
        levels,
        region,
        salaryEstimate: estimateSalary(category, levels, region),
        isCyprus: !!company.isCyprus,
        postedDate: job.date || null,
        scrapedAt: new Date().toISOString(),
      });
    }
  } catch (err) {
    errors.push(`remoteok: ${err.message}`);
  }

  return { jobs: results, errors };
}
