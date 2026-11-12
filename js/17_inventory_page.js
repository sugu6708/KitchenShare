/* KitchenShare - inventory_page | module 17/22 | classic script, loads in filename order */
"use strict";
  /* ---------------- My Kitchen Inventory page ---------------- */

  var INV_CATS = {
    fridge: { name: 'Fridge', listId: 'list-fridge' },
    pantry: { name: 'Pantry', listId: 'list-pantry' },
    spices: { name: 'Spices & Herbs', listId: 'list-spices' }
  };

  function catLabel(cat) {
    if (INV_CATS[cat]) return INV_CATS[cat].name;
    return String(cat || '').replace(/[-_]+/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
  }

  var invPage = document.getElementById('categories');
  if (invPage) {
    var inputCls = 'w-full h-touch-target-min px-4 rounded-xl bg-surface-container-low border border-surface-variant focus:ring-2 focus:ring-primary font-body-md text-body-md text-on-surface';

    function expiryChipHTML(item) {
      var st = expiryState(item);
      if (st === 'none') return '';
      var d = itemDaysLeft(item);
      var label = st === 'expired'
        ? window.t('lbl_expired')
        : window.t('lbl_days_left', { n: d });
      var cls = st === 'expired' ? 'bg-error text-on-error'
        : st === 'soon' ? 'bg-tertiary text-on-tertiary'
        : 'bg-secondary-container text-on-secondary-container';
      return '<span class="ks-exp-chip inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-label-caps text-label-caps text-[10px] ' + cls + '"><span class="material-symbols-outlined text-[12px]">schedule</span>' + esc(label) + '</span>';
    }

    function rowHTML(item) {
      var low = isLow(item);
      var qtyTxt = low ? (item.qty < 0 ? window.t('lbl_out_of_stock') : window.t('lbl_low_prefix') + formatQty(item)) : formatQty(item);
      return '<div class="flex items-center justify-between group py-2 ' +
        (low ? 'bg-error-container/20 rounded-lg px-2 border border-error-container' : 'hover:bg-surface-container-low rounded-lg px-2 transition-colors') + '">' +
        '<div class="flex items-center gap-3">' +
        '<div class="w-10 h-10 rounded-full ' + (low ? 'bg-error-container text-on-error-container' : 'bg-secondary-container text-on-secondary-container') + ' flex items-center justify-center"><span class="material-symbols-outlined text-sm">' + iconFor(item) + '</span></div>' +
        '<div><span class="block font-body-md text-body-md text-on-surface item-name"></span><span class="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">' +
        '<span class="font-label-caps text-label-caps ' + (low ? 'text-error' : 'text-primary') + ' item-qty">' + qtyTxt + '</span>' +
        expiryChipHTML(item) +
        '</span></div>' +
        '</div>' +
        '<div class="flex gap-2 ' + (low ? 'opacity-100 md:opacity-0 md:group-hover:opacity-100' : 'opacity-0 group-hover:opacity-100') + ' transition-opacity">' +
        '<button class="text-outline hover:text-primary transition-colors" data-ks-action="edit"><span class="material-symbols-outlined text-[20px]">edit</span></button>' +
        '<button class="text-outline hover:text-error transition-colors" data-ks-action="delete"><span class="material-symbols-outlined text-[20px]">delete</span></button>' +
        '</div></div>';
    }

    function listIdFor(cat) {
      if (INV_CATS[cat]) return INV_CATS[cat].listId;
      return 'list-' + String(cat).toLowerCase().replace(/[^a-z0-9]+/g, '-');
    }

    function ensureCatCard(cat) {
      var listId = listIdFor(cat);
      var existing = document.getElementById(listId);
      if (existing) return existing;
      var card = document.createElement('div');
      card.className = 'bg-surface-container-lowest rounded-xl ambient-shadow-card p-6 flex flex-col';
      if (!INV_CATS[cat]) card.setAttribute('data-custom', cat);
      card.innerHTML = '<div class="flex items-center justify-between mb-stack-gap-md border-b border-surface-variant pb-2">' +
        '<h3 class="font-headline-md text-headline-md text-on-surface">' + esc(catLabel(cat)) + '</h3>' +
        '<span class="material-symbols-outlined text-primary">inventory_2</span></div>' +
        '<ul id="' + listId + '" class="flex-1 space-y-stack-gap-sm"></ul>';
      document.getElementById('categories').appendChild(card);
      return document.getElementById(listId);
    }

    function renderInventory() {
      var items = getInventory();
      var cats = [];
      Object.keys(INV_CATS).forEach(function (c) { cats.push(c); });
      items.forEach(function (it) {
        if (cats.indexOf(it.category) === -1) cats.push(it.category);
      });
      cats.forEach(function (cat) {
        var list = ensureCatCard(cat);
        list.innerHTML = '';
        items.filter(function (it) { return it.category === cat; })
          .sort(fifoCompare)
          .forEach(function (it) {
            var li = document.createElement('li');
            li.setAttribute('data-id', it.id);
            li.innerHTML = rowHTML(it);
            li.querySelector('.item-name').textContent = it.name;
            list.appendChild(li);
            bindInventoryRow(li, it);
          });
      });
      var cards = document.querySelectorAll('#categories > div[data-custom]');
      for (var i = 0; i < cards.length; i++) {
        if (!items.some(function (it) { return it.category === cards[i].getAttribute('data-custom'); })) {
          cards[i].remove();
        }
      }
      document.getElementById('total-items').textContent = items.length;
      document.getElementById('low-stock').textContent = items.filter(isLow).length;
      var expSoon = document.getElementById('expiring-soon');
      if (expSoon) expSoon.textContent = items.filter(function (it) { return expiryState(it) === 'expired' || expiryState(it) === 'soon'; }).length;
      runInvHooks();
    }
    /* Post-render extension point: module 23 mounts the pantry-match panel. */
    function runInvHooks() {
      (window.ksInvHooks || []).forEach(function (fn) { try { fn(); } catch (e) {} });
    }

    function bindInventoryRow(li, item) {
      var editBtn = li.querySelector('[data-ks-action="edit"]');
      var delBtn = li.querySelector('[data-ks-action="delete"]');
      if (editBtn) editBtn.addEventListener('click', function () { openInventorySheet(item); });
      if (delBtn) delBtn.addEventListener('click', function () {
        ksInventory.remove(item.id);
        renderInventory();
        ksToast(window.t('removed_item', { name: item.name }));
      });
    }

    function openInventorySheet(item) {
      var host = document.getElementById('ks-item-sheet');
      if (host) host.remove();
      var editing = !!item;
      var unitOpts = UNITS.map(function (u) {
        return '<option value="' + u + '"' + (item && item.unit === u ? ' selected' : '') + '>' + u + '</option>';
      }).join('');
      var catKeys = [];
      Object.keys(INV_CATS).forEach(function (c) { catKeys.push(c); });
      getInventory().forEach(function (it) {
        if (catKeys.indexOf(it.category) === -1) catKeys.push(it.category);
      });
      var catOpts = catKeys.map(function (c) {
        return '<option value="' + esc(c) + '"' + (item && item.category === c ? ' selected' : '') + '>' + esc(catLabel(c)) + '</option>';
      }).join('');
      catOpts += '<option value="__new__">＋ ' + window.t('lbl_new_category') + '…</option>';

      host = document.createElement('div');
      host.id = 'ks-item-sheet';
      host.className = 'fixed inset-0 z-[75]';
      host.innerHTML =
        '<div class="absolute inset-0 bg-inverse-surface/40 backdrop-blur-sm"></div>' +
        '<div class="absolute inset-x-0 bottom-0 mx-auto max-w-lg bg-surface rounded-t-3xl shadow-[0px_-12px_32px_rgba(66,88,66,0.08)] slide-up px-container-margin pt-4 pb-8">' +
        '<div class="flex items-center justify-between mb-5">' +
        '<h2 class="font-headline-md text-headline-md text-on-surface">' + (editing ? window.t('lbl_edit_ingredient') : window.t('lbl_add_ingredient')) + '</h2>' +
        '<button class="text-on-surface-variant hover:text-primary p-2 rounded-full transition-colors" data-ks-close aria-label="' + window.t('lbl_close') + '"><span class="material-symbols-outlined">close</span></button>' +
        '</div>' +
        '<label class="block mb-1 font-label-caps text-label-caps text-on-surface-variant uppercase">' + window.t('lbl_name') + '</label>' +
        '<input id="ks-item-name" class="' + inputCls + '" type="text" value="' + esc(item ? item.name : '') + '" placeholder="' + window.t('lbl_name_ph') + '"/>' +
        '<div class="mt-4 grid grid-cols-[1fr_120px] gap-3">' +
        '<div><label class="block mb-1 font-label-caps text-label-caps text-on-surface-variant uppercase">' + window.t('lbl_quantity') + '</label>' +
        '<input id="ks-item-qty" class="' + inputCls + '" type="number" min="0" step="any" value="' + (item && typeof item.qty === 'number' ? item.qty : '') + '" placeholder="' + window.t('lbl_qty_ph') + '"/></div>' +
        '<div><label class="block mb-1 font-label-caps text-label-caps text-on-surface-variant uppercase">' + window.t('lbl_unit') + '</label>' +
        '<select id="ks-item-unit" class="' + inputCls + '">' + unitOpts + '</select></div>' +
        '</div>' +
        '<label class="block mt-4 mb-1 font-label-caps text-label-caps text-on-surface-variant uppercase">' + window.t('lbl_category') + '</label>' +
        '<select id="ks-item-cat" class="' + inputCls + '">' + catOpts + '</select>' +
        '<div id="ks-item-cat-new-wrap" class="hidden mt-2">' +
        '<input id="ks-item-cat-new" class="' + inputCls + '" type="text" placeholder="' + window.t('lbl_new_cat_ph') + '"/>' +
        '</div>' +
        '<label class="block mt-4 mb-1 font-label-caps text-label-caps text-on-surface-variant uppercase">' + window.t('lbl_low_alert') + '</label>' +
        '<input id="ks-item-min" class="' + inputCls + '" type="number" min="0" step="any" value="' + (item && typeof item.min === 'number' ? item.min : '') + '" placeholder="' + window.t('lbl_qty_ph') + '"/>' +
        '<label class="block mt-4 mb-1 font-label-caps text-label-caps text-on-surface-variant uppercase">' + window.t('lbl_expiry') + '</label>' +
        '<input id="ks-item-exp" class="' + inputCls + '" type="date" value="' + esc(item && item.expires_on ? item.expires_on : '') + '"/>' +
        '<label class="block mt-4 mb-1 font-label-caps text-label-caps text-on-surface-variant uppercase">' + window.t('lbl_price') + ' (₹)</label>' +
        '<input id="ks-item-price" class="' + inputCls + '" type="number" min="0" step="0.01" value="' + (item && typeof item.price === 'number' ? item.price : '') + '" placeholder="' + window.t('lbl_price_ph') + '"/>' +
        '<button class="mt-6 w-full h-14 rounded-full bg-primary text-on-primary font-headline-md text-[18px] flex items-center justify-center hover:opacity-90 active:scale-95 transition-all">' + (editing ? window.t('lbl_save_changes') : window.t('lbl_add_to_inventory')) + '</button>' +
        '</div>';
      document.body.appendChild(host);
      document.body.style.overflow = 'hidden';

      function closeSheet() { host.remove(); document.body.style.overflow = ''; }
      host.querySelector('[data-ks-close]').addEventListener('click', closeSheet);
      host.querySelector('.absolute.inset-0').addEventListener('click', closeSheet);
      var catSel = host.querySelector('#ks-item-cat');
      var catNewWrap = host.querySelector('#ks-item-cat-new-wrap');
      function onCatChange() {
        if (catSel.value === '__new__') catNewWrap.classList.remove('hidden');
        else catNewWrap.classList.add('hidden');
      }
      catSel.addEventListener('change', onCatChange);
      onCatChange();
      host.querySelector('button.w-full.h-14').addEventListener('click', function () {
        var n = document.getElementById('ks-item-name').value.trim();
        var q = parseFloat(document.getElementById('ks-item-qty').value);
        var unit = document.getElementById('ks-item-unit').value;
        var cat = catSel.value;
        var m = parseFloat(document.getElementById('ks-item-min').value);
        if (!n) { ksToast(window.t('toast_item_name')); return; }
        if (isNaN(q) || q < 0) { ksToast(window.t('toast_item_qty')); return; }
        if (cat === '__new__') {
          var nn = document.getElementById('ks-item-cat-new').value.trim();
          if (!nn) { ksToast(window.t('toast_item_cat')); return; }
          cat = nn;
        }
        var data = { name: n, category: cat, qty: q, unit: unit, min: isNaN(m) ? null : m };
        var expInput = document.getElementById('ks-item-exp');
        data.expires_on = expInput ? expInput.value : '';
        var p = parseFloat(document.getElementById('ks-item-price').value);
        data.price = isNaN(p) ? null : p;
        if (editing) {
          data.id = item.id;
          dsStamp(data);
          ksInventory.update(item.id, data);
          renderInventory();
          ksToast(window.t('toast_item_updated'));
        } else {
          ksInventory.add(data);
          renderInventory();
          ksToast(window.t('added_item', { name: n, cat: catLabel(cat) }));
        }
        closeSheet();
      });
    }

    renderInventory();
    if (/[?&]add=1/.test(window.location.search)) {
      setTimeout(function () { openInventorySheet(null); }, 60);
    }
    var fabAdd = document.getElementById('fab-add-ingredient');
    if (fabAdd) fabAdd.addEventListener('click', function () { openInventorySheet(null); });
  }

