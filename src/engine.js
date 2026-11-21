/* Pure tax engine. No DOM. Three ways to run a side business next to a job: sole trader, limited company, limited company inside IR35. */
var TTH = (function () {
  var SCOT_2026 = [[3967, 0.19], [16956, 0.20], [31092, 0.21], [62430, 0.42], [125140, 0.45], [Infinity, 0.48]];
  var BASE = {
    pa: 12570, taper: 100000, brl: 37700, hrl: 125140,
    ni: { pt: 12570, uel: 50270, main: 0.08, add: 0.02, band53: 53 * (967 - 242) },
    c4: { lpl: 12570, upl: 50270, main: 0.06, add: 0.02 },
    er: { st: 5000, rate: 0.15 },
    div: [0.1075, 0.3575, 0.3935], divAllowance: 500,
    ct: { low: 50000, high: 250000, small: 0.19, main: 0.25, frac: 3 / 200 },
    wfhFlat: 312,
    sl: { p1: 26900, p2: 29385, p4: 33795, p5: 25000, pg: 21000 },
    scot: SCOT_2026, annualAllowance: 60000
  };
  var YEARS = {
    '2026-27': Object.assign({}, BASE, { label: '2026/27', tradingAllowance: 1000, saDue: '31 January 2028' }),
    '2027-28': Object.assign({}, BASE, { label: '2027/28', tradingAllowance: 3000, saDue: '31 January 2029', sl: { p1: 28005, p2: 29385, p4: 33795, p5: 26025, pg: 21000 } })
  };
  function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }

  function bandTax(taxable, bands) {
    var prev = 0, tax = 0;
    for (var k = 0; k < bands.length; k++) {
      var lim = bands[k][0], rate = bands[k][1];
      if (taxable > prev) tax += (Math.min(taxable, lim) - prev) * rate;
      prev = lim;
    }
    return tax;
  }

  /* Income Tax on pay and profits (nonDiv) with dividends stacked on top.
     rasGross: gross relief-at-source pension contributions. They extend the bands and cut adjusted net income.
     Dividends always use the UK bands, also for Scottish taxpayers. */
  function personalTax(nonDiv, div, rasGross, region, Y) {
    var ani = nonDiv + div - rasGross;
    var pa = Math.max(0, Y.pa - Math.max(0, (ani - Y.taper) / 2));
    var taxNonDiv = Math.max(0, nonDiv - pa);
    var taxDiv = Math.max(0, div - Math.max(0, pa - nonDiv));
    var bands;
    if (region === 'scot') {
      bands = Y.scot.map(function (b, idx) { return [idx === 0 ? b[0] : b[0] + rasGross, b[1]]; });
    } else {
      bands = [[Y.brl + rasGross, 0.20], [Y.hrl + rasGross, 0.40], [Infinity, 0.45]];
    }
    var brl = Y.brl + rasGross, hrl = Y.hrl + rasGross;
    var inBasic = clamp(brl - taxNonDiv, 0, taxDiv);
    var inHigher = clamp(hrl - Math.max(taxNonDiv, brl), 0, taxDiv - inBasic);
    var inAdd = taxDiv - inBasic - inHigher;
    var al = Y.divAllowance, a;
    a = Math.min(al, inBasic); inBasic -= a; al -= a;
    a = Math.min(al, inHigher); inHigher -= a; al -= a;
    a = Math.min(al, inAdd); inAdd -= a;
    var sl = [], prev = 0;
    bands.forEach(function (b) { if (taxNonDiv > prev) sl.push({ amt: Math.min(taxNonDiv, b[0]) - prev, rate: b[1] }); prev = b[0]; });
    var dsl = [{ amt: Y.divAllowance - al, rate: 0 }, { amt: inBasic, rate: Y.div[0] }, { amt: inHigher, rate: Y.div[1] }, { amt: inAdd, rate: Y.div[2] }].filter(function (x) { return x.amt > 0.005; });
    return { tax: bandTax(taxNonDiv, bands), divTax: inBasic * Y.div[0] + inHigher * Y.div[1] + inAdd * Y.div[2], pa: pa, taxable: taxNonDiv,
      paUsed: Math.min(nonDiv, pa), paDiv: Math.min(div, Math.max(0, pa - nonDiv)), slices: sl, divSlices: dsl };
  }
  function incomeTax(totalIncome, rasGross, region, Y) { return personalTax(totalIncome, 0, rasGross, region, Y); }

  function class1(niPay, Y) {
    var main = Math.max(0, Math.min(niPay, Y.ni.uel) - Y.ni.pt) * Y.ni.main;
    var add = Math.max(0, niPay - Y.ni.uel) * Y.ni.add;
    return { main: main, total: main + add, mainAmt: main / Y.ni.main, addAmt: add / Y.ni.add };
  }
  /* Two separate employments. Each has its own thresholds, then the annual maximum caps the main rate (SSCR 2001 reg 21). */
  function class1Two(a, b, Y) {
    var A = class1(a, Y), B = class1(b, Y);
    var band = function (x) { return Math.max(0, Math.min(x, Y.ni.uel) - Y.ni.pt); };
    var over = Math.max(0, a - Y.ni.uel) + Math.max(0, b - Y.ni.uel);
    var max = Y.ni.band53 * Y.ni.main + Math.max(0, band(a) + band(b) - Y.ni.band53) * Y.ni.add + over * Y.ni.add;
    var total = Math.min(A.total + B.total, max);
    return { job: A.total, second: Math.max(0, total - A.total), total: Math.max(A.total, total), main: A.main };
  }

  /* Class 4 with the annual maximum for people who also pay Class 1 (SSCR 2001 reg 100, no Class 2 element from April 2024). */
  function class4(profit, c1main, Y) {
    var c = Y.c4;
    var mainNormal = Math.max(0, Math.min(profit, c.upl) - c.lpl) * c.main;
    var addNormal = Math.max(0, profit - c.upl) * c.add;
    var normal = mainNormal + addNormal;
    var plain = { due: normal, normal: normal, capped: false, amt6: mainNormal / c.main, amt2: addNormal / c.add };
    if (c1main <= 0 || normal <= 0) return plain;
    var step4 = (c.upl - c.lpl) * c.main - c1main;
    if (step4 > c1main + mainNormal) return plain;
    var atMain = Math.max(0, step4);
    var step5 = atMain / c.main;
    var step6 = Math.min(c.upl, profit) - c.lpl;
    var step7 = Math.max(0, step6 - step5);
    var max = atMain + step7 * c.add + addNormal;
    var due = Math.min(normal, max);
    if (due >= normal - 0.005) return plain;
    var a6 = Math.min(step5, Math.max(0, step6));
    return { due: due, normal: normal, capped: true, amt6: a6, amt2: (due - a6 * c.main) / c.add };
  }

  function corpTax(p, Y) {
    var c = Y.ct;
    if (p <= 0) return 0;
    if (p <= c.low) return p * c.small;
    if (p >= c.high) return p * c.main;
    return p * c.main - (c.high - p) * c.frac;
  }

  /* i.homeAnnual: yearly total of rent, mortgage interest and household bills. i.telecomAnnual: yearly business share of broadband and phone. */
  function homeClaim(i) {
    var rooms = Math.max(1, i.rooms || 1);
    var tot = i.bizHours + i.otherHours;
    var timeShare = tot > 0 ? i.bizHours / tot : 0;
    var share = timeShare / rooms;
    var actual = i.homeAnnual * share;
    var hoursMonth = i.bizHours * 52 / 12;
    var flatRate = hoursMonth >= 101 ? 26 : hoursMonth >= 51 ? 18 : hoursMonth >= 25 ? 10 : 0;
    var flat = flatRate * 12;
    var bband = i.telecomAnnual;
    var method = actual >= flat ? 'actual' : 'flat';
    return { rooms: rooms, timeShare: timeShare, share: share, actual: actual, flat: flat, flatRate: flatRate,
      hoursMonth: hoursMonth, bband: bband, method: method, total: Math.max(actual, flat) + bband };
  }

  function job(i) {
    var f = i.months ? Math.min(12, Math.max(1, i.months)) / 12 : 1;
    var gross = i.salary * f, wp = gross * i.wpPct / 100;
    var o = { f: f, gross: gross, wp: wp, taxablePay: gross, niPay: gross, niAnnual: i.salary, wpRas: 0, wpCash: wp };
    if (i.wpType === 'sacrifice') { o.taxablePay -= wp; o.niPay -= wp; o.niAnnual -= i.salary * i.wpPct / 100; }
    else if (i.wpType === 'netpay') { o.taxablePay -= wp; }
    else { o.wpRas = wp; o.wpCash = wp * 0.8; }
    return o;
  }
  /* Student loan: 9% over the lowest threshold of the plans held, plus 6% over the postgraduate threshold. f scales the thresholds for a part year. */
  function loan(income, i, Y, f) {
    f = f || 1;
    var t = 0, ug = (i.plans || []).map(function (p) { return Y.sl[p]; }).filter(function (v) { return v > 0; });
    if (ug.length) t += Math.max(0, income - Math.min.apply(null, ug) * f) * 0.09;
    if (i.pg) t += Math.max(0, income - Y.sl.pg * f) * 0.06;
    return t;
  }
  function blank() { return { loan: 0, loanPaye: 0, erWfh: 0, tax: 0, divTax: 0, c1: 0, c1b: 0, c4: 0, c4normal: 0, c4capped: false, ct: 0, erNI: 0, dividends: 0, retained: 0, cpen: 0, dirSalary: 0, usedAllowance: false, loss: false }; }

  function calcSole(i, yearKey, opt) {
    opt = opt || {};
    var Y = YEARS[yearKey], j = job(i), r = blank();
    var h = homeClaim(i);
    var homeAmt = opt.home === false ? 0 : h.total;
    var expenses = i.costs + homeAmt;
    var profit;
    if (i.sales <= Y.tradingAllowance) { profit = 0; r.usedAllowance = i.sales > 0; }
    else if (Y.tradingAllowance > expenses) { profit = i.sales - Y.tradingAllowance; r.usedAllowance = true; }
    else { profit = Math.max(0, i.sales - expenses); }
    r.loss = !r.usedAllowance && i.sales - expenses < 0;

    var sippNet = opt.sipp === false ? 0 : i.sipp * 12, sippGross = sippNet / 0.8;
    var ras = j.wpRas + sippGross;
    var it = personalTax(j.taxablePay + profit, 0, ras, i.region, Y);
    var c1 = class1(j.niAnnual, Y); c1 = { main: c1.main * j.f, total: c1.total * j.f };
    var c4 = class4(profit, c1.main, Y);
    r.loan = loan(j.niPay + profit, i, Y, j.f); r.loanPaye = loan(j.niPay, i, Y, j.f); r.loanInc = j.niPay + profit;
    r.itx = it; r.ni1 = class1(j.niAnnual, Y); r.c4s = c4; r.f = j.f;
    r.erWfh = i.erWfh ? Y.wfhFlat * j.f : 0; r.gross = j.gross;
    r.mode = 'sole'; r.Y = Y; r.home = h; r.homeAmt = homeAmt; r.wp = j.wp; r.wpCash = j.wpCash; r.taxablePay = j.taxablePay;
    r.profit = profit; r.sippNet = sippNet; r.sippGross = sippGross; r.pa = it.pa; r.tax = it.tax;
    r.payeTax = personalTax(j.taxablePay, 0, 0, i.region, Y).tax;
    r.c1 = c1.total; r.c1main = c1.main; r.c4 = c4.due; r.c4normal = c4.normal; r.c4capped = c4.capped;
    r.bizCosts = i.costs;
    r.takeHome = j.gross - j.wpCash - it.tax - c1.total - c4.due + i.sales - i.costs - sippNet - r.loan + r.erWfh;
    r.pot = j.wp + sippGross; r.kept = r.takeHome + r.pot;
    r.saBill = it.tax - r.payeTax + c4.due + r.loan - r.loanPaye; r.earnings = j.taxablePay + profit;
    return r;
  }

  /* Limited company, contract outside IR35. The company pays Corporation Tax, then you take salary and dividends. */
  function calcLtd(i, yearKey, opt) {
    opt = opt || {};
    var Y = YEARS[yearKey], j = job(i), r = blank();
    var h = homeClaim(i);
    var homeAmt = opt.home === false || i.bizHours <= 0 ? 0 : (i.ltdHome === 'rent' ? Math.max(h.actual, Y.wfhFlat) : Y.wfhFlat);
    var s = Math.max(0, i.dirSalary || 0);
    var erNI = Math.max(0, s - Y.er.st) * Y.er.rate;
    var p = opt.cpen === false ? 0 : Math.max(0, i.cpen || 0) * 12;
    var outgo = i.costs + i.ltdExtra + s + erNI + p + homeAmt;
    var profit = Math.max(0, i.sales - outgo);
    var shortfall = Math.max(0, outgo - i.sales);
    r.loss = shortfall > 0;
    var ct = corpTax(profit, Y), dist = profit - ct;
    var div = dist * clamp(i.takePct, 0, 100) / 100;

    var sippNet = opt.sipp === false ? 0 : i.sipp * 12, sippGross = sippNet / 0.8;
    var ras = j.wpRas + sippGross;
    var pt = personalTax(j.taxablePay + s, div, ras, i.region, Y);
    var ni = class1Two(j.niPay, s, Y);
    r.mode = 'ltd'; r.Y = Y; r.home = h; r.homeAmt = homeAmt; r.wp = j.wp; r.wpCash = j.wpCash; r.taxablePay = j.taxablePay;
    r.profit = profit; r.ct = ct; r.dividends = div; r.retained = dist - div; r.dirSalary = s; r.erNI = erNI; r.cpen = p;
    r.sippNet = sippNet; r.sippGross = sippGross; r.pa = pt.pa; r.tax = pt.tax; r.divTax = pt.divTax;
    r.payeTax = personalTax(j.taxablePay + s, 0, 0, i.region, Y).tax;
    r.c1 = ni.job; r.c1b = ni.second; r.c1main = ni.main;
    r.bizCosts = i.costs + i.ltdExtra;
    r.loan = loan(j.niPay + s + (div > 2000 ? div : 0), i, Y, 1); r.loanPaye = loan(j.niPay, i, Y, 1); r.gross = j.gross; r.loanInc = j.niPay + s + (div > 2000 ? div : 0);
    r.itx = pt; r.ni1 = class1(j.niPay, Y); r.f = 1;
    r.takeHome = j.gross - j.wpCash + s + div + homeAmt - pt.tax - pt.divTax - ni.total - sippNet - shortfall - r.loan;
    r.pot = j.wp + sippGross + p; r.kept = r.takeHome + r.pot + r.retained;
    r.saBill = pt.tax + pt.divTax - r.payeTax + r.loan - r.loanPaye; r.earnings = j.taxablePay + s;
    return r;
  }

  /* Limited company, contract inside IR35. The fee is taxed at source like a second salary and costs do not come off it. */
  function calcInside(i, yearKey, opt) {
    opt = opt || {};
    var Y = YEARS[yearKey], j = job(i), r = blank();
    var fee = i.sales;
    var sippNet = opt.sipp === false ? 0 : i.sipp * 12, sippGross = sippNet / 0.8;
    var ras = j.wpRas + sippGross;
    var pt = personalTax(j.taxablePay + fee, 0, ras, i.region, Y);
    var ni = class1Two(j.niPay, fee, Y);
    r.mode = 'ir35'; r.Y = Y; r.home = homeClaim(i); r.homeAmt = 0; r.wp = j.wp; r.wpCash = j.wpCash; r.taxablePay = j.taxablePay;
    r.profit = fee; r.sippNet = sippNet; r.sippGross = sippGross; r.pa = pt.pa; r.tax = pt.tax;
    r.payeTax = personalTax(j.taxablePay + fee, 0, 0, i.region, Y).tax;
    r.c1 = ni.job; r.c1b = ni.second; r.c1main = ni.main;
    r.bizCosts = i.costs + i.ltdExtra;
    r.loan = loan(j.niPay + fee, i, Y, 1); r.loanPaye = loan(j.niPay, i, Y, 1); r.gross = j.gross; r.loanInc = j.niPay + fee;
    r.itx = pt; r.ni1 = class1(j.niPay, Y); r.f = 1;
    r.takeHome = j.gross - j.wpCash + fee - i.costs - i.ltdExtra - pt.tax - ni.total - sippNet - r.loan;
    r.pot = j.wp + sippGross; r.kept = r.takeHome + r.pot;
    r.saBill = pt.tax - r.payeTax + r.loan - r.loanPaye; r.earnings = j.taxablePay + fee;
    return r;
  }

  function run(mode, i, yearKey, opt) {
    return mode === 'ltd' ? calcLtd(i, yearKey, opt) : mode === 'ir35' ? calcInside(i, yearKey, opt) : calcSole(i, yearKey, opt);
  }

  return { YEARS: YEARS, run: run, calc: calcSole, calcLtd: calcLtd, calcInside: calcInside, homeClaim: homeClaim,
    incomeTax: incomeTax, personalTax: personalTax, loan: loan, class1: class1, class1Two: class1Two, class4: class4, corpTax: corpTax };
})();
if (typeof module !== 'undefined') module.exports = TTH;
