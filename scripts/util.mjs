export function normalizeName(name) {
  return (name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

export function matchCompany(rawName, companies) {
  const normalized = normalizeName(rawName);
  if (!normalized) return null;
  return (
    companies.find((company) =>
      [company.name, ...(company.aliases || [])].some(
        (candidate) => normalizeName(candidate) === normalized,
      ),
    ) || null
  );
}

export function makeJobId(source, rawId) {
  return `${source}:${rawId}`;
}

export async function politeDelay(ms = 400) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}
