/* KitchenShare - pantry_match | module 23/26 | classic script, loads in filename order */
"use strict";
/* §23 Smart Kitchen: AI-style "Pantry-to-Plate" matching.
 * Scores every recipe against the user's inventory with substitution
 * logic, surfaces a "Cook with your kitchen" panel on the inventory page
 * and match badges on feed cards. */

var KS_SUBS = {
  paneer: ['tofu', 'cottage cheese', 'queso'],
  tofu: ['paneer'],
  yogurt: ['curd'],
  curd: ['yogurt'],
  butter: ['ghee', 'margarine', 'oil'],
  ghee: ['butter', 'oil'],
  cream: ['yogurt', 'curd', 'malai'],
  lemon: ['lime'],
  lime: ['lemon'],
  pasta: ['penne', 'macaroni', 'spaghetti', 'fusilli'],
  penne: ['pasta', 'macaroni', 'spaghetti'],
  spaghetti: ['pasta', 'penne'],
  macaroni: ['pasta', 'penne'],
  cilantro: ['coriander', 'parsley'],
  coriander: ['cilantro', 'parsley'],
  scallion: ['spring onion', 'shallot', 'onion'],
  'cherry tomatoes': ['tomato', 'tomatoes'],
  tomatoes: ['tomato', 'crushed tomatoes'],
  tomato: ['crushed tomatoes', 'tomatoes'],
  basmati: ['jasmine rice', 'rice'],
  'jasmine rice': ['basmati', 'rice'],
  stock: ['broth']
};

