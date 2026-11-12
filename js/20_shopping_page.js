/* KitchenShare - shopping_page | module 20/22 | classic script, loads in filename order */
"use strict";
  /* ---------------- Shopping List page ---------------- */

  function getShopSuggestions() {
      var map = {};
      try {
        var inv = getInventory();
        inv.forEach(function (it) { if (it && it.name) map[norm(it.name)] = it.name; });
      } catch (e) {}
      try {
        var list = getIngredientList();
        list.forEach(function (n) { if (n) map[norm(n)] = n; });
      } catch (e) {}
      var out = [];
      Object.keys(map).forEach(function (k) { out.push(map[k]); });
      out.sort();
      return out;
    }

  function populateShopDatalist() {
    var dl = document.getElementById('shop-ingredient-datalist');
    if (!dl) return;
    var names = getShopSuggestions();
    dl.innerHTML = names.map(function (n) { return '<option value="' + esc(n) + '"></option>'; }).join('');
  }

  /* ---------------- Shopping List page (shopping-list.html) ---------------- */

  var shopPage = document.getElementById('shopping-groups');
  if (shopPage) {
    var shopSub = document.getElementById('shopping-subtitle');
    var shopInputCls = 'w-full h-touch-target-min px-4 rounded-xl bg-surface-container-low border border-surface-variant focus:ring-2 focus:ring-primary font-body-md text-body-md text-on-surface';

    function groupIcon(g) {
      return 'shopping_basket';
    }

    function shopRowHTML(it) {
      return '<div class="flex items-center h-[24px] mt-1 mr-4"><input class="kitchen-checkbox" type="checkbox"' + (it.done ? ' checked' : '') + '/></div>' +
        '<div class="flex-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">' +
        '<div class="item-text font-body-lg text-body-lg text-on-surface transition-colors">' + esc(it.name) + '</div>' +
        '<div class="flex items-center gap-3">' +
        '<button data-ks-shop-edit type="button" class="font-headline-md text-body-md text-primary bg-primary-fixed/50 px-3 py-1 rounded-full whitespace-nowrap hover:bg-primary-fixed transition-colors">' + formatQty(it) + '</button>' +
        (it.group ? '<span class="text-[13px] text-on-surface-variant bg-surface-container px-2 py-1 rounded-md hidden sm:inline-block">' + esc(it.group) + '</span>' : '') +
        '</div></div>';
    }

    function bindShopLabel(label, it) {
      var cb = label.querySelector('.kitchen-checkbox');
      if (it.done) {
        label.classList.add('list-item-checked');
        label.classList.remove('bg-surface-container-lowest', 'hover:bg-surface-container-low');
      }
      cb.addEventListener('change', function (e) {
        ksShopping.toggle(it.name, e.target.checked);
        if (e.target.checked) {
          label.classList.add('list-item-checked');
          label.classList.remove('bg-surface-container-lowest', 'hover:bg-surface-container-low');
        } else {
          label.classList.remove('list-item-checked');
          label.classList.add('bg-surface-container-lowest', 'hover:bg-surface-container-low');
        }
        updateShoppingProgress();
      });
      var editBtn = label.querySelector('[data-ks-shop-edit]');
      if (editBtn) editBtn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        openShopItemSheet(it);
      });
    }

    function updateShoppingProgress() {
      if (!shopSub) return;
      var s = getShopping();
      var done = 0;
      s.forEach(function (it) { if (it.done) done++; });
      shopSub.textContent = s.length ? (done + ' of ' + s.length + ' items gathered') : window.t('shopping_subtitle');
    }

    function renderShopping() {
      shopPage.innerHTML = '';
      var s = getShopping();
      if (!s.length) {
        shopPage.innerHTML = '<div class="py-14 text-center"><span class="material-symbols-outlined text-[48px] text-outline">shopping_basket</span><p class="mt-3 font-body-md text-body-md text-on-surface-variant">' + window.t('shopping_subtitle') + '</p></div>';
        updateShoppingProgress();
        return;
      }
      var order = [];
      s.forEach(function (it) {
        var g = it.group || 'Other';
        if (order.indexOf(g) === -1) order.push(g);
      });
      order.forEach(function (g) {
        var sec = document.createElement('section');
        sec.className = 'mb-stack-gap-lg';
        var head = document.createElement('h3');
        head.className = 'font-label-caps text-label-caps text-primary uppercase tracking-wider mb-stack-gap-sm flex items-center gap-2';
        head.innerHTML = '<span class="material-symbols-outlined text-[18px]">' + groupIcon(g) + '</span>' + esc(g);
        var listBox = document.createElement('div');
        listBox.className = 'bg-surface-container-lowest rounded-[16px] shadow-[0px_4px_20px_rgba(66,88,66,0.05)] overflow-hidden flex flex-col gap-[1px] bg-surface-variant/30 border border-surface-variant/50';
        s.filter(function (it) { return (it.group || 'Other') === g; }).forEach(function (it) {
          var label = document.createElement('label');
          label.className = 'flex items-start p-4 bg-surface-container-lowest cursor-pointer hover:bg-surface-container-low transition-colors group';
          label.innerHTML = shopRowHTML(it);
          bindShopLabel(label, it);
          listBox.appendChild(label);
        });
        sec.appendChild(head);
        sec.appendChild(listBox);
        shopPage.appendChild(sec);
      });
      updateShoppingProgress();
    }

    function openShopItemSheet(item) {
      var isEdit = !!item;
      var unitOpts = UNITS.map(function (u) {
        return '<option value="' + u + '"' + (item && item.unit === u ? ' selected' : '') + '>' + u + '</option>';
      }).join('');
      var catKeys = [];
      Object.keys(INV_CATS).forEach(function (c) { catKeys.push(c); });
      getInventory().forEach(function (i) {
        if (catKeys.indexOf(i.category) === -1) catKeys.push(i.category);
      });
      var initCat = item && item.cat ? item.cat : '';
      if (!initCat && item && item.group) {
        catKeys.forEach(function (c) { if (!initCat && catLabel(c) === item.group) initCat = c; });
      }
      var initIsNew = !!initCat && catKeys.indexOf(initCat) === -1;
      var catOpts = catKeys.map(function (c) {
        return '<option value="' + esc(c) + '"' + (initCat === c ? ' selected' : '') + '>' + esc(catLabel(c)) + '</option>';
      }).join('');
      catOpts += '<option value="__new__"' + (initIsNew ? ' selected' : '') + '>＋ ' + window.t('lbl_new_category') + '…</option>';
      var host = document.createElement('div');
      host.id = 'ks-shop-sheet';
      host.className = 'fixed inset-0 z-[75]';
      host.innerHTML =
        '<div class="absolute inset-0 bg-inverse-surface/40 backdrop-blur-sm"></div>' +
        '<div class="absolute inset-x-0 bottom-0 mx-auto max-w-lg bg-surface rounded-t-3xl shadow-[0px_-12px_32px_rgba(66,88,66,0.08)] slide-up px-container-margin pt-4 pb-8">' +
        '<div class="flex items-center justify-between mb-5">' +
        '<h2 class="font-headline-md text-headline-md text-on-surface">' + (isEdit ? window.t('lbl_edit_item') : window.t('lbl_add_item')) + '</h2>' +
        '<button class="text-on-surface-variant hover:text-primary p-2 rounded-full transition-colors" data-ks-close aria-label="' + window.t('lbl_close') + '"><span class="material-symbols-outlined">close</span></button>' +
        '</div>' +
        '<label class="block mb-1 font-label-caps text-label-caps text-on-surface-variant uppercase">' + window.t('lbl_item') + '</label>' +
        '<input id="shop-name" class="' + shopInputCls + '" type="text" value="' + (item ? esc(item.name) : '') + '" placeholder="' + window.t('lbl_name_ph') + '"/>' +
        '<div class="flex gap-3 mt-4">' +
        '<div class="flex-1"><label class="block mb-1 font-label-caps text-label-caps text-on-surface-variant uppercase">' + window.t('lbl_qty') + '</label>' +
        '<input id="shop-qty" class="' + shopInputCls + '" type="number" min="0" step="any" value="' + (item ? item.qty : 1) + '"/></div>' +
        '<div class="flex-1"><label class="block mb-1 font-label-caps text-label-caps text-on-surface-variant uppercase">' + window.t('lbl_unit') + '</label>' +
        '<select id="shop-unit" class="' + shopInputCls + '">' + unitOpts + '</select></div>' +
        '</div>' +
        '<label class="block mt-4 mb-1 font-label-caps text-label-caps text-on-surface-variant uppercase">' + window.t('lbl_category') + '</label>' +
        '<select id="shop-cat" class="' + shopInputCls + '">' + catOpts + '</select>' +
        '<div id="shop-cat-new-wrap" class="hidden mt-2">' +
        '<input id="shop-cat-new" class="' + shopInputCls + '" type="text" placeholder="' + window.t('lbl_new_cat_ph') + '"/>' +
        '</div>' +
        '<label class="block mt-4 mb-1 font-label-caps text-label-caps text-on-surface-variant uppercase">' + window.t('lbl_price') + ' (₹)</label>' +
        '<input id="shop-price" class="' + shopInputCls + '" type="number" min="0" step="0.01" value="' + (item && typeof item.price === 'number' ? item.price : '') + '" placeholder="' + window.t('lbl_price_ph') + '"/>' +
        '<button class="mt-6 w-full h-14 rounded-full bg-primary text-on-primary font-headline-md text-[18px] flex items-center justify-center hover:opacity-90 active:scale-95 transition-all">' + window.t('lbl_save') + '</button>' +
        '</div>';
      document.body.appendChild(host);
      document.body.style.overflow = 'hidden';
      function closeSheet() { host.remove(); document.body.style.overflow = ''; }
      host.querySelector('[data-ks-close]').addEventListener('click', closeSheet);
      host.querySelector('.absolute.inset-0').addEventListener('click', closeSheet);
      var catSel = host.querySelector('#shop-cat');
      var catNewWrap = host.querySelector('#shop-cat-new-wrap');
      var catNewInp = host.querySelector('#shop-cat-new');
      function onCatChange() {
        if (catSel.value === '__new__') catNewWrap.classList.remove('hidden');
        else catNewWrap.classList.add('hidden');
      }
      catSel.addEventListener('change', onCatChange);
      onCatChange();
      if (initIsNew) catNewInp.value = catLabel(initCat);
      var nameInp = document.getElementById('shop-name');
      if (!isEdit) {
        nameInp.setAttribute('list', 'shop-ingredient-datalist');
        var autofillShop = function () {
          var m = findItem(nameInp.value.trim())[0];
          if (!m) return;
          document.getElementById('shop-qty').value = m.qty;
          document.getElementById('shop-unit').value = m.unit;
          if (catKeys.indexOf(m.category) !== -1) { catSel.value = m.category; }
          else { catSel.value = '__new__'; catNewInp.value = catLabel(m.category); }
          onCatChange();
        };
        nameInp.addEventListener('input', autofillShop);
        nameInp.addEventListener('change', autofillShop);
      }
      host.querySelector('button.w-full.h-14').addEventListener('click', function () {
        var name = document.getElementById('shop-name').value.trim();
        if (!name) { ksToast(window.t('toast_item_name')); return; }
        var q = parseFloat(document.getElementById('shop-qty').value);
        if (isNaN(q) || q <= 0) q = 1;
        var unit = document.getElementById('shop-unit').value;
        var cat = catSel.value;
        if (cat === '__new__') {
          var nn = catNewInp.value.trim();
          if (!nn) { ksToast(window.t('toast_item_cat')); return; }
          cat = nn;
        }
        var group = catLabel(cat);
        var p = parseFloat(document.getElementById('shop-price').value);
        var data = { name: name, qty: q, unit: unit, group: group, cat: cat, price: isNaN(p) ? null : p };
        if (isEdit) {
          data.done = item.done;
          ksShopping.update(item.name, data);
          ksToast(window.t('toast_item_updated'));
        } else {
          ksShopping.add([data]);
          ksToast(window.t('toast_shopping_added', { name: name }));
        }
        closeSheet();
        renderShopping();
        populateShopDatalist();
      });
    }

    var shopOpenAddBtn = document.getElementById('shop-open-add');
    if (shopOpenAddBtn) shopOpenAddBtn.addEventListener('click', function () { openShopItemSheet(null); });

    function buildCatOptions(item) {
      var catKeys = [];
      Object.keys(INV_CATS).forEach(function (c) { catKeys.push(c); });
      getInventory().forEach(function (i) {
        if (catKeys.indexOf(i.category) === -1) catKeys.push(i.category);
      });
      var initCat = item && item.cat ? item.cat : '';
      if (!initCat && item && item.group) {
        catKeys.forEach(function (c) { if (!initCat && catLabel(c) === item.group) initCat = c; });
      }
      if (!initCat) initCat = 'pantry';
      var initIsNew = !!initCat && catKeys.indexOf(initCat) === -1;
      var catOpts = catKeys.map(function (c) {
        return '<option value="' + esc(c) + '"' + (initCat === c ? ' selected' : '') + '>' + esc(catLabel(c)) + '</option>';
      }).join('');
      catOpts += '<option value="__new__"' + (initIsNew ? ' selected' : '') + '>＋ ' + window.t('lbl_new_category') + '…</option>';
      return { catKeys: catKeys, initCat: initCat, initIsNew: initIsNew, catOpts: catOpts };
    }

    /* Completed-item confirmation: when clearing the shopping list, ask the
     * user for the actual qty, unit, price and category of each bought item
     * so inventory and the budget dashboard get accurate data. */
    function openCompleteItemSheet(it, opts) {
      var b = buildCatOptions(it);
      var unitOpts = UNITS.map(function (u) {
        return '<option value="' + u + '"' + (it.unit === u ? ' selected' : '') + '>' + u + '</option>';
      }).join('');
      var more = opts.index < opts.total - 1;
      var saveLabel = more ? window.t('lbl_save_next') : window.t('lbl_save_finish');
      var host = document.createElement('div');
      host.id = 'ks-complete-sheet';
      host.className = 'fixed inset-0 z-[76]';
      host.innerHTML =
        '<div class="absolute inset-0 bg-inverse-surface/40 backdrop-blur-sm"></div>' +
        '<div class="absolute inset-x-0 bottom-0 mx-auto max-w-lg bg-surface rounded-t-3xl shadow-[0px_-12px_32px_rgba(66,88,66,0.08)] slide-up px-container-margin pt-4 pb-8">' +
        '<div class="flex items-center justify-between mb-2">' +
        '<h2 class="font-headline-md text-headline-md text-on-surface">' + window.t('lbl_complete_item') + '</h2>' +
        '<button class="text-on-surface-variant hover:text-primary p-2 rounded-full transition-colors" data-ks-close aria-label="' + window.t('lbl_close') + '"><span class="material-symbols-outlined">close</span></button>' +
        '</div>' +
        '<p class="font-body-sm text-body-sm text-on-surface-variant mb-4">' + window.t('shop_complete_hint') + '</p>' +
        '<div class="flex items-center justify-between rounded-xl bg-surface-container-low px-4 py-3 mb-4">' +
        '<div class="flex items-center gap-3 min-w-0">' +
        '<span class="material-symbols-outlined text-[20px] text-primary shrink-0">shopping_basket</span>' +
        '<span class="font-headline-md text-headline-sm text-on-surface truncate">' + esc(it.name) + '</span>' +
        '</div>' +
        '<span class="font-label-caps text-label-caps text-on-surface-variant shrink-0">' + (opts.index + 1) + ' ' + window.t('lbl_of') + ' ' + opts.total + '</span>' +
        '</div>' +
        '<div class="flex gap-3">' +
        '<div class="flex-1"><label class="block mb-1 font-label-caps text-label-caps text-on-surface-variant uppercase">' + window.t('lbl_qty') + '</label>' +
        '<input id="cmp-qty" class="' + shopInputCls + '" type="number" min="0" step="any" value="' + (typeof it.qty === 'number' ? it.qty : 1) + '"/></div>' +
        '<div class="flex-1"><label class="block mb-1 font-label-caps text-label-caps text-on-surface-variant uppercase">' + window.t('lbl_unit') + '</label>' +
        '<select id="cmp-unit" class="' + shopInputCls + '">' + unitOpts + '</select></div>' +
        '</div>' +
        '<label class="block mt-4 mb-1 font-label-caps text-label-caps text-on-surface-variant uppercase">' + window.t('lbl_price') + ' (₹)</label>' +
        '<input id="cmp-price" class="' + shopInputCls + '" type="number" min="0" step="0.01" value="' + (typeof it.price === 'number' ? it.price : '') + '" placeholder="' + window.t('lbl_price_ph') + '"/>' +
        '<label class="block mt-4 mb-1 font-label-caps text-label-caps text-on-surface-variant uppercase">' + window.t('lbl_category') + '</label>' +
        '<select id="cmp-cat" class="' + shopInputCls + '">' + b.catOpts + '</select>' +
        '<div id="cmp-cat-new-wrap" class="hidden mt-2">' +
        '<input id="cmp-cat-new" class="' + shopInputCls + '" type="text" placeholder="' + window.t('lbl_new_cat_ph') + '"/>' +
        '</div>' +
        '<div class="flex gap-3 mt-6">' +
        '<button data-cmp-skip type="button" class="h-14 px-6 rounded-full bg-surface-container-high text-on-surface font-headline-md text-[16px] flex items-center justify-center hover:opacity-90 active:scale-95 transition-all">' + window.t('lbl_skip') + '</button>' +
        '<button data-cmp-save type="button" class="flex-1 h-14 rounded-full bg-primary text-on-primary font-headline-md text-[16px] flex items-center justify-center hover:opacity-90 active:scale-95 transition-all">' + saveLabel + '</button>' +
        '</div>' +
        '</div>';
      document.body.appendChild(host);
      document.body.style.overflow = 'hidden';
      function closeSheet() { host.remove(); document.body.style.overflow = ''; }
      function cancelAll() { closeSheet(); if (opts.onCancelAll) opts.onCancelAll(); }
      host.querySelector('[data-ks-close]').addEventListener('click', cancelAll);
      host.querySelector('.absolute.inset-0').addEventListener('click', cancelAll);
      var catSel = host.querySelector('#cmp-cat');
      var catNewWrap = host.querySelector('#cmp-cat-new-wrap');
      var catNewInp = host.querySelector('#cmp-cat-new');
      function onCatChange() {
        if (catSel.value === '__new__') catNewWrap.classList.remove('hidden');
        else catNewWrap.classList.add('hidden');
      }
      catSel.addEventListener('change', onCatChange);
      onCatChange();
      if (b.initIsNew) catNewInp.value = catLabel(b.initCat);
      host.querySelector('[data-cmp-skip]').addEventListener('click', function () {
        closeSheet();
        if (opts.onSkip) opts.onSkip();
      });
      host.querySelector('[data-cmp-save]').addEventListener('click', function () {
        var q = parseFloat(host.querySelector('#cmp-qty').value);
        if (isNaN(q) || q <= 0) q = 1;
        var unit = host.querySelector('#cmp-unit').value;
        var cat = catSel.value;
        if (cat === '__new__') {
          var nn = catNewInp.value.trim();
          if (!nn) { ksToast(window.t('toast_item_cat')); return; }
          cat = nn;
        }
        var p = parseFloat(host.querySelector('#cmp-price').value);
        var data = { name: it.name, qty: q, unit: unit, price: isNaN(p) || p <= 0 ? null : p, cat: cat, group: catLabel(cat) };
        closeSheet();
        if (opts.onSave) opts.onSave(data);
      });
    }

    function addPurchasedToInventory(it, cat) {
      var items = getInventory();
      var target = null;
      var matches = findItem(it.name);
      for (var i = 0; i < matches.length; i++) {
        if (matches[i].unit === it.unit) { target = matches[i]; break; }
        if (target === null && sameDimension(matches[i].unit, it.unit)) target = matches[i];
      }
      if (!target && matches.length) target = matches[0];
      if (target) {
        var base = toBase(target.qty, target.unit) + toBase(it.qty, it.unit);
        target.qty = roundNum(fromBase(base, target.unit));
        target.category = cat || target.category || 'pantry';
        if (typeof it.price === 'number' && it.price > 0) target.price = it.price;
      } else {
        var rec = { id: uid(), name: it.name, category: cat || 'pantry', qty: it.qty, unit: it.unit, min: null };
        if (typeof it.price === 'number' && it.price > 0) rec.price = it.price;
        items.push(rec);
      }
      saveInventory();
    }

    function applyCompletedItem(it) {
      addPurchasedToInventory(it, it.cat);
      var q = parseFloat(it.qty);
      if (!isNaN(q) && it.unit in UNIT_MULT) recordPurchased(toBase(q, it.unit));
      var amt = (typeof it.price === 'number' && it.price > 0) ? it.price : 0;
      recordSpend(amt, it.cat || 'Other', it.name, it.qty, it.unit);
      ksShopping.remove(it.name);
    }

    function clearCompleted() {
      var queue = getShopping().filter(function (it) { return it.done; });
      if (!queue.length) { ksToast(window.t('toast_no_completed')); return; }
      var total = queue.length;
      var index = 0;
      var added = [];
      function finish() {
        renderShopping();
        evaluateAchievements(null, { silent: true });
        if (added.length) ksToast(window.t('cleared_to_inventory', { count: added.length }));
      }
      function next() {
        if (!queue.length) { finish(); return; }
        var it = queue.shift();
        openCompleteItemSheet(it, {
          index: index++,
          total: total,
          onSave: function (data) {
            applyCompletedItem(data);
            added.push(data.name);
            next();
          },
          onSkip: function () { next(); },
          onCancelAll: function () { finish(); }
        });
      }
      next();
    }
    var clrTop = document.getElementById('clear-completed-top');
    var clrMob = document.getElementById('clear-completed-mobile');
    if (clrTop) clrTop.addEventListener('click', clearCompleted);
    if (clrMob) clrMob.addEventListener('click', clearCompleted);

    /* ---------------- Order Online (cart export) ---------------- */
    var SHOP_PROVIDERS = [
      { id: 'blinkit', name: 'Blinkit', icon: 'bolt', color: '#f9d71c', textColor: '#1f1f1f',
        searchUrl: function (q) { return 'https://blinkit.com/s/?q=' + encodeURIComponent(q); }},
      { id: 'instamart', name: 'Swiggy Instamart', icon: 'delivery_dining', color: '#fc8019', textColor: '#ffffff',
        searchUrl: function (q) { return 'https://www.swiggy.com/instamart/search?query=' + encodeURIComponent(q); }},
      { id: 'bigbasket', name: 'BigBasket', icon: 'local_grocery_store', color: '#8cc63f', textColor: '#ffffff',
        searchUrl: function (q) { return 'https://www.bigbasket.com/ps/?q=' + encodeURIComponent(q); }},
      { id: 'zepto', name: 'Zepto', icon: 'flash_on', color: '#6c3ec1', textColor: '#ffffff',
        searchUrl: function (q) { return 'https://www.zeptonow.com/search?query=' + encodeURIComponent(q); }}
    ];

    function getPendingItems() {
      return getShopping().filter(function (it) { return !it.done; });
    }

    function openOrderOnlineSheet() {
      var pending = getPendingItems();
      if (!pending.length) {
        ksToast(window.t('toast_order_empty'));
        return;
      }
      var host = document.createElement('div');
      host.id = 'ks-order-sheet';
      host.className = 'fixed inset-0 z-[75]';
      var itemsHTML = pending.map(function (it) {
        return '<li class="flex items-center gap-3 py-2.5 px-4 bg-surface-container-lowest rounded-xl">' +
          '<span class="material-symbols-outlined text-[18px] text-primary">check_circle</span>' +
          '<span class="flex-1 font-body-md text-body-md text-on-surface">' + esc(it.name) + '</span>' +
          '<span class="font-body-sm text-body-sm text-on-surface-variant">' + esc(formatQty(it)) + '</span>' +
          '</li>';
      }).join('');
      var providerHTML = SHOP_PROVIDERS.map(function (p) {
        return '<button data-provider="' + p.id + '" class="flex items-center gap-4 w-full p-4 rounded-2xl bg-surface-container-lowest border border-surface-variant/50 hover:bg-surface-container-low transition-all active:scale-[0.98]">' +
          '<div class="w-12 h-12 rounded-xl flex items-center justify-center text-[24px] font-bold" style="background:' + p.color + ';color:' + p.textColor + '">' +
          '<span class="material-symbols-outlined">' + p.icon + '</span></div>' +
          '<div class="flex-1 text-left">' +
          '<div class="font-headline-md text-headline-sm text-on-surface">' + esc(p.name) + '</div>' +
          '<div class="font-body-sm text-body-sm text-on-surface-variant">' + window.t('lbl_send_n_items', { n: pending.length }) + '</div>' +
          '</div>' +
          '<span class="material-symbols-outlined text-on-surface-variant">open_in_new</span>' +
          '</button>';
      }).join('');
      host.innerHTML =
        '<div class="absolute inset-0 bg-inverse-surface/40 backdrop-blur-sm"></div>' +
        '<div class="absolute inset-x-0 bottom-0 mx-auto max-w-lg bg-surface rounded-t-3xl shadow-[0px_-12px_32px_rgba(66,88,66,0.08)] slide-up px-container-margin pt-4 pb-8">' +
        '<div class="flex items-center justify-between mb-2">' +
        '<h2 class="font-headline-md text-headline-md text-on-surface">' + window.t('lbl_order_online') + '</h2>' +
        '<button class="text-on-surface-variant hover:text-primary p-2 rounded-full transition-colors" data-ks-close aria-label="' + window.t('lbl_close') + '"><span class="material-symbols-outlined">close</span></button>' +
        '</div>' +
        '<p class="font-body-sm text-body-sm text-on-surface-variant mb-4">' + window.t('lbl_order_desc') + '</p>' +
        '<ul class="flex flex-col gap-2 mb-5 max-h-[200px] overflow-y-auto pr-1">' + itemsHTML + '</ul>' +
        '<div class="flex flex-col gap-3">' + providerHTML + '</div>' +
        '</div>';
      document.body.appendChild(host);
      document.body.style.overflow = 'hidden';
      function closeSheet() { host.remove(); document.body.style.overflow = ''; }
      host.querySelector('[data-ks-close]').addEventListener('click', closeSheet);
      host.querySelector('.absolute.inset-0').addEventListener('click', closeSheet);
      host.querySelectorAll('[data-provider]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var pid = btn.getAttribute('data-provider');
          var prov = SHOP_PROVIDERS.find(function (p) { return p.id === pid; });
          if (!prov) return;
          var pendingNow = getPendingItems();
          if (!pendingNow.length) { ksToast(window.t('toast_order_empty')); closeSheet(); return; }
          if (pendingNow.length === 1) {
            window.open(prov.searchUrl(pendingNow[0].name), '_blank');
          } else {
            var combined = pendingNow.map(function (it) { return it.name; }).join(', ');
            window.open(prov.searchUrl(combined), '_blank');
          }
          ksToast(window.t('toast_order_opened', { provider: prov.name }));
          closeSheet();
        });
      });
    }

    var orderTopBtn = document.getElementById('order-online-top');
    var orderMobBtn = document.getElementById('order-online-mobile');
    if (orderTopBtn) orderTopBtn.addEventListener('click', openOrderOnlineSheet);
    if (orderMobBtn) orderMobBtn.addEventListener('click', openOrderOnlineSheet);

    renderShopping();
    populateShopDatalist();
    DS.shopping.load().then(function () { renderShopping(); });
  }

