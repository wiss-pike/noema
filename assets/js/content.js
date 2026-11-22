/* Feed access is shared by the cover and the archive. */
const NoemaContent = (() => {
  async function json(path) {
    const response = await fetch(path, { cache: 'no-cache' });
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

  async function daily() {
    const archive = await json('data/daily.json');
    archive.items.sort((a, b) => b.date.localeCompare(a.date));
    const dates = new Set(archive.items.map(day => day.date));
    archive.missing = (archive.missing || []).filter(day => !dates.has(day.date));
    return archive;
  }

  return { json, daily, safeLink };
})();
