/* KitchenShare - diet_safety | module 24/26 | classic script, loads in filename order */
"use strict";
/* §23 Allergen & Dietary Safety: strict diet-tag filtering (Vegan,
 * Vegetarian, Gluten-free, Nut-free, Halal, Jain), editor tag chips and
 * cross-contamination warnings derived from ingredient keyword scanning. */

var KS_DIETS = ['vegan', 'vegetarian', 'gluten-free', 'nut-free', 'halal', 'jain'];
var KS_DIET_LABEL_KEYS = {
  'vegan': 'diet_vegan',
  'vegetarian': 'diet_vegetarian',
  'gluten-free': 'diet_glutenfree',
  'nut-free': 'diet_nutfree',
  'halal': 'diet_halal',
  'jain': 'diet_jain'
};
var KS_ALLERGENS = [
  { key: 'allergen_nuts', words: ['peanut', 'peanuts', 'almond', 'almonds', 'cashew', 'cashews', 'walnut', 'walnuts', 'pistachio', 'hazelnut', 'pecan'] },
  { key: 'allergen_dairy', words: ['milk', 'butter', 'cheese', 'parmesan', 'paneer', 'yogurt', 'curd', 'cream', 'ghee', 'mozzarella'] },
  { key: 'allergen_gluten', words: ['wheat', 'flour', 'maida', 'bread', 'pasta', 'penne', 'spaghetti', 'macaroni', 'noodle', 'noodles', 'oats', 'barley', 'semolina', 'sooji'] },
  { key: 'allergen_eggs', words: ['egg', 'eggs'] },
  { key: 'allergen_seafood', words: ['fish', 'salmon', 'tuna', 'shrimp', 'prawn', 'prawns', 'anchovy', 'crab', 'lobster'] },
  { key: 'allergen_soy', words: ['tofu', 'soy', 'soya', 'edamame', 'miso'] }
];

function ksRecipeDiet(r) {
  if (!r) return [];
  if (Array.isArray(r.diet) && r.diet.length) return r.diet.slice();
  /* Fallback for catalog recipes without explicit tags: infer from the
   * category tokens so filtering works on day one. */
  var cats = String(r.cat || '').toLowerCase();
  var out = [];
  if (/\bvegan\b/.test(cats)) { out.push('vegan'); out.push('vegetarian'); }
  return out;
}

function ksAllergensOf(r) {
  var found = [];
  if (!r || !r.ingredients) return found;
  KS_ALLERGENS.forEach(function (a) {
    var hit = r.ingredients.some(function (ing) {
      var n = ksNormIng(ing.name);
      return a.words.some(function (w) { return n.indexOf(w) !== -1; });
    });
    if (hit) found.push(a.key);
  });
  return found;
}

