(function () {
  /* itemised fields: id, label, default */
  var HOME = [['rent', 'Rent'], ['mortgage', 'Mortgage interest'], ['ctax', 'Council tax'], ['service', 'Service charge'], ['ground', 'Ground rent'],
    ['gas', 'Gas'], ['elec', 'Electricity'], ['water', 'Water'], ['hins', 'Home insurance'], ['repairs', 'Repairs and upkeep']];
  var TELS = [['bband', 'Broadband', 'bbandPct'], ['mobile', 'Mobile phone', 'mobilePct']];
  var BIZ = [['bStock', 'Stock and materials'], ['bSoftware', 'Software and apps'], ['bEquip', 'Equipment and tools'], ['bTravel', 'Travel and mileage'],
    ['bMarketing', 'Marketing and website'], ['bInsurance', 'Business insurance'], ['bFees', 'Accountant and legal'], ['bTraining', 'Training and courses'],
    ['bBank', 'Bank and payment fees'], ['bStaff', 'Subcontractors, staff'], ['bOther', 'Postage and other']];
  var NAME = {}; HOME.concat(TELS, BIZ).forEach(function (f) { NAME[f[0]] = f[1]; });
  var HOME_IDS = HOME.map(function (f) { return f[0]; }), BIZ_IDS = BIZ.map(function (f) { return f[0]; });
  var TEXT = ['salary', 'hours', 'wpPct', 'sipp', 'cpen', 'sales', 'costs', 'ltdExtra', 'dirSalary', 'takePct', 'housing', 'bills', 'rooms', 'bizHours', 'otherHours',
    'salary2', 'loanBal', 'appStart', 'appQual', 'appYears', 'gradStart', 'uniYears', 'growth', 'bband', 'bbandPct', 'mobile', 'mobilePct'].concat(HOME_IDS, BIZ_IDS);
  var SELECTS = [], CHECKS = [];
  var TOGGLES = ['loan', 'pension', 'starter', 'side', 'wfh', 'scot', 'cmpSal', 'cmpRoute', 'cmpSetup'];
  var KEY = 'tth-v4';
  var PLAN = { p1: 'Plan 1', p2: 'Plan 2', p4: 'Plan 4', p5: 'Plan 5', pg: 'Postgraduate' }, TERM = { p1: 25, p2: 30, p4: 30, p5: 40, pg: 30 };
  var state, DEFAULTS = null, summary = '';
  function fresh() {
    var on = {}; TOGGLES.forEach(function (t) { on[t] = false; });
    var left = [12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1][(new Date().getMonth() + 9) % 12];   /* paydays left this tax year if you start now */
    return { per: 12, mode: 'sole', bizLines: [], homeLines: [], bizPick: false, homePick: false, open: {}, more: false, on: on, plans: ['p5'], pay: { salary: 30000, salary2: 35000 },
      opt: { year: '2026-27', salaryPer: 'year', wpType: 'sacrifice', startMonth: String(left), ltdHome: 'flat', erWfh: 'no' } };
  }
  function O(k) { return state.opt[k]; }
  state = fresh();
  var $ = function (id) { return document.getElementById(id); };
  var all = function (sel) { return [].slice.call(document.querySelectorAll(sel)); };
  var all2 = function (el, sel) { return [].slice.call(el.querySelectorAll(sel)); };

  function num(v) {
    var t = String(v).trim().toLowerCase(), mult = /\dm$/.test(t) ? 1e6 : /\dk$/.test(t) ? 1e3 : 1;
    var n = parseFloat(t.replace(/[^0-9.]/g, '')); return isFinite(n) ? n * mult : 0;
  }
  function gbp(n) { var r = Math.round(Math.abs(n)); return (n < 0 && r > 0 ? '\u2212' : '') + '\u00A3' + r.toLocaleString('en-GB'); }
  function signed(n) { var r = Math.round(Math.abs(n)); return (n < 0 && r > 0 ? '\u2212' : '+') + '\u00A3' + r.toLocaleString('en-GB'); }
  function pct(x) { return Math.round(x * 100) + '%'; }
  function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function sum(ids) { return ids.reduce(function (t, k) { return t + num($(k).value); }, 0); }
  function mix(i, o) { return Object.assign({}, i, o); }
  function calm() { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
  function fmtMoney(el) { var n = Math.round(num(el.value) * 100) / 100; el.value = n ? n.toLocaleString('en-GB', n % 1 ? { minimumFractionDigits: 2, maximumFractionDigits: 2 } : {}) : '0'; }
  var PER = { year: 'a year', month: 'a month', week: 'a week', hour: 'an hour' };
  function perYear() { var p = O('salaryPer'); return p === 'month' ? 12 : p === 'week' ? 52 : p === 'hour' ? (num($('hours').value) || 37.5) * 52 : 1; }
  /* read the pay fields into yearly figures */
  function keepPay(ids) { (ids || ['salary', 'salary2']).forEach(function (id) { state.pay[id] = num($(id).value) * perYear(); }); }
  /* show the yearly figures in the chosen period */
  function showPay() { ['salary', 'salary2'].forEach(function (id) { if (document.activeElement === $(id)) return; $(id).value = Math.round(state.pay[id] / perYear() * 100) / 100; fmtMoney($(id)); }); }
  function annual(v) {
    var p = O('salaryPer'), h = num($('hours').value) || 37.5;
    return p === 'month' ? v * 12 : p === 'week' ? v * 52 : p === 'hour' ? v * h * 52 : v;
  }

  function grids() {
    var rm = function (id) { return '<button type="button" class="x" data-rm="' + id + '" aria-label="Remove ' + NAME[id] + '">&times;</button>'; };
    var cell = function (f, unit) { return '<div class="ln" data-line="' + f[0] + '" hidden><label for="' + f[0] + '">' + f[1] + '</label><div class="lnrow"><div class="inp"><span>£</span><input id="' + f[0] + '" class="money" inputmode="decimal" value="0"><span>' + unit + '</span></div>' + rm(f[0]) + '</div></div>'; };
    $('homeGrid').innerHTML = HOME.map(function (f) { return cell(f, 'a month'); }).join('') + TELS.map(function (f) {
      return '<div class="ln" data-line="' + f[0] + '" hidden><label for="' + f[0] + '">' + f[1] + '</label><div class="lnrow"><div class="inp"><span>£</span><input id="' + f[0] + '" class="money" inputmode="decimal" value="0"><span>a month</span></div>' +
        '<div class="inp pc"><input id="' + f[2] + '" inputmode="decimal" value="50" aria-label="' + f[1] + ', share used for work"><span>% work</span></div>' + rm(f[0]) + '</div></div>';
    }).join('');
    $('bizGrid').innerHTML = BIZ.map(function (f) { return cell(f, 'a year'); }).join('');
    var pick = function (g, list) { return list.map(function (f) { return '<button type="button" data-add="' + g + ':' + f[0] + '">' + f[1] + '</button>'; }).join('') + '<p hidden>Every line is added.</p>'; };
    $('homePick').innerHTML = pick('home', HOME.concat(TELS)); $('bizPick').innerHTML = pick('biz', BIZ);
  }

  /* everything the engine needs, with switched-off parts left out. forceMode builds the same figures for another set-up. */
  function build(forceMode) {
    var on = state.on, mode = forceMode || (on.side ? state.mode : 'job'), biz = mode !== 'job', pen = on.pension;
    var i = {
      salary: state.pay.salary, wpPct: pen ? clamp(num($('wpPct').value), 0, 100) : 0, wpType: O('wpType'),
      region: on.scot ? 'scot' : 'ruk', sipp: pen ? num($('sipp').value) : 0, cpen: pen && mode === 'ltd' ? num($('cpen').value) : 0,
      plans: on.loan ? state.plans.filter(function (p) { return p !== 'pg'; }) : [], pg: on.loan && state.plans.indexOf('pg') > -1,
      months: on.starter && !biz ? clamp(+O('startMonth'), 1, 12) : 0,
      sales: biz ? num($('sales').value) : 0, costs: biz ? (state.bizLines.length ? sum(state.bizLines) : num($('costs').value)) : 0,
      ltdExtra: biz && mode !== 'sole' ? num($('ltdExtra').value) : 0, dirSalary: mode === 'ltd' ? num($('dirSalary').value) : 0,
      takePct: clamp(num($('takePct').value), 0, 100), ltdHome: O('ltdHome'),
      rooms: Math.max(1, Math.round(num($('rooms').value)) || 1), bizHours: 0, otherHours: 0, homeAnnual: 0, telecomAnnual: 0, erWfh: false
    };
    if (i.months === 12) i.months = 0;
    if (on.wfh && biz && mode !== 'ir35') {
      var cl = function (v) { return clamp(v, 0, 100) / 100; };
      i.bizHours = num($('bizHours').value); i.otherHours = num($('otherHours').value);
      var hl = state.homeLines, has = function (k) { return hl.indexOf(k) > -1; };
      if (hl.length) {
        i.homeAnnual = sum(hl.filter(function (k) { return HOME_IDS.indexOf(k) > -1; })) * 12;
        i.telecomAnnual = ((has('bband') ? num($('bband').value) * cl(num($('bbandPct').value)) : 0) + (has('mobile') ? num($('mobile').value) * cl(num($('mobilePct').value)) : 0)) * 12;
      } else { i.homeAnnual = (num($('housing').value) + num($('bills').value)) * 12; }
    } else if (on.wfh && !biz) { i.erWfh = O('erWfh') === 'yes'; }
    return i;
  }
  function calc(i, mode, opt) { return TTH.run(mode === 'job' ? 'sole' : mode, i, O('year'), opt); }

  /* ---- charts ---- */
  function chart(svg, o) {
    var W = clamp((($('panels').clientWidth || 600) - 32), 260, 720), H = W < 480 ? 230 : 290, m = { l: 60, r: 12, t: 12, b: 28 };
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    var lo = 0, hi = 0; o.series.forEach(function (s) { s.pts.forEach(function (p) { lo = Math.min(lo, p[1]); hi = Math.max(hi, p[1]); }); });
    var st = [500, 1000, 2000, 2500, 5000, 10000, 20000, 25000, 50000, 100000, 200000, 250000, 500000, 1e6].filter(function (v) { return (hi - lo) / v <= 6; })[0] || 2e6;
    lo = Math.floor(lo / st) * st; hi = Math.ceil(hi / st) * st; if (hi === lo) hi = lo + st;
    var X = function (v) { return m.l + (v - o.x0) / (o.x1 - o.x0) * (W - m.l - m.r); }, Y = function (v) { return m.t + (hi - v) / (hi - lo) * (H - m.t - m.b); };
    var g = '', id = svg.id;
    for (var yv = lo; yv <= hi + 1; yv += st) g += '<line class="' + (yv === 0 ? 'zero' : 'grid') + '" x1="' + m.l + '" x2="' + (W - m.r) + '" y1="' + Y(yv).toFixed(1) + '" y2="' + Y(yv).toFixed(1) + '"/><text x="' + (m.l - 8) + '" y="' + (Y(yv) + 4).toFixed(1) + '" text-anchor="end">' + o.yfmt(yv) + '</text>';
    o.xticks.forEach(function (t, k) { g += '<text x="' + X(t[0]).toFixed(1) + '" y="' + (H - 8) + '" text-anchor="' + (k === 0 ? 'start' : k === o.xticks.length - 1 ? 'end' : 'middle') + '">' + t[1] + '</text>'; });
    o.series.forEach(function (s) {
      var d = s.pts.map(function (p, k) { return (k ? 'L' : 'M') + X(p[0]).toFixed(1) + ' ' + Y(p[1]).toFixed(1); }).join(' ');
      if (s.fill) {
        var z = Y(0), area = d + ' L' + X(o.x1).toFixed(1) + ' ' + z.toFixed(1) + ' L' + X(o.x0).toFixed(1) + ' ' + z.toFixed(1) + ' Z';
        g += '<defs><clipPath id="' + id + 'A"><rect x="0" y="0" width="' + W + '" height="' + z.toFixed(1) + '"/></clipPath><clipPath id="' + id + 'B"><rect x="0" y="' + z.toFixed(1) + '" width="' + W + '" height="' + (H - z).toFixed(1) + '"/></clipPath></defs>' +
          '<path class="pos" clip-path="url(#' + id + 'A)" d="' + area + '"/><path class="negf" clip-path="url(#' + id + 'B)" d="' + area + '"/>';
      }
      g += '<path class="ln ' + s.cls + '" d="' + d + '"/>';
    });
    (o.marks || []).forEach(function (mk) {
      var cx = X(clamp(mk.x, o.x0, o.x1)), cy = Y(clamp(mk.y, lo, hi)), end = cx > W - 130;
      g += '<circle class="dot" cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="6"/><text class="lab" x="' + (cx + (end ? -10 : 10)).toFixed(1) + '" y="' + (cy < 34 ? cy + 24 : cy - 12).toFixed(1) + '" text-anchor="' + (end ? 'end' : 'start') + '">' + mk.t + '</text>';
    });
    svg.innerHTML = g;
  }
  function kfmt(v) { return v === 0 ? '£0' : (v < 0 ? '−' : '') + '£' + (Math.abs(v) >= 1000 ? Math.round(Math.abs(v) / 1000) + 'k' : Math.abs(v)); }

  /* ---- compare: another salary ---- */
  function renderSal(i, mode, full, d, unit) {
    var s2 = state.pay.salary2, o = calc(mix(i, { salary: s2 }), mode);
    var diff = (o.takeHome - full.takeHome) / d, extra = (o.gross - full.gross);
    var rows = [['Pay', full.gross, o.gross], ['Income Tax', full.tax + full.divTax, o.tax + o.divTax], ['National Insurance', full.c1 + full.c1b + full.c4, o.c1 + o.c1b + o.c4]];
    if (full.loan > 0.5 || o.loan > 0.5) rows.push(['Student loan', full.loan, o.loan]);
    if (full.wpCash + full.sippNet > 0.5) rows.push(['Pension', full.wpCash + full.sippNet, o.wpCash + o.sippNet]);
    rows.push(['Take-home', full.takeHome, o.takeHome]);
    $('cmpSalOut').innerHTML = '<p class="headline" style="margin-top:14px">' + (Math.abs(diff) < 0.5 ? 'No difference in take-home' : 'The other pay leaves you ' + gbp(Math.abs(diff)) + ' ' + unit + (diff > 0 ? ' better off' : ' worse off')) + '</p>' +
      (Math.abs(extra) > 1 ? '<p class="cap">You keep ' + pct((o.takeHome - full.takeHome) / extra) + ' of the difference in pay. The rest goes in tax, National Insurance' + (full.loan > 0.5 || o.loan > 0.5 ? ', student loan' : '') + (i.wpPct > 0 ? ' and pension' : '') + '.</p>' : '') +
      '<table class="t num"><thead><tr><th>' + (unit === 'a year' ? 'Per year' : unit === 'a week' ? 'Per week' : 'Per month') + '</th><th>Your pay</th><th' + (diff > 0 ? ' class="best"' : '') + '>Other pay</th></tr></thead><tbody>' +
      rows.map(function (r) { return '<tr><td>' + r[0] + '</td><td>' + gbp(r[1] / d) + '</td><td' + (diff > 0 ? ' class="best"' : '') + '>' + gbp(r[2] / d) + '</td></tr>'; }).join('') + '</tbody></table>';
  }

  /* ---- compare: apprenticeship or university ---- */
  function renderRoute() {
    var a = num($('appStart').value), q = num($('appQual').value), N = clamp(Math.round(num($('appYears').value)) || 1, 1, 6);
    var G = num($('gradStart').value), U = clamp(Math.round(num($('uniYears').value)) || 1, 1, 7), gr = clamp(num($('growth').value), 0, 15) / 100;
    var scot = state.on.scot, plan = scot ? 'p4' : 'p5', yk = O('year');
    var net = function (sal, loan) {
      return TTH.run('sole', { salary: sal, wpPct: 0, wpType: 'sacrifice', region: scot ? 'scot' : 'ruk', sales: 0, costs: 0, homeAnnual: 0, telecomAnnual: 0, rooms: 1, bizHours: 0, otherHours: 0, sipp: 0, plans: loan ? [plan] : [], pg: false }, yk).takeHome;
    };
    var A = [[18, 0]], B = [[18, 0]], ca = 0, cb = 0, cross = null;
    for (var t = 0; t < 27; t++) {
      ca += net(t < N ? a + (q - a) * t / N : q * Math.pow(1 + gr, t - N), false);
      cb += net(t < U ? 0 : G * Math.pow(1 + gr, t - U), true);
      A.push([19 + t, ca]); B.push([19 + t, cb]);
      if (cross === null && t >= U && cb >= ca) cross = 19 + t;
    }
    var a30 = A[12][1], b30 = B[12][1], lead = a30 - b30;
    $('cmpRouteOut').innerHTML = '<p class="headline" style="margin-top:14px">By 30, ' + (Math.abs(lead) < 500 ? 'the two routes are level' : (lead > 0 ? 'the apprenticeship' : 'university') + ' is ' + gbp(Math.abs(lead)) + ' ahead') + '</p>' +
      '<p class="cap">Total take-home by 30: ' + gbp(a30) + ' through the apprenticeship, ' + gbp(b30) + ' through university. ' +
      (cross !== null ? (cross <= 30 ? 'University pulls ahead at ' + cross + '.' : 'University catches up at ' + cross + '.') : 'On these figures university has not caught up by 45.') + ' The graduate is on ' + PLAN[plan] + '.</p>';
    chart($('routeChart'), { x0: 18, x1: 36, yfmt: kfmt, xticks: [[18, 'Age 18'], [24, '24'], [30, '30'], [36, '36']],
      series: [{ pts: A.slice(0, 19), cls: 'a' }, { pts: B.slice(0, 19), cls: 'b' }] });
  }

  /* ---- compare: sole trader or company ---- */
  function renderSetup() {
    var iS = build('sole'), iL = build('ltd'), iI = build('ir35');
    var S = calc(iS, 'sole'), L = calc(iL, 'ltd'), I = calc(iI, 'ir35');
    var cols = [['Sole trader', S], ['Company', L], ['Inside IR35', I]];
    var best = S.kept >= L.kept ? 0 : 1, diff = Math.abs(S.kept - L.kept), top = Math.max(S.kept, L.kept, I.kept);
    var bi = 0; cols.forEach(function (c, k) { if (c[1].kept > cols[bi][1].kept + 0.5) bi = k; });
    function row(label, fn) { return '<tr><td>' + label + '</td>' + cols.map(function (c, k) { return '<td' + (k === bi ? ' class="best"' : '') + '>' + gbp(fn(c[1])) + '</td>'; }).join('') + '</tr>'; }
    $('cmpSetupOut').innerHTML = '<p class="headline">' + (diff < 50 ? 'Sole trader and company come out level' :
      (best === 0 ? 'As a sole trader you keep ' + gbp(diff) + ' a year more' : 'Through a company you keep ' + gbp(diff) + ' a year more')) + '</p>' +
      '<p class="cap">' + (best === 0 ? 'Corporation Tax plus dividend tax, and ' + gbp(iL.ltdExtra) + ' a year to run the company, cost more than the tax a sole trader pays.' :
        'Lower tax inside the company' + (L.retained > 0.5 ? ', and ' + gbp(L.retained) + ' left there for now,' : '') + ' more than cover the cost of running it.') +
      ' Inside IR35 you would keep ' + gbp(L.kept - I.kept) + ' less than outside.</p>' +
      '<div class="bars num">' + cols.map(function (c) { return '<div' + (c[1].kept >= top - 0.5 ? ' class="win"' : '') + '><span>' + c[0] + '</span><i><b style="width:' + (top > 0 ? Math.max(2, c[1].kept / top * 100).toFixed(1) : 0) + '%"></b></i><span>' + gbp(c[1].kept) + '</span></div>'; }).join('') + '</div>' +
      '<table class="t num"><thead><tr><th>Per year</th>' + cols.map(function (c, k) { return '<th' + (k === bi ? ' class="best"' : '') + '>' + c[0] + '</th>'; }).join('') + '</tr></thead><tbody>' +
      row('All tax', function (r) { return r.tax + r.divTax + r.ct; }) + row('National Insurance', function (r) { return r.c1 + r.c1b + r.c4 + r.erNI; }) +
      row('Take-home', function (r) { return r.takeHome; }) + row('Total you keep', function (r) { return r.kept; }) + '</tbody></table>';
    var xmax = Math.max(150000, Math.ceil(iS.sales * 1.3 / 50000) * 50000), pts = [], cross = null, n = 60, yk = O('year');
    for (var k = 0; k <= n; k++) {
      var s = xmax * k / n, d = TTH.run('ltd', mix(iL, { sales: s }), yk).kept - TTH.run('sole', mix(iS, { sales: s }), yk).kept;
      if (k > 0 && cross === null && pts[k - 1][1] < 0 && d >= 0) cross = pts[k - 1][0] + (s - pts[k - 1][0]) * (-pts[k - 1][1]) / (d - pts[k - 1][1]);
      pts.push([s, d]);
    }
    var ticks = []; for (var xv = 0; xv <= xmax; xv += 50000) ticks.push([xv, xv === 0 ? '£0 sales' : '£' + xv / 1000 + 'k']);
    chart($('setupChart'), { x0: 0, x1: xmax, yfmt: function (v) { return v === 0 ? '£0' : signed(v); }, xticks: ticks, series: [{ pts: pts, cls: 'k', fill: true }], marks: [{ x: iS.sales, y: L.kept - S.kept, t: 'You: ' + signed(L.kept - S.kept) }] });
    $('setupCap').textContent = 'Extra a company leaves you each year as sales grow. ' + (cross !== null ? 'It pulls ahead at about ' + gbp(Math.round(cross / 1000) * 1000) + ' of sales.' :
      pts.every(function (p) { return p[1] >= 0; }) ? 'It is ahead at every level shown.' : 'It does not catch up at any level shown. Leaving profit in the company, or paying it into a pension, is what changes that.');
  }

  /* short count-up on the headline figure */
  var shown = null, raf = 0;
  function tween(el, to) {
    if (shown === null || calm()) { shown = to; el.textContent = gbp(to); return; }
    cancelAnimationFrame(raf);
    var from = shown, t0 = performance.now();
    (function step(t) {
      var p = Math.min(1, (t - t0) / 260), e = 1 - Math.pow(1 - p, 3);
      shown = from + (to - from) * e; el.textContent = gbp(shown);
      if (p < 1) raf = requestAnimationFrame(step); else shown = to;
    })(t0);
  }

  function render() {
    var on = state.on, mode = on.side ? state.mode : 'job', biz = mode !== 'job';
    /* what is on screen */
    all('.tile').forEach(function (c) { var t = c.dataset.t; c.setAttribute('aria-pressed', String(!!on[t])); c.disabled = t === 'starter' && on.side; });
    all('[data-opt]').forEach(function (g) { all2(g, '[data-v]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.v === O(g.dataset.opt))); }); });
    all('[data-plan]').forEach(function (b) { b.setAttribute('aria-pressed', String(state.plans.indexOf(b.dataset.plan) > -1)); });
    all('[data-p]').forEach(function (p) { p.hidden = !on[p.dataset.p]; });
    all('[data-mode]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.mode === state.mode)); });
    all('[data-per]').forEach(function (b) { b.setAttribute('aria-pressed', String(+b.dataset.per === state.per)); });
    $('hoursRow').hidden = O('salaryPer') !== 'hour';
    $('salary2Per').textContent = PER[O('salaryPer')]; $('payUnit').textContent = PER[O('salaryPer')];
    $('ltdBlock').hidden = state.mode === 'sole';
    all('.ltd-only').forEach(function (e) { e.hidden = state.mode !== 'ltd'; });
    [['biz', 'costLump', 'Break costs down', 'Add another cost'], ['home', 'homeLump', 'Break bills down', 'Add another bill']].forEach(function (g) {
      var lines = state[g[0] + 'Lines'], open = state[g[0] + 'Pick'], left = 0;
      all('#' + g[0] + 'Grid .ln').forEach(function (c) { c.hidden = lines.indexOf(c.dataset.line) < 0; });
      all('#' + g[0] + 'Pick button').forEach(function (b) { b.hidden = lines.indexOf(b.dataset.add.split(':')[1]) > -1; if (!b.hidden) left++; });
      $(g[0] + 'Pick').querySelector('p').hidden = left > 0;
      $(g[1]).hidden = lines.length > 0; $(g[0] + 'Grid').hidden = !lines.length; $(g[0] + 'Pick').hidden = !open;
      $(g[0] + 'Add').textContent = open ? 'Done' : lines.length ? g[3] : g[2]; $(g[0] + 'Add').setAttribute('aria-expanded', String(open));
    });
    $('cpenField').hidden = mode !== 'ltd';
    $('wfhJob').hidden = biz; $('wfhBiz').hidden = !biz || mode === 'ir35'; $('wfhNone').hidden = mode !== 'ir35';
    $('ltdHomeRow').hidden = mode !== 'ltd';
    $('salesLbl').textContent = state.mode === 'ir35' ? 'Contract fee for the year' : state.mode === 'ltd' ? 'Company sales for the year' : 'Sales for the year';
    $('modeHint').textContent = state.mode === 'sole' ? 'You and the business are one. Profit is taxed as your income.' :
      state.mode === 'ltd' ? 'The company pays Corporation Tax, then you take dividends, a salary or pension.' : 'You bill through your company, but the client taxes the fee like a salary.';
    $('detail').hidden = !state.more; $('moreBtn').setAttribute('aria-expanded', String(state.more)); $('moreBtn').textContent = state.more ? 'Hide breakdown' : 'Full breakdown';

    var i = build(), yk = O('year'), full = calc(i, mode), Y = full.Y, h = full.home;
    var starter = i.months > 0, d = starter ? i.months : state.per, unit = starter || state.per === 12 ? 'a month' : state.per === 1 ? 'a year' : 'a week';
    var per = function (n) { return gbp(n / d); };
    $('perSeg').hidden = starter;

    /* the answer */
    $('outLbl').textContent = starter ? 'You take home, until April' : 'You take home';
    tween($('outTake'), full.takeHome / d);
    var settled = starter ? calc(mix(i, { months: 0 }), mode) : null;
    $('outSub').textContent = starter ? 'a month for your ' + i.months + ' payday' + (i.months > 1 ? 's' : '') + ' this tax year. From April: ' + gbp(settled.takeHome / 12) + ' a month.' :
      unit + '. ' + [[1, ' a year'], [12, ' a month'], [52, ' a week']].filter(function (x) { return x[0] !== state.per; }).map(function (x) { return gbp(full.takeHome / x[0]) + x[1]; }).join(', ') + '.';
    $('dockVal').textContent = per(full.takeHome); $('dockLbl').textContent = 'Take-home ' + unit;

    var gross = full.gross + i.sales + full.erWfh;
    var segs = [
      ['Take-home', Math.max(0, full.takeHome), 'var(--seg-take)', 1], ['Tax', full.tax + full.divTax, 'var(--seg-tax)', 1],
      ['NI', full.c1 + full.c1b + full.c4 + full.erNI, 'var(--seg-ni)', 1], ['Loan', full.loan, 'var(--seg-loan)'],
      ['Corp. Tax', full.ct, 'var(--seg-ct)'], ['Pension', full.wpCash + full.sippNet + full.cpen, 'var(--seg-pen)'],
      ['Costs', full.bizCosts, 'var(--seg-cost)'], ['In company', full.retained, 'var(--seg-ret)']
    ].filter(function (s) { return s[3] || s[1] > 0.5; });
    $('bar').innerHTML = segs.map(function (s) { return gross > 0 && s[1] > 0 ? '<i style="width:' + (s[1] / gross * 100).toFixed(2) + '%;background:' + s[2] + '" title="' + s[0] + '"></i>' : ''; }).join('');
    $('legend').innerHTML = segs.map(function (s) { return '<div><span><b style="background:' + s[2] + '"></b>' + s[0] + '</span><span>' + per(s[1]) + '</span></div>'; }).join('');

    /* full breakdown: each line can open to show how it is worked out */
    var pc = function (r) { return +(r * 100).toFixed(2) + '%'; }, f = full.f || 1, it = full.itx, n1 = full.ni1, Ln = [];
    function line(k, label, v, cls, subs) { Ln.push({ k: k, label: label, v: v, cls: cls || '', sub: (subs || []).filter(Boolean) }); }
    var sp = O('salaryPer'), rate = num($('salary').value), paySub = [];
    if (sp === 'hour') paySub.push(['£' + rate.toFixed(2) + ' an hour, ' + (num($('hours').value) || 37.5) + ' hours a week, 52 weeks', gbp(i.salary) + ' a year']);
    else if (sp !== 'year') paySub.push([gbp(rate) + ' ' + PER[sp] + ', ' + (sp === 'month' ? '12 months' : '52 weeks'), gbp(i.salary) + ' a year']);
    if (starter) paySub.push([i.months + ' of 12 months this tax year', gbp(full.gross)]);
    line('pay', biz ? 'Pay from your job' : 'Pay', per(full.gross), '', paySub);
    if (full.erWfh > 0.5) line('erwfh', 'Home working payment from your employer', per(full.erWfh), '', [['£6 a week, tax free', gbp(full.erWfh) + ' a year']]);
    var costSub = state.bizLines.length ? state.bizLines.map(function (k) { return [NAME[k], per(num($(k).value))]; }) : [];
    if (mode === 'sole') {
      line('sales', 'Side business sales', per(i.sales), '', [['Sales', per(i.sales)], full.usedAllowance ? ['Trading allowance, used instead of costs', per(-Math.min(i.sales, Y.tradingAllowance))] : ['Business costs', per(-i.costs)],
        !full.usedAllowance && full.homeAmt > 0.5 ? ['Claim for the room you work from', per(-full.homeAmt)] : null, ['Profit that is taxed', per(full.profit)]]);
      line('costs', 'Business costs', per(-i.costs), '', costSub);
    }
    if (mode === 'ltd') {
      line('sales', 'Company sales', per(i.sales), '', [['Sales', per(i.sales)], ['Business costs', per(-i.costs)], ['Cost of running the company', per(-i.ltdExtra)],
        full.dirSalary > 0.5 ? ['Salary paid to you', per(-full.dirSalary)] : null, full.erNI > 0.5 ? ['Employer National Insurance', per(-full.erNI)] : null,
        full.cpen > 0.5 ? ['Company pension', per(-full.cpen)] : null, full.homeAmt > 0.5 ? ['Paid to you for the room', per(-full.homeAmt)] : null, ['Company profit', per(full.profit)]]);
      line('costs', 'Business costs', per(-i.costs), '', costSub);
      line('ltdx', 'Cost of running the company', per(-i.ltdExtra));
      if (full.erNI > 0.5) line('erni', 'Employer National Insurance', per(-full.erNI), '', [[per(full.dirSalary - Y.er.st) + ' of salary over the threshold, at 15%', per(full.erNI)]]);
      line('ct', 'Corporation Tax', per(-full.ct), '', full.profit > 0.5 ? [['Company profit', per(full.profit)], ['Taxed at ' + pc(full.ct / full.profit), per(full.ct)], ['Left to pay out', per(full.profit - full.ct)]] : []);
      if (full.retained > 0.5) line('ret', 'Left in the company', per(-full.retained));
    }
    if (mode === 'ir35') { line('sales', 'Contract fee', per(i.sales)); line('costs', 'Business and company costs', per(-full.bizCosts), '', costSub); }
    var taxSub = [[(full.wp > 0.5 && i.wpType !== 'ras' ? 'Pay after pension' : 'Pay'), per(full.taxablePay)],
      mode === 'sole' && full.profit > 0.5 ? ['Side business profit', per(full.profit)] : null, mode === 'ltd' && full.dirSalary > 0.5 ? ['Salary from your company', per(full.dirSalary)] : null,
      mode === 'ir35' ? ['Contract fee', per(i.sales)] : null, ['Tax-free allowance' + (it.pa < Y.pa ? ', reduced' : ''), per(-it.paUsed)]];
    it.slices.forEach(function (x) { taxSub.push([per(x.amt) + ' at ' + pc(x.rate), per(x.amt * x.rate)]); });
    if (!it.slices.length) taxSub.push(['All inside the allowance', 'nothing']);
    line('tax', 'Income Tax', per(-full.tax), '', taxSub);
    if (mode === 'ltd') line('divtax', 'Dividend tax', per(-full.divTax), '', [['Dividends paid to you', per(full.dividends)], it.paDiv > 0.5 ? [per(it.paDiv) + ' inside your tax-free allowance', 'nothing'] : null]
      .concat(it.divSlices.map(function (x) { return [per(x.amt) + (x.rate ? ' at ' + pc(x.rate) : ', dividend allowance'), x.rate ? per(x.amt * x.rate) : 'nothing']; })));
    var niSub = [['First ' + per(Y.ni.pt * f) + ' of pay', 'nothing'], n1.mainAmt > 0.5 ? [per(n1.mainAmt * f) + ' at 8%', per(n1.mainAmt * Y.ni.main * f)] : null, n1.addAmt > 0.5 ? [per(n1.addAmt * f) + ' at 2%', per(n1.addAmt * Y.ni.add * f)] : null];
    if (mode === 'sole' && full.profit > 0.5) niSub.push(['First ' + per(Y.c4.lpl) + ' of profit', 'nothing'], full.c4s.amt6 > 0.5 ? [per(full.c4s.amt6) + ' of profit at 6%', per(full.c4s.amt6 * Y.c4.main)] : null,
      full.c4s.amt2 > 0.5 ? [per(full.c4s.amt2) + ' of profit at 2%', per(full.c4s.amt2 * Y.c4.add)] : null, full.c4capped ? ['Lower rate because your job has already paid', ''] : null);
    if (full.c1b > 0.5) niSub.push([mode === 'ltd' ? 'On your company salary' : 'On the contract fee', per(full.c1b)]);
    line('ni', 'National Insurance', per(-(full.c1 + full.c1b + full.c4)), '', niSub);
    if (full.loan > 0.5 || on.loan) {
      var low = i.plans.slice().sort(function (a, b) { return Y.sl[a] - Y.sl[b]; })[0], thrL = low ? Y.sl[low] * f : 0, over = low ? Math.max(0, full.loanInc - thrL) : 0, pgOver = Math.max(0, full.loanInc - Y.sl.pg * f);
      line('loan', 'Student loan', per(-full.loan), '', [['Income counted', per(full.loanInc)], low ? [PLAN[low] + ' threshold' + (i.plans.length > 1 ? ', the lowest of your plans' : ''), per(thrL)] : null, low ? [per(over) + ' over, at 9%', per(over * 0.09)] : null,
        i.pg ? [per(pgOver) + ' over the postgraduate threshold, at 6%', per(pgOver * 0.06)] : null]);
    }
    if (full.wpCash > 0.5) line('wp', 'Workplace pension', per(-full.wpCash), '', [[i.wpPct + '% of your pay', per(full.wp)], i.wpType === 'ras' ? ['Tax relief added on top', per(full.wp - full.wpCash)] : ['Comes out before tax' + (i.wpType === 'sacrifice' ? ' and National Insurance' : ''), ''], ['Goes into your pension', per(full.wp)]]);
    if (full.sippNet > 0.5) line('sipp', 'Personal pension', per(-full.sippNet), '', [['You pay in', per(full.sippNet)], ['Provider adds 20%', per(full.sippGross - full.sippNet)], ['Goes into your pension', per(full.sippGross)], ['Higher rate relief is in the Income Tax line', '']]);
    if (full.cpen > 0.5) line('cpen', 'Company pension', per(-full.cpen));
    line('take', 'Take-home ' + unit, per(full.takeHome), 'tot');
    if (full.pot > 0.5) line('pot', 'Plus, into your pension', per(full.pot), 'pot');
    if (full.retained > 0.5) line('ret2', 'Plus, left in the company', per(full.retained), 'pot');
    $('lines').innerHTML = Ln.map(function (L) {
      var inner = '<span>' + L.label + '</span><span>' + L.v + '</span>';
      if (!L.sub.length) return '<li class="' + L.cls + '"><div class="lr">' + inner + '</div></li>';
      return '<li class="exp ' + L.cls + '"><details data-k="' + L.k + '"' + (state.open[L.k] ? ' open' : '') + '><summary class="lr">' + inner + '</summary><ul class="slices">' +
        L.sub.map(function (x) { return '<li><span>' + x[0] + '</span><span>' + (x[1] || '') + '</span></li>'; }).join('') + '</ul></details></li>';
    }).join('');

    var sa = full.saBill, saH, extraLoan = full.loan - full.loanPaye;
    if (!biz) {
      saH = sa < -0.5 ? '<h3><span class="num">' + gbp(-sa) + '</span> to claim back</h3><p>Higher rate relief on your pension top-up is not automatic. Claim it through a tax return, or by contacting HMRC if you do not file one.</p>' :
        starter ? '<h3>Check your first payslip</h3><p>The tax code should read 1257L. If it has W1, M1 or 0T on it you are on an emergency code and will get the overpaid tax back once it is corrected.</p>' :
          '<h3>Nothing to file</h3><p>Your employer takes all of it through your pay, so there is no tax return to do on these figures.</p>';
    } else if (mode === 'ir35') {
      saH = '<h3>Taxed before it reaches you</h3><p>The client or agency takes Income Tax and National Insurance off the fee, so there is normally nothing more to pay on it.' +
        (extraLoan > 0.5 ? ' Your student loan on the fee, <strong class="num">' + gbp(extraLoan) + '</strong>, is collected through your tax return.' : '') + '</p>';
    } else if (sa > 0.5) {
      saH = '<h3>Put aside <span class="num">' + gbp(sa / 12) + '</span> a month</h3><p><strong class="num">' + gbp(sa) + '</strong> is yours to pay through Self Assessment by ' + Y.saDue + '.' +
        (extraLoan > 0.5 ? ' That includes ' + gbp(extraLoan) + ' of student loan on your side income.' : '') +
        (mode === 'ltd' ? ' The company pays its ' + gbp(full.ct) + ' of Corporation Tax separately.' : '') + ' The take-home figure already allows for it.</p>';
    } else if (sa < -0.5) {
      saH = '<h3>A refund of <span class="num">' + gbp(-sa) + '</span></h3><p>Your pension relief is worth more than the tax on your side income.</p>';
    } else { saH = '<h3>Self Assessment</h3><p>Nothing extra to pay on these figures.</p>'; }
    $('saBox').innerHTML = saH;

    var N = [];
    if (mode === 'sole') {
      if (full.usedAllowance && i.sales <= Y.tradingAllowance) N.push('Your sales are within the ' + gbp(Y.tradingAllowance) + ' trading allowance for ' + Y.label + ', so the side income is tax free and there is nothing to report.');
      else if (full.usedAllowance) N.push('The ' + gbp(Y.tradingAllowance) + ' trading allowance is worth more than your costs, so the calculator used the allowance instead.');
      if (full.loss) N.push('Your costs are higher than your sales. The calculator treats the profit as nil.');
      if (full.c4capped) N.push('Your job has already paid most of the main rate National Insurance, which cuts the Class 4 on your profit from ' + gbp(full.c4normal) + ' to ' + gbp(full.c4) + '.');
      if (i.sales > 50000) N.push('With sales over £50,000 you are in Making Tax Digital for Income Tax, with quarterly updates to HMRC.');
      else if (i.sales > 30000) N.push('With sales over £30,000 you join Making Tax Digital for Income Tax from April 2027.');
      else if (i.sales > 20000) N.push('With sales over £20,000 you join Making Tax Digital for Income Tax from April 2028.');
    }
    if (mode === 'ltd') {
      if (full.loss) N.push('The company spends more than it earns on these figures. The calculator assumes you cover the gap yourself.');
      if (full.erNI > 0.5) N.push('Your company salary is over £5,000, so the company pays ' + gbp(full.erNI) + ' of employer National Insurance.');
      if (full.retained > 0.5) N.push('Profit left in the company is not tax free. Dividend tax is due when you take it out.');
      if (i.ltdHome === 'rent' && full.homeAmt > 0) N.push('A rental agreement must be in writing and at a fair rate. Declare the rent on your tax return and set the room\'s share of your home costs against it.');
    }
    if (mode === 'ir35') N.push('Business costs do not reduce the tax inside IR35. If the client has cut your rate to cover its employer National Insurance, enter the lower fee.');
    if (biz && mode !== 'ir35' && sa > 1000 && full.payeTax < 0.8 * (full.tax + full.divTax + full.c4)) N.push('Because the bill is over £1,000, HMRC will also ask for payments on account towards next year. Expect the first January payment to be about ' + gbp(sa * 1.5) + '.');
    if (i.sales > 90000) N.push('Sales over £90,000 in 12 months mean you must register for VAT. The figures here leave VAT out.');
    if (full.pa < Y.pa) N.push('Your income is over £100,000, so your tax-free allowance is reduced to ' + gbp(full.pa) + '. Pension payments win some of it back.');
    if (full.pot > Y.annualAllowance) N.push('Pension payments are over the £60,000 annual allowance.');
    if (on.scot && yk === '2027-28') N.push('Scottish bands for 2027/28 are not set yet. These figures use the 2026/27 bands.');
    if (on.loan && i.plans.indexOf('p4') > -1 && yk === '2027-28') N.push('The Plan 4 threshold for 2027/28 is not confirmed yet. This uses the 2026/27 figure.');
    if (!biz && i.salary > 0 && i.salary < 12.71 * 35 * 52 * 0.62) N.push('Check your pay meets the minimum wage for your age. From April 2026 it is £8.00 an hour for under 18s and first year apprentices, £10.85 for 18 to 20 and £12.71 for 21 and over.');
    $('notes').innerHTML = N.map(function (n) { return '<li>' + esc(n) + '</li>'; }).join('');

    /* panel summaries */
    if (on.loan) {
      var lowP = i.plans.slice().sort(function (a, b) { return Y.sl[a] - Y.sl[b]; })[0], thr = lowP ? Y.sl[lowP] : 0;
      var rule = (lowP ? '9% of pay over ' + gbp(thr) + ' a year' : '') + (lowP && i.pg ? ', plus ' : '') + (i.pg ? '6% over ' + gbp(Y.sl.pg) + ' for the postgraduate loan' : '');
      $('loanSum').innerHTML = !lowP && !i.pg ? 'Pick your plan above.' : full.loan > 0.5 ? '<strong class="num">' + per(full.loan) + '</strong> ' + unit + ' goes to your student loan: ' + rule + '.' +
        (i.plans.length > 1 ? ' With more than one plan you still pay 9% once, split between them.' : '') : 'Nothing to repay yet. It starts at ' + rule + '.';
      /* pay-off estimate for one loan at today's pay */
      var bal = num($('loanBal').value), only = state.plans.length === 1 ? state.plans[0] : null, est = '';
      if (bal > 0 && !only) est = 'Pick a single loan to see when it clears.';
      else if (bal > 0) {
        var inc = full.loanInc, rp = only === 'pg' ? Math.max(0, inc - Y.sl.pg) * 0.06 : Math.max(0, inc - Y.sl[only]) * 0.09;
        var ir = only === 'pg' ? 6 : only === 'p2' ? Math.min(6, 4.1 + 3 * clamp((inc - 29385) / (52885 - 29385), 0, 1)) : 4.1, intr = bal * ir / 100;
        est = 'Interest is ' + (+ir.toFixed(1)) + '% this year, about <strong class="num">' + gbp(intr) + '</strong>. You repay <strong class="num">' + gbp(rp) + '</strong> a year at this pay. ';
        if (rp <= intr) est += 'So the balance keeps growing. Whatever is left is written off ' + TERM[only] + ' years after you first became due to repay.';
        else { var yrs = Math.log(rp / (rp - intr)) / Math.log(1 + ir / 100);
          est += yrs > TERM[only] ? 'That would take about ' + Math.round(yrs) + ' years, longer than the ' + TERM[only] + ' year limit, so part of it will be written off.' :
            'It clears in about <strong>' + Math.max(1, Math.round(yrs)) + ' year' + (Math.round(yrs) > 1 ? 's' : '') + '</strong>, after roughly ' + gbp(rp * yrs) + ' of repayments. The limit is ' + TERM[only] + ' years.'; }
      }
      $('loanEst').innerHTML = est; $('loanEst').hidden = !est;
    }
    var higher = 0, claim = 0;
    if (on.pension) {
      var np = calc(mix(i, { wpPct: 0, sipp: 0, cpen: 0 }), mode), cost = np.takeHome + np.retained - full.takeHome - full.retained;
      $('penSum').innerHTML = full.pot > 0.5 ? '<strong class="num">' + per(full.pot) + '</strong> ' + unit + ' goes into your pension and costs you <strong class="num">' + per(cost) + '</strong> of take-home. That is ' + Math.round(cost / full.pot * 100) + 'p for every £1 saved. Anything your employer adds comes on top.' :
        'Use the buttons to set what you pay in.';
      /* relief above the basic 20%: what the pension saves in tax, less 20% of what went in before tax */
      var nt = calc(mix(i, { wpPct: 0, sipp: 0 }), mode), saved = nt.tax + nt.divTax - full.tax - full.divTax;
      higher = Math.max(0, saved - 0.2 * (i.wpType === 'ras' ? 0 : full.wp));
      var nr = calc(mix(i, { sipp: 0, wpPct: i.wpType === 'ras' ? 0 : i.wpPct }), mode);
      claim = Math.min(higher, Math.max(0, nr.tax + nr.divTax - full.tax - full.divTax));
      $('penHl').innerHTML = '<strong>Higher rate relief: <span class="num">' + gbp(higher) + '</span> a year.</strong> It is worked out for you and already in your take-home. ' +
        (claim > 0.5 ? (higher - claim > 0.5 ? gbp(higher - claim) + ' comes through your pay. The other ' : 'This ') + '<strong class="num">' + gbp(claim) + '</strong> has to be claimed from HMRC, through a tax return or by asking them to change your tax code.' : 'It comes through your pay, so there is nothing to claim.');
    }
    $('penHl').hidden = higher < 0.5;
    $('hlRelief').hidden = higher < 0.5;
    if (higher >= 0.5) $('hlRelief').innerHTML = '<span>Includes higher rate pension relief</span><b class="num">' + per(higher) + '</b>';
    if (on.starter) {
      $('startSum').innerHTML = on.side ? 'This works with a job on its own. Switch off Side business to use it.' : !starter ? 'Starting in April means a full tax year, so your pay is the same every month.' :
        'You have <strong>' + i.months + '</strong> payday' + (i.months > 1 ? 's' : '') + ' left this tax year, and a full year of tax-free allowance to use in them. You take home <strong class="num">' + gbp(full.takeHome / i.months) + '</strong> a month until April, then <strong class="num">' + gbp(settled.takeHome / 12) + '</strong>.';
    }
    if (state.bizLines.length) $('bizTotal').innerHTML = 'Your lines add up to <strong class="num">' + gbp(sum(state.bizLines)) + '</strong> a year. They replace the single total.';
    $('bizTotal').hidden = !state.bizLines.length;
    if (state.homeLines.length) $('homeTotal').innerHTML = 'Your lines add up to <strong class="num">' + gbp(sum(state.homeLines.filter(function (k) { return HOME_IDS.indexOf(k) > -1; }))) + '</strong> a month in home costs. They replace the two totals.';
    $('homeTotal').hidden = !state.homeLines.length;
    if (on.side) {
      var jobOnly = calc(mix(i, { sales: 0, costs: 0, ltdExtra: 0, dirSalary: 0, cpen: 0, homeAnnual: 0, telecomAnnual: 0, bizHours: 0 }), 'job'), add = full.kept - jobOnly.kept;
      $('sideSum').innerHTML = (mode === 'ir35' ? 'The contract' : 'Your side business') + ' adds <strong class="num">' + gbp(add) + '</strong> a year to what you keep, about <strong class="num">' + gbp(add / 12) + '</strong> a month, from ' +
        (mode === 'ir35' ? 'a fee of ' : 'a taxed profit of ') + '<strong class="num">' + gbp(full.profit) + '</strong>.';
    }
    if (on.wfh && biz && mode !== 'ir35') {
      var nh = calc(i, mode, { home: false }), saved = full.kept - nh.kept;
      $('homeSum').innerHTML = 'One of ' + h.rooms + ' rooms, used for work ' + pct(h.timeShare) + ' of the time, is ' + (h.share * 100).toFixed(1).replace(/\.0$/, '') + '% of your home costs: <strong class="num">' + gbp(h.actual) + '</strong> a year. ' +
        (mode === 'ltd' ? 'Your company pays you <strong class="num">' + gbp(full.homeAmt) + '</strong> a year tax free.' :
          (h.method === 'flat' && h.flat > 0 ? 'The HMRC flat rate of ' + gbp(h.flat) + ' is higher, so that is used. ' : '') + 'Your claim is <strong class="num">' + gbp(full.homeAmt) + '</strong>.') +
        ' It leaves you <strong class="num">' + gbp(saved) + '</strong> a year better off.';
    }

    /* comparisons */
    if (on.cmpSal) renderSal(i, mode, full, d, unit);
    if (on.cmpRoute) renderRoute();
    if (on.cmpSetup) renderSetup();

    var setup = { job: 'Job', sole: 'Job + sole trader', ltd: 'Job + limited company', ir35: 'Job + contract inside IR35' }[mode];
    summary = 'True Take-Home, ' + Y.label + ' (' + setup + ')\n' +
      'Take-home: ' + gbp(full.takeHome / d) + ' ' + unit + (starter ? ' until April' : ', ' + gbp(full.takeHome) + ' a year') + '\n' +
      'Pay ' + gbp(i.salary) + ' a year' + (biz ? ', ' + (mode === 'ir35' ? 'contract fee ' : 'side business sales ') + gbp(i.sales) + ', costs ' + gbp(full.bizCosts) : '') + '\n' +
      'Income Tax ' + gbp(full.tax + full.divTax) + ', National Insurance ' + gbp(full.c1 + full.c1b + full.c4 + full.erNI) + (full.loan > 0.5 ? ', student loan ' + gbp(full.loan) : '') + (full.ct > 0.5 ? ', Corporation Tax ' + gbp(full.ct) : '') + '\n' +
      (full.pot > 0.5 ? 'Into pension ' + gbp(full.pot) + '\n' : '') + 'Estimate only, not tax advice.';
    save();
  }

  /* ---- saving and restoring ---- */
  function raw() {
    var o = { state: state };
    TEXT.concat(SELECTS).forEach(function (k) { o[k] = $(k).value; });
    CHECKS.forEach(function (k) { o[k] = $(k).checked; });
    return o;
  }
  function restore(o) {
    if (!o) return;
    TEXT.concat(SELECTS).forEach(function (k) { if (o[k] != null) $(k).value = o[k]; });
    CHECKS.forEach(function (k) { if (o[k] != null) $(k).checked = !!o[k]; });
    if (o.state && o.state.on) { var f = fresh(); state = Object.assign(f, o.state, { on: Object.assign(f.on, o.state.on) }); ['bizLines', 'homeLines'].forEach(function (k) { if (!Array.isArray(state[k])) state[k] = []; }); if (!state.open) state.open = {}; if (!Array.isArray(state.plans)) state.plans = ['p5']; state.opt = Object.assign(fresh().opt, o.state.opt || {}); if (!state.pay || !isFinite(state.pay.salary)) { state.pay = { salary: 0, salary2: 0 }; keepPay(); } }
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(raw())); } catch (e) {} }
  function load() { try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return null; } }

  function toggle(t, v) {
    var on = state.on; on[t] = v;
    if (t === 'cmpSetup' && v) on.side = true;
    if (t === 'side' && v) on.starter = false;
    if (t === 'side' && !v) on.cmpSetup = false;
    render();
    var p = document.querySelector('[data-p="' + t + '"]');
    if (v && p && p.scrollIntoView) p.scrollIntoView({ block: t === 'side' ? 'start' : 'nearest', behavior: calm() ? 'auto' : 'smooth' });
  }

  function start(data) {
    grids();
    DEFAULTS = JSON.parse(JSON.stringify(raw()));
    restore(data && data.salary != null ? data : load());
    showPay();

    document.addEventListener('input', function (e) {
      if (!(e.target.closest && e.target.closest('#app'))) return;
      var id = e.target.id;
      if (id === 'salary' || id === 'salary2') keepPay([id]);
      if (id === 'hours' && O('salaryPer') === 'hour') { keepPay(['salary']); showPay(); }      /* your hourly rate stays, the year changes */
      render();
    });
    document.addEventListener('focusout', function (e) {
      var t = e.target; if (!t || t.tagName !== 'INPUT' || t.type === 'checkbox' || t.type === 'range') return;
      if (t.classList.contains('money')) fmtMoney(t); else if (String(t.value).trim() === '') { t.value = '0'; render(); }
    });
    /* tap a field and type: the old figure is selected, so the first key replaces it */
    document.addEventListener('focusin', function (e) {
      var t = e.target; if (!t || t.tagName !== 'INPUT' || t.type === 'checkbox' || t.type === 'range') return;
      var v0 = t.value, pick = function () { try { t.select(); t.setSelectionRange(0, t.value.length); } catch (err) {} };
      pick(); setTimeout(function () { if (document.activeElement === t && t.value === v0) pick(); }, 0);
    });
    document.addEventListener('mouseup', function (e) {
      var t = e.target;
      if (t.tagName === 'INPUT' && t.type !== 'checkbox' && document.activeElement === t && t.selectionStart === 0 && t.selectionEnd === t.value.length) e.preventDefault();
    });
    /* Enter or Next moves to the next field on screen */
    all('input:not([type=checkbox])').forEach(function (el) { el.setAttribute('enterkeyhint', 'next'); });
    document.addEventListener('keydown', function (e) {
      var t = e.target; if (e.key !== 'Enter' || t.tagName !== 'INPUT' || t.type === 'checkbox') return;
      e.preventDefault();
      var list = all('#app input:not([type=checkbox])').filter(function (el) { return el.offsetParent !== null; }), nx = list[list.indexOf(t) + 1];
      if (nx) { nx.focus(); nx.scrollIntoView({ block: 'center', behavior: calm() ? 'auto' : 'smooth' }); } else t.blur();
    });

    all('.tile').forEach(function (c) { c.addEventListener('click', function () { toggle(c.dataset.t, !state.on[c.dataset.t]); }); });
    all('[data-opt] [data-v]').forEach(function (b) { b.addEventListener('click', function () {
      var k = b.closest('[data-opt]').dataset.opt; state.opt[k] = b.dataset.v;
      if (k === 'salaryPer') { showPay(); state.per = b.dataset.v === 'week' || b.dataset.v === 'hour' ? 52 : 12; shown = null; }   /* same pay, shown per month, week or hour */
      render(); }); });
    all('[data-plan]').forEach(function (b) { b.addEventListener('click', function () { var k = b.dataset.plan, at = state.plans.indexOf(k); if (at > -1) state.plans.splice(at, 1); else state.plans.push(k); render(); }); });
    all('[data-close]').forEach(function (b) { b.addEventListener('click', function () { toggle(b.dataset.close, false); }); });
    all('[data-mode]').forEach(function (b) { b.addEventListener('click', function () { state.mode = b.dataset.mode; render(); }); });
    all('[data-per]').forEach(function (b) { b.addEventListener('click', function () { state.per = +b.dataset.per; shown = null; render(); }); });
    all('[data-for]').forEach(function (b) {
      b.addEventListener('click', function () {
        var el = $(b.dataset.for), st = parseFloat(b.dataset.step), v = num(el.value);
        var nv = st > 0 ? Math.floor(v / st + 1e-9) * st + st : Math.ceil(v / -st - 1e-9) * -st + st;
        var lo = b.dataset.for === 'rooms' ? 1 : 0, hi = /Pct$/.test(b.dataset.for) ? 100 : Infinity;
        el.value = clamp(Math.round(nv * 100) / 100, lo, hi); if (el.classList.contains('money')) fmtMoney(el);
        if (b.dataset.for === 'hours' && O('salaryPer') === 'hour') { keepPay(['salary']); showPay(); }
        render();
      });
    });
    /* costs and bills: open the picker, add one line at a time, remove with the cross */
    ['biz', 'home'].forEach(function (g) { $(g + 'Add').addEventListener('click', function () { state[g + 'Pick'] = !state[g + 'Pick']; render(); if (state[g + 'Pick']) $(g + 'Pick').scrollIntoView({ block: 'nearest', behavior: calm() ? 'auto' : 'smooth' }); }); });
    document.addEventListener('click', function (e) {
      var a = e.target.closest ? e.target.closest('[data-add]') : null, r = e.target.closest ? e.target.closest('[data-rm]') : null;
      if (a) {
        var p = a.dataset.add.split(':'), list = state[p[0] + 'Lines'];
        if (list.indexOf(p[1]) < 0) list.push(p[1]);
        $(p[1]).value = '0'; render(); $(p[1]).focus({ preventScroll: true }); $(p[1]).scrollIntoView({ block: 'center', behavior: calm() ? 'auto' : 'smooth' });
      } else if (r) {
        ['bizLines', 'homeLines'].forEach(function (k) { state[k] = state[k].filter(function (x) { return x !== r.dataset.rm; }); });
        render();
      }
    });
    $('lines').addEventListener('toggle', function (e) { var d = e.target; if (d.dataset && d.dataset.k) { state.open[d.dataset.k] = d.open; save(); } }, true);
    $('moreBtn').addEventListener('click', function () {
      state.more = !state.more; render();
      if (state.more) $('detail').scrollIntoView({ block: 'nearest', behavior: calm() ? 'auto' : 'smooth' });
    });
    var undo = null, undoT = 0, resets = all('[data-reset]');
    var label = function (on) { resets.forEach(function (b) { b.classList.toggle('undo', on); b.textContent = on ? 'Undo' : 'Start again'; }); };
    resets.forEach(function (b) {
      b.addEventListener('click', function () {
        if (undo) { restore(undo); undo = null; clearTimeout(undoT); label(false); showPay(); shown = null; render(); return; }
        undo = JSON.parse(JSON.stringify(raw()));
        state = fresh(); restore(DEFAULTS); state = fresh(); showPay(); shown = null; render(); window.scrollTo(0, 0);
        /* a few seconds to change your mind */
        label(true); undoT = setTimeout(function () { undo = null; label(false); }, 7000);
      });
    });
    $('dockBtn').addEventListener('click', function () { $('result').scrollIntoView({ block: 'center', behavior: calm() ? 'auto' : 'smooth' }); });
    $('copyBtn').addEventListener('click', function () {
      var b = $('copyBtn'), done = function () { b.textContent = 'Copied'; setTimeout(function () { b.textContent = 'Copy summary'; }, 1800); };
      var fail = function () {
        try { var ta = document.createElement('textarea'); ta.value = summary; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); done(); }
        catch (err) { b.textContent = 'Copy not available here'; }
      };
      try { navigator.clipboard.writeText(summary).then(done, fail); } catch (err) { fail(); }
    });
    /* the floating figure only shows while the answer card is off screen */
    if ('IntersectionObserver' in window) new IntersectionObserver(function (en) { $('dock').classList.toggle('off', en[0].isIntersecting); }, { threshold: 0.25 }).observe($('result'));
    var rz = 0; window.addEventListener('resize', function () { clearTimeout(rz); rz = setTimeout(render, 150); });
    render();
  }

  var hot = window.claude && window.claude.hot;
  if (hot && hot.snapshot) hot.snapshot(raw);
  if (hot && hot.ready) hot.ready(start); else start((hot && hot.data) || {});
})();
