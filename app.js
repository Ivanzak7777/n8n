const state = {
  jobs: [],
  position: 'all',
  companies: new Set(),
  search: '',
};

const els = {
  updatedAt: document.getElementById('updated-at'),
  resultsCount: document.getElementById('results-count'),
  sourceErrorsNote: document.getElementById('source-errors-note'),
  positionFilter: document.getElementById('position-filter'),
  companyFilter: document.getElementById('company-filter'),
  resetCompanies: document.getElementById('reset-companies'),
  searchInput: document.getElementById('search-input'),
  cyprusJobs: document.getElementById('cyprus-jobs'),
  otherJobs: document.getElementById('other-jobs'),
  cyprusSection: document.getElementById('cyprus-section'),
  otherSection: document.getElementById('other-section'),
  emptyState: document.getElementById('empty-state'),
};

const CATEGORY_LABEL = { qa: 'QA', product: 'Product' };

function formatDate(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('uk-UA', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return '';
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
  return card;
}

function matchesFilters(job) {
  if (state.position !== 'all' && job.category !== state.position) return false;
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

  try {
    const res = await fetch('./data/jobs.json', { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    state.jobs = data.jobs || [];
    els.updatedAt.textContent = data.updatedAt
      ? `Оновлено: ${new Date(data.updatedAt).toLocaleString('uk-UA')}`
      : '';

    if (data.sourceErrors && data.sourceErrors.length > 0) {
      els.sourceErrorsNote.textContent = `⚠ Деякі джерела тимчасово недоступні (${data.sourceErrors.length})`;
    }

    buildCompanyPills();
    render();
  } catch (err) {
    els.updatedAt.textContent = 'Не вдалося завантажити дані.';
    els.emptyState.hidden = false;
    els.emptyState.textContent = 'Помилка завантаження вакансій. Спробуйте оновити сторінку пізніше.';
    console.error(err);
  }
}

init();
