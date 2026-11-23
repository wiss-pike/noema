export function clean(value) {
  return typeof value === 'string' ? value.replace(/<[^>]*>/g, ' ')
    .replace(/&(amp|lt|gt|quot|apos|nbsp|#39);/g, (_, name) =>
      ({ amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'" })[name])
    .replace(/\s+/g, ' ').trim() : '';
}

export async function source(url, accept, timeout = 12000) {
  const response = await fetch(url, {
    redirect: 'manual',
    signal: AbortSignal.timeout(timeout),
    headers: { Accept: accept },
  });
  if (!response.ok) throw new Error(new URL(url).hostname + ' HTTP ' + response.status);
  return response;
}

const ACL = 'https://aclanthology.org/';
const PMLR = 'https://proceedings.mlr.press/';
const JMLR = 'https://jmlr.org/';
const ISCA = 'https://www.isca-archive.org/';
const ACL_ID = /^\d{4}\.[a-z0-9-]+\.\d+$/;
const PMLR_PATH = /^v\d{1,4}\/[a-z0-9_-]+\.html$/;
const JMLR_PATH = /^papers\/v(\d{1,3})\/(\d{2}-\d{3,5})\.html$/;
const ISCA_PATH = /^[a-z0-9_-]{2,70}_interspeech\.html$/;
const TOPICS = /\b(?:llm|language models?|agents?|transformers?|retrieval|vision|multimodal|reinforcement|reasoning|diffusion|benchmark|neural|alignment|audio[- ](?:language|text))\b/i;
const FRONT_MATTER = /^(?:preface|foreword|front matter|table of contents|proceedings of|program committee|author index|welcome)\b/i;

function date(value) {
  const time = Date.parse(/^\d{1,2} [a-z]+ \d{4}$/i.test(value) ? value + ' UTC' : value);
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

export function readJmlr(rss, window) {
  const papers = [];
  for (const [, block] of rss.matchAll(/<item>([\s\S]*?)<\/item>/gi)) {
    const year = clean(block.match(/<pubDate>([^<]*)<\/pubDate>/i)?.[1]);
    const link = clean(block.match(/<link>([^<]*)<\/link>/i)?.[1]).replace(/^http:/, 'https:');
    const path = link.startsWith(JMLR) && link.slice(JMLR.length);
    const key = path && path.match(JMLR_PATH);
    const title = clean(block.match(/<title>([\s\S]*?)<\/title>/i)?.[1]);
    if (!key || !/^\d{4}$/.test(year) || year < window.from.slice(0, 4) || year > window.to.slice(0, 4) ||
        !title || FRONT_MATTER.test(title)) continue;
    const authors = clean(block.match(/<author>([\s\S]*?)<\/author>/i)?.[1])
      .split(/,\s*/).filter(Boolean).map(name => ({ name }));
    const abstract = clean(block.match(/<description>([\s\S]*?)<\/description>/i)?.[1]);
    papers.push({ id: 'jmlr:' + key[1] + '/' + key[2], publisher: 'jmlr', title, published: year, authors,
      abstract, venue: 'Journal of Machine Learning Research', paperUrl: JMLR + path });
    if (papers.length >= 18) break;
  }
  return limit(papers);
}

export function readInterspeech(html, year, window) {
  const header = html.split('<!-- Sessions -->', 1)[0];
  const stamp = clean(header.match(/<h5\b[^>]*>[^<]*<br\s*\/?>\s*([\s\S]*?)<\/h5>/i)?.[1]);
  const first = stamp.match(/^(\d{1,2})(?:\s+([A-Z][a-z]+))?\s*[-–—]\s*\d{1,2}\s+([A-Z][a-z]+)\s+(\d{4})$/);
  if (!first || first[4] !== year) return [];
  const published = date(first[1] + ' ' + (first[2] || first[3]) + ' ' + year);
  if (!recent(published, window)) return [];
  const papers = [];
  for (const [, path, titleText, authorText] of html.matchAll(
    /<div class="paper-type-regular">\s*<a class="w3-text" href="([^"]+)">\s*<p>\s*<span>([\s\S]*?)<\/span>\s*<br\s*\/?>\s*<span[^>]*>([\s\S]*?)<\/span>/gi)) {
    const title = clean(titleText);
    if (!ISCA_PATH.test(path) || !title || FRONT_MATTER.test(title)) continue;
    const authors = clean(authorText).split(/,\s*/).filter(Boolean).map(name => ({ name }));
    papers.push({ id: 'isca:' + year + '/' + path.slice(0, -5), publisher: 'isca', title, published, authors,
      venue: 'Interspeech ' + year, paperUrl: ISCA + 'interspeech_' + year + '/' + path });
    if (papers.length >= 200) break;
  }
  return limit(papers);
}

export async function discoverPublished(window) {
  const year = window.to.slice(0, 4);
  const issueYears = Array.from(new Set([year, window.from.slice(0, 4)]));
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
    source(JMLR + 'jmlr.xml', 'application/xml').then(async response => readJmlr(await response.text(), window)),
    Promise.allSettled(issueYears.map(async issueYear => {
      const issue = await source(ISCA + 'interspeech_' + issueYear + '/index.html', 'text/html');
      return readInterspeech(await issue.text(), issueYear, window);
    })).then(results => {
      for (const result of results) {
        if (result.status === 'rejected') console.warn('ISCA proceedings unavailable', String(result.reason));
      }
      return limit(results.flatMap(result => result.status === 'fulfilled' ? result.value : []));
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
  const yearOnly = ['jmlr', 'isca'].includes(paper.publisher) && indexedDate === paper.published.slice(0, 4);
  const published = /^\d{4}-\d{2}-\d{2}$/.test(indexedDate) ? indexedDate :
    (indexedDate === paper.published.slice(0, 7) || yearOnly ? paper.published : '');
  let pdf = field('pdf_url');
  const expectedPath = paper.paperUrl.slice(PMLR.length);
  const match = expectedPath.match(/^(v\d+)\/([a-z0-9_-]+)\.html$/);
  const pmlrPdf = match && [
    PMLR + match[1] + '/' + match[2] + '/' + match[2] + '.pdf',
    'https://raw.githubusercontent.com/mlresearch/' + match[1] + '/main/assets/' + match[2] + '/' + match[2] + '.pdf',
  ].includes(pdf);
  let validPdf;
  if (paper.publisher === 'jmlr') {
    const path = paper.paperUrl.startsWith(JMLR) && paper.paperUrl.slice(JMLR.length).match(JMLR_PATH);
    pdf = pdf?.replace(/^http:/, 'https:');
    validPdf = path && pdf === JMLR + 'papers/volume' + path[1] + '/' + path[2] + '/' + path[2] + '.pdf';
  } else if (paper.publisher === 'isca') {
    validPdf = pdf === paper.paperUrl.slice(0, -5) + '.pdf';
  } else {
    validPdf = paper.publisher === 'acl' ? pdf === paper.paperUrl.slice(0, -1) + '.pdf' : pmlrPdf;
  }
  if (!title || !published || !authors.length || !validPdf) throw new Error('Missing or unverified publisher metadata');
  const abstract = clean(html.match(/<div\b[^>]*\bid=(?:"abstract"|abstract\b)[^>]*>([\s\S]*?)<\/div>/i)?.[1]) ||
    clean(html.match(/<p\b[^>]*\bclass=(?:"abstract"|abstract\b)[^>]*>([\s\S]*?)<\/p>/i)?.[1]) ||
    metadata(html, 'description')[0] || paper.abstract || '';
  return { ...paper, title, authors, published, pdf, abstract, venue: field('conference_title') || field('journal_title') || paper.venue };
}

export async function downloadPdf(url) {
  const maxBytes = 8_000_000;
  const response = await source(url, 'application/pdf', 20000);
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
