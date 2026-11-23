/* Feed access is shared by the cover and the archive. */
const NoemaContent = (() => {
  async function json(path, signal) {
    const response = await fetch(path, { cache: 'no-cache', signal });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    return response.json();
  }

  function safeLink(value, localPdf = false) {
    if (typeof value !== 'string') return false;
    if (localPdf && /^assets\/papers\/[\w.-]+\.pdf$/i.test(value)) return true;
    try {
      return ['http:', 'https:'].includes(new URL(value).protocol);
    } catch {
      return false;
    }
  }

  async function publishedEditions() {
    const config = document.querySelector('meta[name="noema-daily-api"]');
    if (!config) return [];
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    try {
      const result = await json(config.content, controller.signal);
      return Array.isArray(result.items) ? result.items : [];
    } catch {
      return [];
    } finally {
      clearTimeout(timeout);
    }
  }

  async function daily() {
    const [archive, published] = await Promise.all([
      json('data/daily.json'),
      publishedEditions(),
    ]);
    const editions = new Map(archive.items.map(day => [day.date, day]));
    for (const day of published) {
      if (day && typeof day.date === 'string' && Array.isArray(day.entries)) {
        editions.set(day.date, day);
      }
    }
    archive.items = Array.from(editions.values());
    archive.items.sort((a, b) => b.date.localeCompare(a.date));
    const dates = new Set(archive.items.map(day => day.date));
    archive.missing = (archive.missing || []).filter(day => !dates.has(day.date));
    return archive;
  }

  return { json, daily, safeLink };
})();
