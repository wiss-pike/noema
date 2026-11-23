import assert from 'node:assert/strict';
import test from 'node:test';
import { readAcl, readInterspeech, readJmlr, readPmlrVolume, readPublication } from './paper-sources.mjs';
import { jmlrMonth, readPdfText, repeated } from './papers.mjs';

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
  assert.equal(paper.closingLabel, '结论');
  const discussion = readPdfText(fixture.replace('6 Conclusion', '6. Discussion'));
  assert.equal(discussion.closingLabel, '讨论');
  assert.match(discussion.conclusion, /^The benchmark supports/);
});

test('JMLR uses the month in the publisher PDF rather than guessing from an RSS year', () => {
  const feed = '<item><title>Grounded Reasoning in Neural Networks</title>' +
    '<link>http://jmlr.org/papers/v27/25-1670.html</link><pubDate>2026</pubDate>' +
    '<author>First Author</author><description>Abstract from the journal feed.</description></item>';
  const [paper] = readJmlr(feed, period);
  assert.equal(paper.id, 'jmlr:27/25-1670');
  assert.equal(paper.published, '2026');
  const meta = '<head><meta name="citation_title" content="Grounded Reasoning in Neural Networks">' +
    '<meta name="citation_author" content="First Author"><meta name="citation_publication_date" content="2026">' +
    '<meta name="citation_pdf_url" content="http://jmlr.org/papers/volume27/25-1670/25-1670.pdf"></head>';
  assert.equal(readPublication(meta, paper).pdf, 'https://jmlr.org/papers/volume27/25-1670/25-1670.pdf');
  assert.equal(jmlrMonth('### Page 1\nSubmitted 07/25; Published 10/26\n', '2026'), '2026-10');
  assert.equal(jmlrMonth('### Page 1\nSubmitted 07/25; Published 10/25\n', '2026'), '');
  assert.equal(jmlrMonth('### Page 1\nNo date.\n### Page 2\nPublished 10/26', '2026'), '');
});

test('Interspeech uses the proceedings dates and accepts only its linked paper PDF', () => {
  const issue = '<h5 class="w3-text w3-center">Sydney, Australia<br>27 September - 1 October 2026</h5>' +
    '<!-- Sessions --><div class="paper-type-regular"><a class="w3-text" href="example26_interspeech.html">' +
    '<p><span>Speech Reasoning with Audio Models</span><br><span class="w3-text">First Author</span>';
  const [paper] = readInterspeech(issue, '2026', period);
  assert.equal(paper.id, 'isca:2026/example26_interspeech');
  assert.equal(paper.published, '2026-09-27');
  assert.deepEqual(readInterspeech(issue, '2026', { from: '2026-10-01', to: '2026-11-23' }), []);
  const meta = '<head><meta name="citation_title" content="Speech Reasoning with Audio Models">' +
    '<meta name="citation_author" content="First Author"><meta name="citation_publication_date" content="2026">' +
    '<meta name="citation_pdf_url" content="https://www.isca-archive.org/interspeech_2026/example26_interspeech.pdf"></head>';
  assert.equal(readPublication(meta, paper).published, '2026-09-27');
  assert.throws(() => readPublication(meta.replace('example26_interspeech.pdf', 'other26_interspeech.pdf'), paper), /unverified/);
});
