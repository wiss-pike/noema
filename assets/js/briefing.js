/* Noema — 日报 / 周报
   数据：data/daily.json、data/weekly.json；页面由 ?d= 日期 / ?w= 周起始日 深链。 */

(function () {
  'use strict';

  var view = document.body.getAttribute('data-view');
  var body = document.getElementById('brief-body');
  var params = new URLSearchParams(window.location.search);

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  var WEEK = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  function parts(iso) {
    var p = String(iso).split('-');
    return { y: +p[0], m: +p[1], d: +p[2] };
  }
  function pretty(iso) {
    var p = parts(iso);
    return p.y + ' 年 ' + p.m + ' 月 ' + p.d + ' 日';
  }
  function weekday(iso) {
    var p = parts(iso);
    return WEEK[new Date(Date.UTC(p.y, p.m - 1, p.d)).getUTCDay()];
  }
  function shift(iso, days) {
    var p = parts(iso);
    var t = new Date(Date.UTC(p.y, p.m - 1, p.d + days));
    var m = String(t.getUTCMonth() + 1), d = String(t.getUTCDate());
    return t.getUTCFullYear() + '-' + (m.length < 2 ? '0' + m : m) + '-' + (d.length < 2 ? '0' + d : d);
  }
  function shortRange(a, b) {
    var x = parts(a), y = parts(b);
    return x.m === y.m
      ? x.m + ' 月 ' + x.d + ' 日 — ' + y.d + ' 日'
      : x.m + ' 月 ' + x.d + ' 日 — ' + y.m + ' 月 ' + y.d + ' 日';
  }

  function category(c) {
    return '<span class="dir" data-dir="' + esc(c) + '">' + esc(c) + '</span>';
  }
  function sources(list) {
    if (!list || !list.length) return '';
    return '<p class="sources">' + list.map(function (s) {
      return s.url
        ? '<a class="source-link" href="' + esc(s.url) + '" target="_blank" rel="noopener">' + esc(s.label) + '<span class="arrow">↗</span></a>'
        : '<span class="source-link is-plain">' + esc(s.label) + '</span>';
    }).join('') + '</p>';
  }

  function gapNote(list, label) {
    if (!list || !list.length) return '';
    return '<p class="week-footnote">' + label + '：' + list.map(function (m) {
      return esc(m.date) + '（' + esc(m.reason) + '）';
    }).join('；') + '</p>';
  }

  function emptyBox(text, back) {
    return '<p class="empty">' + text + (back ? ' <a href="' + back.href + '" style="border-bottom:1px solid currentColor">' + back.label + '</a>' : '') + '</p>';
  }

  /* ---------------------------------------------------------- 日报 */

  function dailyList(items) {
    if (!items.length) return emptyBox('还没有日报入库。新增一天，就在 data/daily.json 的 items 里加一个对象。');
    return '<ul class="day-list">' + items.map(function (d) {
      return '<li><a class="day-row" href="daily.html?d=' + esc(d.date) + '">' +
        '<span class="day-lead"><span class="day-num">' + esc(d.date.slice(8)) + '</span>' +
          '<span class="day-month">' + esc(parts(d.date).m) + ' 月 · ' + esc(weekday(d.date)) + '</span></span>' +
        '<span class="day-body"><span class="day-title">' + esc((d.entries && d.entries[0] && d.entries[0].title) || d.lead || '当日简报') + '</span>' +
          '<span class="day-sub">' + (d.entries || []).length + ' 条' + (d.lead ? ' · ' + esc(d.lead.slice(0, 46)) + (d.lead.length > 46 ? '…' : '') : '') + '</span></span>' +
        '<span class="day-go">阅读 →</span>' +
      '</a></li>';
    }).join('') + '</ul>';
  }

  function dailyDetail(items, date) {
    var day = items.filter(function (d) { return d.date === date; })[0];
    if (!day) {
      return emptyBox('这一天没有日报入库。', { href: 'daily.html', label: '看全部日报' }) +
        '<nav class="daynav" aria-label="翻日">' +
          '<a href="daily.html?d=' + esc(shift(date, -1)) + '">← 前一天</a>' +
          '<span class="spacer"></span>' +
          '<a href="daily.html?d=' + esc(shift(date, 1)) + '">后一天 →</a>' +
        '</nav>';
    }
    var entries = (day.entries || []).map(function (e, i) {
      return '<article class="entry">' +
        '<p class="entry-eyebrow">' + category(e.category || '其他') + '<span class="entry-no">' + (i + 1 < 10 ? '0' : '') + (i + 1) + '</span></p>' +
        '<h2 class="entry-title">' + esc(e.title) + '</h2>' +
        '<ul class="entry-points">' + (e.points || []).map(function (p) { return '<li>' + esc(p) + '</li>'; }).join('') + '</ul>' +
        sources(e.sources) +
      '</article>';
    }).join('');

    return '<div class="day-head"><p class="day-date">' + esc(pretty(date)) + ' · ' + esc(weekday(date)) + '</p>' +
        (day.window ? '<p class="day-window">覆盖时段 ' + esc(day.window) + '</p>' : '') +
        (day.lead ? '<p class="day-lead-line">' + esc(day.lead) + '</p>' : '') +
        (day.note ? '<p class="week-footnote">' + esc(day.note) + '</p>' : '') + '</div>' +
      '<div class="entry-list">' + entries + '</div>' +
      '<nav class="daynav" aria-label="翻日">' +
        '<a href="daily.html?d=' + esc(shift(date, -1)) + '">← 前一天</a>' +
        '<a class="daynav-all" href="daily.html">全部日报</a>' +
        '<a href="daily.html?d=' + esc(shift(date, 1)) + '">后一天 →</a>' +
      '</nav>';
  }

  /* ---------------------------------------------------------- 周报 */

  function weeklyList(items) {
    if (!items.length) return emptyBox('还没有周报入库。新增一周，就在 data/weekly.json 的 items 里加一个对象。');
    return '<ul class="day-list">' + items.map(function (w) {
      return '<li><a class="day-row" href="weekly.html?w=' + esc(w.id) + '">' +
        '<span class="day-lead"><span class="week-mark">周</span>' +
          '<span class="day-month">' + esc(shortRange(w.start, w.end)) + '</span></span>' +
        '<span class="day-body"><span class="day-title">' + esc(w.lead || '本周周报') + '</span>' +
          '<span class="day-sub">' + (w.highlights || []).length + ' 条要点 · ' + (w.gaps || []).length + ' 条遗漏热点</span></span>' +
        '<span class="day-go">阅读 →</span>' +
      '</a></li>';
    }).join('') + '</ul>';
  }

  function weeklyDetail(items, id) {
    var idx = -1;
    items.forEach(function (w, i) { if (w.id === id) idx = i; });
    if (idx === -1) return emptyBox('没有这一周的周报。', { href: 'weekly.html', label: '看全部周报' });
    var w = items[idx];

    function block(label, note, inner) {
      if (!inner) return '';
      return '<section class="week-block"><h2 class="week-label">' + label +
        (note ? '<span class="week-note">' + note + '</span>' : '') + '</h2>' + inner + '</section>';
    }

    var highlights = (w.highlights || []).map(function (h, i) {
      return '<article class="point"><p class="point-no">' + (i + 1 < 10 ? '0' : '') + (i + 1) + '</p>' +
        '<h3 class="point-title">' + esc(h.title) + '</h3>' +
        '<p class="point-text">' + esc(h.text) + '</p></article>';
    }).join('');

    var review = (w.review || []).map(function (r) {
      return '<li><a class="review-row" href="daily.html?d=' + esc(r.date) + '">' +
        '<span class="review-date">' + esc(r.date.slice(5).replace('-', '.')) + '</span>' +
        '<span class="review-main"><span class="review-title">' + esc(r.title) + '</span>' +
        '<span class="review-take">' + esc(r.takeaway) + '</span></span></a></li>';
    }).join('');

    var gaps = (w.gaps || []).map(function (g) {
      return '<article class="gap"><h3 class="gap-title">' + esc(g.title) + '</h3>' +
        '<p class="gap-why"><span class="gap-label">为什么值得关注</span>' + esc(g.why) + '</p>' +
        sources(g.source ? [g.source] : []) + '</article>';
    }).join('');

    var trends = (w.trends || []).map(function (t, i) {
      return '<article class="trend"><p class="point-no">' + (i + 1 < 10 ? '0' : '') + (i + 1) + '</p>' +
        '<h3 class="point-title">' + esc(t.title) + '</h3>' +
        '<p class="point-text">' + esc(t.text) + '</p></article>';
    }).join('');

    var prev = items[idx + 1], next = items[idx - 1];

    return '<div class="day-head"><p class="day-date">' + esc(shortRange(w.start, w.end)) + ' · ' + esc(parts(w.start).y) + '</p>' +
        (w.lead ? '<p class="day-lead-line">' + esc(w.lead) + '</p>' : '') + '</div>' +
      block('本周要点', '五条以内，按重要性', highlights) +
      block('日报回顾', '只做索引，细节在日报页', review
        ? '<ul class="review-list">' + review + '</ul>' + (w.reviewNote ? '<p class="week-footnote">' + esc(w.reviewNote) + '</p>' : '')
        : '') +
      block('遗漏热点', '日报没有覆盖，但这一周值得留意', gaps
        ? gaps + (w.gapNote ? '<p class="week-footnote">' + esc(w.gapNote) + '</p>' : '')
        : '') +
      block('趋势判断', '是判断，不是结论', trends) +
      '<nav class="daynav" aria-label="翻周">' +
        (prev ? '<a href="weekly.html?w=' + esc(prev.id) + '">← ' + esc(shortRange(prev.start, prev.end)) + '</a>' : '<span class="spacer"></span>') +
        '<a class="daynav-all" href="weekly.html">全部周报</a>' +
        (next ? '<a href="weekly.html?w=' + esc(next.id) + '">' + esc(shortRange(next.start, next.end)) + ' →</a>' : '<span class="spacer"></span>') +
      '</nav>';
  }

  /* ---------------------------------------------------------- 启动 */

  function fail(err) {
    var box = $('load-error');
    box.hidden = false;
    box.innerHTML = '数据没能加载（<code>data/' + (view === 'daily' ? 'daily' : 'weekly') + '.json</code>）。' +
      '直接双击打开时浏览器会拦本地读取；在站点目录跑 <code>python3 -m http.server 8000</code> 再看 localhost:8000。' +
      (err && err.message ? '<br>' + esc(err.message) : '');
  }

  function start(data) {
    var items = (data.items || []).slice();
    var title = $('brief-title'), meta = $('brief-meta');

    if (view === 'daily') {
      items.sort(function (a, b) { return a.date < b.date ? 1 : -1; });
      var d = (params.get('d') || '').trim();
      if (d && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
        var day = items.filter(function (x) { return x.date === d; })[0];
        title.textContent = pretty(d) + ' ' + weekday(d);
        meta.textContent = day ? '共 ' + (day.entries || []).length + ' 条 · ' + (day.window || '') : '这一天没有入库的日报。';
        document.title = d + ' 日报 · Noema';
        body.innerHTML = dailyDetail(items, d);
      } else {
        title.textContent = '日报';
        meta.textContent = items.length
          ? '已入库 ' + items.length + ' 天 · 最近更新 ' + (items[0] && items[0].date)
          : '还没有日报入库。';
        body.innerHTML = dailyList(items) + gapNote(data.missing, '缺失日期');
      }
    } else {
      items.sort(function (a, b) { return a.start < b.start ? 1 : -1; });
      var id = (params.get('w') || '').trim();
      if (id) {
        var week = items.filter(function (x) { return x.id === id; })[0];
        title.textContent = week ? shortRange(week.start, week.end) : '没有这一周';
        meta.textContent = week ? '周报 · ' + parts(week.start).y + ' 年' : '这一周还没有周报。';
        if (week) document.title = shortRange(week.start, week.end) + ' 周报 · Noema';
        body.innerHTML = weeklyDetail(items, id);
      } else {
        title.textContent = '周报';
        meta.textContent = items.length ? '已入库 ' + items.length + ' 周' : '还没有周报入库。';
        body.innerHTML = weeklyList(items) + gapNote((data.missing || []).map(function (x) { return { date: x.start + ' — ' + x.end, reason: x.reason }; }), '缺失的周');
      }
    }
  }

  fetch(view === 'daily' ? 'data/daily.json' : 'data/weekly.json', { cache: 'no-store' })
    .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(start)
    .catch(fail);
})();