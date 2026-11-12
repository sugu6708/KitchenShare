# KitchenShare — Manual QA Checklist (Phase 9)

> Use this checklist before every release. Check every page × every role × every device size.
> Mark `[x]` when verified on real device, `[~]` when only in emulation, `[ ]` when not tested.
> All data is in a known state after `python seed.py`.

## 0) Preconditions

- [ ] Server running: `python server.py 8124` (or `python server.py 8124 0.0.0.0` for LAN) — prints `Shared directory` and LAN URLs
- [ ] Seed applied: `python seed.py` (or `python seed.py --verify` to inspect)
- [ ] Browser hard-refresh: `Ctrl+F5` / clear `localStorage` if needed
- [ ] Base URL: `http://127.0.0.1:8124/index.html` (desktop) and `http://<LAN-IP>:8124/index.html` (phone, see `python lan_test.py`)

## 1) Device Matrix

| Device | Width | How to test | Notes |
|--------|-------|-------------|-------|
| Mobile Small | 320–375px | Chrome DevTools iPhone SE / real phone | Bottom nav visible, drawer, safe-area |
| Mobile Large | 390–430px | iPhone 14 / Pixel 7 emulation | Same |
| Tablet | 768–820px | iPad Mini emulation | Drawer + inline nav |
| Desktop | 1280px | Chrome windowed | Desktop nav in header, max-width containers |
| Desktop XL | 1440px+ | Fullscreen | No horizontal scroll, shadows |

Repeat every page row below on at least **mobile real device (LAN)** + **desktop**.

## 2) Role Matrix

| Role | How to get | Permissions |
|------|------------|-------------|
| Guest (not logged in, but app auto-defaults to `u-sugu` — test by clearing `kitchenshare.session` and hard-refresh; server `GET /api/me` will 401) | Clear session or open incognito without tapping a quick-login | Can view feed/recipe/people/leaderboard, cannot post/like/follow/cook |
| User (`swetha`/`viji`/`saravana`) | Tap quick-login on `login.html` | All user actions, cannot see Admin panel or Reset demo |
| Admin (`sugu`) | Tap `sugu ADMIN` on `login.html` | Plus Admin panel, Reset demo, suspend/role, delete any recipe/post, see audit log |

## 3) Page Checklists

### 3.1 Feed — `index.html`

- [ ] Catalog cards render (14) + user recipes + community posts prepended
- [ ] Search filters cards live (case-insensitive)
- [ ] Category pills build from `allCatTokens()` — new recipe category appears as pill without refresh (`__ksRebuildPills`)
- [ ] "For You" ranking reorders catalog when `cat==all` and search empty; user cards stay pinned
- [ ] Bookmark toggles (filled vs outline) + toast + persists to `bookmarks` (titles)
- [ ] Owner line: user/community cards show author `person` icon, catalog cards show "by KitchenShare"
- [ ] Card click → `recipe-details.html?recipe=<id>` except on bookmark/follow/edit
- [ ] FAB → Create sheet (New Recipe / Scan Ingredients / New Post) opens and each action navigates correctly
- [ ] New Post: empty → toast "write something", valid → appears at top of feed, `posts-save` to server (check Network)
- [ ] New Recipe: required fields (name, 1 ingredient) → validation toasts, save → appears in feed, category pill appears
- [ ] Image in recipe card shows first photo when `photos[]` present, fallback gradient/icon when not
- [ ] Like (post): heart toggles `favorite`/`favorite_border` red when liked, count updates, batch load on render
- [ ] Comment count on post matches inline comment list length
- [ ] Follow button on post: "Follow" ↔ "Following" live, `toggleFollow` + notification to target
- [ ] Sync badge: `Synced` vs `Offline` click shows toast with reload prompt when offline

Guest: [ ] Like/Follow/Post buttons prompt or are disabled
User:  [ ] All above
Admin: [ ] Same + can see admin-only drawer link

### 3.2 Recipe Details — `recipe-details.html`

