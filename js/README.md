# js/ — KitchenShare client modules

The former 4,770-line monolithic `app.js` is now **26 standalone script files**,
loaded by every page in filename order (01 → 26). There is no build step and no
`app.js` anymore — edit a module, save, hard-refresh (Ctrl+F5). Modules 23–26
implement the §23 roadmap (pantry match, diet/allergen safety, cook mode,
PWA offline).

## How the split works

All modules were one IIFE closure. The wrapper was removed: top-level
`function`/`var` declarations are now real globals shared across files, exactly
mirroring the old closure semantics while scripts execute sequentially in tag
order. Each file starts with `"use strict";`. A forward-reference scan verified
no load-time statement calls a symbol defined in a later module (runtime calls
are unaffected).

## Modules (load order)

| # | File | Contents |
|---|------|----------|
| 01 | ui_shell | Nav model, drawer/notification/toast markup injection, login+signup+forgot handlers, ksToast, drawer renderers, layer open/close, follow/like/bookmark bindings, edit-profile sheet |
| 02 | store_users | DB_KEYS localStorage schema, lsGet/lsSet, seeded users, password migration |
| 03 | api_social | serverApi + serverStatus, image upload/delete, social* API wrappers |
| 04 | ds_coalesce | dsCoalesce push scheduler, DS adapters (kitchen/shop/recipes/posts) |
| 05 | sync_badge_seed | Sync badge UI, unread poll, demo seeding/migration helpers |
| 06 | auth_session | session state, currentUserId/currentUser, per-user keys, switchUser, local login/signup/logout |
| 07 | notifications_follows | notification store, follow system |
| 08 | achievements | KS_ACHIEVEMENTS catalog, streaks, evaluateAchievements |
| 09 | celebration_admin | badge celebration queue, admin controls |
| 10 | comments_content | comments CRUD, ingredient autocomplete, shared content helpers |
| 11 | user_data_time | loadUserData, reset-demo, esc/uid/norm, date-time formatting |
| 12 | inventory_media | units conversion, inventory store+matchers, avatars, photo rotation |
| 13 | profile_bookmarks_stats | profile save/sync-name, bookmarks, cook log, profile stats |
| 14 | my_recipes_sync | myRecipes/posts state, syncPush*/syncPull/syncPushAll |
| 15 | catalog_cook_shopping | RECIPES catalog ops, cook(), shopping core + addToShopping |
| 16 | recipe_editor_feed | recipe editor sheet, refreshFeed, drag-drop photos |
| 17 | inventory_page | My Kitchen page logic |
| 18 | recipe_details | Recipe Details page logic |
| 19 | feed_page | Feed grid, activity feed, likes, comments, cards, search bindings |
| 20 | shopping_page | Shopping suggestions + Shopping List page logic |
| 21 | admin_people_board | Admin / People / Leaderboard pages |
| 22 | profile_privacy_boot | Unified profile, achievements grid, export/delete, universal server-sync boot tail |
| 23 | pantry_match | Pantry-to-plate matching (ksPantryMatch/ksCookNowMatches), substitution map KS_SUBS, "Cook with your kitchen" panel via ksInvHooks, feed match badges |
| 24 | diet_safety | Diet vocabulary KS_DIETS, allergen scan ksAllergensOf, editor diet chips (ksDietChipsInit/ksDietCollect), feed #diet-pills filter, details allergen warning + diet badges |
| 25 | cook_mode | Portion scaling stepper + applyScaling, step timers (parseDuration, beepTimesUp, vibrate), Cooking Mode Screen Wake Lock toggle |
| 26 | pwa_offline | manifest link injection, service-worker registration, online/offline toasts |

## Rules for future edits

- **Load order matters.** Later files may call earlier files' globals; never
  add load-time (top-level) code in file N that calls symbols first defined in
  file >N — wrap it in an event handler or move it to a later module.
- New pages must include all 26 tags plus `<link rel="manifest" href="manifest.webmanifest"/>`.
- Editing any module's markup/classes requires bumping the SW cache name
  (`KS_CACHE` in `sw.js`) and regenerating `tailwind.css`
  (`python %TEMP%\opencode\ks_gen_tailwind.py`).
- Server serves `js/*` gzipped with `Cache-Control: max-age=3600`; use Ctrl+F5
  while developing.
