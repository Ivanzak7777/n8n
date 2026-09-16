const DATA_URLS = [
  'https://raw.githubusercontent.com/Ivanzak7777/n8n/master/data/jobs.json',
  'https://raw.githubusercontent.com/Ivanzak7777/n8n/master/data/jobs-indeed.json',
];

const VISITS_NAMESPACE = 'payments-jobs-board-ivanzak7777';

const state = {
  jobs: [],
  position: 'all',
  level: 'all',
  companies: new Set(),
  search: '',
};

const els = {
  updatedAt: document.getElementById('updated-at'),
  visitsCounter: document.getElementById('visits-counter'),
  resultsCount: document.getElementById('results-count'),
  sourceErrorsNote: document.getElementById('source-errors-note'),
  positionFilter: document.getElementById('position-filter'),
  levelFilter: document.getElementById('level-filter'),
  companyFilter: document.getElementById('company-filter'),
  resetCompanies: document.getElementById('reset-companies'),
  searchInput: document.getElementById('search-input'),
  cyprusJobs: document.getElementById('cyprus-jobs'),
  otherJobs: document.getElementById('other-jobs'),
  cyprusSection: document.getElementById('cyprus-section'),
  otherSection: document.getElementById('other-section'),
  emptyState: document.getElementById('empty-state'),
  loadingSkeleton: document.getElementById('loading-skeleton'),
  statTotal: document.getElementById('stat-total'),
  statQa: document.getElementById('stat-qa'),
  statProduct: document.getElementById('stat-product'),
  statCyprus: document.getElementById('stat-cyprus'),
};

const CATEGORY_LABEL = { qa: 'QA', product: 'Product' };
const LEVEL_LABEL = { junior: 'Junior', middle: 'Middle', senior: 'Senior' };

