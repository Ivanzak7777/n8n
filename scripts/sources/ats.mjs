import { categorize } from '../categorize.mjs';
import { detectLevels, detectRegionBucket, estimateSalary } from '../enrich.mjs';
import { fetchWithRetry, makeJobId } from '../util.mjs';

const HEADERS = { 'User-Agent': 'Mozilla/5.0 (compatible; PaymentsJobBoardBot/1.0)' };

async function fetchJson(url) {
  const res = await fetchWithRetry(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

async function scrapeGreenhouse(company) {
  const data = await fetchJson(
    `https://boards-api.greenhouse.io/v1/boards/${company.atsSlug}/jobs?content=false`,
  );
  return (data.jobs || []).map((job) => ({
    rawId: String(job.id),
    title: job.title,
    url: job.absolute_url,
    location: job.location?.name || null,
    postedDate: job.updated_at || null,
  }));
}

async function scrapeLever(company) {
  const data = await fetchJson(`https://api.lever.co/v0/postings/${company.atsSlug}?mode=json`);
  return (data || []).map((job) => ({
    rawId: String(job.id),
    title: job.text,
    url: job.hostedUrl,
    location: job.categories?.location || null,
    postedDate: job.createdAt ? new Date(job.createdAt).toISOString() : null,
  }));
}

async function scrapeTeamtailor(company) {
  const data = await fetchJson(`https://${company.atsSlug}.teamtailor.com/jobs.json`);
  return (data.items || []).map((job) => ({
    rawId: String(job.id),
    title: job.title,
    url: job.url,
    location: null,
    postedDate: job.date_published || null,
  }));
}

async function scrapeWorkable(company) {
  const data = await fetchJson(
    `https://apply.workable.com/api/v1/widget/accounts/${company.atsSlug}`,
  );
  return (data.jobs || []).map((job) => ({
    rawId: String(job.shortcode || job.id || job.title),
    title: job.title,
    url: job.url,
    location: [job.city, job.country].filter(Boolean).join(', ') || null,
    postedDate: job.created_at || null,
  }));
}

async function scrapeAshby(company) {
  const data = await fetchJson(`https://api.ashbyhq.com/posting-api/job-board/${company.atsSlug}`);
  return (data.jobs || []).map((job) => ({
    rawId: String(job.id),
    title: job.title,
    url: job.jobUrl || job.applyUrl,
    location: job.location || null,
    postedDate: job.publishedAt || null,
  }));
}

const ADAPTERS = {
  greenhouse: scrapeGreenhouse,
  lever: scrapeLever,
  teamtailor: scrapeTeamtailor,
  workable: scrapeWorkable,
  ashby: scrapeAshby,
};

export async function scrapeAts(companies) {
  const results = [];
  const errors = [];

  const targets = companies.filter((company) => company.atsSlug && ADAPTERS[company.ats]);

  for (const company of targets) {
    try {
      const rawJobs = await ADAPTERS[company.ats](company);
      for (const job of rawJobs) {
        const category = categorize(job.title);
        if (category === 'other') continue;

        const levels = detectLevels(job.title);
        const region = detectRegionBucket(job.location, company.hqCountry);

        results.push({
          id: makeJobId(`${company.ats}:${company.slug}`, job.rawId),
          title: job.title,
          company: company.name,
          companySlug: company.slug,
          location: job.location,
          url: job.url,
          source: company.ats,
          category,
          levels,
          region,
          salaryEstimate: estimateSalary(category, levels, region),
          isCyprus: !!company.isCyprus,
          postedDate: job.postedDate,
          scrapedAt: new Date().toISOString(),
        });
      }
    } catch (err) {
      errors.push(`ats:${company.slug}: ${err.message}`);
    }
  }

  return { jobs: results, errors };
}