/* ---- Recipe editor chips (called from module 16 at open/save time) ---- */
window.ksDietChipsInit = function (host, existing) {
  var box = host.querySelector('#ks-diet-chips');
  if (!box) return;
  var selected = ksRecipeDiet(existing);
  function chipHTML(tag) {
    var on = selected.indexOf(tag) !== -1;
    return '<button type="button" data-diet="' + tag + '" class="ks-diet-chip inline-flex items-center h-9 px-4 rounded-full font-label-caps text-label-caps transition-colors ' +
      (on ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface hover:bg-secondary-container') + '">' + esc(window.t(KS_DIET_LABEL_KEYS[tag])) + '</button>';
  }
  box.innerHTML = KS_DIETS.map(chipHTML).join('');
  box.addEventListener('click', function (e) {
    var btn = e.target.closest('.ks-diet-chip');
    if (!btn) return;
    var tag = btn.getAttribute('data-diet');
    var on = btn.classList.toggle('bg-primary');
    btn.classList.toggle('text-on-primary', on);
    btn.classList.toggle('bg-surface-container-high', !on);
    btn.classList.toggle('text-on-surface', !on);
    btn.classList.toggle('hover:bg-secondary-container', !on);
  });
};
window.ksDietCollect = function (host) {
  var box = host.querySelector('#ks-diet-chips');
  if (!box) return [];
  var out = [];
  box.querySelectorAll('.ks-diet-chip.bg-primary').forEach(function (b) { out.push(b.getAttribute('data-diet')); });
  return out;
};

/* ---- Feed page: strict diet filter pills ---- */
(function () {
  var grid = document.getElementById('recipe-grid');
  var catHost = document.getElementById('category-pills');
  if (!grid || !catHost || document.getElementById('diet-pills')) return;

  function activeDiet() {
    var el = document.querySelector('#diet-pills .ks-diet-pill[data-on="1"]');
    return el ? el.getAttribute('data-diet') : '';
  }
  function applyDietFilter() {
    var diet = activeDiet();
    grid.querySelectorAll('article[data-recipe]').forEach(function (card) {
      if (!diet) return;
      var r = getRecipe(card.getAttribute('data-recipe'));
      var tags = ksRecipeDiet(r);
      var ok = tags.indexOf(diet) !== -1;
      card.classList.toggle('hidden', !ok);
    });
    if (!diet) {
      /* restore default visibility by re-clicking nothing: show all */
      grid.querySelectorAll('article').forEach(function (card) { card.classList.remove('hidden'); });
    }
  }
  var row = document.createElement('div');
  row.id = 'diet-pills';
  row.className = 'flex gap-2 overflow-x-auto py-2 snap-x';
  var html = KS_DIETS.map(function (d) {
    return '<button data-diet="' + d + '" class="ks-diet-pill shrink-0 h-8 px-3 rounded-full bg-surface-container-high text-on-surface font-label-caps text-label-caps flex items-center hover:bg-secondary-container transition-colors whitespace-nowrap">' + esc(window.t(KS_DIET_LABEL_KEYS[d])) + '</button>';
  }).join('');
  row.innerHTML = html;
  catHost.parentNode.insertBefore(row, catHost.nextSibling);
  row.addEventListener('click', function (e) {
    var pill = e.target.closest('.ks-diet-pill');
    if (!pill) return;
    var wasOn = pill.getAttribute('data-on') === '1';
    row.querySelectorAll('.ks-diet-pill').forEach(function (p) {
      p.setAttribute('data-on', '0');
      p.classList.remove('bg-primary', 'text-on-primary');
      p.classList.add('bg-surface-container-high', 'text-on-surface', 'hover:bg-secondary-container');
    });
    if (!wasOn) {
      pill.setAttribute('data-on', '1');
      pill.classList.add('bg-primary', 'text-on-primary');
      pill.classList.remove('bg-surface-container-high', 'text-on-surface', 'hover:bg-secondary-container');
    } else {
      pill.setAttribute('data-on', '0');
    }
    applyDietFilter();
  });

  /* Re-assert after any feed re-render (activity feed inserts cards async). */
  new MutationObserver(function () { applyDietFilter(); }).observe(grid, { childList: true });
})();

/* ---- Recipe Details: allergen warning + diet badges ---- */
(function () {
  var stepsEl = document.getElementById('rd-steps');
  if (!stepsEl) return;
  var m = window.location.search.match(/[?&]recipe=([^&]+)/);
  var rid = m && m[1] ? decodeURIComponent(m[1]) : '';
  var recipe = getRecipe(rid);
  if (!recipe) return;

  var allergens = ksAllergensOf(recipe);
  if (allergens.length) {
    var warn = document.createElement('div');
    warn.id = 'ks-allergen-warn';
    warn.className = 'flex items-start gap-2 font-body-md text-body-md text-on-surface bg-tertiary-container/40 border border-tertiary/30 rounded-xl p-4 mb-4';
    warn.innerHTML = '<span class="material-symbols-outlined text-[20px] text-tertiary">warning</span>' +
      '<span><strong>' + esc(window.t('lbl_allergens')) + ':</strong> ' +
      allergens.map(function (k) { return esc(window.t(k)); }).join(', ') +
      '. <span class="text-on-surface-variant">' + esc(window.t('lbl_cross_contam')) + '</span></span>';
    stepsEl.parentNode.insertBefore(warn, stepsEl);
  }

  var tags = ksRecipeDiet(recipe);
  if (tags.length) {
    var host = document.createElement('div');
    host.id = 'ks-diet-badges';
    host.className = 'flex flex-wrap gap-2 mt-2';
    host.innerHTML = tags.map(function (t) {
      return '<span class="inline-flex items-center h-7 px-3 rounded-full bg-primary-container text-on-primary-container font-label-caps text-label-caps">' + esc(window.t(KS_DIET_LABEL_KEYS[t] || t)) + '</span>';
    }).join('');
    var tagEl = document.getElementById('rd-tag');
    if (tagEl && tagEl.parentNode) tagEl.parentNode.appendChild(host);
  }
})();
