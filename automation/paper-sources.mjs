export function clean(value) {
  return typeof value === 'string' ? value.replace(/<[^>]*>/g, ' ')
    .replace(/&(amp|lt|gt|quot|apos|nbsp|#39);/g, (_, name) =>
      ({ amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'" })[name])
    .replace(/\s+/g, ' ').trim() : '';
}

export async function source(url, accept) {
  const response = await fetch(url, {
    redirect: 'manual',
    signal: AbortSignal.timeout(12000),
    headers: { Accept: accept },
  });
  if (!response.ok) throw new Error(new URL(url).hostname + ' HTTP ' + response.status);
  return response;
}

const ACL = 'https://aclanthology.org/';
const PMLR = 'https://proceedings.mlr.press/';
const ACL_ID = /^\d{4}\.[a-z0-9-]+\.\d+$/;
const PMLR_PATH = /^v\d{1,4}\/[a-z0-9_-]+\.html$/;
const TOPICS = /\b(?:llm|language models?|agents?|transformers?|retrieval|vision|multimodal|reinforcement|reasoning|diffusion|benchmark|neural|alignment)\b/i;
const FRONT_MATTER = /^(?:preface|foreword|front matter|table of contents|proceedings of|program committee|author index|welcome)\b/i;

function date(value) {
  const time = Date.parse(value);
  return Number.isFinite(time) ? new Date(time).toISOString().slice(0, 10) : '';
}

function recent(published, window) {
  return published && published >= window.from && published <= window.to;
}

function limit(papers) {
  return papers.sort((a, b) => Number(TOPICS.test(b.title)) - Number(TOPICS.test(a.title)) ||
    b.published.localeCompare(a.published)).slice(0, 6);
}

export function readAcl(rss, window) {
  const papers = [];
  for (const [, block] of rss.matchAll(/<item>([\s\S]*?)<\/item>/gi)) {
    const key = clean(block.match(/<guid(?:\s[^>]*)?>([^<]*)<\/guid>/i)?.[1]);
    const published = date(block.match(/<pubDate>([^<]*)<\/pubDate>/i)?.[1]);
    const title = clean(block.match(/<title>([\s\S]*?)<\/title>/i)?.[1]);
    if (!ACL_ID.test(key) || !recent(published, window) || !title || FRONT_MATTER.test(title)) continue;
    papers.push({ id: 'acl:' + key, publisher: 'acl', title, published, authors: [],
      venue: 'ACL Anthology', paperUrl: ACL + key + '/' });
    if (papers.length >= 40) break;
  }
  return limit(papers);
}

export function readPmlrVolume(html, window) {
  const published = date(html.match(/Published as Volume \d+ by the Proceedings of Machine Learning Research on (\d{1,2} [a-z]+ \d{4})/i)?.[1]);
  if (!recent(published, window)) return [];
  const papers = [];
  for (const [, block] of html.matchAll(/<div class="paper">([\s\S]*?)<\/div>/gi)) {
    const path = block.match(/href="https:\/\/proceedings\.mlr\.press\/([^"]+)"/i)?.[1];
    const title = clean(block.match(/<p class="title">([\s\S]*?)<\/p>/i)?.[1]);
    const authors = clean(block.match(/<span class="authors">([\s\S]*?)<\/span>/i)?.[1])
      .split(/,\s*/).filter(Boolean).map(name => ({ name }));
    if (!PMLR_PATH.test(path) || !title || FRONT_MATTER.test(title)) continue;
    const venue = clean(block.match(/<span class="info"><i>([\s\S]*?)<\/i>/i)?.[1]) || 'PMLR';
    papers.push({ id: 'pmlr:' + path.slice(0, -5), publisher: 'pmlr', title, published, authors,
      venue, paperUrl: PMLR + path });
  }
  return limit(papers);
}

export async function discoverPublished(window) {
  const requests = [
    source(ACL + 'papers/index.xml', 'application/xml').then(async response => readAcl(await response.text(), window)),
    source(PMLR, 'text/html').then(async response => {
      const html = await response.text();
      const volumes = Array.from(new Set(Array.from(html.matchAll(/href="(v\d{1,4})"><b>Volume\b/g), match => match[1]))).slice(0, 4);
      const papers = [];
      for (const volume of volumes) {
        try {
          const issue = await source(PMLR + volume + '/', 'text/html');
          papers.push(...readPmlrVolume(await issue.text(), window));
          if (papers.length >= 6) break;
        } catch (error) {
          console.warn('PMLR volume unavailable', String(error));
        }
      }
      return limit(papers);
    }),
  ];
  return (await Promise.allSettled(requests)).map((result, index) => {
    if (result.status === 'fulfilled') return result.value;
    console.warn('Paper publisher discovery unavailable', index, String(result.reason));
    return [];
  });
}

export function metadata(html, name) {
  const values = [];
  for (const [tag] of html.split(/<\/head>/i, 1)[0].matchAll(/<meta\b[^>]*>/gi)) {
    const field = tag.match(/\bname=(?:"([^"]+)"|'([^']+)'|([^\s>]+))/i)?.slice(1).find(Boolean);
    if (field !== name) continue;
    const value = tag.match(/\bcontent=(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i)?.slice(1).find(Boolean);
    if (value) values.push(clean(value));
  }
  return values;
}

export function readPublication(html, paper) {
  const field = name => metadata(html, 'citation_' + name)[0];
  const title = field('title');
  const authors = metadata(html, 'citation_author').map(name => ({ name }));
  const indexedDate = field('publication_date')?.replaceAll('/', '-');
  const published = /^\d{4}-\d{2}-\d{2}$/.test(indexedDate) ? indexedDate :
    (indexedDate === paper.published.slice(0, 7) ? paper.published : '');
  const pdf = field('pdf_url');
  const expectedPath = paper.paperUrl.slice(PMLR.length);
  const match = expectedPath.match(/^(v\d+)\/([a-z0-9_-]+)\.html$/);
  const pmlrPdf = match && [
    PMLR + match[1] + '/' + match[2] + '/' + match[2] + '.pdf',
    'https://raw.githubusercontent.com/mlresearch/' + match[1] + '/main/assets/' + match[2] + '/' + match[2] + '.pdf',
  ].includes(pdf);
  const validPdf = paper.publisher === 'acl' ? pdf === paper.paperUrl.slice(0, -1) + '.pdf' : pmlrPdf;
  if (!title || !published || !authors.length || !validPdf) throw new Error('Missing or unverified publisher metadata');
  const abstract = clean(html.match(/<div\b[^>]*\bid=(?:"abstract"|abstract\b)[^>]*>([\s\S]*?)<\/div>/i)?.[1]) ||
    metadata(html, 'description')[0] || '';
  return { ...paper, title, authors, published, pdf, abstract, venue: field('conference_title') || paper.venue };
}

export async function downloadPdf(url) {
  const maxBytes = 8_000_000;
  const response = await source(url, 'application/pdf');
  if (Number(response.headers.get('content-length')) > maxBytes || !response.body) throw new Error('Paper PDF too large or missing');
  const reader = response.body.getReader();
  const parts = [];
  let length = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > maxBytes) throw new Error('Paper PDF too large');
      parts.push(value);
    }
  } finally {
    await reader.cancel();
  }
  if (!parts.length || new TextDecoder().decode(parts[0].slice(0, 5)) !== '%PDF-') throw new Error('Invalid paper PDF');
  return new Blob(parts, { type: 'application/pdf' });
}
