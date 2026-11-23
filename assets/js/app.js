/* Noema — 论文精读归档
   数据唯一来源：data/papers.json；本文件只负责渲染、筛选、目录与阅读进度。 */

(function () {
  'use strict';

  var state = { dir: '', q: '' };
  var DATA = null;
  var monthPage = !!document.getElementById('paper-list');
  var firstPaint = true;

  function $(id) { return document.getElementById(id); }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  var CN_MONTH = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二'];

  function ymd(m) {
    var p = String(m).split('-');
    return { y: p[0] || '', m: parseInt(p[1], 10) || 0 };
  }
  function monthName(m) {
    var n = ymd(m).m;
    return (CN_MONTH[n - 1] || String(n)) + '月';
  }
  function monthLabel(m) {
    var p = ymd(m);
    return p.y + ' 年 ' + p.m + ' 月';
  }

  function searchBlob(p) {
    return [p.titleZh, p.titleEn, p.authors, p.venue, (p.tags || []).join(' ')]
      .join(' ').toLowerCase();
  }
  function matches(p) {
    if (state.dir && p.direction !== state.dir) return false;
    var q = state.q.trim().toLowerCase();
    if (q && searchBlob(p).indexOf(q) === -1) return false;
    return true;
  }

  /* 筛选与搜索写进 URL，方便直接分享/刷新后保留 */
  function readUrl() {
    var p = new URLSearchParams(window.location.search);
    var dir = p.get('d') || '';
    if (dir && (DATA.directions || []).indexOf(dir) === -1) dir = '';
    state.dir = dir;
    state.q = (p.get('q') || '').trim();
    var input = $('q');
    if (input && state.q) input.value = state.q;
  }

  function writeUrl() {
    var p = new URLSearchParams(window.location.search);
    if (state.dir) p.set('d', state.dir); else p.delete('d');
    if (state.q) p.set('q', state.q); else p.delete('q');
    var qs = p.toString();
    try {
      window.history.replaceState(null, '', window.location.pathname + (qs ? '?' + qs : '') + window.location.hash);
    } catch (e) { /* file:// 下忽略 */ }
  }
  function byDate(a, b) {
    return a.date === b.date ? (a.id < b.id ? 1 : -1) : (a.date < b.date ? 1 : -1);
  }
  function groups(papers) {
    var map = {};
    papers.forEach(function (p) { (map[p.month] = map[p.month] || []).push(p); });
    return Object.keys(map).sort().reverse().map(function (m) {
      return { month: m, papers: map[m].sort(byDate) };
    });
  }
  function dirTag(d) {
    return '<span class="dir" data-dir="' + esc(d) + '">' + esc(d) + '</span>';
  }
  function monthHref(m) { return 'month.html?m=' + encodeURIComponent(m); }

  /* ------------------------------------------------------------- 首页 */

  function monthRow(g, index) {
    var shown = g.papers.filter(matches);
    if (!shown.length) return '';
    var d = ymd(g.month);
    var items = shown.map(function (p) {
      return '<li><a class="item-link" href="' + monthHref(g.month) + '#p-' + esc(p.id) + '">' +
        '<span class="item-title">' + esc(p.titleZh) + '</span>' +
        '<span class="item-meta">' + dirTag(p.direction) +
          '<span class="item-date">' + esc(p.date.slice(5).replace('-', '.')) + '</span>' +
        '</span>' +
      '</a></li>';
    }).join('');

    return '<article class="month-row' + (firstPaint ? ' reveal' : '') + '"' +
      (firstPaint ? ' style="--d:' + Math.min(index * 45, 180) + 'ms"' : '') + '>' +
      '<div class="month-lead">' +
        '<span class="month-year">' + esc(d.y) + '</span>' +
        '<span class="month-num">' + d.m + '</span>' +
        '<span class="month-unit">月</span>' +
      '</div>' +
      '<div class="month-main"><ul class="month-items">' + items + '</ul></div>' +
      '<a class="month-go" href="' + monthHref(g.month) + '">' +
        '<span>' + shown.length + ' 篇</span>' +
        '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">' +
          '<path d="M1 8h13M9 3l5 5-5 5" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"></path>' +
        '</svg>' +
      '</a>' +
    '</article>';
  }

  function showCover() {
    const latest = DATA.papers.slice().sort(byDate)[0];
    if (latest) {
      $('feature-title').textContent = latest.titleZh;
      $('feature-date').textContent = latest.date.replace(/-/g, '.');
      $('feature-date').dateTime = latest.date;
      $('cover-feature').href = monthHref(latest.month) + '#p-' + encodeURIComponent(latest.id);
    }
    NoemaContent.daily().then(function (archive) {
      const day = archive.items[0];
      if (!day) return;
      $('latest-day').href = 'daily.html?d=' + encodeURIComponent(day.date);
      $('latest-headline').textContent = (day.entries[0] && day.entries[0].title) || day.lead || day.date;
    }).catch(function () { /* The static link still opens the daily archive. */ });
  }

  function renderIndex() {
    var gs = groups(DATA.papers);
    var html = '';
    var total = 0;
    gs.forEach(function (g, i) {
      var row = monthRow(g, i);
      if (row) {
        total += g.papers.filter(matches).length;
        html += row;
      }
    });
    $('months').innerHTML = html;

    var filtered = !!(state.dir || state.q);
    $('count').textContent = filtered
      ? '匹配 ' + total + ' 篇'
      : '共 ' + DATA.papers.length + ' 篇 · ' + gs.length + ' 个月';
    $('empty').hidden = total > 0;
    if (firstPaint) showCover();
    firstPaint = false;
  }

  /* ------------------------------------------------------------- 月页 */

  function blockHTML(b) {
    if (b.t === 'h') return '<h3>' + esc(b.text) + '</h3>';
    if (b.t === 'quote') {
      var note = b.note ? '<p class="q-note">' + esc(b.note) + '</p>' : '';
      return '<blockquote><p class="q">' + esc(b.text) + '</p>' + note + '</blockquote>';
    }
    if (b.t === 'ul') {
      return '<ul>' + (b.items || []).map(function (it) {
        return '<li>' + esc(it) + '</li>';
      }).join('') + '</ul>';
    }
    if (b.t === 'callout') return '<div class="callout"><p>' + esc(b.text) + '</p></div>';
    return '<p>' + esc(b.text) + '</p>';
  }

  function sectionsOf(p) {
    var out = [];
    var cur = { heading: '', blocks: [] };
    (p.body || []).forEach(function (b) {
      if (b.t === 'h') {
        if (cur.heading || cur.blocks.length) out.push(cur);
        cur = { heading: b.text, blocks: [] };
      } else {
        cur.blocks.push(b);
      }
    });
    out.push(cur);
    out = out.filter(function (s) { return s.heading || s.blocks.length; });
    out.forEach(function (s, i) {
      s.id = s.heading ? 's-' + p.id + '-' + (i + 1) : 's-' + p.id + '-intro';
    });
    return out;
  }

  function linksHTML(p) {
    var L = p.links || {};
    var out = [];
    if (NoemaContent.safeLink(L.paper)) out.push('<a class="link" href="' + esc(L.paper) + '" target="_blank" rel="noopener">论文原文<span class="arrow">↗</span></a>');
    if (NoemaContent.safeLink(L.pdf, true)) out.push('<a class="link link-primary" href="' + esc(L.pdf) + '" download>论文原件 PDF<span class="arrow">↓</span></a>');
    if (NoemaContent.safeLink(L.blog)) out.push('<a class="link" href="' + esc(L.blog) + '" target="_blank" rel="noopener">作者博客<span class="arrow">↗</span></a>');
    if (NoemaContent.safeLink(L.code)) out.push('<a class="link" href="' + esc(L.code) + '" target="_blank" rel="noopener">代码与权重<span class="arrow">↗</span></a>');
    if (!out.length) return '';
    return '<div class="paper-links">' + out.join('') + '</div>';
  }

  function paperHTML(p, index) {
    var secs = sectionsOf(p);
    var body = secs.map(function (s) {
      return '<section class="sec" id="' + esc(s.id) + '" data-spy>' +
        (s.heading ? '<h3>' + esc(s.heading) + '</h3>' : '') +
        s.blocks.map(blockHTML).join('') +
      '</section>';
    }).join('');

    var byline = [];
    if (p.authors) byline.push(esc(p.authors));
    if (p.venue) byline.push(esc(p.venue));

    return '<article class="paper' + (index === 0 ? ' is-first' : '') + '" id="p-' + esc(p.id) + '" data-spy>' +
      '<header class="paper-head">' +
        '<p class="paper-eyebrow">' + dirTag(p.direction) +
          '<span class="sep">/</span>' +
          '<time datetime="' + esc(p.date) + '">' + esc(p.date) + '</time>' +
        '</p>' +
        '<h2 class="paper-title">' + esc(p.titleZh) + '</h2>' +
        (p.titleEn ? '<p class="paper-en">' + esc(p.titleEn) + '</p>' : '') +
        (byline.length ? '<p class="paper-byline">' + byline.join('<br>') + '</p>' : '') +
      '</header>' +
      '<p class="paper-claim"><span class="claim-label">一句话结论</span>' + esc(p.oneLine) + '</p>' +
      '<div class="paper-body">' + body + '</div>' +
      linksHTML(p) +
    '</article>';
  }

  function tocInfos(list) {
    return list.map(function (p) {
      return {
        id: 'p-' + p.id,
        title: p.titleZh,
        sections: sectionsOf(p).filter(function (s) { return !!s.heading; })
          .map(function (s) { return { id: s.id, heading: s.heading }; })
      };
    });
  }

  function buildToc(infos) {
    var html = infos.map(function (info) {
      var sub = info.sections.length
        ? '<ol class="toc-sections">' + info.sections.map(function (s) {
          return '<li><a href="#' + esc(s.id) + '">' + esc(s.heading) + '</a></li>';
        }).join('') + '</ol>'
        : '';
      return '<div class="toc-group">' +
        '<a class="toc-paper" href="#' + esc(info.id) + '">' + esc(info.title) + '</a>' +
        sub +
      '</div>';
    }).join('');
    Array.prototype.forEach.call(document.querySelectorAll('[data-toc]'), function (n) {
      n.innerHTML = html;
    });
  }

  function renderMonth() {
    var m = new URLSearchParams(window.location.search).get('m');
    var gs = groups(DATA.papers);
    var idx = -1;
    gs.forEach(function (g, i) { if (g.month === m) idx = i; });

    if (idx === -1) {
      document.querySelector('.toc').hidden = true;
      document.title = '没有这个月份 · Noema';
      $('month-kicker').textContent = '—';
      $('month-title').textContent = '空';
      $('month-meta').textContent = '这个月份还没有收录论文，或者地址里的月份参数不对。';
      var inline = $('toc-inline');
      if (inline) inline.hidden = true;
      var tools = document.querySelector('.month-tools');
      if (tools) tools.hidden = true;
      $('paper-list').innerHTML = '<p class="empty">回到 <a href="index.html" style="border-bottom:1px solid currentColor">全部归档</a> 看看。</p>';
      return;
    }

    var g = gs[idx];
    var all = g.papers;

    document.title = monthName(m) + ' · Noema';
    $('month-kicker').textContent = ymd(m).y;
    $('month-title').textContent = monthName(m);

    var tally = {};
    all.forEach(function (p) { tally[p.direction] = (tally[p.direction] || 0) + 1; });
    var tallyText = Object.keys(tally).map(function (d) { return d + ' ' + tally[d]; }).join(' · ');
    $('month-meta').textContent = '共 ' + all.length + ' 篇' + (tallyText ? ' · ' + tallyText : '');

    var list = all.filter(matches);
    $('paper-list').innerHTML = list.length
      ? list.map(paperHTML).join('')
      : '<p class="empty">这个月没有符合筛选条件的论文。</p>';

    $('count').textContent = (state.dir || state.q)
      ? '匹配 ' + list.length + ' 篇'
      : '共 ' + all.length + ' 篇';

    document.querySelector('.toc').hidden = !list.length;
    buildToc(tocInfos(list));
    refreshReading();

    var inline = $('toc-inline');
    if (inline) {
      inline.hidden = !list.length;
      Array.prototype.forEach.call(inline.querySelectorAll('a'), function (a) {
        a.addEventListener('click', function () { inline.removeAttribute('open'); });
      });
    }

    var prev = gs[idx + 1];
    var next = gs[idx - 1];
    $('pager').innerHTML =
      (next ? '<a href="' + monthHref(next.month) + '">← ' + esc(monthLabel(next.month)) + '</a>' : '<span class="spacer"></span>') +
      (prev ? '<a href="' + monthHref(prev.month) + '">' + esc(monthLabel(prev.month)) + ' →</a>' : '<span class="spacer"></span>');
  }

  /* ------------------------------------------------------------- 阅读进度 */

  var readState = { spy: [], linkMap: {} };
  var ticking = false;

  function refreshReading() {
    readState.spy = Array.prototype.slice.call(document.querySelectorAll('[data-spy]'));
    readState.linkMap = {};
    Array.prototype.forEach.call(document.querySelectorAll('.toc-nav a'), function (a) {
      var id = (a.getAttribute('href') || '').slice(1);
      if (!id) return;
      (readState.linkMap[id] = readState.linkMap[id] || []).push(a);
    });
    updateReading();
  }

  function updateReading() {
    ticking = false;
    var doc = document.documentElement;
    var max = doc.scrollHeight - window.innerHeight;
    var y = window.pageYOffset || doc.scrollTop || 0;
    var pct = max > 8 ? Math.min(1, Math.max(0, y / max)) : 0;

    var bar = $('readbar-fill');
    var tocFill = $('toc-fill');
    if (bar) bar.style.transform = 'scaleX(' + pct + ')';
    if (tocFill) tocFill.style.transform = 'scaleX(' + pct + ')';
    Array.prototype.forEach.call(document.querySelectorAll('[data-progress]'), function (n) {
      n.textContent = '阅读 ' + Math.round(pct * 100) + '%';
    });

    var current = null;
    for (var i = 0; i < readState.spy.length; i++) {
      if (readState.spy[i].getBoundingClientRect().top <= 132) current = readState.spy[i];
      else break;
    }

    var activeSection = current && current.classList.contains('sec') ? current.id : null;
    var activePaper = null;
    if (current) {
      var article = current.classList.contains('paper') ? current : current.closest('.paper');
      if (article) activePaper = article.id;
    }

    Array.prototype.forEach.call(document.querySelectorAll('.toc-nav a'), function (a) {
      var id = (a.getAttribute('href') || '').slice(1);
      var on = (activeSection && id === activeSection) ||
        (!activeSection && activePaper && id === activePaper && a.classList.contains('toc-paper'));
      a.classList.toggle('is-active', !!on);
    });
  }

  function onScroll() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(updateReading);
  }

  /* ------------------------------------------------------------- 工具条 */

  function renderChips() {
    var box = $('chips');
    if (!box) return;
    var items = [{ v: '', label: '全部' }].concat((DATA.directions || []).map(function (d) {
      return { v: d, label: d };
    }));
    box.innerHTML = items.map(function (it) {
      return '<button type="button" class="filter" data-dir="' + esc(it.v) + '" aria-pressed="' +
        (state.dir === it.v ? 'true' : 'false') + '">' + esc(it.label) + '</button>';
    }).join('');
  }

  function bind() {
    var input = $('q');
    if (input) {
      input.addEventListener('input', function () {
        state.q = input.value.trim();
        render();
      });
    }
    var chips = $('chips');
    if (chips) {
      chips.addEventListener('click', function (e) {
        var btn = e.target.closest ? e.target.closest('.filter') : null;
        if (!btn) return;
        state.dir = btn.getAttribute('data-dir') || '';
        chips.querySelectorAll('button').forEach(function (chip) {
          chip.setAttribute('aria-pressed', String(chip === btn));
        });
        render();
      });
    }
    var reset = $('reset');
    if (reset) {
      reset.addEventListener('click', function () {
        state.dir = '';
        state.q = '';
        if (input) input.value = '';
        renderChips();
        render();
      });
    }
    if (monthPage) {
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', onScroll);
    }
  }

  function render() {
    if (monthPage) renderMonth(); else renderIndex();
    writeUrl();
  }

  function fail(err) {
    var box = $('load-error');
    if (!box) return;
    box.hidden = false;
    box.setAttribute('role', 'alert');
    box.textContent = '暂时无法读取论文，请刷新页面重试。';

  }

  function init() {
    fetch('data/papers.json', { cache: 'no-store' })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (data) {
        DATA = data || {};
        if (!DATA.papers) DATA.papers = [];
        if (!DATA.directions) DATA.directions = [];
        readUrl();
        renderChips();
        bind();
        render();
        if (monthPage && window.location.hash) {
          var target;
          try {
            target = document.getElementById(decodeURIComponent(window.location.hash.slice(1)));
          } catch (error) {
            // Malformed fragments can be ignored.
          }
          if (target) target.scrollIntoView();
        }
      })
      .catch(fail);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