async function fetchVisitsToday() {
  const today = new Date().toISOString().slice(0, 10);
  try {
    const res = await fetch(`https://abacus.jasoncameron.dev/hit/${VISITS_NAMESPACE}/${today}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.value ?? null;
  } catch {
    return null;
  }
}

function formatDate(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('uk-UA', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

async function fetchJobData(url) {
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return { jobs: [], updatedAt: null, sourceErrors: [] };
    return await res.json();
  } catch {
    return { jobs: [], updatedAt: null, sourceErrors: [] };
  }
}

function buildCompanyPills() {
  const companies = [...new Set(state.jobs.map((job) => job.company))].sort((a, b) =>
    a.localeCompare(b),
  );

  els.companyFilter.innerHTML = '';
  for (const company of companies) {
    const btn = document.createElement('button');
    btn.className = 'pill';
    btn.textContent = company;
    btn.dataset.value = company;
    btn.addEventListener('click', () => {
      if (state.companies.has(company)) {
        state.companies.delete(company);
        btn.classList.remove('active');
      } else {
        state.companies.add(company);
        btn.classList.add('active');
      }
      render();
    });
    els.companyFilter.appendChild(btn);
  }
}

function updateStats() {
  const total = state.jobs.length;
  const qa = state.jobs.filter((job) => job.category === 'qa').length;
  const product = state.jobs.filter((job) => job.category === 'product').length;
  const cyprusCompanies = new Set(
    state.jobs.filter((job) => job.isCyprus).map((job) => job.company),
  ).size;

  els.statTotal.textContent = total;
  els.statQa.textContent = qa;
  els.statProduct.textContent = product;
  els.statCyprus.textContent = cyprusCompanies;
}

function jobCard(job) {
  const card = document.createElement('div');
  card.className = 'job-card';

  const top = document.createElement('div');
  top.className = 'job-card-top';

  const link = document.createElement('a');
  link.className = 'job-title';
  link.href = job.url;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.textContent = job.title;
  top.appendChild(link);

  const badge = document.createElement('span');
  badge.className = `badge badge-${job.category}`;
  badge.textContent = CATEGORY_LABEL[job.category] || job.category;
  top.appendChild(badge);

  card.appendChild(top);

  const meta = document.createElement('div');
  meta.className = 'job-meta';

  const company = document.createElement('span');
  company.className = 'company-name';
  company.textContent = job.company;
  meta.appendChild(company);

  if (job.isCyprus) {
    const cyBadge = document.createElement('span');
    cyBadge.className = 'badge badge-cyprus';
    cyBadge.textContent = '🇨🇾 Cyprus';
    meta.appendChild(cyBadge);
  }

  for (const level of job.levels || []) {
    const levelBadge = document.createElement('span');
    levelBadge.className = 'badge badge-level';
    levelBadge.textContent = LEVEL_LABEL[level] || level;
    meta.appendChild(levelBadge);
  }

  if (job.location) {
    const loc = document.createElement('span');
    loc.textContent = job.location;
    meta.appendChild(loc);
  }

  const source = document.createElement('span');
  source.textContent = `via ${job.source}`;
  meta.appendChild(source);

  const date = formatDate(job.postedDate || job.scrapedAt);
  if (date) {
    const dateEl = document.createElement('span');
    dateEl.textContent = date;
    meta.appendChild(dateEl);
  }

  card.appendChild(meta);

  if (job.salaryEstimate) {
    const salary = document.createElement('div');
    salary.className = 'job-salary';
    salary.textContent = `≈ ${job.salaryEstimate} (оцінка)`;
    card.appendChild(salary);
  }

  return card;
}

function matchesFilters(job) {
  if (state.position !== 'all' && job.category !== state.position) return false;
  if (state.level !== 'all' && !(job.levels || []).includes(state.level)) return false;
  if (state.companies.size > 0 && !state.companies.has(job.company)) return false;
  if (state.search) {
    const haystack = `${job.title} ${job.company}`.toLowerCase();
    if (!haystack.includes(state.search.toLowerCase())) return false;
  }
  return true;
}

function render() {
  const filtered = state.jobs.filter(matchesFilters);

  const cyprusJobs = filtered.filter((job) => job.isCyprus);
  const otherJobs = filtered.filter((job) => !job.isCyprus);

  els.cyprusJobs.innerHTML = '';
  cyprusJobs.forEach((job) => els.cyprusJobs.appendChild(jobCard(job)));
  els.cyprusSection.hidden = cyprusJobs.length === 0;

  els.otherJobs.innerHTML = '';
  otherJobs.forEach((job) => els.otherJobs.appendChild(jobCard(job)));
  els.otherSection.hidden = otherJobs.length === 0;

  els.emptyState.hidden = filtered.length !== 0;
  els.resultsCount.textContent = `Знайдено вакансій: ${filtered.length}`;
}

function bindStaticControls() {
  els.positionFilter.addEventListener('click', (e) => {
    const btn = e.target.closest('.pill');
    if (!btn) return;
    state.position = btn.dataset.value;
    [...els.positionFilter.children].forEach((child) => child.classList.remove('active'));
    btn.classList.add('active');
    render();
  });

  els.levelFilter.addEventListener('click', (e) => {
    const btn = e.target.closest('.pill');
    if (!btn) return;
    state.level = btn.dataset.value;
    [...els.levelFilter.children].forEach((child) => child.classList.remove('active'));
    btn.classList.add('active');
    render();
  });

  els.resetCompanies.addEventListener('click', () => {
    state.companies.clear();
    [...els.companyFilter.children].forEach((child) => child.classList.remove('active'));
    render();
  });

  let searchTimer;
  els.searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      state.search = e.target.value.trim();
      render();
    }, 150);
  });
}

async function init() {
  bindStaticControls();

  fetchVisitsToday().then((count) => {
    if (count != null) {
      els.visitsCounter.textContent = `Переглядів сьогодні: ${count}`;
    }
  });

  try {
    const results = await Promise.all(DATA_URLS.map(fetchJobData));

    const allJobs = results.flatMap((data) => data.jobs || []);
    const byId = new Map();
    for (const job of allJobs) byId.set(job.id, job);
    state.jobs = [...byId.values()];

    const timestamps = results.map((data) => data.updatedAt).filter(Boolean).sort();
    const latest = timestamps[timestamps.length - 1];
    els.updatedAt.textContent = latest
      ? `Оновлено: ${new Date(latest).toLocaleString('uk-UA')}`
      : 'Дата оновлення невідома';

    const errorCount = results.reduce((sum, data) => sum + (data.sourceErrors?.length || 0), 0);
    if (errorCount > 0) {
      els.sourceErrorsNote.textContent = `⚠ Деякі джерела тимчасово недоступні (${errorCount})`;
    }

    els.loadingSkeleton.hidden = true;
    buildCompanyPills();
    updateStats();
    render();
  } catch (err) {
    els.loadingSkeleton.hidden = true;
    els.updatedAt.textContent = 'Не вдалося завантажити дані.';
    els.emptyState.hidden = false;
    els.emptyState.textContent = 'Помилка завантаження вакансій. Спробуйте оновити сторінку пізніше.';
    console.error(err);
  }
}

init();