- [ ] `?recipe=seed-r1` resolves via `getRecipe` order (myRecipes → any user's myrecipes → hidden → catalogEdits → RECIPES → fallback)
- [ ] Hero slideshow: 0 photo → gradient placeholder, 1 photo → single img, 2+ photos → dots + auto-rotate 3s + tap advances
- [ ] Ingredients: `check` (ok), red `close`+Low, outline `close`+Missing; status bar "Missing N" vs hidden when ok
- [ ] Plan rows: qty inputs `plan-qty-*`, `#plan-add-all` adds each ingredient to shopping with `group=recipe name` → goto shopping list
- [ ] Nutrition card: shows kcal/protein/fat/fiber when `ksNutrition` coverage >0, else hidden; label "X of Y ingredients · Z% coverage"
- [ ] Cook: missing/low → sheet warning + `#cook-add-missing` adds to shopping and navigates to shopping; `#cook-now` → `cook()` deducts inventory, `recordCook` appends `cooked` log, navigates to feed
- [ ] Comments: list shows avatar + time + delete (only author/admin) + like with count; login prompt when logged out; post trims, truncates 500, toasts

### 3.3 My Kitchen — `my-kitchen-inventory.html`

- [ ] Categories: fridge/pantry/spices (+ custom via "+ New category…") render as cards
- [ ] Seed: sugu 7 items, others 3; `qty`/`unit`/`min` normalized, counters `#total-items` / `#low-stock`
- [ ] Row: low → `bg-error-container/20` + red pill, out-of-stock when `qty<0`, hover shows edit/delete
- [ ] Add sheet: `?add=1` auto-opens; fields name/qty/unit/category/min; save → appears in correct category
- [ ] Low-stock min validation, `formatQty` with `toBase`/`fromBase` unit conversion
- [ ] Edit/delete persist via `saveInventory` → `DS.kitchen.saveAll` (Network `kitchen-save-all`)

### 3.4 Shopping — `shopping-list.html`

- [ ] Grouped by `group` (Other fallback), rows with 24×24 `kitchen-checkbox`, name, qty/unit button → edit sheet, group chip
- [ ] Done toggle: `ksShopping.toggle` updates `done` + `list-item-checked` pressed style + progress "X of Y"
 - [ ] Add: `#shop-open-add` button opens sheet (name/category/qty/unit); edit sheet updates same row
- [ ] `clearCompleted` → for each done: `addPurchasedToInventory` merges by name+dimension else adds pantry, removes from shopping
- [ ] Progress and counts update, `saveShopping` → `DS.shopping.saveAll`

### 3.5 People — `people.html`

- [ ] `#ks-people-following` vs `#ks-people-all` (excludes self)
- [ ] Rows link to `user-profile.html?uid=<id>`; avatar via `avatarHTML`, follower count via `followerCount`
- [ ] Follow button live updates; pending users show pending pill not button
- [ ] Search? Not implemented — verify no break

### 3.6 Login — `login.html`

- [ ] `#ks-quick-logins` lists 4 active users (admin badge for sugu), no email/password inputs, no signup tabs visible
- [ ] Tap sugu → `switchUser` + toast `signed_in_as` + `index.html` with `currentUserId()==u-sugu`
- [ ] Tap swetha as different user → independent session (test with two Chrome profiles 9222/9223)
- [ ] Signup flow (legacy `signup.html` still serves old users): create pending → admin pending list shows it → approve → generated password → login works → decline removes user

### 3.7 Admin — `admin.html`

- [ ] Gate: non-admin sees `#ks-admin-gate` not authorized, admin sees `#ks-admin-members/#ks-admin-recipes/#ks-admin-posts`
- [ ] Members: Promote/Demote (`setRole`), Remove (self shows "You"), suspend → status suspended + audit log entry
- [ ] Recipes: user recipes Remove (deletes from owner's `myrecipes`), catalog Hide (`hiddenRecipes` + `server_content.json` not applicable), Edit button opens `openRecipeEditor` with catalog override (`catalogEdits`)
- [ ] Posts: Remove deletes via `removePost` + server `posts-delete`
- [ ] Audit log: `admin_audit.log` entries visible via `POST /api/audit-log` (future admin UI)

### 3.8 Profile — `user-profile.html`

- [ ] Self vs `?uid=` other-user: posts/cooked-today/recipes filtered by `viewUid`, edit button + share-sheet link hidden when `?uid`≠self
- [ ] Stats dynamic: cooked (`#ps-cooked` from `cooked.length`), saved kg (`#ps-saved`), likes (`#ps-likes` sum of comment likes authored), streak (`#ps-streak` consecutive days), followers/following from `following` arrays, weekly activity bars 7 days, favorites from `bookmarks` via `findRecipeIdByTitle`, empty states (0, empty chart, favorites empty)
- [ ] Followers/Following counts clickable → sheet listing via `socialFollowers`/`socialFollowing`
- [ ] Achievements grid `#achievements-grid` 15 badges via `profileBadgeHTML` (earned colored, locked grayscale + lock), counter `#achievements-count` `n/15`, celebration modal `queueCelebration` on new unlock + toast + notification
- [ ] Leaderboard link in drawer MORE, profile share sheet copy/message/whatsapp
- [ ] **Data & Privacy** card (only self): Export my data → downloads `kitchenshare-export-<uid>-YYYY-MM-DD.json` (augments server export with local bookmarks/cooked/saved), Delete my account + data → modal requiring exact username, calls `delete-my-account`, clears `kitchenshare.u.<uid>.*` and `kitchenshare.session`, redirects to `login.html`
- [ ] Photo picker: Add photo via `ksUploadImage` (or FileReader fallback), preview, Remove photo reverts to `data-default` portrait, drawer/feed/comments avatars update via `avatarHTML`

### 3.9 Leaderboard — `leaderboard.html`

- [ ] Tabs Recipes/Followers/Streaks switch `lbTab` and re-render + update heading `lb_most_recipes/most_followed/best_streaks`
- [ ] Rows: rank 1-3 `military_tech` gold/silver/bronze, others numeric, avatar, name + ADMIN tag, metric (recipes/followers or streak `days`)
- [ ] Server merge: `POST /api/leaderboard` `byRecipes`/`byFollowers` max vs local `computeAchStats` for each non-pending user; streaks local-only
- [ ] Row click → `user-profile.html?uid=<id>`

### 3.10 Backup / Restore / Export / Delete (Phase 8)

- [ ] `python backup.py --dry-run` prints would-copy without writing
- [ ] `python backup.py` creates `backups/daily/YYYY-MM-DD_HHMMSS/` with `kitchen_data.db` (hot backup, integrity ok), `server_users.json`, `server_content.json`, `uploads/` (8 files), `manifest.json` with sha256; daily rotation keeps 7
- [ ] `python backup.py --weekly` promotes to `backups/weekly/YYYY-MM-DD/` and prunes weekly keep 4
- [ ] `python restore.py --list` lists daily/weekly with mtime + manifest flag
- [ ] `python restore.py --latest --dry-run --force` previews restore without writing
- [ ] `python restore.py --latest` with server stopped creates `backups/pre-restore-*/` safety copy and restores DB+JSON+uploads, `PRAGMA integrity_check` ok
- [ ] Export: `POST /api/export-my-data` as logged-in user returns `ok` with `kitchenItems`/`recipes`/`posts`/`achievements` etc.; client fallback builds same from `localStorage` when offline
- [ ] Delete: `POST /api/delete-my-account` with wrong confirm → error `Confirmation does not match`; with correct `confirm==username` → deletes likes/follows/notifications/achievements/comments/posts/recipes/kitchen/shopping/profile + uploads + `server_users.json` entry + sessions; last admin guard blocks sugu deletion

## 4) Flows (E2E)

- [ ] **Seed** → `python seed.py` → counts: users 4, profiles 4, kitchen 7+3, shopping 2, recipes 2, posts 2, comments 1, follows 3, likes 1, notifications 1, integrity ok, uploads cleared/thumbs recreated
- [ ] **Auth flow** → signup A pending → login blocked pending → admin approve A → login A with generated password → logout → decline B → login B fails (No account)
- [ ] **Image flow** → upload PNG → thumbs exist → GET uploads/<file> 200 → delete-image → file removed
- [ ] **Social flow** → A creates post → admin likes → like-status true count 1 → like-batch true → unlike → status false; A follows sugu → follow-status true → followers list contains A → unfollow; A comments on own post → list has ≥1
- [ ] **Achievements** → `GET /api/achievements/u-sugu` returns 15 badges; `POST /api/achievements-evaluate` with cooked/streak correctly unlocks; leaderboard returns `byRecipes`/`byFollowers`
- [ ] **QA flows script** → `node qa-flows.js` — 25+ checks PASS (see Section 5)
- [ ] **Load test** → `python load_test.py --concurrency 50 --requests 200` — p95 <2000ms, 0% err, >50 req/s (see Section 6)

## 5) qa-flows.js Coverage (49-50)

Run: `node qa-flows.js` (or `node qa-flows.js --base=http://127.0.0.1:8124 --verbose`)

- [ ] Server reachable `GET /index.html` 200 contains KitchenShare
- [ ] Static pages 200: `/index.html`, `/login.html`, `/admin.html`, `/user-profile.html`, `/leaderboard.html`, `/people.html`
- [ ] Signup A pending → login blocked pending
- [ ] Admin login sugu, pending list contains A
- [ ] Approve A → generated password
- [ ] Login A with generated password + `/api/me`
- [ ] Logout invalidates session → re-login
- [ ] Signup B → decline B → login B fails
- [ ] Image upload `POST /api/upload-image` multipart PNG → returns `uploads/...` + thumbs → `GET /uploads/...` 200 → `POST /api/delete-image`
- [ ] Posts: `posts-save` → `posts-list` contains new pid
- [ ] Like: `like` → `like-status` true → `like-batch` → `unlike` → status false
- [ ] Follow: `follow` → `follow-status` true → `followers` list → `unfollow`
- [ ] Comment: `post-comments-save` → `post-comments-list`
- [ ] Notifications + unread, Achievements GET/list, Leaderboard, Export my data, Delete my account cleanup + login after delete fails

Expected: `QA FLOWS — 30/30 PASS` (exit 0), verbose shows each step. With `--keep-data` leaves temp user/post for inspection.

## 6) Load Test (53)

Run: `python load_test.py` (defaults 50 conc, 200 total) or `python load_test.py --concurrency 100 --requests 500 --duration 10`

- [ ] 50 concurrent, 200 total → p95 <800ms, 0% errors, >100 req/s on loopback
- [ ] 100 concurrent, 500 total → no 5xx, p95 <2000ms
- [ ] Mixed endpoints (GET /, POST login, GET achievements) all 200
- [ ] Server remains responsive after load (manual `GET /index.html` still 200, `python seed.py --verify` integrity ok)

Stdlib only (`concurrent.futures`, `http.client`).

## 7) LAN / Mobile Real Device (54)

Prereq: Phone and PC on same Wi-Fi or WireGuard.

- [ ] Server bound to all interfaces: `python server.py 8124 0.0.0.0` prints `Local URLs: http://<LAN-IP>:8124` (check `python lan_test.py` or `python server.py` output)
- [ ] Firewall: Windows Defender allows `python` inbound on Private network (first run prompt Accept)
- [ ] Phone browser open `http://<LAN-IP>:8124/index.html` (LAN IP from server log, e.g. `192.168.1.12`)
- [ ] Verify on phone:
  - [ ] Feed loads, Tailwind styles, no mixed-content
  - [ ] Tap login → 4 users, tap sugu → feed → drawer shows sugu Admin
  - [ ] Create New Recipe with photo (camera `capture="environment"` opens camera) → appears in feed → new pill appears
  - [ ] Cook a recipe (inventory deducts) → profile streak increments
  - [ ] Like a post → heart turns red, count increments (server via LAN)
  - [ ] Follow a user → button toggles Following, target's followers +1
  - [ ] Comment → appears under post
  - [ ] Upload image → shows in recipe hero and survives refresh (served from `uploads/`)
  - [ ] Rotate device, test safe-area (no bottom nav overlap, `pb-safe`/`pt-safe`)
  - [ ] Kill server, phone shows `Offline` badge → `Sync` click shows offline toast
- [ ] Helper: `python lan_test.py` prints LAN URLs, checks `0.0.0.0:8124` listening and fetches `/index.html` via LAN IP to confirm reachable
- [ ] After test, `python seed.py` to reset if needed

## 8) Regression Guard

- [ ] `python -c "import esprima; esprima.parseScript(open('i18n.js').read())" && echo i18n.js OK`
- [ ] `python -m py_compile server.py && echo py OK` (seed/load/lan/backup/restore now live in parent folder `..\`)
- [ ] All pages load 26 ordered `<script src="js/NN_*.js">` tags + `<link rel="manifest" href="manifest.webmanifest"/>`; DevTools Console shows no errors (module load order matters — see `js/README.md`)
- [ ] No console errors on any page (DevTools Console)
- [ ] After adding any new Tailwind class to HTML/JS: regenerate `tailwind.css` and hard-refresh (`tailwind.css` is precompiled; unknown classes render unstyled)
- [ ] After editing any module's served markup/assets: bump `KS_CACHE` in `sw.js` (e.g. `ks-v1` → `ks-v2`) so installed clients pick up changes; verify Application → Service Workers + Cache Storage in DevTools
- [ ] Perf spot check: warm reload of index/shopping/profile should stay ~1.3–1.8 s in the CDP harness (`python %TEMP%\opencode\ks_perf.py after`); a jump back toward CDN-era numbers means the static CSS or caching regressed
- [ ] **API hardening:** every `/api/*` POST must send header `X-Requested-With: KSFetch` (server `_api_gate()` rejects otherwise; harnesses' `post()` helpers already do); auth rate limit trips after 20 login/signup/reset requests per minute per IP (`KS_RATE_AUTH=0` disables, `KS_RATE_GLOBAL=600/min`) — space suites ~60 s or restart server between runs
- [ ] **LWW / tombstones:** run `%TEMP%\opencode\ks_sec_lww.py` (**14/14**) — covers gate rejection, rate-limit trip, IDOR deny/allow on delete-image, stale-write skip (`skipped_older`), tombstone delete-resist, `expires_on` + `diet` round-trips
- [ ] **Suites:** shop UI `%TEMP%\opencode\ks_shop_ui.py` **14/14**, API `%TEMP%\opencode\ks_qa.py` **25/25**, journey `%TEMP%\opencode\ks_journey.py` **16/16**
- [ ] **PWA offline:** DevTools → Network → Offline, reload a visited page — shell renders from SW cache; online/offline transitions toast; Lighthouse PWA installable check passes on `http://127.0.0.1:8124`

---
Last updated: 2026-08-25 (§23 implementation: modules 23–26, PWA, hardening/LWW). Keep this file in sync with `PROJECT.md` §19/§22.
