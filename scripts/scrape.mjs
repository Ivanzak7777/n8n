import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { scrapeDjinni } from './sources/djinni.mjs';
import { scrapeAts } from './sources/ats.mjs';
import { scrapeDou } from './sources/dou.mjs';
import { scrapeRemoteOk } from './sources/remoteok.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const COMPANIES_PATH = path.join(__dirname, 'companies.json');
const OUTPUT_PATH = path.join(ROOT, 'data', 'jobs.json');

async function loadCompanies() {
  const raw = await readFile(COMPANIES_PATH, 'utf-8');
  return JSON.parse(raw);
}

async function loadExisting() {
  try {
    const raw = await readFile(OUTPUT_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function dedupe(jobs) {
  const byId = new Map();
  for (const job of jobs) {
    byId.set(job.id, job);
  }
  return [...byId.values()];
}

async function main() {
  const companies = await loadCompanies();

  const sourceRuns = await Promise.allSettled([
    scrapeDjinni(companies),
    scrapeAts(companies),
    scrapeDou(companies),
    scrapeRemoteOk(companies),
  ]);

  const allJobs = [];
  const allErrors = [];
  let anySourceSucceeded = false;

  for (const run of sourceRuns) {
    if (run.status === 'fulfilled') {
      allJobs.push(...run.value.jobs);
      allErrors.push(...run.value.errors);
      if (run.value.jobs.length > 0) anySourceSucceeded = true;
    } else {
      allErrors.push(`source crashed: ${run.reason?.message || run.reason}`);
    }
  }

  const jobs = dedupe(allJobs).sort((a, b) => {
    if (a.isCyprus !== b.isCyprus) return a.isCyprus ? -1 : 1;
    return a.company.localeCompare(b.company);
  });

  const existing = await loadExisting();

  if (jobs.length === 0 && existing?.jobs?.length) {
    console.error(
      'All sources returned zero jobs — keeping previous data/jobs.json instead of overwriting it.',
    );
    console.error('Errors:', allErrors.join('\n'));
    process.exit(1);
  }

  const output = {
    updatedAt: new Date().toISOString(),
    jobCount: jobs.length,
    sourceErrors: allErrors,
    jobs,
  };

  await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, JSON.stringify(output, null, 2));

  console.log(`Wrote ${jobs.length} jobs to ${OUTPUT_PATH}`);
  if (allErrors.length > 0) {
    console.log(`Non-fatal source errors (${allErrors.length}):`);
    console.log(allErrors.join('\n'));
  }
  if (!anySourceSucceeded) {
    console.log('Warning: no source produced any jobs this run.');
  }
}

main().catch((err) => {
  console.error('Scrape failed:', err);
  process.exit(1);
});
