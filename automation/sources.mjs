export const feeds = [
  { name: 'BBC News', url: 'https://feeds.bbci.co.uk/news/world/rss.xml', kind: 'foreign', category: '国际' },
  { name: 'Le Monde', url: 'https://www.lemonde.fr/en/artificial-intelligence/rss_full.xml', kind: 'foreign', category: 'AI' },
  { name: 'Ars Technica', url: 'https://arstechnica.com/ai/feed/', kind: 'foreign', category: 'AI' },
  { name: 'The Verge', url: 'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml', kind: 'foreign', category: 'AI' },
  { name: 'WIRED', url: 'https://www.wired.com/feed/tag/ai/latest/rss', kind: 'foreign', category: 'AI' },
  { name: 'Nature Machine Intelligence', url: 'https://www.nature.com/natmachintell.rss', kind: 'foreign', category: 'AI' },
  { name: 'arXiv cs.AI', url: 'https://rss.arxiv.org/rss/cs.AI', kind: 'primary', category: 'AI' },
  { name: 'OpenAI', url: 'https://openai.com/news/rss.xml', kind: 'primary', category: 'AI' },
  { name: 'Google DeepMind', url: 'https://deepmind.google/blog/rss.xml', kind: 'primary', category: 'AI' },
  { name: 'Hugging Face', url: 'https://huggingface.co/blog/feed.xml', kind: 'primary', category: 'AI' },
  { name: 'IT之家', url: 'https://www.ithome.com/rss/', kind: 'domestic', category: '科技' },
];

const articleRules = [
  [/^(?:www\.)?bbc\.(?:co\.uk|com)$/, /^\/news\/(?:articles|videos)\/[a-z0-9]+\/?$|^\/news\/[a-z-]+-\d+\/?$/],
  [/^(?:www\.)?lemonde\.fr$/, /\/article\/\d{4}\/\d{2}\/\d{2}\/[^/]+\.html$/],
  [/^arstechnica\.com$/, /^\/[^/]+\/\d{4}\/\d{2}\/[^/]+\/?$/],
  [/^(?:www\.)?theverge\.com$/, /^\/(?:[^/]+\/)*\d{5,}\/[^/]+\/?$/],
  [/^(?:www\.)?wired\.com$/, /^\/story\/[^/]+\/?$/],
  [/^(?:www\.)?nature\.com$/, /^\/articles\/[^/]+\/?$/],
  [/^arxiv\.org$/, /^\/abs\/\d{4}\.\d{4,5}(?:v\d+)?\/?$/],
  [/^(?:www\.)?openai\.com$/, /^\/index\/[^/]+\/?$/],
  [/^deepmind\.google$/, /^\/blog\/[^/]+\/?$/],
  [/^huggingface\.co$/, /^\/blog\/[^/]+(?:\/[^/]+)?\/?$/],
  [/^(?:www\.)?ithome\.com$/, /^\/\d+\/\d{3}\/\d{3}\.htm$/],
];

export function isArticleUrl(value, publisher) {
  const index = feeds.findIndex(feed => feed.name === publisher);
  if (index < 0) return false;
  const [host, path] = articleRules[index];
  const url = new URL(value);
  return url.protocol === 'https:' && !url.port && !url.username && !url.password &&
    host.test(url.hostname) && path.test(url.pathname);
}
