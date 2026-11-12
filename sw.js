/* KitchenShare service worker - precache shell, SWR static, network-first API. */
var KS_CACHE = 'ks-v2';
var KS_ASSETS = [
  'index.html', 'recipe-details.html', 'my-kitchen-inventory.html',
  'shopping-list.html', 'user-profile.html', 'people.html', 'leaderboard.html',
  'login.html', 'signup.html', 'admin.html', 'profile-share-sheet.html',
  'budget-dashboard.html',
  'styles.css', 'tailwind.css', 'tailwind.config.js', 'i18n.js', 'nutrients.js', 'manifest.webmanifest'
];
var KS_JS = [
  'js/01_ui_shell.js', 'js/02_store_users.js', 'js/03_api_social.js',
  'js/04_ds_coalesce.js', 'js/05_sync_badge_seed.js', 'js/06_auth_session.js',
  'js/07_notifications_follows.js', 'js/08_achievements.js',
  'js/09_celebration_admin.js', 'js/10_comments_content.js',
  'js/11_user_data_time.js', 'js/12_inventory_media.js',
  'js/13_profile_bookmarks_stats.js', 'js/14_my_recipes_sync.js',
  'js/15_catalog_cook_shopping.js', 'js/16_recipe_editor_feed.js',
  'js/17_inventory_page.js', 'js/18_recipe_details.js', 'js/19_feed_page.js',
  'js/20_shopping_page.js', 'js/21_admin_people_board.js',
  'js/22_profile_privacy_boot.js', 'js/23_pantry_match.js',
  'js/24_diet_safety.js', 'js/25_cook_mode.js', 'js/26_pwa_offline.js',
  'js/27_budget_dashboard.js', 'js/28_groups.js'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(KS_CACHE).then(function (c) {
      return c.addAll(KS_ASSETS.concat(KS_JS));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== KS_CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== location.origin) return;

  /* API GETs: network-first, fall back to last cached JSON */
  if (url.pathname.indexOf('/api/') !== -1) {
    e.respondWith(
      fetch(req).then(function (res) {
        var clone = res.clone();
        caches.open(KS_CACHE).then(function (c) { c.put(req, clone); });
        return res;
      }).catch(function () { return caches.match(req); })
    );
    return;
  }

  /* Static: stale-while-revalidate */
  e.respondWith(
    caches.match(req).then(function (cached) {
      var refresh = fetch(req).then(function (res) {
        if (res && res.ok) {
          var clone = res.clone();
          caches.open(KS_CACHE).then(function (c) { c.put(req, clone); });
        }
        return res;
      }).catch(function () { return cached; });
      return cached || refresh;
    })
  );
});
