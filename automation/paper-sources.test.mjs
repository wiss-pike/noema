import assert from 'node:assert/strict';
import test from 'node:test';
import { readAcl, readPmlrVolume, readPublication } from './paper-sources.mjs';
import { readPdfText, repeated } from './papers.mjs';

const period = { from: '2026-08-23', to: '2026-11-23' };

test('ACL discovery uses publication dates and skips proceedings front matter', () => {
  const records = [
    ['2026.emnlp-main.45', 'Grounded Reasoning with Language Models', 'Mon, 16 Nov 2026 00:00:00 +0000'],
    ['2026.emnlp-main.0', 'Proceedings of EMNLP', 'Mon, 16 Nov 2026 00:00:00 +0000'],
    ['2025.findings-acl.4', 'An older benchmark', 'Sat, 01 Nov 2025 00:00:00 +0000'],
  ].map(([key, title, stamp]) => '<item><guid>' + key + '</guid><title>' + title +
    '</title><pubDate>' + stamp + '</pubDate></item>').join('');
  const [paper, extra] = readAcl(records, period);
  assert.equal(extra, undefined);
  assert.equal(paper.id, 'acl:2026.emnlp-main.45');
  assert.equal(paper.paperUrl, 'https://aclanthology.org/2026.emnlp-main.45/');
  const meta = '<head><meta content="Grounded Reasoning with Language Models" name=citation_title>' +
    '<meta content="First Author" name=citation_author><meta content="2026/11" name=citation_publication_date>' +
    '<meta content="https://aclanthology.org/2026.emnlp-main.45.pdf" name=citation_pdf_url></head>';
  const published = readPublication(meta, paper);
  assert.equal(published.published, '2026-11-16');
  assert.deepEqual(published.authors, [{ name: 'First Author' }]);
  assert.throws(() => readPublication(meta.replace('aclanthology.org/', 'invalid.example/'), paper), /unverified/);
});

test('PMLR discovery reads dated volumes and validates its official hosted PDF', () => {
  const volume = 'Published as Volume 350 by the Proceedings of Machine Learning Research on 07 November 2026.' +
    '<div class="paper"><p class="title">A Vision Benchmark</p><span class="authors">First Author,&nbsp;Second Author</span>' +
    '<span class="info"><i>Example conference</i></span><a href="https://proceedings.mlr.press/v350/name26a.html">abs</a></div>';
  const [paper] = readPmlrVolume(volume, period);
  assert.equal(paper.id, 'pmlr:v350/name26a');
  const meta = '<head><meta name="citation_title" content="A Vision Benchmark">' +
    '<meta name="citation_author" content="First Author"><meta name="citation_publication_date" content="2026/11/07">' +
    '<meta name="citation_pdf_url" content="https://raw.githubusercontent.com/mlresearch/v350/main/assets/name26a/name26a.pdf"></head>' +
    '<div id="abstract">Official proceedings abstract text.</div>';
  const published = readPublication(meta, paper);
  assert.equal(published.abstract, 'Official proceedings abstract text.');
  assert.equal(published.published, '2026-11-07');
  assert.throws(() => readPublication(meta.replace('mlresearch', 'unrelated'), paper), /unverified/);
});

test('an arXiv preprint and publisher paper with the same normalized title count once', () => {
  const previous = [{ sourceId: '2611.12345', titleEn: 'Grounded Reasoning: with Language Models',
    authorNames: ['First Author'] }];
  assert.equal(repeated({ id: 'acl:2026.emnlp-main.45', title: 'Grounded Reasoning With Language Models',
    authors: [] }, previous), true);
  assert.equal(repeated({ id: 'pmlr:v350/name26a', title: 'Unrelated paper on visual agents',
    authors: [{ name: 'First Author' }] }, previous), false);
});

test('PDF evidence locates headings glued to body text and drops references', () => {
  const fixture = '# paper.pdf\n## Metadata\n- Author=First Author\n\n## Contents\n### Page 1\n' +
    'Paper title DepartmentAbstractWe study language models and introduce a method for grounding.1 Introduction' +
    'We motivate the setting and describe a reproducible baseline. '.repeat(70) +
    '4 Experimental ResultsOur method reaches 80% accuracy.6 ConclusionThe benchmark supports the authors’ conclusion.' +
    'References\n[1] A previous paper.';
  const paper = readPdfText(fixture);
  assert.equal(paper.abstract, 'We study language models and introduce a method for grounding.');
  assert.match(paper.body, /80% accuracy/);
  assert.match(paper.conclusion, /^The benchmark supports/);
  assert.doesNotMatch(paper.conclusion, /A previous paper/);
});
