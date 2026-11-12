/* KitchenShare - inventory_media | module 12/22 | classic script, loads in filename order */
"use strict";
  var UNITS = ['ml', 'l', 'g', 'kg', 'pcs', 'filet', 'bunch', 'pack', 'block', 'cup', 'tbsp', 'tsp'];
  var UNIT_MULT = { ml: 1, l: 1000, g: 1, kg: 1000 };

  function toBase(qty, unit) { return (unit in UNIT_MULT) ? qty * UNIT_MULT[unit] : qty; }
  function fromBase(base, unit) { return (unit in UNIT_MULT) ? base / UNIT_MULT[unit] : base; }
  function sameDimension(a, b) {
    var inA = a in UNIT_MULT, inB = b in UNIT_MULT;
    if (!inA && !inB) return true;
    if (inA !== inB) return false;
    return (a === 'ml' || a === 'l') === (b === 'ml' || b === 'l');
  }
  function roundNum(n) { return Math.round(n * 1000) / 1000; }

  function iconFor(item) {
    return 'inventory_2';
  }

  var SEED_INVENTORY = [
    { id: 'seed-01', name: 'Eggs', category: 'fridge', qty: 12, unit: 'pcs', min: null, expires_on: '+9' },
    { id: 'seed-02', name: 'Milk', category: 'fridge', qty: 750, unit: 'ml', min: 1000, expires_on: '+2' },
    { id: 'seed-03', name: 'Salmon', category: 'fridge', qty: 1, unit: 'filet', min: 2, expires_on: '+1' },
    { id: 'seed-04', name: 'Parmesan Cheese', category: 'fridge', qty: 100, unit: 'g', min: null },
    { id: 'seed-05', name: 'Fresh Basil', category: 'fridge', qty: 25, unit: 'g', min: 50 },
    { id: 'seed-06', name: 'Garlic Cloves', category: 'fridge', qty: 5, unit: 'pcs', min: null },
    { id: 'seed-07', name: 'Penne Pasta', category: 'pantry', qty: 500, unit: 'g', min: 200 },
    { id: 'seed-08', name: 'Crushed Tomatoes', category: 'pantry', qty: 400, unit: 'g', min: null },
    { id: 'seed-09', name: 'Jasmine Rice', category: 'pantry', qty: 2, unit: 'kg', min: null },
    { id: 'seed-10', name: 'Whole Wheat Flour', category: 'pantry', qty: 500, unit: 'g', min: null },
    { id: 'seed-11', name: 'Olive Oil', category: 'pantry', qty: 500, unit: 'ml', min: null },
    { id: 'seed-12', name: 'Canned Chickpeas', category: 'pantry', qty: 400, unit: 'g', min: null },
    { id: 'seed-13', name: 'Granulated Sugar', category: 'pantry', qty: 1, unit: 'kg', min: null },
    { id: 'seed-14', name: 'Rolled Oats', category: 'pantry', qty: 1, unit: 'kg', min: null },
    { id: 'seed-15', name: 'Cumin', category: 'spices', qty: 120, unit: 'g', min: null },
    { id: 'seed-16', name: 'Smoked Paprika', category: 'spices', qty: 60, unit: 'g', min: null },
    { id: 'seed-17', name: 'Dried Oregano', category: 'spices', qty: 40, unit: 'g', min: null },
    { id: 'seed-18', name: 'Sea Salt', category: 'spices', qty: 250, unit: 'g', min: null }
  ];
  /* Seed offsets like '+2' become concrete YYYY-MM-DD dates on first load so
   * the FIFO sort + expiry badges have real data to work with. */
  function resolveSeedExpiry(items) {
    var day = 24 * 60 * 60 * 1000;
    var today = new Date(); today.setHours(12, 0, 0, 0);
    return items.map(function (it) {
      if (it.expires_on && it.expires_on.charAt(0) === '+') {
        var d = new Date(today.getTime() + parseInt(it.expires_on.slice(1), 10) * day);
        it.expires_on = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      }
      return it;
    });
  }

  /* ---- Expiry / FIFO helpers (§23 Food Waste & Expiry Tracking) ---- */
  function itemDaysLeft(it) {
    if (!it || !it.expires_on) return null;
    var t = new Date(it.expires_on + 'T00:00:00');
    if (isNaN(t.getTime())) return null;
    var today = new Date(); today.setHours(0, 0, 0, 0);
    return Math.round((t.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
  }
  function expiryState(it) {
    var d = itemDaysLeft(it);
    if (d === null) return 'none';
    if (d < 0) return 'expired';
    if (d <= 2) return 'soon';
    if (d <= 7) return 'week';
    return 'fresh';
  }
  function fifoCompare(a, b) {
    var da = itemDaysLeft(a), db = itemDaysLeft(b);
    if (da === null && db === null) return String(a.name).localeCompare(String(b.name));
    if (da === null) return 1;
    if (db === null) return -1;
    return da - db;
  }

  var inventory = null;
  function getInventory() {
    if (inventory) return inventory;
    var uid = currentUserId();
    var data = getUserData(uid, 'inventory', null);
    if (!data || !data.length) {
      data = resolveSeedExpiry(JSON.parse(JSON.stringify(SEED_INVENTORY)));
      setUserData(uid, 'inventory', data);
    }
    inventory = data.map(function (it) {
      var q = parseFloat(it.qty);
      var p = parseFloat(it.price);
      return {
        id: it.id || uid(),
        name: String(it.name || '').trim(),
        category: it.category || 'pantry',
        qty: isNaN(q) ? 0 : q,
        unit: it.unit || 'pcs',
        min: typeof it.min === 'number' ? it.min : null,
        expires_on: it.expires_on ? String(it.expires_on) : '',
        price: isNaN(p) ? null : p,
        _ua: it._ua || 0
      };
    });
    DS.kitchen.load();
    return inventory;
  }
  function saveInventory() { setUserData(currentUserId(), 'inventory', inventory); dsCoalesce('kitchen', function () { DS.kitchen.saveAll(inventory || []); }); }

  function findItem(name) {
    var n = norm(name);
    return getInventory().filter(function (it) { return norm(it.name) === n; });
  }

  function matchIngredient(name, unit) {
    var matches = findItem(name);
    var target = null;
    for (var i = 0; i < matches.length; i++) {
      if (matches[i].unit === unit) { target = matches[i]; break; }
      if (target === null && sameDimension(matches[i].unit, unit)) target = matches[i];
    }
    if (!target && matches.length) target = matches[0];
    return target;
  }

  function isLow(item) { return typeof item.min === 'number' && item.qty < item.min; }
  function formatQty(item) {
    if (typeof item.qty !== 'number') return String(item.qty || '—');
    return roundNum(item.qty) + ' ' + (item.unit || 'pcs');
  }

  function photoOf(uid) {
    if (!uid) return '';
    try {
      var u = getUserById(uid);
      if (u && u.photo) return String(u.photo);
      var p = getUserData(uid, 'profile', null);
      if (p && p.photo) return String(p.photo);
    } catch (e) {}
    return '';
  }

  function initialsOf(name) {
    return String(name || '?').split(/\s+/).map(function (w) { return w.charAt(0); }).slice(0, 2).join('').toUpperCase();
  }

  function avatarHTML(uid, name, cls) {
    var ph = photoOf(uid);
    if (ph) {
      return '<span class="' + cls + ' overflow-hidden"><img alt="" class="w-full h-full object-cover" src="' + esc(ph) + '"/></span>';
    }
    return '<span class="' + cls + '">' + esc(initialsOf(name)) + '</span>';
  }

  function photoList(recipe) {
    if (!recipe) return [];
    var arr = (recipe.photos && recipe.photos.length) ? recipe.photos.slice() : (recipe.img ? [recipe.img] : []);
    return arr.filter(function (s) { return s && String(s).trim(); });
  }

  function videoOf(recipe) {
    if (!recipe) return '';
    var v = recipe.video || '';
    return v && String(v).trim() ? String(v).trim() : '';
  }

  function videoThumbOf(recipe) {
    if (!recipe) return '';
    var v = recipe.videoThumb || '';
    return v && String(v).trim() ? String(v).trim() : '';
  }

  function isVideoUrl(url) {
    if (!url) return false;
    return /\.(mp4|webm|mov|ogv)(\?|$)/i.test(url) || url.indexOf('uploads/videos/') !== -1;
  }

  var photoTimer = null;
  var photoIdx = 0;
  function setPhotoShown(wrap, dots, i) {
    if (!wrap) return;
    wrap.querySelectorAll('img').forEach(function (im, k) {
      im.classList.toggle('opacity-0', k !== i);
      im.classList.toggle('opacity-100', k === i);
    });
    if (!dots) return;
    dots.querySelectorAll('button').forEach(function (b, k) {
      b.classList.toggle('bg-white/40', k !== i);
      b.classList.toggle('bg-white', k === i);
    });
  }
  function startPhotoRotate(phs, wrap, dots) {
    stopPhotoRotate();
    photoIdx = 0;
    setPhotoShown(wrap, dots, 0);
    photoTimer = window.setInterval(function () {
      photoIdx = (photoIdx + 1) % phs.length;
      setPhotoShown(wrap, dots, photoIdx);
    }, 3000);
  }
  function stopPhotoRotate() {
    if (photoTimer) { window.clearInterval(photoTimer); photoTimer = null; }
  }

