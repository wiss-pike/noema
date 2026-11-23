import assert from 'node:assert/strict';
import test from 'node:test';
import { makePaper, parseReview, readArxiv } from './papers.mjs';

const candidate = {
  id: '2611.12345', version: '2611.12345v2',
  title: 'A test paper', authors: [{ name: 'Author' }],
  published: '2026-11-05', venue: 'arXiv:2611.12345',
  abstract: 'Our first result concerns visual reasoning.',
};

const proof = {
  fullText: 'https://arxiv.org/html/2611.12345v2',
  body: 'Accuracy increases by 15% on the held-out benchmark. The results support more efficient training.',
  conclusion: 'The results support more efficient training.',
  institutions: ['Test University'],
  experiments: [{ id: 1, text: 'Accuracy increases by 15% on the held-out benchmark.' }],
};

function draft() {
  const paragraph = '这段测试文字用于检查归档时的中文篇幅约束。'.repeat(10);
  const sections = Array.from({ length: 8 }, () => [paragraph]);
  sections[3].push('在该测试集上，准确率提高了15%。');
  return {
    titleZh: '测试论文', oneLine: '提高了训练效率。', direction: '训练方法', minutes: 30,
    sections, experimentEvidenceId: 1,
    abstractQuote: 'concerns visual reasoning', conclusionQuote: 'support more efficient training',
  };
}

test('weekly paper preserves primary metadata and versioned full text links', () => {
  const input = '<feed><entry><id>http://arxiv.org/abs/2611.12345v2</id><title>A test paper</title>' +
    '<summary>Our first result concerns visual reasoning.</summary><published>2026-11-05T12:00:00Z</published>' +
    '<author><name>Author</name></author></entry></feed>';
  const [parsed] = readArxiv(input);
  assert.equal(parsed.version, candidate.version);
  assert.deepEqual(parsed.authors.map(author => author.name), ['Author']);
  const paper = makePaper(draft(), candidate, proof, '2026-11-23');
  assert.equal(paper.titleEn, candidate.title);
  assert.equal(paper.links.pdf, 'https://arxiv.org/pdf/2611.12345v2');
  assert.equal(paper.links.fullText, proof.fullText);
  assert.equal(paper.month, '2026-11');
  assert.ok(paper.body.some(block => block.text.includes('未找到可核验')));
});

test('weekly paper rejects altered numbers, unverified author quotes, and inaccurate excerpts', () => {
  const changedNumber = draft();
  changedNumber.sections[3].push('另一组提高了25%。');
  assert.throws(() => makePaper(changedNumber, candidate, proof, '2026-11-23'), /Experiment numbers/);
  assert.throws(() => makePaper(draft(), candidate, { ...proof, blog: { text: 'No matching quotes' } }, '2026-11-23'),
    /project page accurately/);
  assert.throws(() => makePaper({ ...draft(), conclusionQuote: 'visual reasoning is solved' },
    candidate, proof, '2026-11-23'), /original-language/);
});

test('review format preserves multiple paragraphs and keeps metadata out of the prose', () => {
  const review = parseReview('@@TITLE\r\n测试标题\r\n@@S1\r\n第一段。\r\n\r\n第二段。\r\n@@EXPERIMENT\r\n3');
  assert.equal(review.titleZh, '测试标题');
  assert.deepEqual(review.sections[0], ['第一段。', '第二段。']);
  assert.equal(review.experimentEvidenceId, 3);
});
