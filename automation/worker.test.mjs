import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import handler, { checkedArticle, readFeed, makeEdition } from './worker.mjs';
import { onRequestGet } from './pages/functions/api/daily.js';
import { feeds } from './sources.mjs';

const now = Date.parse('2026-11-23T00:00:00Z');
const xmlEntry = (link, date) => `<item><title>AI news &amp; research</title><link>${link}</link><pubDate>${new Date(date).toUTCString()}</pubDate><description><![CDATA[<b>Source excerpt</b>]]></description></item>`;
const feed = (...entries) => `<rss><channel>${entries.join('')}</channel></rss>`;
const draft = { title: '研究简报', points: ['公开研究的主要更新。'], evidence: 'AI news & research',
  url: 'https://invalid.example' };

test('RSS keeps the last 24 hours, cleans text and strips tracking links', () => {
  const results = readFeed(feed(
    xmlEntry('https://example.org/recent?utm_source=rss', now - 1000),
    xmlEntry('https://example.org/old', now - 90_000_000),
    xmlEntry('javascript:alert(1)', now - 1000),
    xmlEntry('https://example.org/future', now + 1000),
  ), feeds[0], now);
  assert.deepEqual(results.map(({ title, link, excerpt }) => ({ title, link, excerpt })), [{
    title: 'AI news & research', link: 'https://example.org/recent', excerpt: 'Source excerpt',
  }]);
});

test('Atom updated dates and RSS publication dates remain supported', () => {
  const atom = `<feed><entry><title>Research</title><link rel="alternate" href="https://example.org/atom"/><updated>2026-11-22T20:30:00Z</updated></entry></feed>`;
  assert.equal(readFeed(atom, feeds[0], now)[0].link, 'https://example.org/atom');
  const republished = `<feed><entry><title>Older article</title><link href="https://example.org/old"/><published>2026-11-20T10:00:00Z</published><updated>2026-11-22T20:30:00Z</updated></entry></feed>`;
  assert.deepEqual(readFeed(republished, feeds[0], now), []);
});

test('editorial quotas are enforced and links only come from candidate feeds', () => {
  const kinds = ['domestic', 'domestic', 'domestic', 'foreign', 'foreign', 'foreign', 'foreign', 'primary', 'primary'];
  const candidates = kinds.map((kind, index) => ({ kind, category: index < 2 ? '科技' : 'AI', source: kind,
    link: 'https://example.org/' + index, title: 'AI news & research' }));
  const drafts = candidates.map(candidate => ({ candidate, item: draft }));
  const edition = makeEdition(drafts, '2026-11-23');
  assert.equal(edition.entries.length, 8);
  const sourceTypes = edition.entries.map(item => item.sources[0].label);
  assert.equal(sourceTypes.filter(item => item === 'foreign').length, 4);
  assert.equal(sourceTypes.filter(item => item !== 'domestic').length, 6);
  assert.ok(edition.entries.every(item => item.sources[0].url.startsWith('https://example.org/')));
  assert.throws(() => makeEdition([{ candidate: candidates[3], item: { ...draft, evidence: 'An unrelated article' } }],
    '2026-11-23'), /No verified selection/);
});

test('article checks reject homepages, another article, and a verification challenge', async t => {
  const candidate = { source: 'BBC News', link: 'https://www.bbc.co.uk/news/articles/c820q9wgrpyyo' };
  let destination = 'https://www.bbc.com/';
  let markup = '<title>Original article | BBC News</title>';
  const fetch = t.mock.method(globalThis, 'fetch', async url => url === candidate.link ?
    new Response(null, { status: 302, headers: { Location: destination } }) :
    new Response(markup, { headers: { 'Content-Type': 'text/html' } }));
  assert.equal(await checkedArticle(candidate), null);
  destination = 'https://www.bbc.com/news/articles/someotherreport';
  assert.equal(await checkedArticle(candidate), null);
  assert.equal(fetch.mock.callCount(), 2);
  destination = 'https://www.bbc.com/news/articles/c820q9wgrpyyo';
  assert.equal((await checkedArticle(candidate)).link, destination);
  markup = '<title>Client Challenge</title>';
  assert.equal(await checkedArticle(candidate), null);
});

test('the scheduled archive stores Simplified Chinese once, and Pages reads the published edition', async t => {
  const database = new DatabaseSync(':memory:');
  t.after(() => database.close());
  database.exec(readFileSync(new URL('./migrations/0001_editions.sql', import.meta.url), 'utf8'));
  const env = { ARCHIVE: {
    prepare(sql) {
      const statement = database.prepare(sql);
      const command = (args = []) => ({
        bind: (...values) => command(values),
        all: async () => ({ results: statement.all(...args) }),
        first: async () => statement.get(...args),
        run: async () => statement.run(...args),
      });
      return command();
    },
  }, AI: {
    run: t.mock.fn(async (_, input) => {
      const payload = JSON.parse(input.messages[1].content);
      if (Array.isArray(payload)) return { response: { ids: [1] } };
      assert.deepEqual(Object.keys(payload), ['title', 'excerpt']);
      return { response: {
      ...draft, title: '美國州檢察總長試圖阻止 Character.AI 出售用戶聊天數據',
      points: ['「上下文縮放」旨在減少因用戶狀態和工具追蹤資訊缺失而導致的問題。'],
      } };
    }),
  } };
  const url = 'https://www.theverge.com/policy/1042620/character-ai-sale-state-ags-block-selling-users-chats';
  t.mock.method(globalThis, 'fetch', async input => {
    if (input === url) return new Response('<title>AI news &amp; research</title>', { headers: { 'Content-Type': 'text/html' } });
    const match = feeds.find(source => source.url === input);
    return new Response(match?.name === 'The Verge' ? feed(xmlEntry(url, now - 1000)) : feed());
  });
  const result = {};
  const ctx = { waitUntil(promise) { result.job = promise; } };
  handler.scheduled({ scheduledTime: now }, env, ctx);
  await result.job;
  handler.scheduled({ scheduledTime: now }, env, ctx);
  await result.job;
  assert.equal(env.AI.run.mock.callCount(), 2);
  const request = new Request('https://noema-wiss.pages.dev/api/daily');
  const published = await onRequestGet({ request, env: { BRIEFING: { fetch: req => handler.fetch(req, env) } } });
  const body = await published.json();
  assert.equal(body.items.length, 1);
  assert.equal(body.items[0].date, '2026-11-23');
  assert.equal(body.items[0].entries[0].title, '美国州检察总长试图阻止 Character.AI 出售用户聊天数据');
  assert.equal(body.items[0].entries[0].points[0], '「上下文缩放」旨在减少因用户状态和工具追踪资讯缺失而导致的问题。');
  assert.equal(body.items[0].entries[0].sources[0].url, url);
  const post = await handler.fetch(new Request(request, { method: 'POST' }), env);
  assert.equal(post.status, 405);
});
