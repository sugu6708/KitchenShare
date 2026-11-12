/* KitchenShare - budget_dashboard | module 27/27 | classic script, loads in filename order */
"use strict";
  /* ---------------- Budget Dashboard ---------------- */

  if (currentPage === 'budget-dashboard.html') {

    var CATEGORY_COLORS = {
      fridge: '#5c8a6e',
      pantry: '#8b6e4e',
      spices: '#b8860b',
      other: '#7a7a7a'
    };
    var OUTCOME_COLORS = {
      used: '#425842',
      leftover: '#675c53',
      wasted: '#ba1a1a'
    };

    function getFinancialYear(date) {
      var d = date || new Date();
      var month = d.getMonth();
      var year = d.getFullYear();
      if (month >= 3) return { start: year, end: year + 1, label: year + '-' + (year + 1) };
      return { start: year - 1, end: year, label: (year - 1) + '-' + year };
    }

    function getFYRange(fyStart) {
      var start = new Date(fyStart, 3, 1);
      var end = new Date(fyStart + 1, 2, 31, 23, 59, 59);
      return { start: start, end: end };
    }

    function filterByFY(log, fyStart) {
      var range = getFYRange(fyStart);
      return log.filter(function (entry) {
        var d = new Date(entry.date || entry.ts);
        return d >= range.start && d <= range.end;
      });
    }

    function getMonthLabel(date) {
      var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return months[date.getMonth()] + ' ' + date.getFullYear();
    }

    function getMonthIndex(date) {
      var d = new Date(date);
      return (d.getFullYear() * 12 + d.getMonth());
    }

    function computeBudgetData(fyStart) {
      var log = filterByFY(getSpendingLog(), fyStart);
      var inventory = getInventory();
      var cooked = getSpendingLog();

      var totalSpending = 0;
      var byCategory = {};
      var byMonth = {};
      var byItem = {};

      log.forEach(function (entry) {
        var amt = entry.amount || 0;
        totalSpending += amt;
        var cat = (entry.category || 'Other').toLowerCase();
        if (!byCategory[cat]) byCategory[cat] = 0;
        byCategory[cat] += amt;

        var d = new Date(entry.date || entry.ts);
        var mk = getMonthLabel(d);
        if (!byMonth[mk]) byMonth[mk] = { total: 0, items: 0 };
        byMonth[mk].total += amt;
        byMonth[mk].items++;

        var ik = (entry.item || '').toLowerCase();
        if (ik) {
          if (!byItem[ik]) byItem[ik] = { name: entry.item, amount: 0, qty: 0, unit: entry.unit || '' };
          byItem[ik].amount += amt;
          byItem[ik].qty += entry.qty || 0;
        }
      });

      var inventoryValue = 0;
      var inventoryByCategory = {};
      inventory.forEach(function (it) {
        var price = typeof it.price === 'number' ? it.price : 0;
        var cat = (it.category || 'other').toLowerCase();
        if (!inventoryByCategory[cat]) inventoryByCategory[cat] = 0;
        if (price > 0) {
          inventoryByCategory[cat] += price;
          inventoryValue += price;
        }
      });

      var usedCount = 0;
      var leftoverCount = inventory.length;
      try {
        var cookLog = lsGet('kitchenshare.u.' + currentUserId() + '.cooked', []);
        usedCount = cookLog.length;
      } catch (e) { usedCount = 0; }

      var utilizationRate = 0;
      if (usedCount + leftoverCount > 0) {
        utilizationRate = Math.round((usedCount / (usedCount + leftoverCount)) * 100);
      }

      var sortedMonths = Object.keys(byMonth).sort(function (a, b) {
        return getMonthIndex(new Date(a)) - getMonthIndex(new Date(b));
      });

      return {
        totalSpending: totalSpending,
        byCategory: byCategory,
        byMonth: byMonth,
        byItem: byItem,
        sortedMonths: sortedMonths,
        inventoryValue: inventoryValue,
        inventoryByCategory: inventoryByCategory,
        usedCount: usedCount,
        leftoverCount: leftoverCount,
        utilizationRate: utilizationRate,
        recentTransactions: log.slice(-10).reverse()
      };
    }

    function renderSummary(data) {
      document.getElementById('budget-total').textContent = '₹' + Math.round(data.totalSpending).toLocaleString();
      document.getElementById('budget-used').textContent = data.usedCount;
      document.getElementById('budget-leftover').textContent = data.leftoverCount;
      document.getElementById('budget-util').textContent = data.utilizationRate + '%';
    }

    function renderMonthlyBars(data) {
      var container = document.getElementById('monthly-bars');
      var empty = document.getElementById('monthly-empty');
      container.innerHTML = '';
      if (!data.sortedMonths.length) { empty.style.display = ''; return; }
      empty.style.display = 'none';

      var maxVal = 0;
      data.sortedMonths.forEach(function (mk) {
        if (data.byMonth[mk].total > maxVal) maxVal = data.byMonth[mk].total;
      });
      if (maxVal === 0) maxVal = 1;

      data.sortedMonths.forEach(function (mk) {
        var m = data.byMonth[mk];
        var pct = Math.round((m.total / maxVal) * 100);
        var col = document.createElement('div');
        col.className = 'flex-1 flex flex-col items-center justify-end h-full';
        col.innerHTML =
          '<span class="font-body-xs text-on-surface-variant mb-1">₹' + Math.round(m.total) + '</span>' +
          '<div class="w-full rounded-t-lg transition-all duration-500" style="height:' + pct + '%;background:linear-gradient(to top,#425842,#5c8a6e);"></div>' +
          '<span class="font-body-xs text-on-surface-variant mt-1 text-center leading-tight">' + mk.split(' ')[0] + '</span>';
        container.appendChild(col);
      });
    }

    function renderCategoryBreakdown(data) {
      var container = document.getElementById('category-list');
      var empty = document.getElementById('category-empty');
      container.innerHTML = '';
      var cats = Object.keys(data.byCategory);
      if (!cats.length && !data.inventoryValue) { empty.style.display = ''; return; }
      empty.style.display = 'none';

      var allCats = {};
      cats.forEach(function (c) { allCats[c] = data.byCategory[c]; });
      Object.keys(data.inventoryByCategory).forEach(function (c) {
        if (!allCats[c]) allCats[c] = 0;
      });

      var total = data.totalSpending || 1;
      Object.keys(allCats).sort(function (a, b) { return allCats[b] - allCats[a]; }).forEach(function (cat) {
        var spent = data.byCategory[cat] || 0;
        var inv = data.inventoryByCategory[cat] || 0;
        var pct = Math.round((spent / total) * 100);
        var color = CATEGORY_COLORS[cat] || CATEGORY_COLORS.other;
        var row = document.createElement('div');
        row.className = 'flex items-center gap-3';
        row.innerHTML =
          '<div class="w-3 h-3 rounded-full shrink-0" style="background:' + color + ';"></div>' +
          '<div class="flex-1">' +
          '<div class="flex justify-between items-center mb-1">' +
          '<span class="font-body-md text-body-md text-on-surface capitalize">' + cat + '</span>' +
          '<span class="font-body-md text-body-md text-on-surface-variant">₹' + Math.round(spent) + ' spent</span>' +
          '</div>' +
          '<div class="h-2 rounded-full bg-surface-container-high overflow-hidden">' +
          '<div class="h-full rounded-full transition-all duration-500" style="width:' + pct + '%;background:' + color + ';"></div>' +
          '</div>' +
          (inv > 0 ? '<p class="font-body-xs text-on-surface-variant mt-1">₹' + Math.round(inv) + ' in stock</p>' : '') +
          '</div>';
        container.appendChild(row);
      });
    }

    function renderTransactions(data) {
      var container = document.getElementById('transactions-list');
      var empty = document.getElementById('transactions-empty');
      container.innerHTML = '';
      if (!data.recentTransactions.length) { empty.style.display = ''; return; }
      empty.style.display = 'none';

      data.recentTransactions.forEach(function (entry) {
        var d = new Date(entry.date || entry.ts);
        var row = document.createElement('div');
        row.className = 'flex items-center gap-3 p-2 rounded-lg hover:bg-surface-container-low transition-colors';
        var catColor = CATEGORY_COLORS[(entry.category || 'other').toLowerCase()] || CATEGORY_COLORS.other;
        row.innerHTML =
          '<div class="w-10 h-10 shrink-0 rounded-full flex items-center justify-center" style="background:' + catColor + '20;">' +
          '<span class="material-symbols-outlined text-[18px]" style="color:' + catColor + ';">receipt</span></div>' +
          '<div class="flex-1 min-w-0">' +
          '<p class="font-body-md text-body-md text-on-surface truncate">' + esc(entry.item || 'Purchase') + '</p>' +
          '<p class="font-body-xs text-on-surface-variant">' + d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) + ' · ' + esc(entry.category || 'Other') + '</p>' +
          '</div>' +
          '<span class="font-headline-sm text-headline-sm text-on-surface shrink-0">₹' + Math.round(entry.amount || 0) + '</span>';
        container.appendChild(row);
      });
    }

    function renderSankey(data) {
      var svg = document.getElementById('sankey-svg');
      var emptyMsg = document.getElementById('sankey-empty');
      svg.innerHTML = '';
      if (data.totalSpending === 0 && data.inventoryValue === 0) {
        emptyMsg.style.display = '';
        return;
      }
      emptyMsg.style.display = 'none';

      var width = svg.parentElement.clientWidth || 600;
      var height = 320;
      svg.setAttribute('viewBox', '0 0 ' + width + ' ' + height);

      var nodeW = 24;
      var gap = 16;
      var padY = 20;

      var sourceNodes = [];
      var sourceTotal = 0;
      Object.keys(data.byCategory).forEach(function (cat) {
        var val = data.byCategory[cat];
        if (val > 0) {
          sourceNodes.push({ id: cat, value: val, color: CATEGORY_COLORS[cat] || CATEGORY_COLORS.other });
          sourceTotal += val;
        }
      });
      if (data.inventoryValue > 0 && sourceTotal === 0) {
        Object.keys(data.inventoryByCategory).forEach(function (cat) {
          var val = data.inventoryByCategory[cat];
          if (val > 0) {
            sourceNodes.push({ id: cat, value: val, color: CATEGORY_COLORS[cat] || CATEGORY_COLORS.other });
            sourceTotal += val;
          }
        });
      }
      if (!sourceNodes.length) return;

      var usedValue = 0;
      var leftoverValue = 0;
      var wastedValue = 0;
      sourceNodes.forEach(function (sn) {
        var catInv = data.inventoryByCategory[sn.id] || 0;
        var catSpent = sn.value;
        var usedFrac = catSpent > 0 ? Math.min(1, (catSpent - catInv) / catSpent) : 0;
        usedValue += catSpent * usedFrac;
        leftoverValue += catInv;
        if (usedFrac < 0.3 && catSpent > 0) wastedValue += catSpent * 0.1;
      });

      var targetNodes = [];
      if (usedValue > 0) targetNodes.push({ id: 'used', value: usedValue, color: OUTCOME_COLORS.used });
      if (leftoverValue > 0) targetNodes.push({ id: 'leftover', value: leftoverValue, color: OUTCOME_COLORS.leftover });
      if (wastedValue > 0) targetNodes.push({ id: 'wasted', value: wastedValue, color: OUTCOME_COLORS.wasted });

      if (!targetNodes.length) return;

      var totalTarget = targetNodes.reduce(function (s, t) { return s + t.value; }, 0);
      if (totalTarget === 0) totalTarget = 1;

      var x1 = 40;
      var x2 = width - nodeW - 40;

      var usableH = height - padY * 2;
      var sourceGap = Math.min(gap, (usableH - sourceNodes.length * 8) / Math.max(sourceNodes.length - 1, 1));
      var targetGap = Math.min(gap, (usableH - targetNodes.length * 8) / Math.max(targetNodes.length - 1, 1));

      var sourceH = sourceNodes.map(function (n) { return Math.max(8, (n.value / sourceTotal) * (usableH - sourceGap * Math.max(sourceNodes.length - 1, 0))); });
      var targetH = targetNodes.map(function (n) { return Math.max(8, (n.value / totalTarget) * (usableH - targetGap * Math.max(targetNodes.length - 1, 0))); });

      var sy = padY;
      sourceNodes.forEach(function (n, i) {
        n.y = sy;
        n.h = sourceH[i];
        sy += n.h + sourceGap;
      });

      var ty = padY;
      targetNodes.forEach(function (n, i) {
        n.y = ty;
        n.h = targetH[i];
        ty += n.h + targetGap;
      });

      var ns = 'http://www.w3.org/2000/svg';

      sourceNodes.forEach(function (sn) {
        var rect = document.createElementNS(ns, 'rect');
        rect.setAttribute('x', x1);
        rect.setAttribute('y', sn.y);
        rect.setAttribute('width', nodeW);
        rect.setAttribute('height', sn.h);
        rect.setAttribute('rx', 4);
        rect.setAttribute('fill', sn.color);
        svg.appendChild(rect);

        var label = document.createElementNS(ns, 'text');
        label.setAttribute('x', x1 - 6);
        label.setAttribute('y', sn.y + sn.h / 2 + 4);
        label.setAttribute('text-anchor', 'end');
        label.setAttribute('fill', '#444');
        label.setAttribute('font-size', '11');
        label.setAttribute('font-family', 'Work Sans, sans-serif');
        label.textContent = sn.id.charAt(0).toUpperCase() + sn.id.slice(1) + ' ₹' + Math.round(sn.value);
        svg.appendChild(label);
      });

      targetNodes.forEach(function (tn) {
        var rect = document.createElementNS(ns, 'rect');
        rect.setAttribute('x', x2);
        rect.setAttribute('y', tn.y);
        rect.setAttribute('width', nodeW);
        rect.setAttribute('height', tn.h);
        rect.setAttribute('rx', 4);
        rect.setAttribute('fill', tn.color);
        svg.appendChild(rect);

        var label = document.createElementNS(ns, 'text');
        label.setAttribute('x', x2 + nodeW + 6);
        label.setAttribute('y', tn.y + tn.h / 2 + 4);
        label.setAttribute('text-anchor', 'start');
        label.setAttribute('fill', '#444');
        label.setAttribute('font-size', '11');
        label.setAttribute('font-family', 'Work Sans, sans-serif');
        var labelKey = 'lbl_sanjey_' + tn.id;
        var labelMap = { used: 'Used in Cooking', leftover: 'In Stock', wasted: 'Wasted' };
        label.textContent = (labelMap[tn.id] || tn.id) + ' ₹' + Math.round(tn.value);
        svg.appendChild(label);
      });

      var sourceOffsets = sourceNodes.map(function () { return 0; });
      var targetOffsets = targetNodes.map(function () { return 0; });

      sourceNodes.forEach(function (sn, si) {
        targetNodes.forEach(function (tn, ti) {
          var flowVal = 0;
          if (tn.id === 'used') {
            flowVal = sn.value * (1 - (data.inventoryByCategory[sn.id] || 0) / Math.max(sn.value, 1));
          } else if (tn.id === 'leftover') {
            flowVal = data.inventoryByCategory[sn.id] || 0;
          } else if (tn.id === 'wasted') {
            flowVal = sn.value * 0.05;
          }
          if (flowVal <= 0) return;

          var flowH = (flowVal / sn.value) * sn.h;
          if (flowH < 1) flowH = 1;

          var sx = x1 + nodeW;
          var sy0 = sn.y + sourceOffsets[si];
          var tx = x2;
          var ty0 = tn.y + targetOffsets[ti];
          sourceOffsets[si] += flowH;
          targetOffsets[ti] += flowH;

          var mx1 = sx + (tx - sx) * 0.4;
          var mx2 = sx + (tx - sx) * 0.6;

          var path = document.createElementNS(ns, 'path');
          var d = 'M' + sx + ',' + sy0 +
            ' C' + mx1 + ',' + sy0 + ' ' + mx2 + ',' + ty0 + ' ' + tx + ',' + ty0 +
            ' L' + tx + ',' + (ty0 + flowH) +
            ' C' + mx2 + ',' + (ty0 + flowH) + ' ' + mx1 + ',' + (sy0 + flowH) + ' ' + sx + ',' + (sy0 + flowH) +
            ' Z';
          path.setAttribute('d', d);
          path.setAttribute('fill', tn.color);
          path.setAttribute('opacity', '0.35');
          svg.appendChild(path);
        });
      });
    }

    function renderFYOptions() {
      var select = document.getElementById('budget-fy-select');
      var currentFY = getFinancialYear();
      var options = [];
      for (var i = 0; i < 5; i++) {
        var fy = currentFY.start - i;
        options.push({ value: fy, label: 'FY ' + fy + '-' + (fy + 1) });
      }
      select.innerHTML = options.map(function (o) {
        return '<option value="' + o.value + '">' + o.label + '</option>';
      }).join('');
      select.value = currentFY.start;
    }

    function refreshDashboard() {
      var fyStart = parseInt(document.getElementById('budget-fy-select').value, 10);
      var data = computeBudgetData(fyStart);
      renderSummary(data);
      renderSankey(data);
      renderMonthlyBars(data);
      renderCategoryBreakdown(data);
      renderTransactions(data);
    }

    function syncBudgetNow() {
      if (typeof DS !== 'undefined' && DS.budget && typeof DS.budget.load === 'function') {
        DS.budget.load().then(function (merged) {
          if (merged && typeof DS.budget.saveAll === 'function') {
            var sig = JSON.stringify(merged);
            if (sig !== __budgetPushSig) { __budgetPushSig = sig; DS.budget.saveAll(merged); }
          }
          refreshDashboard();
        });
      } else {
        refreshDashboard();
      }
    }
    var __budgetPushSig = '';

    renderFYOptions();
    refreshDashboard();
    syncBudgetNow();
    document.getElementById('budget-fy-select').addEventListener('change', refreshDashboard);

    window.addEventListener('pageshow', syncBudgetNow);
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) syncBudgetNow();
    });
    setInterval(function () {
      if (!document.hidden) syncBudgetNow();
    }, 5000);

    window.addEventListener('resize', function () {
      var fyStart = parseInt(document.getElementById('budget-fy-select').value, 10);
      var data = computeBudgetData(fyStart);
      renderSankey(data);
    });
  }