function ksNormIng(name) {
  return String(name || '').toLowerCase().replace(/[^a-z\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function _ksInvIndex() {
  var idx = {};
  getInventory().forEach(function (it) {
    var n = ksNormIng(it.name);
    if (!n || it.qty <= 0) return;
    var toks = n.split(' ');
    idx[n] = true;
    toks.forEach(function (t) { if (t.length > 2 && !idx['t:' + t]) idx['t:' + t] = n; });
  });
  return idx;
}

/* Returns {have, subs[], missing[], total, pct} for a recipe. */
function ksPantryMatch(recipe) {
  var out = { have: 0, subs: [], missing: [], total: 0, pct: 0 };
  if (!recipe || !recipe.ingredients || !recipe.ingredients.length) return out;
  var idx = _ksInvIndex();
  out.total = recipe.ingredients.length;
  recipe.ingredients.forEach(function (ing) {
    var n = ksNormIng(ing.name);
    if (idx[n] || Array.prototype.some.call(Object.keys(idx), function (k) { return k.charAt(0) !== 't' && (n.indexOf(k) !== -1 || k.indexOf(n) !== -1); })) {
      out.have++;
      return;
    }
    /* token overlap: "garlic cloves" vs inventory "garlic" */
    var toks = n.split(' ');
    var hit = toks.some(function (t) { return t.length > 2 && idx['t:' + t]; });
    if (hit) { out.have++; return; }
    var subHit = null;
    Object.keys(KS_SUBS).forEach(function (key) {
      if (subHit) return;
      if (n === key || toks.indexOf(key) !== -1) {
        for (var i = 0; i < KS_SUBS[key].length; i++) {
          var s = KS_SUBS[key][i];
          if (idx[s] || idx['t:' + s.split(' ')[0]]) { subHit = s; break; }
        }
      }
    });
    if (subHit) out.subs.push({ forName: ing.name, useName: subHit });
    else out.missing.push(ing);
  });
  out.pct = Math.round(((out.have + out.subs.length * 0.5) / out.total) * 100);
  return out;
}

function ksAllKnownRecipes() {
  var seen = {};
  var out = [];
  var hidden = {};
  (typeof hiddenRecipes !== 'undefined' ? hiddenRecipes : []).forEach(function (h) { hidden[h] = true; });
  Object.keys(RECIPES).forEach(function (id) {
    var r = (catalogEdits && catalogEdits[id]) || RECIPES[id];
    if (r && r.name && !hidden[id] && !seen[id]) { seen[id] = true; out.push(r); }
  });
  try {
    var all = listAllUserRecipes();
    Object.keys(all).forEach(function (rid) {
      var r = all[rid].recipe;
      if (r && r.name && !seen[r.id]) { seen[r.id] = true; out.push(r); }
    });
  } catch (e) {}
  return out;
}

function ksCookNowMatches(limit) {
  limit = limit || 5;
  return ksAllKnownRecipes()
    .map(function (r) { return { recipe: r, m: ksPantryMatch(r) }; })
    .filter(function (x) { return x.m.pct >= 30; })
    .sort(function (a, b) { return b.m.pct - a.m.pct || a.m.missing.length - b.m.missing.length; })
    .slice(0, limit);
}

/* ---- Inventory page: mount the Cook-with-your-kitchen panel ---- */
if (document.getElementById('categories')) {
  window.ksInvHooks = window.ksInvHooks || [];
  window.ksInvHooks.push(function () {
    var host = document.getElementById('ks-cooknow-panel');
    if (!host) {
      host = document.createElement('div');
      host.id = 'ks-cooknow-panel';
      host.className = 'bg-surface-container-lowest rounded-xl ambient-shadow-card p-6';
      var anchor = document.getElementById('categories');
      anchor.parentNode.insertBefore(host, anchor);
    }
    var matches = ksCookNowMatches(3);
    var rows = matches.map(function (x) {
      var pctCls = x.m.pct >= 80 ? 'bg-primary text-on-primary'
        : x.m.pct >= 50 ? 'bg-secondary-container text-on-secondary-container'
        : 'bg-surface-container-high text-on-surface';
      var subNote = x.m.subs.length
        ? '<span class="font-label-caps text-label-caps text-on-surface-variant">' + esc(window.t('lbl_substitute_for', { name: x.m.subs[0].forName })) + ': ' + esc(x.m.subs.map(function (s) { return s.useName; }).join(', ')) + '</span>'
        : '';
      return '<a href="recipe-details.html?recipe=' + encodeURIComponent(x.recipe.id) + '" class="flex items-center justify-between gap-3 p-3 rounded-xl hover:bg-surface-container-low transition-colors">' +
        '<div class="min-w-0"><span class="block font-body-md text-body-md text-on-surface truncate">' + esc(x.recipe.name) + '</span>' +
        '<span class="font-label-caps text-label-caps text-on-surface-variant">' + esc(window.t('lbl_missing_short', { n: x.m.missing.length })) + (subNote ? ' · ' : '') + subNote.replace(/<[^>]+>/g, '') + '</span></div>' +
        '<span class="shrink-0 inline-flex items-center h-8 px-3 rounded-full font-label-caps text-label-caps ' + pctCls + '">' + x.m.pct + '%</span>' +
        '</a>';
    }).join('');
    host.innerHTML =
      '<div class="flex items-center justify-between mb-4 border-b border-surface-variant pb-2">' +
      '<h3 class="font-headline-md text-headline-md text-on-surface">' + esc(window.t('lbl_cook_with_kitchen')) + '</h3>' +
      '<span class="material-symbols-outlined text-primary">skillet</span></div>' +
      (rows || '<p class="font-body-md text-body-md text-on-surface-variant">—</p>');
  });
}

/* ---- Feed page: pantry-match badges on catalog/user cards ---- */
(function () {
  var grid = document.getElementById('recipe-grid');
  if (!grid) return;
  function decorate(root) {
    (root || grid).querySelectorAll('article[data-recipe]').forEach(function (card) {
      if (card.querySelector('.ks-match-badge')) return;
      var r = getRecipe(card.getAttribute('data-recipe'));
      if (!r) return;
      var m = ksPantryMatch(r);
      if (m.pct < 40 || !m.total) return;
      var body = card.querySelector('.p-4') || card;
      var chip = document.createElement('span');
      chip.className = 'ks-match-badge mt-1 self-start inline-flex items-center gap-1 px-2 py-1 rounded-full font-label-caps text-label-caps text-[10px] ' +
        (m.pct >= 70 ? 'bg-primary-container text-on-primary-container' : 'bg-secondary-container/60 text-on-secondary-container');
      chip.innerHTML = '<span class="material-symbols-outlined text-[12px]">skillet</span>' + esc(window.t('lbl_match_pct', { pct: m.pct }));
      body.appendChild(chip);
    });
  }
  decorate();
  new MutationObserver(function () { decorate(); }).observe(grid, { childList: true, subtree: false });
})();
