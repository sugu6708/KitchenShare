#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
KitchenShare Shared Server
==========================
Serves the static app on ALL interfaces (so the WireGuard tunnel / home
network can reach it) and keeps a shared member directory in
server_users.json. Phones/tablets on the network can:

  1. Sign up  -> creates a PENDING join request in the shared directory.
  2. Log in   -> blocked ("pending approval") until an admin approves.
  3. Admin approves on the admin PC -> server generates a one-time
     password the admin relays to the person.
  4. The person logs in with that email + generated password.

When the server is NOT running, the app keeps working in its original
pure-localStorage demo mode (this is what the E2E suite exercises).

Usage (exact commands):

  python server.py                     # bind 0.0.0.0:8124  (all interfaces)
  python server.py 8124                # custom port
  python server.py 8124 127.0.0.1      # bind a specific interface

  # Plain static server (no shared auth), all interfaces - the old pattern:
  python -m http.server 8124 --bind 0.0.0.0

Stdlib-only: no pip installs required.
"""

import gzip
import hashlib
import json
import os
import secrets
import sqlite3
import sys
import threading
import time
import re
import urllib.request
from http.server import HTTPServer, SimpleHTTPRequestHandler
from socketserver import ThreadingMixIn
from urllib.parse import unquote_plus


class ThreadingHTTPServer(ThreadingMixIn, HTTPServer):
    daemon_threads = True

APP_DIR = os.path.dirname(os.path.abspath(__file__))

# Data directory separation (isolates live database & user uploads from git/code)
DATA_DIR = os.environ.get("KS_DATA_DIR") or os.path.join(APP_DIR, "data")
if not os.path.exists(DATA_DIR):
    DATA_DIR = APP_DIR

DB_PATH = os.path.join(DATA_DIR, "server_users.json")
CONTENT_PATH = os.path.join(DATA_DIR, "server_content.json")
DATA_DB_PATH = os.path.join(DATA_DIR, "kitchen_data.db")
UPLOAD_DIR = os.path.join(DATA_DIR, "uploads")
THUMB_DIR = os.path.join(UPLOAD_DIR, "thumbs")
VIDEO_DIR = os.path.join(UPLOAD_DIR, "videos")
ADMIN_LOG_PATH = os.path.join(DATA_DIR, "admin_audit.log")
RESEND_CONFIG_PATH = os.path.join(DATA_DIR, "resend_config.json")
DEFAULT_PORT = 8124
DEFAULT_BIND = "0.0.0.0"

# ---------------- Resend Email Engine ----------------
def _load_resend_config():
    if os.path.exists(RESEND_CONFIG_PATH):
        try:
            with open(RESEND_CONFIG_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {}

def send_email(to_email, subject, html_content):
    """Dispatch an email via Resend API."""
    cfg = _load_resend_config()
    api_key = cfg.get("api_key")
    if not api_key:
        print("[EMAIL WARNING] No Resend API key configured. Email skipped for:", to_email)
        return False
    from_email = cfg.get("from_domain_email") or cfg.get("from_email") or "KitchenShare <noreply@kitchenshare.co.in>"
    payload = json.dumps({
        "from": from_email,
        "to": [to_email],
        "subject": subject,
        "html": html_content
    }).encode("utf-8")
    req = urllib.request.Request(
        "https://api.resend.com/emails",
        data=payload,
        headers={
            "Authorization": "Bearer " + api_key,
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) KitchenShare/1.0"
        }
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            res = json.loads(resp.read().decode("utf-8"))
            print("[EMAIL SENT] Delivered to:", to_email, "id:", res.get("id"))
            return True
    except Exception as e:
        print("[EMAIL ERROR] Failed to send email to", to_email, ":", e)
        return False

# Image upload limits
MAX_IMAGE_SIZE = 10 * 1024 * 1024  # 10 MB
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
THUMB_SIZES = {"sm": (128, 128), "md": (400, 400), "lg": (800, 800)}

# Video upload limits (1 min max duration, ~50 MB generous cap)
MAX_VIDEO_SIZE = 50 * 1024 * 1024  # 50 MB
ALLOWED_VIDEO_TYPES = {"video/mp4", "video/webm", "video/quicktime", "video/ogg"}
MAX_VIDEO_DURATION_SEC = 60  # 1 minute

# ---------------- Achievements schema (Phase 7) ----------------
# Badge catalog: each badge = {id, name, description, icon, criteria}.
# criteria.type: recipes | posts | followers | likes | cooked | streak | savedKg | recipeCooked
# criteria.value: numeric threshold, or a recipe id for type=recipeCooked.
# Server-computable: recipes, posts, followers, likes. Client-supplied (localStorage):
# cooked, streak, savedKg, recipeCooked. Mirrored in app.js as KS_ACHIEVEMENTS.
ACHIEVEMENT_DEFS = [
    {"id": "first-recipe", "name": "First Recipe", "description": "Post your first recipe",
     "icon": "restaurant_menu", "criteria": {"type": "recipes", "value": 1}},
    {"id": "recipe-collector", "name": "Recipe Collector", "description": "Post 5 recipes",
     "icon": "menu_book", "criteria": {"type": "recipes", "value": 5}},
    {"id": "master-chef", "name": "Master Chef", "description": "Post 10 recipes",
     "icon": "workspace_premium", "criteria": {"type": "recipes", "value": 10}},
    {"id": "first-cook", "name": "First Cook", "description": "Cook your first recipe",
     "icon": "skillet", "criteria": {"type": "cooked", "value": 1}},
    {"id": "spice-master", "name": "Spice Master", "description": "Cook 3 recipes",
     "icon": "local_fire_department", "criteria": {"type": "cooked", "value": 3}},
    {"id": "baking-pro", "name": "Baking Pro", "description": "Cook 10 recipes",
     "icon": "cake", "criteria": {"type": "cooked", "value": 10}},
    {"id": "kitchen-legend", "name": "Kitchen Legend", "description": "Cook 25 recipes",
     "icon": "military_tech", "criteria": {"type": "cooked", "value": 25}},
    {"id": "pasta-perfectionist", "name": "Pasta Perfectionist", "description": "Cook Rustic Basil Pomodoro",
     "icon": "ramen_dining", "criteria": {"type": "recipeCooked", "value": "rustic-basil-pomodoro"}},
    {"id": "zero-waste-hero", "name": "Zero Waste Hero", "description": "Save 5 kg of ingredients from your shopping list",
     "icon": "eco", "criteria": {"type": "savedKg", "value": 5}},
    {"id": "first-post", "name": "First Post", "description": "Share your first community post",
     "icon": "post_add", "criteria": {"type": "posts", "value": 1}},
    {"id": "chatty-chef", "name": "Chatty Chef", "description": "Share 5 community posts",
     "icon": "forum", "criteria": {"type": "posts", "value": 5}},
    {"id": "first-follower", "name": "First Follower", "description": "Get your first follower",
     "icon": "person_add", "criteria": {"type": "followers", "value": 1}},
    {"id": "crowd-favorite", "name": "Crowd Favorite", "description": "Get 5 followers",
     "icon": "groups", "criteria": {"type": "followers", "value": 5}},
    {"id": "streak-starter", "name": "Streak Starter", "description": "Cook 3 days in a row",
     "icon": "whatshot", "criteria": {"type": "streak", "value": 3}},
    {"id": "week-on-fire", "name": "Week on Fire", "description": "Keep a 7-day cooking streak",
     "icon": "local_fire_department", "criteria": {"type": "streak", "value": 7}}
]
ACHIEVEMENT_INDEX = {b["id"]: b for b in ACHIEVEMENT_DEFS}

try:
    from PIL import Image as _PILImage
    _HAS_PIL = True
except ImportError:
    _HAS_PIL = False

# Mirrors seedUsers() in app.js. Only used to seed the shared directory the
# first time the server runs.
SEED_USERS = [
    {"id": "u-sugu", "name": "sugu", "tagline": "Admin & Chef",
     "bio": "Home cook who loves flavour-first, everyday cooking.",
     "email": "sugu@kitchenshare.app", "pass": "admin", "role": "admin", "status": "active"},
    {"id": "u-swetha", "name": "swetha", "tagline": "Home Cook",
     "bio": "Baker at heart — pies, breads and everything sweet.",
     "email": "swetha@kitchenshare.app", "pass": "6708", "role": "user", "status": "active"},
    {"id": "u-viji", "name": "viji", "tagline": "Home Cook",
     "bio": "Dal, sambar and slow comfort food.",
     "email": "viji@kitchenshare.app", "pass": "1234", "role": "user", "status": "active"},
    {"id": "u-saravana", "name": "saravana", "tagline": "Home Cook",
     "bio": "Sunday sambar and classic South Indian spreads.",
     "email": "saravana@kitchenshare.app", "pass": "7394", "role": "user", "status": "active"},
    {"id": "u-e1d76479", "name": "Rocky", "tagline": "Home Cook",
     "bio": "",
     "email": "rocky@kitchenshare.app", "pass": "rocky123", "role": "user", "status": "active"},
]

_lock = threading.Lock()
_content_lock = threading.Lock()
_RESET_TOKENS = {}
_RESET_EXPIRY_MS = 60 * 60 * 1000  # 1 hour


# Server-side session store: {token: {userId, expiry}}
_SESSIONS = {}
_SESSION_TIMEOUT = 60 * 60 * 1000  # 10 minutes in ms
# Password reset tokens: {token: {userId, expiry}}
_RESET_TOKENS = {}
# Reset token expiry: 1 hour
_RESET_EXPIRY = 60 * 60 * 1000


# ---------------- SQLite data layer ----------------

def _init_data_db():
    """Create SQLite tables for the data layer."""
    conn = sqlite3.connect(DATA_DB_PATH)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    c = conn.cursor()

    # User recipes
    c.execute("""CREATE TABLE IF NOT EXISTS recipes (
        id TEXT PRIMARY KEY,
        owner_id TEXT NOT NULL,
        name TEXT NOT NULL DEFAULT '',
        servings TEXT DEFAULT '1 serving',
        time TEXT DEFAULT '',
        kcal TEXT DEFAULT '',
        tag TEXT DEFAULT '',
        cat TEXT DEFAULT '',
        icon TEXT DEFAULT 'restaurant_menu',
        gradient TEXT DEFAULT '',
        photos TEXT DEFAULT '[]',
        img TEXT DEFAULT '',
        video TEXT DEFAULT '',
        video_thumb TEXT DEFAULT '',
        ingredients TEXT DEFAULT '[]',
        steps TEXT DEFAULT '[]',
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
    )""")

    # Kitchen inventory items
    c.execute("""CREATE TABLE IF NOT EXISTS kitchen_items (
        id TEXT PRIMARY KEY,
        owner_id TEXT NOT NULL,
        name TEXT NOT NULL DEFAULT '',
        category TEXT DEFAULT 'pantry',
        qty REAL DEFAULT 0,
        unit TEXT DEFAULT 'pcs',
        min_qty REAL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
    )""")

    # Shopping list items
    c.execute("""CREATE TABLE IF NOT EXISTS shopping_items (
        id TEXT PRIMARY KEY,
        owner_id TEXT NOT NULL,
        name TEXT NOT NULL DEFAULT '',
        qty REAL DEFAULT 1,
        unit TEXT DEFAULT 'pcs',
        shop_group TEXT DEFAULT '',
        done INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
    )""")

    # User posts
    c.execute("""CREATE TABLE IF NOT EXISTS posts (
        id TEXT PRIMARY KEY,
        owner_id TEXT NOT NULL,
        text TEXT DEFAULT '',
        by_name TEXT DEFAULT '',
        ts INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL
    )""")

    # Comments per recipe/post
    c.execute("""CREATE TABLE IF NOT EXISTS comments (
        item_id TEXT NOT NULL,
        owner_id TEXT NOT NULL,
        text TEXT DEFAULT '',
        by_name TEXT DEFAULT '',
        ts INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL,
        PRIMARY KEY (item_id, owner_id, created_at)
    )""")

    # Catalog edits (admin overrides)
    c.execute("""CREATE TABLE IF NOT EXISTS catalog_edits (
        recipe_id TEXT PRIMARY KEY,
        data TEXT NOT NULL DEFAULT '{}',
        updated_at INTEGER NOT NULL
    )""")

    # Hidden recipes (admin)
    c.execute("""CREATE TABLE IF NOT EXISTS hidden_recipes (
        recipe_id TEXT PRIMARY KEY
    )""")

    # Notifications
    c.execute("""CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        owner_id TEXT NOT NULL,
        actor_id TEXT DEFAULT '',
        type TEXT DEFAULT 'info',
        item_id TEXT DEFAULT '',
        icon TEXT DEFAULT 'info',
        title TEXT DEFAULT '',
        desc TEXT DEFAULT '',
        href TEXT DEFAULT '',
        ts INTEGER DEFAULT 0,
        read INTEGER DEFAULT 0
    )""")

    # Likes on posts
    c.execute("""CREATE TABLE IF NOT EXISTS likes (
        post_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        ts INTEGER DEFAULT 0,
        PRIMARY KEY (post_id, user_id)
    )""")

    # Follows between users
    c.execute("""CREATE TABLE IF NOT EXISTS follows (
        follower_id TEXT NOT NULL,
        following_id TEXT NOT NULL,
        ts INTEGER DEFAULT 0,
        PRIMARY KEY (follower_id, following_id)
    )""")

    # User profiles (extended)
    c.execute("""CREATE TABLE IF NOT EXISTS profiles (
        owner_id TEXT PRIMARY KEY,
        name TEXT DEFAULT '',
        tagline TEXT DEFAULT '',
        bio TEXT DEFAULT '',
        photo TEXT DEFAULT '',
        updated_at INTEGER NOT NULL
    )""")

    # Achievements unlocked per user
    c.execute("""CREATE TABLE IF NOT EXISTS achievements (
        user_id TEXT NOT NULL,
        badge_id TEXT NOT NULL,
        unlocked_at INTEGER DEFAULT 0,
        PRIMARY KEY (user_id, badge_id)
    )""")

    # Budget spending log (one row per purchase record)
    c.execute("""CREATE TABLE IF NOT EXISTS spending (
        id TEXT PRIMARY KEY,
        owner_id TEXT NOT NULL,
        amount REAL DEFAULT 0,
        category TEXT DEFAULT 'Other',
        item TEXT DEFAULT '',
        qty REAL DEFAULT 0,
        unit TEXT DEFAULT '',
        date TEXT DEFAULT '',
        ts INTEGER DEFAULT 0,
        is_deleted INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
    )""")

    # Migrate notifications table — add columns if missing (idempotent)
    existing_cols = {row[1] for row in c.execute("PRAGMA table_info(notifications)").fetchall()}
    for col, typedef in [("actor_id", "TEXT DEFAULT ''"), ("type", "TEXT DEFAULT 'info'"), ("item_id", "TEXT DEFAULT ''")]:
        if col not in existing_cols:
            try: c.execute("ALTER TABLE notifications ADD COLUMN %s %s" % (col, typedef))
            except: pass

    # Migrate kitchen_items — expiry tracking (§23 food waste / FIFO)
    existing_cols = {row[1] for row in c.execute("PRAGMA table_info(kitchen_items)").fetchall()}
    if "expires_on" not in existing_cols:
        try: c.execute("ALTER TABLE kitchen_items ADD COLUMN expires_on TEXT DEFAULT ''")
        except: pass

    # Migrate recipes — diet/allergen tags (§23 allergen & dietary safety)
    existing_cols = {row[1] for row in c.execute("PRAGMA table_info(recipes)").fetchall()}
    if "diet" not in existing_cols:
        try: c.execute("ALTER TABLE recipes ADD COLUMN diet TEXT DEFAULT '[]'")
        except: pass
    # Migrate recipes — video support
    if "video" not in existing_cols:
        try: c.execute("ALTER TABLE recipes ADD COLUMN video TEXT DEFAULT ''")
        except: pass
    if "video_thumb" not in existing_cols:
        try: c.execute("ALTER TABLE recipes ADD COLUMN video_thumb TEXT DEFAULT ''")
        except: pass

    # Migrate posts — updated_at needed for LWW reconciliation (§23)
    existing_cols = {row[1] for row in c.execute("PRAGMA table_info(posts)").fetchall()}
    if "updated_at" not in existing_cols:
        try:
            c.execute("ALTER TABLE posts ADD COLUMN updated_at INTEGER DEFAULT 0")
            c.execute("UPDATE posts SET updated_at = created_at WHERE updated_at IS NULL OR updated_at = 0")
        except Exception:
            pass

    # Durable delete tombstones for LWW reconciliation (§23) — a stale write
    # arriving after a delete must not resurrect the row.
    c.execute("""CREATE TABLE IF NOT EXISTS deleted_items (
    kind TEXT NOT NULL,
    id TEXT NOT NULL,
    owner_id TEXT NOT NULL,
    deleted_at INTEGER NOT NULL,
    PRIMARY KEY (kind, id, owner_id)
    )""")

    # Groups
    c.execute("""CREATE TABLE IF NOT EXISTS groups (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL DEFAULT '',
        owner_id TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
    )""")

    # Group members
    c.execute("""CREATE TABLE IF NOT EXISTS group_members (
        group_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        invited_by TEXT DEFAULT '',
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        PRIMARY KEY (group_id, user_id)
    )""")

    # Group shared recipes
    c.execute("""CREATE TABLE IF NOT EXISTS group_recipes (
        group_id TEXT NOT NULL,
        recipe_id TEXT NOT NULL,
        shared_by TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        PRIMARY KEY (group_id, recipe_id)
    )""")

    conn.commit()
    conn.close()


def _db_conn():
    conn = sqlite3.connect(DATA_DB_PATH, timeout=10)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def _db_now():
    return int(time.time() * 1000)


def _send_notification(conn, owner_id, actor_id, ntype, item_id, icon, title, desc, href, ts):
    nid = "notif-" + secrets.token_hex(8)
    conn.execute("INSERT INTO notifications (id,owner_id,actor_id,type,item_id,icon,title,desc,href,ts,read) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
                 (nid, owner_id, actor_id, ntype, item_id, icon, title, desc, href, ts, 0))


def _rows_to_dicts(rows):
    return [dict(r) for r in rows]


def _clean_sessions():
    """Remove expired sessions and reset tokens."""
    now = int(time.time() * 1000)
    for token in list(_SESSIONS):
        if _SESSIONS[token].get('expiry', 0) < now:
            del _SESSIONS[token]
    for token in list(_RESET_TOKENS):
        if _RESET_TOKENS[token].get('expiry', 0) < now:
            del _RESET_TOKENS[token]
    for token in list(_RESET_TOKENS):
        if _RESET_TOKENS[token].get('expiry', 0) < now:
            del _RESET_TOKENS[token]


def _gen_token():
    return secrets.token_hex(24)


def _session_token(request):
    """Read session token from Cookie header."""
    header = request.headers.get('Cookie', '')
    for part in header.split(';'):
        part = part.strip()
        if part.lower().startswith('ks_session='):
            return part.split('=', 1)[1]
    return None


def _reset_token(request):
    """Read reset token from Query string or body."""
    # Check query string first (for REST links)
    if '?' in self.path:
        # This won't work directly here since we're in do_POST; caller passes token
        pass
    return None


def _cleanup_stale_sessions():
    """Run periodically to remove expired sessions."""
    _clean_sessions()


def _get_session_user_id(handler):
    """Extract userId from session cookie on the handler (self)."""
    token = _session_token(handler)
    if not token or token not in _SESSIONS:
        return None
    s = _SESSIONS[token]
    if s.get('expiry', 0) < int(time.time() * 1000):
        return None
    return s['userId']


# ---- Hardening (§23 Data Integrity & Security) ----
# 1) CSRF mitigation: every /api/* POST must carry the custom header
#    "X-Requested-With: KSFetch". Browsers cannot attach a custom header
#    cross-site without a CORS preflight, and this server never answers
#    preflights — so forged cross-origin form posts are rejected.
# 2) Per-IP sliding-window rate limits (global + auth endpoints).
#    KS_RATE_GLOBAL=0 / KS_RATE_AUTH=0 disables a limit; both default on.
def _env_int(name, default):
    try:
        return int(os.environ.get(name, "") or default)
    except Exception:
        return default


RATE_GLOBAL_PER_MIN = _env_int("KS_RATE_GLOBAL", 600)
RATE_AUTH_PER_MIN = _env_int("KS_RATE_AUTH", 20)
AUTH_ACTIONS = {"signup", "login", "reset-request", "reset-confirm"}
_rate_lock = threading.Lock()
_rate_buckets = {}


def _rate_ok(ip, kind, limit):
    """Sliding 60s window per (kind, ip). Returns False when over limit."""
    if limit <= 0:
        return True
    now = time.time()
    with _rate_lock:
        bucket = [t for t in _rate_buckets.get((kind, ip), []) if now - t < 60]
        if len(bucket) >= limit:
            _rate_buckets[(kind, ip)] = bucket
            return False
        bucket.append(now)
        _rate_buckets[(kind, ip)] = bucket
        if len(_rate_buckets) > 4096:
            stale = [k for k, v in _rate_buckets.items() if not v or now - v[-1] > 300]
            for k in stale:
                _rate_buckets.pop(k, None)
        return True


def _reject_json(handler, obj):
    body = json.dumps(obj).encode("utf-8")
    handler.send_response(200)
    handler.send_header("Content-Type", "application/json")
    handler.send_header("Content-Length", str(len(body)))
    handler.send_header("Cache-Control", "no-store")
    handler.end_headers()
    handler.wfile.write(body)


def _api_gate(handler, action):
    """Common security gate for /api/* POSTs. Sends the error response and
    returns False when the request must not proceed."""
    ip = handler.client_address[0] if handler.client_address else "?"
    if (handler.headers.get("X-Requested-With") or "") != "KSFetch":
        _reject_json(handler, {"error": "Missing security header"})
        return False
    if not _rate_ok(ip, "global", RATE_GLOBAL_PER_MIN):
        _reject_json(handler, {"error": "Rate limited"})
        return False
    if action in AUTH_ACTIONS and not _rate_ok(ip, "auth", RATE_AUTH_PER_MIN):
        _reject_json(handler, {"error": "Rate limited"})
        return False
    return True


def _hash_pass(password, salt=None):
    salt = salt or secrets.token_hex(8)
    digest = hashlib.sha256((salt + ":" + password).encode("utf-8")).hexdigest()
    return salt + "$" + digest


def _check_pass(password, stored):
    if not stored or "$" not in stored:
        return False
    salt, digest = stored.split("$", 1)
    return digest == hashlib.sha256((salt + ":" + password).encode("utf-8")).hexdigest()


def _save_db_locked(db):
    tmp = DB_PATH + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(db, f, ensure_ascii=False, indent=2)
    os.replace(tmp, DB_PATH)


def _load_db():
    with _lock:
        if not os.path.exists(DB_PATH):
            db = {"users": [
                {"id": u["id"], "name": u["name"], "tagline": u["tagline"], "bio": u["bio"],
                 "email": u["email"], "role": u["role"], "status": u["status"],
                 "pass_hash": _hash_pass(u["pass"]), "join": int(time.time() * 1000)}
                for u in SEED_USERS
            ]}
            _save_db_locked(db)
            return db
        try:
            with open(DB_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {"users": []}


def _save_db(db):
    with _lock:
        _save_db_locked(db)


# ---------------- Shared content (recipes / posts / profiles / comments) ----

def _empty_content():
    return {"profiles": {}, "recipes": {}, "posts": {}, "comments": {}}


def _load_content():
    with _content_lock:
        if not os.path.exists(CONTENT_PATH):
            c = _empty_content()
            _save_content_locked(c)
            return c
        try:
            with open(CONTENT_PATH, "r", encoding="utf-8") as f:
                c = json.load(f)
            base = _empty_content()
            base.update({k: c.get(k, base.get(k, {})) for k in base})
            return base
        except Exception:
            return _empty_content()


def _save_content_locked(c):
    tmp = CONTENT_PATH + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(c, f, ensure_ascii=False, indent=2)
    os.replace(tmp, CONTENT_PATH)


def _save_content(c):
    with _content_lock:
        _save_content_locked(c)


def _auth_user(db, data):
    email = str(data.get("authEmail", "")).strip().lower()
    password = str(data.get("authPass", ""))
    u = _find_by_email(db, email)
    if not u or u.get("status") != "active":
        return None
    if not _check_pass(password, u.get("pass_hash")):
        return None
    return u


def _to_public(u):
    out = {k: u[k] for k in ("id", "name", "tagline", "bio", "email", "role", "status", "join")
           if k in u}
    if u.get("photo"):
        out["photo"] = u["photo"]
    if u.get("must_reset"):
        out["must_reset"] = True
    return out


def _find_by_email(db, email):
    for u in db["users"]:
        if u.get("email") == email:
            return u
    return None


def _find_by_id(db, uid):
    for u in db["users"]:
        if u.get("id") == uid:
            return u
    return None


def _load_user_by_id(uid):
    db = _load_db()
    u = _find_by_id(db, uid)
    if u:
        return u
    conn = _db_conn()
    row = conn.execute("SELECT * FROM profiles WHERE owner_id=?", (uid,)).fetchone()
    conn.close()
    if row:
        return dict(row)
    return None


def _auth_admin(db, data):
    email = str(data.get("adminEmail", "")).strip().lower()
    password = str(data.get("adminPass", ""))
    u = _find_by_email(db, email)
    if not u or u.get("role") != "admin":
        return None
    if not _check_pass(password, u.get("pass_hash")):
        return None
    return u


def _gen_password():
    word = secrets.choice(["Maple", "Cedar", "Clover", "Ember", "Haven", "Lumen",
                           "Mango", "Saffron", "Basil", "Nimbus", "Rosemary", "Thyme"])
    return word + "-" + str(secrets.randbelow(9000) + 1000)


# ---------------- API actions ----------------

def api_signup(data):
    name = str(data.get("name", "")).strip()
    email = str(data.get("email", "")).strip().lower()
    password = str(data.get("pass", ""))
    if not name or not email or len(password) < 4:
        return {"error": "Enter a name, email, and a password (4+ characters)"}
    db = _load_db()
    if _find_by_email(db, email):
        return {"error": "An account already exists for that email"}
    uid = "u-" + secrets.token_hex(4)
    verify_token = secrets.token_urlsafe(32)
    verify_expiry = int(time.time() * 1000) + (24 * 3600 * 1000) # 24 hours
    
    rec = {"id": uid, "name": name, "tagline": "Home Cook", "bio": "",
           "email": email, "role": "user", "status": "unverified",
           "verify_token": verify_token, "verify_expiry": verify_expiry,
           "pass_hash": _hash_pass(password), "join": int(time.time() * 1000)}
    db["users"].append(rec)
    _save_db(db)

    # Dispatch verification email via Resend
    cfg = _load_resend_config()
    app_url = cfg.get("app_url", "https://kitchenshare.co.in")
    verify_link = f"{app_url}/login.html?verify={verify_token}"

    html = f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #e0e0e0; border-radius: 16px;">
        <div style="text-align: center; margin-bottom: 24px;">
            <div style="display: inline-block; width: 48px; height: 48px; background-color: #425842; color: #ffffff; border-radius: 12px; line-height: 48px; font-size: 24px; font-weight: bold;">K</div>
            <h1 style="color: #1e1e1e; font-size: 24px; margin-top: 12px; margin-bottom: 4px;">Welcome to KitchenShare!</h1>
            <p style="color: #666; font-size: 15px; margin: 0;">Smart Kitchen & Home Cooking Hub</p>
        </div>
        <p style="font-size: 16px; color: #333; line-height: 1.5;">Hi {name},</p>
        <p style="font-size: 16px; color: #333; line-height: 1.5;">Thanks for joining KitchenShare. Please confirm your email address to activate your account and start sharing recipes, tracking inventory, and cooking smart.</p>
        <div style="text-align: center; margin: 32px 0;">
            <a href="{verify_link}" style="background-color: #425842; color: #ffffff; padding: 14px 32px; border-radius: 30px; font-size: 16px; font-weight: 600; text-decoration: none; display: inline-block;">Confirm Email & Activate Account</a>
        </div>
        <p style="font-size: 13px; color: #777; line-height: 1.4;">If the button doesn't work, copy and paste this link in your browser:<br/><a href="{verify_link}" style="color: #425842;">{verify_link}</a></p>
        <hr style="border: none; border-top: 1px solid #eaeaea; margin: 24px 0;"/>
        <p style="font-size: 12px; color: #999; text-align: center;">If you didn't create an account, you can safely ignore this email.</p>
    </div>
    """
    threading.Thread(target=send_email, args=(email, "Confirm your KitchenShare Account", html), daemon=True).start()

    return {"ok": True, "unverified": True, "id": uid, "name": name, "message": "Verification link sent to your email!"}


def api_verify_email(data):
    """Verify email via token and activate account."""
    token = str(data.get("token", "")).strip()
    if not token:
        return {"error": "Verification token required"}
    db = _load_db()
    now = int(time.time() * 1000)
    found = None
    for u in db.get("users", []):
        if u.get("verify_token") == token:
            expiry = u.get("verify_expiry") or 0
            if expiry < now:
                return {"error": "Verification link expired. Please sign up again or request a new link."}
            found = u
            break
    if not found:
        return {"error": "Invalid or already used verification token"}

    found["status"] = "active"
    found["verify_token"] = None
    found["verify_expiry"] = None
    _save_db(db)
    logAdminAction("email_verified", found["id"], "system", f"Verified via email link: {found['email']}")
    return {"ok": True, "name": found.get("name", "member"), "email": found.get("email")}


def api_login(data):
    remember = str(data.get("remember", "")).lower() in ('1', 'true', 'yes')
    email = str(data.get("email", "")).strip().lower()
    password = str(data.get("pass", ""))
    db = _load_db()
    u = _find_by_email(db, email)
    if not u:
        return {"error": "No account found with that email"}
    if u.get("status") == "pending":
        return {"error": "Your join request is pending admin approval"}
    if u.get("status") == "unverified":
        return {"error": "Please confirm your email address. Check your inbox for the activation link."}
    if u.get("status") == "suspended":
        return {"error": "Your account has been suspended by an administrator."}
    if not _check_pass(password, u.get("pass_hash")):
        return {"error": "Incorrect password"}
    # Create session
    token = _gen_token()
    expiry = int(time.time() * 1000) + (30 * 24 * 3600 * 1000 if remember else 7 * 24 * 3600 * 1000)  # 30 days or 7 days server-side
    _SESSIONS[token] = {"userId": u["id"], "expiry": expiry}
    _clean_sessions()
    # Return user + remember flag for cookie expiry
    return {"user": _to_public(u), "remember": remember, "token": token}


def api_get_users(data):
    db = _load_db()
    return {"users": [_to_public(u) for u in db["users"] if u.get("status") == "active"]}


def api_pending(data):
    db = _load_db()
    if not _auth_admin(db, data):
        return {"error": "Admin credentials required"}
    return {"users": [_to_public(u) for u in db["users"] if u.get("status") == "pending"]}


def api_approve(data):
    db = _load_db()
    if not _auth_admin(db, data):
        return {"error": "Admin credentials required"}
    uid = str(data.get("id", ""))
    password = str(data.get("password", ""))
    u = _find_by_id(db, uid)
    if not u:
        return {"error": "Account not found"}
    if password:
        u["pass_hash"] = _hash_pass(password)
        u["status"] = "active"
        _save_db(db)
        return {"ok": True, "password": password, "name": u.get("name", "member")}
    # No password supplied — keep the original signup password and just activate
    u["status"] = "active"
    _save_db(db)
    return {"ok": True, "name": u.get("name", "member")}


def api_decline(data):
    db = _load_db()
    if not _auth_admin(db, data):
        return {"error": "Admin credentials required"}
    uid = str(data.get("id", ""))
    before = len(db["users"])
    db["users"] = [u for u in db["users"] if u.get("id") != uid]
    if len(db["users"]) == before:
        return {"error": "Account not found"}
    _save_db(db)
    # Log the decline action
    logAdminAction("decline", uid, getAdminName(data))
    return {"ok": True}


def api_suspend(data):
    """Suspend/ban a user. Sets status to 'suspended'. Logs the action."""
    db = _load_db()
    if not _auth_admin(db, data):
        return {"error": "Admin credentials required"}
    uid = str(data.get("id", ""))
    reason = str(data.get("reason", "")).strip()
    u = _find_by_id(db, uid)
    if not u:
        return {"error": "Account not found"}
    u["status"] = "suspended"
    _save_db(db)
    # Log the suspension action
    logAdminAction("suspend", uid, getAdminName(data), reason=reason)
    return {"ok": True, "status": "suspended", "name": u.get("name", "member")}


def api_set_role(data):
    """Set user role (admin/user). Logs the action."""
    db = _load_db()
    if not _auth_admin(db, data):
        return {"error": "Admin credentials required"}
    uid = str(data.get("id", ""))
    role = str(data.get("role", "")).lower()
    if role not in ('admin', 'user'):
        return {"error": "Invalid role"}
    u = _find_by_id(db, uid)
    if not u:
        return {"error": "Account not found"}
    old_role = u.get("role", "user")
    u["role"] = role
    _save_db(db)
    # Log the role change action
    logAdminAction("role_change", uid, getAdminName(data), reason="promoted to admin" if role == "admin" else "demoted to user")
    return {"ok": True, "role": role, "old_role": old_role, "name": u.get("name", "member")}


def api_admin_reset_password(data):
    """Admin resets a user's password to a temporary one and sets must_reset flag."""
    db = _load_db()
    if not _auth_admin(db, data):
        return {"error": "Admin credentials required"}
    uid = str(data.get("id", ""))
    new_pass = str(data.get("password", "")).strip()
    u = _find_by_id(db, uid)
    if not u:
        return {"error": "Account not found"}
    if not new_pass:
        new_pass = _gen_password()
    u["pass_hash"] = _hash_pass(new_pass)
    u["must_reset"] = True
    _save_db(db)
    logAdminAction("reset_password", uid, getAdminName(data), reason="password reset, must_change on next login")
    return {"ok": True, "password": new_pass, "name": u.get("name", "member")}


def api_set_new_password(handler, data):
    """User sets a new password after admin reset. Requires session."""
    uid = _get_session_user_id(handler)
    if not uid:
        return {"error": "Not logged in"}
    new_pass = str(data.get("password", "")).strip()
    confirm = str(data.get("confirm", "")).strip()
    if not new_pass or len(new_pass) < 4:
        return {"error": "Password must be at least 4 characters"}
    if new_pass != confirm:
        return {"error": "Passwords do not match"}
    db = _load_db()
    u = _find_by_id(db, uid)
    if not u:
        return {"error": "User not found"}
    u["pass_hash"] = _hash_pass(new_pass)
    u.pop("must_reset", None)
    _save_db(db)
    return {"ok": True}


def api_audit_log(data):
    """Return the admin audit log entries."""
    log_path = ADMIN_LOG_PATH
    entries = []
    try:
        with open(log_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line:
                    try:
                        entry = json.loads(line)
                        entries.append(entry)
                    except json.JSONDecodeError:
                        pass
    except FileNotFoundError:
        pass
    # Return last 50 entries
    return {"ok": True, "entries": entries[-50:]}


def logAdminAction(action, uid, adminName, reason=""):
    """Append an admin action to the audit log."""
    log_path = ADMIN_LOG_PATH
    try:
        entry = {
            "ts": int(time.time() * 1000),
            "action": action,
            "admin": adminName,
            "uid": uid,
            "reason": reason
        }
        # Append to log file (create if not exists)
        with open(log_path, "a", encoding="utf-8") as f:
            f.write(json.dumps(entry) + "\n")
    except Exception:
        pass  # Best effort logging


def getAdminName(data):
    """Extract admin name from request data."""
    email = str(data.get("adminEmail", "")).strip().lower()
    db = _load_db()
    u = _find_by_email(db, email)
    return u.get("name", "admin") if u else "admin"


# ---------------- Session management ----------------


def api_me(request):
    """Return current user based on session cookie, or error."""
    _clean_sessions()
    token = _session_token(request)
    if not token or token not in _SESSIONS:
        return {"error": "Not logged in"}
    s = _SESSIONS[token]
    if s.get('expiry', 0) < int(time.time() * 1000):
        del _SESSIONS[token]
        return {"error": "Session expired"}
    u = _find_by_id(_load_db(), s['userId'])
    if not u or u.get('status') != 'active':
        del _SESSIONS[token]
        return {"error": "Account not found or inactive"}
    return {"user": _to_public(u)}


def api_logout(request):
    """Invalidate session and clear cookie."""
    _clean_sessions()
    token = _session_token(request)
    if token and token in _SESSIONS:
        del _SESSIONS[token]
    return {"ok": True}


def api_reset_request(data):
    """Request a password reset link and send via Resend email."""
    _clean_sessions()
    email = str(data.get("email", "")).strip().lower()
    db = _load_db()
    u = _find_by_email(db, email)
    if not u:
        return {"error": "No account found with that email"}
    if u.get("status") not in ("active", "unverified"):
        return {"error": "Account is suspended or invalid"}
    token = _gen_token()
    expiry = int(time.time() * 1000) + _RESET_EXPIRY_MS
    _RESET_TOKENS[token] = {"userId": u["id"], "expiry": expiry}
    _clean_sessions()

    cfg = _load_resend_config()
    app_url = cfg.get("app_url", "https://kitchenshare.co.in")
    reset_link = f"{app_url}/login.html?reset={token}"
    name = u.get("name", "KitchenShare Member")

    html = f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #e0e0e0; border-radius: 16px;">
        <div style="text-align: center; margin-bottom: 24px;">
            <div style="display: inline-block; width: 48px; height: 48px; background-color: #425842; color: #ffffff; border-radius: 12px; line-height: 48px; font-size: 24px; font-weight: bold;">K</div>
            <h1 style="color: #1e1e1e; font-size: 22px; margin-top: 12px; margin-bottom: 4px;">Password Reset Request</h1>
        </div>
        <p style="font-size: 16px; color: #333; line-height: 1.5;">Hi {name},</p>
        <p style="font-size: 16px; color: #333; line-height: 1.5;">We received a request to reset your KitchenShare account password. Click the button below to choose a new password (valid for 1 hour):</p>
        <div style="text-align: center; margin: 32px 0;">
            <a href="{reset_link}" style="background-color: #425842; color: #ffffff; padding: 14px 32px; border-radius: 30px; font-size: 16px; font-weight: 600; text-decoration: none; display: inline-block;">Reset Password</a>
        </div>
        <p style="font-size: 13px; color: #777; line-height: 1.4;">If the button doesn't work, copy and paste this link in your browser:<br/><a href="{reset_link}" style="color: #425842;">{reset_link}</a></p>
        <hr style="border: none; border-top: 1px solid #eaeaea; margin: 24px 0;"/>
        <p style="font-size: 12px; color: #999; text-align: center;">If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
    </div>
    """
    threading.Thread(target=send_email, args=(email, "Reset your KitchenShare Password", html), daemon=True).start()

    return {"ok": True, "message": "Password reset link sent to your email!"}


def api_reset_confirm(data):
    """Confirm password reset with token and new password."""
    _clean_sessions()
    token = str(data.get("token", ""))
    new_pass = str(data.get("new_pass", ""))
    if not token or not new_pass or len(new_pass) < 4:
        return {"error": "Token and new password (4+ chars) required"}
    rt = _RESET_TOKENS.get(token)
    if not rt:
        return {"error": "Invalid reset token"}
    if rt.get('expiry', 0) < int(time.time() * 1000):
        del _RESET_TOKENS[token]
        return {"error": "Reset token expired"}
    # Update user password
    db = _load_db()
    u = _find_by_id(db, rt['userId'])
    if not u:
        return {"error": "User not found"}
    u["pass_hash"] = _hash_pass(new_pass)
    _save_db(db)
    # Invalidate the reset token
    del _RESET_TOKENS[token]
    return {"ok": True, "name": u.get("name", "member")}


# ---------------- Shared content API ----------------


def api_get_content(data):
    return {"content": _load_content()}


def api_save_profile(data):
    db = _load_db()
    u = _auth_user(db, data)
    if not u:
        return {"error": "Auth required"}
    p = data.get("profile") or {}
    uid = str(p.get("userId") or u["id"])
    if uid != u["id"] and u.get("role") != "admin":
        return {"error": "Only the owner can edit this profile"}
    c = _load_content()
    c["profiles"][uid] = {
        "name": str(p.get("name", "")),
        "tagline": str(p.get("tagline", "")),
        "bio": str(p.get("bio", "")),
        "photo": str(p.get("photo", "")),
        "updatedAt": int(time.time() * 1000)
    }
    _save_content(c)
    if uid == u["id"]:
        member = _find_by_id(db, uid)
        if member:
            if str(p.get("name", "")):
                member["name"] = str(p.get("name", ""))
            if "tagline" in p:
                member["tagline"] = str(p.get("tagline", ""))
            if "bio" in p:
                member["bio"] = str(p.get("bio", ""))
            if "photo" in p:
                member["photo"] = str(p.get("photo", ""))
            _save_db(db)
    return {"ok": True, "profile": c["profiles"][uid]}


def api_save_recipe(data):
    db = _load_db()
    u = _auth_user(db, data)
    if not u:
        return {"error": "Auth required"}
    r = data.get("recipe") or {}
    rid = str(r.get("id", ""))
    if not rid:
        return {"error": "Recipe id required"}
    owner = str(r.get("ownerId") or u["id"])
    if owner != u["id"] and u.get("role") != "admin":
        return {"error": "Only the owner can edit this recipe"}
    c = _load_content()
    c["recipes"][rid] = {
        "ownerId": owner,
        "updatedAt": int(time.time() * 1000),
        "recipe": r
    }
    _save_content(c)
    return {"ok": True, "recipe": c["recipes"][rid]}


def api_delete_recipe(data):
    db = _load_db()
    u = _auth_user(db, data)
    if not u:
        return {"error": "Auth required"}
    rid = str(data.get("id", ""))
    c = _load_content()
    rec = c["recipes"].get(rid)
    if not rec:
        return {"ok": True}
    if rec.get("ownerId") != u["id"] and u.get("role") != "admin":
        return {"error": "Only the owner can delete this recipe"}
    del c["recipes"][rid]
    _save_content(c)
    return {"ok": True}


def api_save_post(data):
    db = _load_db()
    u = _auth_user(db, data)
    if not u:
        return {"error": "Auth required"}
    p = data.get("post") or {}
    pid = str(p.get("id", ""))
    if not pid:
        return {"error": "Post id required"}
    owner = str(p.get("userId") or u["id"])
    if owner != u["id"] and u.get("role") != "admin":
        return {"error": "Only the owner can edit this post"}
    c = _load_content()
    c["posts"][pid] = {
        "ownerId": owner,
        "updatedAt": int(time.time() * 1000),
        "post": p
    }
    _save_content(c)
    return {"ok": True, "post": c["posts"][pid]}


def api_delete_post(data):
    db = _load_db()
    u = _auth_user(db, data)
    if not u:
        return {"error": "Auth required"}
    pid = str(data.get("id", ""))
    c = _load_content()
    post = c["posts"].get(pid)
    if not post:
        return {"ok": True}
    if post.get("ownerId") != u["id"] and u.get("role") != "admin":
        return {"error": "Only the owner can delete this post"}
    del c["posts"][pid]
    _save_content(c)
    return {"ok": True}


def api_save_comments(data):
    db = _load_db()
    u = _auth_user(db, data)
    if not u:
        return {"error": "Auth required"}
    rid = str(data.get("recipeId", ""))
    if not rid:
        return {"error": "Recipe id required"}
    comments = data.get("comments")
    if not isinstance(comments, list):
        return {"error": "comments must be a list"}
    c = _load_content()
    c["comments"][rid] = comments
    _save_content(c)
    return {"ok": True, "comments": c["comments"][rid]}


# ---- Kitchen inventory CRUD ----

def api_kitchen_list(handler, data):
    uid = _get_session_user_id(handler)
    if not uid: return {"error": "Not logged in"}
    conn = _db_conn()
    rows = conn.execute("SELECT * FROM kitchen_items WHERE owner_id=? ORDER BY created_at DESC", (uid,)).fetchall()
    conn.close()
    return {"items": _rows_to_dicts(rows)}

def api_kitchen_add(handler, data):
    uid = _get_session_user_id(handler)
    if not uid: return {"error": "Not logged in"}
    item = {
        "id": data.get("id", "itm-" + secrets.token_hex(6)),
        "owner_id": uid,
        "name": str(data.get("name", "")).strip(),
        "category": str(data.get("category", "pantry")),
        "qty": float(data.get("qty", 0) or 0),
        "unit": str(data.get("unit", "pcs")),
        "min_qty": data.get("min_qty"),
        "created_at": _db_now(),
        "updated_at": _db_now()
    }
    if not item["name"]: return {"error": "Name required"}
    if item["min_qty"] is not None:
        try: item["min_qty"] = float(item["min_qty"])
        except: item["min_qty"] = None
    conn = _db_conn()
    conn.execute("INSERT OR REPLACE INTO kitchen_items (id,owner_id,name,category,qty,unit,min_qty,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)",
                 (item["id"], item["owner_id"], item["name"], item["category"], item["qty"], item["unit"], item["min_qty"], item["created_at"], item["updated_at"]))
    conn.commit()
    conn.close()
    return {"ok": True, "item": item}

def api_kitchen_update(handler, data):
    uid = _get_session_user_id(handler)
    if not uid: return {"error": "Not logged in"}
    item_id = data.get("id", "")
    if not item_id: return {"error": "ID required"}
    conn = _db_conn()
    existing = conn.execute("SELECT * FROM kitchen_items WHERE id=? AND owner_id=?", (item_id, uid)).fetchone()
    if not existing: conn.close(); return {"error": "Item not found"}
    updates = {}
    for field in ("name", "category", "unit", "expires_on"):
        if field in data: updates[field] = str(data[field])
    if "qty" in data: updates["qty"] = float(data["qty"] or 0)
    if "min_qty" in data:
        try: updates["min_qty"] = float(data["min_qty"])
        except: updates["min_qty"] = None
    updates["updated_at"] = _db_now()
    set_clause = ", ".join(k + "=?" for k in updates)
    vals = list(updates.values()) + [item_id, uid]
    conn.execute("UPDATE kitchen_items SET " + set_clause + " WHERE id=? AND owner_id=?", vals)
    conn.commit()
    updated = conn.execute("SELECT * FROM kitchen_items WHERE id=?", (item_id,)).fetchone()
    conn.close()
    return {"ok": True, "item": dict(updated) if updated else None}

def api_kitchen_remove(handler, data):
    uid = _get_session_user_id(handler)
    if not uid: return {"error": "Not logged in"}
    item_id = data.get("id", "")
    if not item_id: return {"error": "ID required"}
    conn = _db_conn()
    conn.execute("DELETE FROM kitchen_items WHERE id=? AND owner_id=?", (item_id, uid))
    conn.commit()
    conn.close()
    return {"ok": True}

def api_kitchen_clear(handler, data):
    uid = _get_session_user_id(handler)
    if not uid: return {"error": "Not logged in"}
    conn = _db_conn()
    conn.execute("DELETE FROM kitchen_items WHERE owner_id=?", (uid,))
    conn.commit()
    conn.close()
    return {"ok": True}

# ---- Shopping list CRUD ----

def api_shop_list(handler, data):
    uid = _get_session_user_id(handler)
    if not uid: return {"error": "Not logged in"}
    conn = _db_conn()
    rows = conn.execute("SELECT * FROM shopping_items WHERE owner_id=? ORDER BY created_at DESC", (uid,)).fetchall()
    conn.close()
    return {"items": _rows_to_dicts(rows)}

def api_shop_add(handler, data):
    uid = _get_session_user_id(handler)
    if not uid: return {"error": "Not logged in"}
    item = {
        "id": data.get("id", "shop-" + secrets.token_hex(6)),
        "owner_id": uid,
        "name": str(data.get("name", "")).strip(),
        "qty": float(data.get("qty", 1) or 1),
        "unit": str(data.get("unit", "pcs")),
        "shop_group": str(data.get("group", "")),
        "done": 1 if data.get("done") else 0,
        "created_at": _db_now(),
        "updated_at": _db_now()
    }
    if not item["name"]: return {"error": "Name required"}
    conn = _db_conn()
    # Upsert: if same name exists for this user, update it
    existing = conn.execute("SELECT id FROM shopping_items WHERE owner_id=? AND name=?", (uid, item["name"])).fetchone()
    if existing:
        item["id"] = existing["id"]
        conn.execute("UPDATE shopping_items SET qty=?, unit=?, shop_group=?, done=?, updated_at=? WHERE id=?",
                     (item["qty"], item["unit"], item["shop_group"], item["done"], item["updated_at"], item["id"]))
    else:
        conn.execute("INSERT INTO shopping_items (id,owner_id,name,qty,unit,shop_group,done,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)",
                     (item["id"], item["owner_id"], item["name"], item["qty"], item["unit"], item["shop_group"], item["done"], item["created_at"], item["updated_at"]))
    conn.commit()
    conn.close()
    return {"ok": True, "item": item}

def api_shop_update(handler, data):
    uid = _get_session_user_id(handler)
    if not uid: return {"error": "Not logged in"}
    item_id = data.get("id", "")
    if not item_id: return {"error": "ID required"}
    conn = _db_conn()
    existing = conn.execute("SELECT * FROM shopping_items WHERE id=? AND owner_id=?", (item_id, uid)).fetchone()
    if not existing: conn.close(); return {"error": "Item not found"}
    updates = {}
    for field in ("name", "unit", "shop_group"):
        if field in data: updates[field] = str(data[field])
    if "qty" in data: updates["qty"] = float(data["qty"] or 1)
    if "done" in data: updates["done"] = 1 if data["done"] else 0
    updates["updated_at"] = _db_now()
    set_clause = ", ".join(k + "=?" for k in updates)
    vals = list(updates.values()) + [item_id, uid]
    conn.execute("UPDATE shopping_items SET " + set_clause + " WHERE id=? AND owner_id=?", vals)
    conn.commit()
    updated = conn.execute("SELECT * FROM shopping_items WHERE id=?", (item_id,)).fetchone()
    conn.close()
    return {"ok": True, "item": dict(updated) if updated else None}

def api_shop_toggle(handler, data):
    uid = _get_session_user_id(handler)
    if not uid: return {"error": "Not logged in"}
    item_id = data.get("id", "")
    if not item_id: return {"error": "ID required"}
    conn = _db_conn()
    conn.execute("UPDATE shopping_items SET done=1-done, updated_at=? WHERE id=? AND owner_id=?", (_db_now(), item_id, uid))
    conn.commit()
    updated = conn.execute("SELECT * FROM shopping_items WHERE id=?", (item_id,)).fetchone()
    conn.close()
    return {"ok": True, "item": dict(updated) if updated else None}

def api_shop_remove(handler, data):
    uid = _get_session_user_id(handler)
    if not uid: return {"error": "Not logged in"}
    item_id = data.get("id", "")
    if not item_id: return {"error": "ID required"}
    conn = _db_conn()
    conn.execute("DELETE FROM shopping_items WHERE id=? AND owner_id=?", (item_id, uid))
    conn.commit()
    conn.close()
    return {"ok": True}

def api_shop_clear_done(handler, data):
    uid = _get_session_user_id(handler)
    if not uid: return {"error": "Not logged in"}
    conn = _db_conn()
    conn.execute("DELETE FROM shopping_items WHERE owner_id=? AND done=1", (uid,))
    conn.commit()
    conn.close()
    return {"ok": True}

# ---- Recipes CRUD ----

def api_recipes_list(handler, data):
    uid = _get_session_user_id(handler)
    if not uid: return {"error": "Not logged in"}
    conn = _db_conn()
    rows = conn.execute("SELECT * FROM recipes WHERE owner_id=? ORDER BY created_at DESC", (uid,)).fetchall()
    conn.close()
    # Deserialize JSON fields
    result = []
    for r in _rows_to_dicts(rows):
        for field in ("photos", "ingredients", "steps", "diet"):
            try: r[field] = json.loads(r.get(field, "[]") or "[]")
            except Exception: r[field] = [] if field != "diet" else []
        r["video"] = r.get("video", "") or ""
        r["videoThumb"] = r.get("video_thumb", "") or ""
        result.append(r)
    return {"recipes": result}

def api_recipes_save(handler, data):
    uid = _get_session_user_id(handler)
    if not uid: return {"error": "Not logged in"}
    rid = data.get("id", "my-" + secrets.token_hex(6))
    now = _db_now()
    conn = _db_conn()
    existing = conn.execute("SELECT * FROM recipes WHERE id=?", (rid,)).fetchone()
    photos = json.dumps(data.get("photos", []))
    ingredients = json.dumps(data.get("ingredients", []))
    steps = json.dumps(data.get("steps", []))
    diet = json.dumps(data.get("diet", []) or [])
    video = str(data.get("video", "") or "")
    video_thumb = str(data.get("videoThumb", "") or "")
    if existing and existing["owner_id"] == uid:
        conn.execute("""UPDATE recipes SET name=?,servings=?,time=?,kcal=?,tag=?,cat=?,icon=?,gradient=?,photos=?,img=?,video=?,video_thumb=?,ingredients=?,steps=?,diet=?,updated_at=? WHERE id=?""",
                     (data.get("name",""), data.get("servings",""), data.get("time",""), data.get("kcal",""),
                      data.get("tag",""), data.get("cat",""), data.get("icon","restaurant_menu"), data.get("gradient",""),
                      photos, data.get("img",""), video, video_thumb, ingredients, steps, diet, now, rid))
    elif not existing:
        conn.execute("""INSERT INTO recipes (id,owner_id,name,servings,time,kcal,tag,cat,icon,gradient,photos,img,video,video_thumb,ingredients,steps,diet,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                     (rid, uid, data.get("name",""), data.get("servings",""), data.get("time",""), data.get("kcal",""),
                      data.get("tag",""), data.get("cat",""), data.get("icon","restaurant_menu"), data.get("gradient",""),
                      photos, data.get("img",""), video, video_thumb, ingredients, steps, diet, now, now))
    else:
        conn.close()
        return {"error": "Recipe belongs to another user"}
    conn.commit()
    updated = conn.execute("SELECT * FROM recipes WHERE id=?", (rid,)).fetchone()
    conn.close()
    result = dict(updated) if updated else {}
    for field in ("photos", "ingredients", "steps", "diet"):
        try: result[field] = json.loads(result.get(field, "[]") or "[]")
        except Exception: result[field] = []
    result["video"] = result.get("video", "") or ""
    result["videoThumb"] = result.get("video_thumb", "") or ""
    return {"ok": True, "recipe": result}

def api_recipes_delete(handler, data):
    uid = _get_session_user_id(handler)
    if not uid: return {"error": "Not logged in"}
    rid = data.get("id", "")
    if not rid: return {"error": "ID required"}
    conn = _db_conn()
    conn.execute("DELETE FROM recipes WHERE id=? AND owner_id=?", (rid, uid))
    conn.commit()
    conn.close()
    return {"ok": True}

# ---- Posts CRUD ----

def api_posts_list(handler, data):
    uid = _get_session_user_id(handler)
    if not uid: return {"error": "Not logged in"}
    conn = _db_conn()
    # List all posts (social feed)
    rows = conn.execute("SELECT * FROM posts ORDER BY ts DESC LIMIT 200").fetchall()
    conn.close()
    return {"posts": _rows_to_dicts(rows)}

def api_posts_list_user(handler, data):
    uid = _get_session_user_id(handler)
    if not uid: return {"error": "Not logged in"}
    target_uid = data.get("userId", uid)
    conn = _db_conn()
    rows = conn.execute("SELECT * FROM posts WHERE owner_id=? ORDER BY ts DESC", (target_uid,)).fetchall()
    conn.close()
    return {"posts": _rows_to_dicts(rows)}

def api_posts_save(handler, data):
    uid = _get_session_user_id(handler)
    if not uid: return {"error": "Not logged in"}
    pid = data.get("id", "p-" + secrets.token_hex(6))
    now = _db_now()
    # Get display name
    db = _load_db()
    u = _find_by_id(db, uid)
    by_name = u["name"] if u else ""
    conn = _db_conn()
    existing = conn.execute("SELECT * FROM posts WHERE id=?", (pid,)).fetchone()
    if existing and existing["owner_id"] == uid:
        conn.execute("UPDATE posts SET text=?, by_name=?, ts=? WHERE id=?", (data.get("text",""), by_name, data.get("ts", now), pid))
    elif not existing:
        conn.execute("INSERT INTO posts (id,owner_id,text,by_name,ts,created_at) VALUES (?,?,?,?,?,?)",
                     (pid, uid, data.get("text",""), by_name, data.get("ts", now), now))
    else:
        conn.close()
        return {"error": "Post belongs to another user"}
    conn.commit()
    updated = conn.execute("SELECT * FROM posts WHERE id=?", (pid,)).fetchone()
    conn.close()
    return {"ok": True, "post": dict(updated) if updated else None}

def api_posts_delete(handler, data):
    uid = _get_session_user_id(handler)
    if not uid: return {"error": "Not logged in"}
    pid = data.get("id", "")
    if not pid: return {"error": "ID required"}
    conn = _db_conn()
    conn.execute("DELETE FROM posts WHERE id=? AND owner_id=?", (pid, uid))
    conn.commit()
    conn.close()
    return {"ok": True}

# ---- Comments CRUD ----

def api_comments_list(handler, data):
    uid = _get_session_user_id(handler)
    if not uid: return {"error": "Not logged in"}
    item_id = data.get("itemId", "")
    if not item_id: return {"error": "itemId required"}
    conn = _db_conn()
    rows = conn.execute("SELECT * FROM comments WHERE item_id=? ORDER BY created_at ASC", (item_id,)).fetchall()
    conn.close()
    return {"comments": _rows_to_dicts(rows)}

def api_comments_save(handler, data):
    uid = _get_session_user_id(handler)
    if not uid: return {"error": "Not logged in"}
    item_id = data.get("itemId", "")
    if not item_id: return {"error": "itemId required"}
    now = _db_now()
    db = _load_db()
    u = _find_by_id(db, uid)
    by_name = u["name"] if u else ""
    comments = data.get("comments", [])
    conn = _db_conn()
    conn.execute("DELETE FROM comments WHERE item_id=?", (item_id,))
    for c in comments:
        conn.execute("INSERT INTO comments (item_id,owner_id,text,by_name,ts,created_at) VALUES (?,?,?,?,?,?)",
                     (item_id, c.get("ownerId", uid), c.get("text",""), c.get("by", by_name), c.get("ts", now), now))
    conn.commit()
    conn.close()
    return {"ok": True}

# ---- Bulk migration endpoint ----

def api_migrate(handler, data):
    """Accept bulk localStorage data and import into SQLite. One-time migration."""
    uid = _get_session_user_id(handler)
    if not uid: return {"error": "Not logged in"}
    now = _db_now()
    conn = _db_conn()
    counts = {"recipes": 0, "kitchen_items": 0, "shopping_items": 0, "posts": 0, "comments": 0, "spending": 0}

    # Import inventory
    for item in data.get("inventory", []):
        try:
            conn.execute("INSERT OR REPLACE INTO kitchen_items (id,owner_id,name,category,qty,unit,min_qty,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)",
                         (item.get("id","itm-"+secrets.token_hex(6)), uid, item.get("name",""), item.get("category","pantry"),
                          float(item.get("qty",0) or 0), item.get("unit","pcs"),
                          float(item["min_qty"]) if item.get("min_qty") is not None else None,
                          item.get("ts", now), now))
            counts["kitchen_items"] += 1
        except: pass

    # Import shopping
    for item in data.get("shopping", []):
        try:
            conn.execute("INSERT OR REPLACE INTO shopping_items (id,owner_id,name,qty,unit,shop_group,done,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)",
                         (item.get("id","shop-"+secrets.token_hex(6)), uid, item.get("name",""),
                          float(item.get("qty",1) or 1), item.get("unit","pcs"), item.get("group",""),
                          1 if item.get("done") else 0, item.get("ts", now), now))
            counts["shopping_items"] += 1
        except: pass

    # Import recipes
    for item in data.get("recipes", []):
        try:
            conn.execute("INSERT OR REPLACE INTO recipes (id,owner_id,name,servings,time,kcal,tag,cat,icon,gradient,photos,img,video,video_thumb,ingredients,steps,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                         (item.get("id","my-"+secrets.token_hex(6)), uid, item.get("name",""), item.get("servings",""),
                          item.get("time",""), item.get("kcal",""), item.get("tag",""), item.get("cat",""),
                          item.get("icon","restaurant_menu"), item.get("gradient",""),
                          json.dumps(item.get("photos",[])), item.get("img",""),
                          item.get("video",""), item.get("videoThumb","") or item.get("video_thumb",""),
                          json.dumps(item.get("ingredients",[])), json.dumps(item.get("steps",[])),
                          item.get("ts", now), now))
            counts["recipes"] += 1
        except: pass

    # Import posts
    for item in data.get("posts", []):
        try:
            conn.execute("INSERT OR REPLACE INTO posts (id,owner_id,text,by_name,ts,created_at) VALUES (?,?,?,?,?,?)",
                         (item.get("id","p-"+secrets.token_hex(6)), uid, item.get("text",""), item.get("by",""),
                          item.get("ts", now), now))
            counts["posts"] += 1
        except: pass

    # Import comments
    for item_id, comments_list in data.get("comments", {}).items():
        for c in (comments_list if isinstance(comments_list, list) else []):
            try:
                conn.execute("INSERT OR REPLACE INTO comments (item_id,owner_id,text,by_name,ts,created_at) VALUES (?,?,?,?,?,?)",
                             (item_id, c.get("ownerId", uid), c.get("text",""), c.get("by",""),
                              c.get("ts", now), now))
                counts["comments"] += 1
            except: pass

    # Import profiles
    profile = data.get("profile", {})
    if profile:
        try:
            conn.execute("INSERT OR REPLACE INTO profiles (owner_id,name,tagline,bio,photo,updated_at) VALUES (?,?,?,?,?,?)",
                         (uid, profile.get("name",""), profile.get("tagline",""), profile.get("bio",""),
                          profile.get("photo",""), now))
        except: pass

    # Import spending log
    for item in data.get("spending", []):
        try:
            conn.execute("INSERT OR REPLACE INTO spending (id,owner_id,amount,category,item,qty,unit,date,ts,is_deleted,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
                         (item.get("id","sp-"+secrets.token_hex(6)), uid,
                          float(item.get("amount",0) or 0), str(item.get("category","Other")),
                          str(item.get("item","")), float(item.get("qty",0) or 0), str(item.get("unit","")),
                          str(item.get("date","") or ""), int(item.get("ts",0) or 0) or now,
                          0, now, now))
            counts["spending"] += 1
        except: pass

    conn.commit()
    conn.close()
    return {"ok": True, "counts": counts}

# ---- Catalog edits & hidden recipes (admin) ----

def api_catalog_edit_save(handler, data):
    uid = _get_session_user_id(handler)
    if not uid: return {"error": "Not logged in"}
    rid = data.get("id", "")
    if not rid: return {"error": "ID required"}
    conn = _db_conn()
    conn.execute("INSERT OR REPLACE INTO catalog_edits (recipe_id, data, updated_at) VALUES (?,?,?)",
                 (rid, json.dumps(data.get("recipe", {})), _db_now()))
    conn.commit()
    conn.close()
    return {"ok": True}

def api_catalog_hidden_list(handler, data):
    uid = _get_session_user_id(handler)
    if not uid: return {"error": "Not logged in"}
    conn = _db_conn()
    rows = conn.execute("SELECT recipe_id FROM hidden_recipes").fetchall()
    conn.close()
    return {"hidden": [r["recipe_id"] for r in rows]}

def api_catalog_hidden_toggle(handler, data):
    uid = _get_session_user_id(handler)
    if not uid: return {"error": "Not logged in"}
    rid = data.get("id", "")
    if not rid: return {"error": "ID required"}
    conn = _db_conn()
    existing = conn.execute("SELECT 1 FROM hidden_recipes WHERE recipe_id=?", (rid,)).fetchone()
    if existing:
        conn.execute("DELETE FROM hidden_recipes WHERE recipe_id=?", (rid,))
    else:
        conn.execute("INSERT INTO hidden_recipes (recipe_id) VALUES (?)", (rid,))
    conn.commit()
    conn.close()
    return {"ok": True, "hidden": not bool(existing)}


# ---- Bulk save endpoints (replace all items for a user) ----

def _incoming_ts(it, now):
    """Per-item last-modified timestamp sent by the client (_ua, ms)."""
    try:
        v = int(it.get("_ua") or it.get("ts") or 0)
        return v if v > 0 else now
    except Exception:
        return now


def _mark_deleted(conn, kind, uid, ids, now):
    """Record durable tombstones so late stale writes cannot resurrect rows."""
    for d in ids or []:
        try:
            conn.execute("INSERT OR REPLACE INTO deleted_items (kind,id,owner_id,deleted_at) VALUES (?,?,?,?)",
                         (kind, str(d), uid, int(now)))
        except Exception:
            pass


def _tombstoned(conn, kind, uid, iid, ts):
    """True when a delete for this id is newer than the incoming write."""
    try:
        r = conn.execute("SELECT deleted_at FROM deleted_items WHERE kind=? AND id=? AND owner_id=?",
                         (kind, iid, uid)).fetchone()
        return bool(r and ts < (r[0] or 0))
    except Exception:
        return False


def _foreign_row(conn, table, iid):
    """owner_id when the id already belongs to another user (global id PK)."""
    try:
        r = conn.execute("SELECT owner_id FROM %s WHERE id=?" % table, (iid,)).fetchone()
        return r[0] if r else None
    except Exception:
        return None


def api_kitchen_save_all(handler, data):
    uid = _get_session_user_id(handler)
    if not uid: return {"error": "Not logged in"}
    items = data.get("items", [])
    deleted_ids = [str(x) for x in (data.get("deleted_ids") or [])]
    now = _db_now()
    conn = _db_conn()
    if deleted_ids:
        q = ",".join(["?"] * len(deleted_ids))
        conn.execute("DELETE FROM kitchen_items WHERE owner_id=? AND id IN (%s)" % q, [uid] + deleted_ids)
        _mark_deleted(conn, "kitchen", uid, deleted_ids, now)
    kept = skipped = foreign = 0
    for it in items:
        try:
            iid = str(it.get("id") or ("itm-" + secrets.token_hex(6)))
            ts = _incoming_ts(it, now)
            row = conn.execute("SELECT updated_at FROM kitchen_items WHERE id=? AND owner_id=?", (iid, uid)).fetchone()
            if row and ts < (row["updated_at"] or 0):
                skipped += 1
                continue  # older copy loses the race (LWW reconciliation)
            if not row:
                if _tombstoned(conn, "kitchen", uid, iid, ts):
                    skipped += 1
                    continue  # deleted newer than this stale write
                if _foreign_row(conn, "kitchen_items", iid):
                    foreign += 1
                    continue  # id belongs to another user; never hijack it
            min_qty = None
            if it.get("min_qty") is not None:
                try: min_qty = float(it["min_qty"])
                except: pass
            elif it.get("min") is not None:
                try: min_qty = float(it["min"])
                except: pass
            vals = (str(it.get("name", "")).strip(), str(it.get("category", "pantry")),
                    float(it.get("qty", 0) or 0), str(it.get("unit", "pcs")), min_qty,
                    str(it.get("expires_on", "") or ""), ts)
            if row:
                conn.execute("UPDATE kitchen_items SET name=?,category=?,qty=?,unit=?,min_qty=?,expires_on=?,updated_at=? WHERE id=? AND owner_id=?",
                             vals + (iid, uid))
            else:
                conn.execute("INSERT INTO kitchen_items (id,owner_id,name,category,qty,unit,min_qty,expires_on,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)",
                             (iid, uid) + vals + (ts,))
            kept += 1
        except Exception:
            pass
    try:
        conn.execute("DELETE FROM deleted_items WHERE kind='kitchen' AND deleted_at < ?", (now - 30 * 24 * 3600 * 1000,))
    except Exception:
        pass
    conn.commit()
    conn.close()
    return {"ok": True, "count": kept, "skipped_older": skipped, "foreign_skipped": foreign}


def api_shop_save_all(handler, data):
    uid = _get_session_user_id(handler)
    if not uid: return {"error": "Not logged in"}
    items = data.get("items", [])
    deleted_ids = [str(x) for x in (data.get("deleted_ids") or [])]
    now = _db_now()
    conn = _db_conn()
    if deleted_ids:
        q = ",".join(["?"] * len(deleted_ids))
        conn.execute("DELETE FROM shopping_items WHERE owner_id=? AND id IN (%s)" % q, [uid] + deleted_ids)
        _mark_deleted(conn, "shop", uid, deleted_ids, now)
    kept = skipped = foreign = 0
    for it in items:
        try:
            iid = str(it.get("id") or ("shop-" + secrets.token_hex(6)))
            ts = _incoming_ts(it, now)
            row = conn.execute("SELECT updated_at FROM shopping_items WHERE id=? AND owner_id=?", (iid, uid)).fetchone()
            if row and ts < (row["updated_at"] or 0):
                skipped += 1
                continue
            if not row:
                if _tombstoned(conn, "shop", uid, iid, ts):
                    skipped += 1
                    continue
                if _foreign_row(conn, "shopping_items", iid):
                    foreign += 1
                    continue
            vals = (str(it.get("name", "")).strip(), float(it.get("qty", 1) or 1),
                    str(it.get("unit", "pcs")), str(it.get("group", "")),
                    1 if it.get("done") else 0, ts)
            if row:
                conn.execute("UPDATE shopping_items SET name=?,qty=?,unit=?,shop_group=?,done=?,updated_at=? WHERE id=? AND owner_id=?",
                             vals + (iid, uid))
            else:
                conn.execute("INSERT INTO shopping_items (id,owner_id,name,qty,unit,shop_group,done,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)",
                             (iid, uid) + vals + (ts,))
            kept += 1
        except Exception:
            pass
    try:
        conn.execute("DELETE FROM deleted_items WHERE kind='shop' AND deleted_at < ?", (now - 30 * 24 * 3600 * 1000,))
    except Exception:
        pass
    conn.commit()
    conn.close()
    return {"ok": True, "count": kept, "skipped_older": skipped, "foreign_skipped": foreign}


def api_recipes_save_all(handler, data):
    uid = _get_session_user_id(handler)
    if not uid: return {"error": "Not logged in"}
    items = data.get("items", [])
    deleted_ids = [str(x) for x in (data.get("deleted_ids") or [])]
    now = _db_now()
    conn = _db_conn()
    if deleted_ids:
        q = ",".join(["?"] * len(deleted_ids))
        conn.execute("DELETE FROM recipes WHERE owner_id=? AND id IN (%s)" % q, [uid] + deleted_ids)
        _mark_deleted(conn, "recipes", uid, deleted_ids, now)
    kept = skipped = foreign = 0
    for it in items:
        try:
            iid = str(it.get("id") or ("my-" + secrets.token_hex(6)))
            ts = _incoming_ts(it, now)
            row = conn.execute("SELECT updated_at FROM recipes WHERE id=? AND owner_id=?", (iid, uid)).fetchone()
            if row and ts < (row["updated_at"] or 0):
                skipped += 1
                continue
            if not row:
                if _tombstoned(conn, "recipes", uid, iid, ts):
                    skipped += 1
                    continue
                if _foreign_row(conn, "recipes", iid):
                    foreign += 1
                    continue
            vals = (it.get("name", ""), it.get("servings", ""), it.get("time", ""),
                    it.get("kcal", ""), it.get("tag", ""), it.get("cat", ""),
                    it.get("icon", "restaurant_menu"), it.get("gradient", ""),
                    json.dumps(it.get("photos", [])), it.get("img", ""),
                    it.get("video", ""), it.get("videoThumb", "") or it.get("video_thumb", ""),
                    json.dumps(it.get("ingredients", [])), json.dumps(it.get("steps", [])),
                    json.dumps(it.get("diet", []) or []), ts)
            if row:
                conn.execute("UPDATE recipes SET name=?,servings=?,time=?,kcal=?,tag=?,cat=?,icon=?,gradient=?,photos=?,img=?,video=?,video_thumb=?,ingredients=?,steps=?,diet=?,updated_at=? WHERE id=? AND owner_id=?",
                             vals + (iid, uid))
            else:
                conn.execute("INSERT INTO recipes (id,owner_id,name,servings,time,kcal,tag,cat,icon,gradient,photos,img,video,video_thumb,ingredients,steps,diet,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                             (iid, uid) + vals + (ts,))
            kept += 1
        except Exception:
            pass
    try:
        conn.execute("DELETE FROM deleted_items WHERE kind='recipes' AND deleted_at < ?", (now - 30 * 24 * 3600 * 1000,))
    except Exception:
        pass
    conn.commit()
    conn.close()
    return {"ok": True, "count": kept, "skipped_older": skipped, "foreign_skipped": foreign}


def api_posts_save_all(handler, data):
    uid = _get_session_user_id(handler)
    if not uid: return {"error": "Not logged in"}
    items = data.get("items", [])
    deleted_ids = [str(x) for x in (data.get("deleted_ids") or [])]
    now = _db_now()
    db = _load_db()
    u = _find_by_id(db, uid)
    by_name = u["name"] if u else ""
    conn = _db_conn()
    if deleted_ids:
        q = ",".join(["?"] * len(deleted_ids))
        conn.execute("DELETE FROM posts WHERE owner_id=? AND id IN (%s)" % q, [uid] + deleted_ids)
        _mark_deleted(conn, "posts", uid, deleted_ids, now)
    kept = skipped = foreign = 0
    for it in items:
        try:
            iid = str(it.get("id") or ("p-" + secrets.token_hex(6)))
            ts = _incoming_ts(it, now)
            row = conn.execute("SELECT updated_at FROM posts WHERE id=? AND owner_id=?", (iid, uid)).fetchone()
            if row and ts < (row["updated_at"] or 0):
                skipped += 1
                continue
            if not row:
                if _tombstoned(conn, "posts", uid, iid, ts):
                    skipped += 1
                    continue
                if _foreign_row(conn, "posts", iid):
                    foreign += 1
                    continue
            vals = (it.get("text", ""), it.get("by", by_name), int(it.get("ts", 0) or 0), ts)
            if row:
                conn.execute("UPDATE posts SET text=?,by_name=?,ts=?,updated_at=? WHERE id=? AND owner_id=?", vals + (iid, uid))
            else:
                conn.execute("INSERT INTO posts (id,owner_id,text,by_name,ts,created_at,updated_at) VALUES (?,?,?,?,?,?,?)",
                             (iid, uid) + vals + (ts,))
            kept += 1
        except Exception:
            pass
    try:
        conn.execute("DELETE FROM deleted_items WHERE kind='posts' AND deleted_at < ?", (now - 30 * 24 * 3600 * 1000,))
    except Exception:
        pass
    conn.commit()
    conn.close()
    return {"ok": True, "count": kept, "skipped_older": skipped, "foreign_skipped": foreign}


def api_budget_list(handler, data):
    uid = _get_session_user_id(handler)
    if not uid: return {"error": "Not logged in"}
    conn = _db_conn()
    try:
        rows = conn.execute("SELECT * FROM spending WHERE owner_id=? AND is_deleted=0 ORDER BY ts DESC", (uid,)).fetchall()
    except Exception:
        conn.close()
        return {"items": []}
    conn.close()
    items = [{
        "id": r["id"], "amount": r["amount"], "category": r["category"],
        "item": r["item"], "qty": r["qty"], "unit": r["unit"],
        "date": r["date"] or "", "ts": r["ts"] or 0, "updated_at": r["updated_at"]
    } for r in rows]
    return {"items": items}


def api_budget_save_all(handler, data):
    uid = _get_session_user_id(handler)
    if not uid: return {"error": "Not logged in"}
    items = data.get("items", [])
    deleted_ids = [str(x) for x in (data.get("deleted_ids") or [])]
    now = _db_now()
    conn = _db_conn()
    if deleted_ids:
        q = ",".join(["?"] * len(deleted_ids))
        try:
            conn.execute("UPDATE spending SET is_deleted=1, updated_at=? WHERE owner_id=? AND id IN (%s)" % q, [now, uid] + deleted_ids)
            _mark_deleted(conn, "budget", uid, deleted_ids, now)
        except Exception:
            pass
    kept = skipped = foreign = 0
    for it in items:
        try:
            iid = str(it.get("id") or ("sp-" + secrets.token_hex(6)))
            ts = _incoming_ts(it, now)
            row = conn.execute("SELECT updated_at, is_deleted FROM spending WHERE id=? AND owner_id=? AND is_deleted=0", (iid, uid)).fetchone()
            if row and ts < (row["updated_at"] or 0):
                skipped += 1
                continue
            if not row:
                if _tombstoned(conn, "budget", uid, iid, ts):
                    skipped += 1
                    continue
                if _foreign_row(conn, "spending", iid):
                    foreign += 1
                    continue
            vals = (float(it.get("amount", 0) or 0), str(it.get("category", "Other")),
                    str(it.get("item", "")), float(it.get("qty", 0) or 0), str(it.get("unit", "")),
                    str(it.get("date", "") or ""), int(it.get("ts", 0) or 0) or ts, ts)
            if row:
                conn.execute("UPDATE spending SET amount=?,category=?,item=?,qty=?,unit=?,date=?,ts=?,updated_at=? WHERE id=? AND owner_id=? AND is_deleted=0",
                             vals + (iid, uid))
            else:
                conn.execute("INSERT INTO spending (id,owner_id,amount,category,item,qty,unit,date,ts,is_deleted,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
                             (iid, uid, vals[0], vals[1], vals[2], vals[3], vals[4], vals[5], vals[6], 0, ts, ts))
            kept += 1
        except Exception:
            pass
    try:
        conn.execute("DELETE FROM deleted_items WHERE kind='budget' AND deleted_at < ?", (now - 30 * 24 * 3600 * 1000,))
    except Exception:
        pass
    conn.commit()
    conn.close()
    return {"ok": True, "count": kept, "skipped_older": skipped, "foreign_skipped": foreign}


# ---- Image upload ----

def _ensure_upload_dirs():
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    os.makedirs(THUMB_DIR, exist_ok=True)
    os.makedirs(VIDEO_DIR, exist_ok=True)

def _parse_multipart(handler):
    """Parse multipart/form-data from the request body. Returns list of
    {name, filename, content_type, data} dicts for each file part."""
    content_type = handler.headers.get("Content-Type", "")
    m = re.search(r"boundary=(.+?)(?:;|$)", content_type)
    if not m:
        return []
    boundary = m.group(1).strip().encode()
    length = int(handler.headers.get("Content-Length", 0))
    raw = handler.rfile.read(length)
    parts = []
    for part in raw.split(b"--" + boundary):
        if not part or part.strip() == b"" or part.strip() == b"--":
            continue
        if b"\r\n\r\n" not in part:
            continue
        header_block, body = part.split(b"\r\n\r\n", 1)
        # Strip trailing \r\n from body
        if body.endswith(b"\r\n"):
            body = body[:-2]
        headers_text = header_block.decode("utf-8", errors="replace")
        h_name = ""
        h_filename = ""
        h_ct = ""
        for line in headers_text.split("\r\n"):
            line = line.strip()
            if line.lower().startswith("content-disposition:"):
                nm = re.search(r'name="([^"]+)"', line)
                fn = re.search(r'filename="([^"]+)"', line)
                if nm: h_name = nm.group(1)
                if fn: h_filename = unquote_plus(fn.group(1))
            elif line.lower().startswith("content-type:"):
                h_ct = line.split(":", 1)[1].strip()
        if h_filename:
            parts.append({"name": h_name, "filename": h_filename, "content_type": h_ct, "data": body})
    return parts

def _gen_image_id():
    return "img-" + secrets.token_hex(8)

def _save_upload_image(handler, file_data, content_type, image_id=None):
    """Save an uploaded image, generate thumbnails, return the image record."""
    _ensure_upload_dirs()
    ext_map = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/gif": ".gif"}
    ext = ext_map.get(content_type, ".jpg")
    if not image_id:
        image_id = _gen_image_id()
    filename = image_id + ext
    filepath = os.path.join(UPLOAD_DIR, filename)
    with open(filepath, "wb") as f:
        f.write(file_data)
    record = {
        "id": image_id,
        "filename": filename,
        "url": "uploads/" + filename,
        "size": len(file_data),
        "type": content_type,
    }
    # Generate thumbnails using Pillow
    if _HAS_PIL:
        try:
            img = _PILImage.open(filepath)
            for label, (tw, th) in THUMB_SIZES.items():
                thumb = img.copy()
                thumb.thumbnail((tw, th), _PILImage.LANCZOS)
                thumb_name = image_id + "_" + label + ext
                thumb_path = os.path.join(THUMB_DIR, thumb_name)
                if content_type == "image/png":
                    thumb.save(thumb_path, "PNG", optimize=True)
                elif content_type == "image/webp":
                    thumb.save(thumb_path, "WEBP", quality=85)
                else:
                    thumb.save(thumb_path, "JPEG", quality=85, optimize=True)
                record["thumb_" + label] = "uploads/thumbs/" + thumb_name
        except Exception:
            pass
    return record

def _delete_image_file(image_url):
    """Delete an image file and its thumbnails by URL path."""
    if not image_url or not image_url.startswith("uploads/"):
        return
    # Prevent path traversal
    safe = image_url.replace("\\", "/")
    if ".." in safe:
        return
    full = os.path.join(APP_DIR, safe)
    try:
        if os.path.isfile(full):
            os.remove(full)
    except Exception:
        pass
    # Also try to delete thumbnails (guess thumb names from main file)
    base = os.path.basename(safe)
    name_no_ext = os.path.splitext(base)[0]
    ext = os.path.splitext(base)[1]
    for label in THUMB_SIZES:
        thumb_name = name_no_ext + "_" + label + ext
        thumb_path = os.path.join(THUMB_DIR, thumb_name)
        try:
            if os.path.isfile(thumb_path):
                os.remove(thumb_path)
        except Exception:
            pass

def api_upload_image(handler, data):
    """Handle multipart image upload. Returns image record with URL."""
    uid = _get_session_user_id(handler)
    if not uid:
        return {"error": "Not logged in"}
    parts = _parse_multipart(handler)
    if not parts:
        return {"error": "No file uploaded"}
    p = parts[0]
    ct = p["content_type"]
    if ct not in ALLOWED_IMAGE_TYPES:
        return {"error": "Unsupported image type: %s (allowed: JPEG, PNG, WebP, GIF)" % ct}
    if len(p["data"]) > MAX_IMAGE_SIZE:
        return {"error": "Image too large (%d MB max)" % (MAX_IMAGE_SIZE // (1024 * 1024))}
    try:
        rec = _save_upload_image(handler, p["data"], ct)
        return {"ok": True, "image": rec}
    except Exception as e:
        return {"error": "Upload failed: %s" % str(e)}

def api_delete_image(handler, data):
    """Delete an uploaded image and its thumbnails."""
    uid = _get_session_user_id(handler)
    if not uid:
        return {"error": "Not logged in"}
    url = data.get("url", "")
    if not url:
        return {"error": "No URL provided"}
    # IDOR guard: only the owner of the referencing recipe/profile (or an
    # admin) may delete the file.
    allowed = False
    conn = _db_conn()
    for row in conn.execute("SELECT photos, img FROM recipes WHERE owner_id=?", (uid,)):
        if row[1] == url:
            allowed = True
            break
        try:
            if url in json.loads(row[0] or "[]"):
                allowed = True
                break
        except Exception:
            pass
    if not allowed and conn.execute("SELECT 1 FROM profiles WHERE owner_id=? AND photo=?", (uid, url)).fetchone():
        allowed = True
    conn.close()
    if not allowed:
        db = _load_db()
        u = _find_by_id(db, uid)
        if not (u and u.get("role") == "admin"):
            return {"error": "Not your image"}
    _delete_image_file(url)
    return {"ok": True}

def api_cleanup_images(handler, data):
    """Remove orphaned images not referenced by any recipe, profile, or post.
    Requires admin."""
    uid = _get_session_user_id(handler)
    if not uid:
        return {"error": "Not logged in"}
    db = _load_db()
    u = _find_by_id(db, uid)
    if not u or u.get("role") != "admin":
        return {"error": "Admin only"}
    _ensure_upload_dirs()
    # Collect all referenced URLs from DB
    referenced = set()
    # Profiles
    conn = _db_conn()
    for row in conn.execute("SELECT photo FROM profiles WHERE photo IS NOT NULL AND photo != ''"):
        referenced.add(row[0])
    # Recipes
    for row in conn.execute("SELECT photos, img FROM recipes"):
        try:
            for p in json.loads(row[0] or "[]"):
                if p: referenced.add(p)
        except: pass
        if row[1]: referenced.add(row[1])
    # Posts
    for row in conn.execute("SELECT text FROM posts"):
        pass  # posts don't store image URLs in text
    conn.close()
    # Scan upload dir
    deleted = 0
    for fname in os.listdir(UPLOAD_DIR):
        fpath = os.path.join(UPLOAD_DIR, fname)
        if not os.path.isfile(fpath):
            continue
        url = "uploads/" + fname
        if url not in referenced:
            try:
                os.remove(fpath)
                deleted += 1
            except: pass
    # Scan thumb dir
    for fname in os.listdir(THUMB_DIR):
        fpath = os.path.join(THUMB_DIR, fname)
        if os.path.isfile(fpath):
            # Check if parent image still exists
            base = fname
            for label in THUMB_SIZES:
                base = base.replace("_" + label, "")
            if "uploads/" + base not in referenced:
                try:
                    os.remove(fpath)
                    deleted += 1
                except: pass
    return {"ok": True, "deleted": deleted}


# ---- Video upload ----

def _gen_video_id():
    return "vid-" + secrets.token_hex(8)

def _save_upload_video(handler, file_data, content_type, video_id=None):
    """Save an uploaded video file. Attempt thumbnail extraction via ffmpeg."""
    _ensure_upload_dirs()
    ext_map = {"video/mp4": ".mp4", "video/webm": ".webm", "video/quicktime": ".mov", "video/ogg": ".ogv"}
    ext = ext_map.get(content_type, ".mp4")
    if not video_id:
        video_id = _gen_video_id()
    filename = video_id + ext
    filepath = os.path.join(VIDEO_DIR, filename)
    with open(filepath, "wb") as f:
        f.write(file_data)
    record = {
        "id": video_id,
        "filename": filename,
        "url": "uploads/videos/" + filename,
        "size": len(file_data),
        "type": content_type,
    }
    # Try to extract a thumbnail frame using ffmpeg (best-effort)
    thumb_name = video_id + ".jpg"
    thumb_path = os.path.join(THUMB_DIR, thumb_name)
    try:
        import subprocess
        subprocess.run(
            ["ffmpeg", "-y", "-i", filepath, "-ss", "00:00:01", "-vframes", "1",
             "-vf", "scale=400:-1", thumb_path],
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=10
        )
        if os.path.isfile(thumb_path):
            record["thumb"] = "uploads/thumbs/" + thumb_name
    except Exception:
        pass
    # If ffmpeg failed or isn't available, try PIL on first frame (mp4 won't work,
    # but webm seekable might). Skip silently — client will show a play icon fallback.
    if "thumb" not in record and _HAS_PIL:
        try:
            from PIL import Image as _PILImg
            # For GIF-like animated formats, try opening directly
            img = _PILImg.open(filepath)
            img.thumbnail((400, 400), _PILImg.LANCZOS)
            img.save(thumb_path, "JPEG", quality=85)
            if os.path.isfile(thumb_path):
                record["thumb"] = "uploads/thumbs/" + thumb_name
        except Exception:
            pass
    return record

def api_upload_video(handler, data):
    """Handle multipart video upload. Returns video record with URL."""
    uid = _get_session_user_id(handler)
    if not uid:
        return {"error": "Not logged in"}
    parts = _parse_multipart(handler)
    if not parts:
        return {"error": "No file uploaded"}
    p = parts[0]
    ct = p["content_type"]
    if ct not in ALLOWED_VIDEO_TYPES:
        return {"error": "Unsupported video type: %s (allowed: MP4, WebM, MOV, OGG)" % ct}
    if len(p["data"]) > MAX_VIDEO_SIZE:
        return {"error": "Video too large (%d MB max)" % (MAX_VIDEO_SIZE // (1024 * 1024))}
    try:
        rec = _save_upload_video(handler, p["data"], ct)
        return {"ok": True, "video": rec}
    except Exception as e:
        return {"error": "Upload failed: %s" % str(e)}

def api_delete_video(handler, data):
    """Delete an uploaded video and its thumbnail."""
    uid = _get_session_user_id(handler)
    if not uid:
        return {"error": "Not logged in"}
    url = data.get("url", "")
    if not url:
        return {"error": "No URL provided"}
    # Only allow deleting your own videos
    allowed = False
    conn = _db_conn()
    for row in conn.execute("SELECT photos, img FROM recipes WHERE owner_id=?", (uid,)):
        if row[1] == url:
            allowed = True
            break
        try:
            if url in json.loads(row[0] or "[]"):
                allowed = True
                break
        except Exception:
            pass
    conn.close()
    if not allowed:
        db = _load_db()
        u = _find_by_id(db, uid)
        if not (u and u.get("role") == "admin"):
            return {"error": "Not your video"}
    _delete_video_file(url)
    return {"ok": True}

def _delete_video_file(video_url):
    """Delete a video file and its thumbnail by URL path."""
    if not video_url or not video_url.startswith("uploads/videos/"):
        return
    safe = video_url.replace("\\", "/")
    if ".." in safe:
        return
    full = os.path.join(APP_DIR, safe)
    try:
        if os.path.isfile(full):
            os.remove(full)
    except Exception:
        pass
    # Also try to delete thumbnail (same name but .jpg)
    base = os.path.basename(safe)
    name_no_ext = os.path.splitext(base)[0]
    thumb_path = os.path.join(THUMB_DIR, name_no_ext + ".jpg")
    try:
        if os.path.isfile(thumb_path):
            os.remove(thumb_path)
    except Exception:
        pass


# ---- Social: Likes ----

def api_like(handler, data):
    uid = _get_session_user_id(handler)
    if not uid: return {"error": "Not logged in"}
    pid = data.get("postId", "")
    if not pid: return {"error": "postId required"}
    now = _db_now()
    conn = _db_conn()
    existing = conn.execute("SELECT 1 FROM likes WHERE post_id=? AND user_id=?", (pid, uid)).fetchone()
    if existing:
        conn.close()
        return {"ok": True, "liked": True, "count": api_like_count(None, pid)["count"]}
    conn.execute("INSERT INTO likes (post_id, user_id, ts) VALUES (?,?,?)", (pid, uid, now))
    # Create notification for post owner
    post = conn.execute("SELECT owner_id, by_name FROM posts WHERE id=?", (pid,)).fetchone()
    if post and post[0] != uid:
        actor = conn.execute("SELECT name FROM profiles WHERE owner_id=?", (uid,)).fetchone()
        actor_name = actor[0] if actor else uid
        nid = "notif-" + secrets.token_hex(8)
        conn.execute("INSERT INTO notifications (id,owner_id,actor_id,type,item_id,icon,title,desc,href,ts,read) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
                     (nid, post[0], uid, "like", pid, "favorite", actor_name + " liked your post", "", "post:" + pid, now, 0))
    conn.commit()
    count = conn.execute("SELECT COUNT(*) FROM likes WHERE post_id=?", (pid,)).fetchone()[0]
    conn.close()
    return {"ok": True, "liked": True, "count": count}

def api_unlike(handler, data):
    uid = _get_session_user_id(handler)
    if not uid: return {"error": "Not logged in"}
    pid = data.get("postId", "")
    if not pid: return {"error": "postId required"}
    conn = _db_conn()
    conn.execute("DELETE FROM likes WHERE post_id=? AND user_id=?", (pid, uid))
    conn.commit()
    count = conn.execute("SELECT COUNT(*) FROM likes WHERE post_id=?", (pid,)).fetchone()[0]
    conn.close()
    return {"ok": True, "liked": False, "count": count}

def api_like_count(handler, pid):
    conn = _db_conn()
    row = conn.execute("SELECT COUNT(*) FROM likes WHERE post_id=?", (pid,)).fetchone()
    conn.close()
    return {"count": row[0] if row else 0}

def api_like_status(handler, data):
    uid = _get_session_user_id(handler)
    pid = data.get("postId", "")
    if not pid: return {"error": "postId required"}
    conn = _db_conn()
    count = conn.execute("SELECT COUNT(*) FROM likes WHERE post_id=?", (pid,)).fetchone()[0]
    liked = False
    if uid:
        row = conn.execute("SELECT 1 FROM likes WHERE post_id=? AND user_id=?", (pid, uid)).fetchone()
        liked = bool(row)
    conn.close()
    return {"ok": True, "liked": liked, "count": count}

def api_like_batch(handler, data):
    """Return like status+count for multiple post IDs at once."""
    uid = _get_session_user_id(handler)
    ids = data.get("postIds", [])
    if not ids: return {"ok": True, "likes": {}}
    conn = _db_conn()
    result = {}
    for pid in ids:
        count = conn.execute("SELECT COUNT(*) FROM likes WHERE post_id=?", (pid,)).fetchone()[0]
        liked = False
        if uid:
            row = conn.execute("SELECT 1 FROM likes WHERE post_id=? AND user_id=?", (pid, uid)).fetchone()
            liked = bool(row)
        result[pid] = {"liked": liked, "count": count}
    conn.close()
    return {"ok": True, "likes": result}


# ---- Social: Follows ----

def api_follow(handler, data):
    uid = _get_session_user_id(handler)
    if not uid: return {"error": "Not logged in"}
    target = data.get("userId", "")
    if not target or target == uid: return {"error": "Invalid target"}
    now = _db_now()
    conn = _db_conn()
    existing = conn.execute("SELECT 1 FROM follows WHERE follower_id=? AND following_id=?", (uid, target)).fetchone()
    if existing:
        conn.close()
        return {"ok": True, "following": True}
    conn.execute("INSERT INTO follows (follower_id, following_id, ts) VALUES (?,?,?)", (uid, target, now))
    # Notification
    actor = conn.execute("SELECT name FROM profiles WHERE owner_id=?", (uid,)).fetchone()
    actor_name = actor[0] if actor else uid
    nid = "notif-" + secrets.token_hex(8)
    conn.execute("INSERT INTO notifications (id,owner_id,actor_id,type,item_id,icon,title,desc,href,ts,read) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
                 (nid, target, uid, "follow", uid, "person_add", actor_name + " started following you", "", "profile:" + uid, now, 0))
    conn.commit()
    conn.close()
    return {"ok": True, "following": True}

def api_unfollow(handler, data):
    uid = _get_session_user_id(handler)
    if not uid: return {"error": "Not logged in"}
    target = data.get("userId", "")
    if not target: return {"error": "userId required"}
    conn = _db_conn()
    conn.execute("DELETE FROM follows WHERE follower_id=? AND following_id=?", (uid, target))
    conn.commit()
    conn.close()
    return {"ok": True, "following": False}

def api_follow_status(handler, data):
    uid = _get_session_user_id(handler)
    target = data.get("userId", "")
    if not target: return {"error": "userId required"}
    conn = _db_conn()
    following = False
    if uid:
        row = conn.execute("SELECT 1 FROM follows WHERE follower_id=? AND following_id=?", (uid, target)).fetchone()
        following = bool(row)
    fc = conn.execute("SELECT COUNT(*) FROM follows WHERE following_id=?", (target,)).fetchone()[0]
    fgc = conn.execute("SELECT COUNT(*) FROM follows WHERE follower_id=?", (target,)).fetchone()[0]
    conn.close()
    return {"ok": True, "following": following, "followerCount": fc, "followingCount": fgc}

def api_followers(handler, data):
    uid = _get_session_user_id(handler)
    target = data.get("userId", "")
    if not target: target = uid or ""
    conn = _db_conn()
    rows = conn.execute("SELECT follower_id, ts FROM follows WHERE following_id=? ORDER BY ts DESC", (target,)).fetchall()
    result = []
    for r in rows:
        u = _find_by_id(_load_db(), r[0])
        if u:
            result.append({"id": u["id"], "name": u["name"], "ts": r[1]})
    conn.close()
    return {"ok": True, "followers": result}

def api_following(handler, data):
    uid = _get_session_user_id(handler)
    target = data.get("userId", "")
    if not target: target = uid or ""
    conn = _db_conn()
    rows = conn.execute("SELECT following_id, ts FROM follows WHERE follower_id=? ORDER BY ts DESC", (target,)).fetchall()
    result = []
    for r in rows:
        u = _find_by_id(_load_db(), r[0])
        if u:
            result.append({"id": u["id"], "name": u["name"], "ts": r[1]})
    conn.close()
    return {"ok": True, "following": result}


# ---- Social: Post Comments ----

def api_post_comments_list(handler, data):
    pid = data.get("postId", "")
    if not pid: return {"error": "postId required"}
    conn = _db_conn()
    rows = conn.execute("SELECT item_id,owner_id,text,by_name,ts,created_at FROM comments WHERE item_id=? ORDER BY created_at ASC", (pid,)).fetchall()
    result = [{"postId": r[0], "ownerId": r[1], "text": r[2], "by": r[3], "ts": r[4]} for r in rows]
    conn.close()
    return {"ok": True, "comments": result}

def api_post_comments_save(handler, data):
    uid = _get_session_user_id(handler)
    if not uid: return {"error": "Not logged in"}
    pid = data.get("postId", "")
    text = str(data.get("text", "")).strip()
    if not pid or not text: return {"error": "postId and text required"}
    now = _db_now()
    conn = _db_conn()
    actor = conn.execute("SELECT name FROM profiles WHERE owner_id=?", (uid,)).fetchone()
    by_name = actor[0] if actor else uid
    conn.execute("INSERT INTO comments (item_id,owner_id,text,by_name,ts,created_at) VALUES (?,?,?,?,?,?)",
                 (pid, uid, text, by_name, now, now))
    # Notification for post owner
    post = conn.execute("SELECT owner_id FROM posts WHERE id=?", (pid,)).fetchone()
    if post and post[0] != uid:
        nid = "notif-" + secrets.token_hex(8)
        conn.execute("INSERT INTO notifications (id,owner_id,actor_id,type,item_id,icon,title,desc,href,ts,read) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
                     (nid, post[0], uid, "comment", pid, "chat_bubble", by_name + " commented on your post", text[:100], "post:" + pid, now, 0))
    conn.commit()
    # Return updated comments
    rows = conn.execute("SELECT item_id,owner_id,text,by_name,ts,created_at FROM comments WHERE item_id=? ORDER BY created_at ASC", (pid,)).fetchall()
    result = [{"postId": r[0], "ownerId": r[1], "text": r[2], "by": r[3], "ts": r[4]} for r in rows]
    conn.close()
    return {"ok": True, "comments": result}


# ---- Social: Notifications ----

def api_notifications_list(handler, data):
    uid = _get_session_user_id(handler)
    if not uid: return {"error": "Not logged in"}
    conn = _db_conn()
    rows = conn.execute("SELECT id,owner_id,actor_id,type,item_id,icon,title,desc,href,ts,read FROM notifications WHERE owner_id=? ORDER BY ts DESC LIMIT 50", (uid,)).fetchall()
    result = [{"id": r[0], "ownerId": r[1], "actorId": r[2], "type": r[3], "itemId": r[4], "icon": r[5], "title": r[6], "desc": r[7], "href": r[8], "ts": r[9], "read": bool(r[10])} for r in rows]
    unread = conn.execute("SELECT COUNT(*) FROM notifications WHERE owner_id=? AND read=0", (uid,)).fetchone()[0]
    conn.close()
    return {"ok": True, "notifications": result, "unread": unread}

def api_notifications_read(handler, data):
    uid = _get_session_user_id(handler)
    if not uid: return {"error": "Not logged in"}
    ids = data.get("ids", [])
    conn = _db_conn()
    if ids:
        placeholders = ",".join(["?" for _ in ids])
        conn.execute("UPDATE notifications SET read=1 WHERE owner_id=? AND id IN (%s)" % placeholders, [uid] + ids)
    else:
        conn.execute("UPDATE notifications SET read=1 WHERE owner_id=?", (uid,))
    conn.commit()
    conn.close()
    return {"ok": True}

def api_unread_count(handler, data):
    uid = _get_session_user_id(handler)
    if not uid: return {"ok": True, "unread": 0}
    conn = _db_conn()
    row = conn.execute("SELECT COUNT(*) FROM notifications WHERE owner_id=? AND read=0", (uid,)).fetchone()
    conn.close()
    return {"ok": True, "unread": row[0] if row else 0}


# ---- Social: Activity Feed ----

def api_activity_feed(handler, data):
    uid = _get_session_user_id(handler)
    if not uid: return {"error": "Not logged in"}
    conn = _db_conn()
    # Get users this person follows
    following_rows = conn.execute("SELECT following_id FROM follows WHERE follower_id=?", (uid,)).fetchall()
    following_ids = [r[0] for r in following_rows]
    # Always include own posts + followed users' posts
    all_ids = [uid] + following_ids
    if not all_ids:
        conn.close()
        return {"ok": True, "posts": []}
    placeholders = ",".join(["?" for _ in all_ids])
    rows = conn.execute("SELECT id,owner_id,text,by_name,ts,created_at FROM posts WHERE owner_id IN (%s) ORDER BY ts DESC LIMIT 100" % placeholders, all_ids).fetchall()
    posts = [{"id": r[0], "ownerId": r[1], "text": r[2], "by": r[3], "ts": r[4]} for r in rows]
    conn.close()
    return {"ok": True, "posts": posts}


# ---- Achievements (Phase 7) ----

def _achievement_stats_for(conn, uid):
    """Achievement stats computable from server tables."""
    return {
        "recipes": conn.execute("SELECT COUNT(*) FROM recipes WHERE owner_id=?", (uid,)).fetchone()[0],
        "posts": conn.execute("SELECT COUNT(*) FROM posts WHERE owner_id=?", (uid,)).fetchone()[0],
        "followers": conn.execute("SELECT COUNT(*) FROM follows WHERE following_id=?", (uid,)).fetchone()[0],
        "likes": conn.execute(
            "SELECT COUNT(*) FROM likes l JOIN posts p ON l.post_id=p.id WHERE p.owner_id=?",
            (uid,)).fetchone()[0]
    }


def _achievement_criteria_met(criteria, stats):
    t = criteria.get("type", "")
    val = criteria.get("value", 0)
    if t == "recipeCooked":
        cooked_ids = stats.get("cookedIds") or []
        if isinstance(cooked_ids, str):
            try: cooked_ids = json.loads(cooked_ids)
            except Exception: cooked_ids = []
        return str(val) in [str(x) for x in cooked_ids]
    cur = stats.get(t)
    if isinstance(cur, bool) or not isinstance(cur, (int, float)):
        return False
    return cur >= val


def _achievements_state(conn, uid):
    unlocked_rows = conn.execute("SELECT badge_id, unlocked_at FROM achievements WHERE user_id=? ORDER BY unlocked_at ASC", (uid,)).fetchall()
    return [{"badgeId": r[0], "unlockedAt": r[1]} for r in unlocked_rows]


def _persist_achievement(conn, uid, badge_id, now):
    conn.execute("INSERT OR IGNORE INTO achievements (user_id, badge_id, unlocked_at) VALUES (?,?,?)",
                 (uid, badge_id, now))


def api_achievements_list(handler, data):
    """List achievement badges + unlock state for a user.
    Mirrors GET /api/achievements/<userId>."""
    uid = _get_session_user_id(handler)
    target = data.get("userId", "") or uid or ""
    if not target: return {"error": "userId required"}
    conn = _db_conn()
    state = {
        "ok": True,
        "userId": target,
        "badges": ACHIEVEMENT_DEFS,
        "unlocked": _achievements_state(conn, target)
    }
    conn.close()
    return state


def api_achievements_evaluate(handler, data):
    """Evaluate achievement triggers for the session user.

    Accepts client-side stats for localStorage-only metrics:
      cooked (int), streak (int), savedKg (number), cookedIds ([recipe id])
    Server-computed: recipes, posts, followers, likes.
    Persists newly earned badges; returns the full new-unlock list so the
    client can celebrate exactly once per badge.
    """
    uid = _get_session_user_id(handler)
    if not uid: return {"error": "Not logged in"}
    extra = data.get("stats") or {}
    now = _db_now()
    conn = _db_conn()
    merged = _achievement_stats_for(conn, uid)
    # Client-supplied local-only metrics fill gaps (never override server counts).
    for key in ("cooked", "streak", "savedKg"):
        v = extra.get(key)
        if key in merged or v is None: continue
        try: merged[key] = float(v)
        except Exception: pass
    if "cookedIds" in extra and isinstance(extra["cookedIds"], list):
        merged["cookedIds"] = extra["cookedIds"]
    before = {u["badgeId"] for u in _achievements_state(conn, uid)}
    newly = []
    for badge in ACHIEVEMENT_DEFS:
        if badge["id"] in before: continue
        if _achievement_criteria_met(badge["criteria"], merged):
            _persist_achievement(conn, uid, badge["id"], now)
            newly.append({"badgeId": badge["id"], "name": badge["name"],
                          "description": badge["description"], "icon": badge["icon"],
                          "unlockedAt": now})
    if newly:
        conn.commit()
    state = {
        "ok": True,
        "userId": uid,
        "badges": ACHIEVEMENT_DEFS,
        "unlocked": _achievements_state(conn, uid),
        "stats": merged,
        "newlyUnlocked": newly
    }
    conn.close()
    return state


def api_achievements_unlock(handler, data):
    """Explicitly record unlocks computed client-side (offline-first sync)."""
    uid = _get_session_user_id(handler)
    if not uid: return {"error": "Not logged in"}
    unlocks = data.get("unlocks") or []
    now = _db_now()
    conn = _db_conn()
    known_before = {u["badgeId"] for u in _achievements_state(conn, uid)}
    added = []
    for item in unlocks:
        bid = str(item.get("badgeId", "")) if isinstance(item, dict) else str(item)
        if bid not in ACHIEVEMENT_INDEX or bid in known_before: continue
        at = int(item.get("unlockedAt", 0)) if isinstance(item, dict) and str(item.get("unlockedAt", 0)).isdigit() else now
        _persist_achievement(conn, uid, bid, at)
        added.append(bid)
    if added:
        conn.commit()
    state = {
        "ok": True,
        "added": added,
        "userId": uid,
        "badges": ACHIEVEMENT_DEFS,
        "unlocked": _achievements_state(conn, uid)
    }
    conn.close()
    return state


def _leaderboard_entry(conn, user_row):
    uid = user_row["id"] if isinstance(user_row, dict) else user_row[0]
    name = user_row.get("name", uid) if isinstance(user_row, dict) else user_row[1]
    recipes = conn.execute("SELECT COUNT(*) FROM recipes WHERE owner_id=?", (uid,)).fetchone()[0]
    followers = conn.execute("SELECT COUNT(*) FROM follows WHERE following_id=?", (uid,)).fetchone()[0]
    return {"id": uid, "name": name, "recipes": recipes, "followers": followers}


def api_leaderboard(handler, data):
    """Ranked lists: most recipes posted, most followers.
    Streaks are computed on-device from the local cook log (client merges them)."""
    conn = _db_conn()
    db = _load_db()
    users_all = db.get("users", []) if isinstance(db, dict) else []
    entries = [_leaderboard_entry(conn, u) for u in users_all]
    by_recipes = sorted(entries, key=lambda e: (-e["recipes"], e["name"]))[:20]
    by_followers = sorted(entries, key=lambda e: (-e["followers"], e["name"]))[:20]
    conn.close()
    return {"ok": True, "byRecipes": by_recipes, "byFollowers": by_followers}


# ---- Groups ----

def api_group_create(handler, data):
    """Create a new cooking group."""
    uid = _get_session_user_id(handler)
    if not uid:
        return {"error": "Not logged in"}
    name = (data.get("name") or "").strip()
    if not name:
        return {"error": "Group name required"}
    gid = "grp-" + secrets.token_hex(8)
    now = _db_now()
    conn = _db_conn()
    conn.execute("INSERT INTO groups (id, name, owner_id, created_at, updated_at) VALUES (?,?,?,?,?)",
                 (gid, name, uid, now, now))
    conn.execute("INSERT INTO group_members (group_id, user_id, status, invited_by, created_at, updated_at) VALUES (?,?,?,?,?,?)",
                 (gid, uid, "accepted", uid, now, now))
    conn.commit()
    conn.close()
    return {"ok": True, "group": {"id": gid, "name": name, "ownerId": uid}}


def api_group_invite(handler, data):
    """Invite a user to a group."""
    uid = _get_session_user_id(handler)
    if not uid:
        return {"error": "Not logged in"}
    gid = data.get("groupId", "")
    target_id = data.get("userId", "")
    if not gid or not target_id:
        return {"error": "groupId and userId required"}
    conn = _db_conn()
    group = conn.execute("SELECT * FROM groups WHERE id=?", (gid,)).fetchone()
    if not group:
        conn.close()
        return {"error": "Group not found"}
    existing = conn.execute("SELECT status FROM group_members WHERE group_id=? AND user_id=?", (gid, uid)).fetchone()
    if not existing or existing[0] != "accepted":
        conn.close()
        return {"error": "You must be a member of this group"}
    target_member = conn.execute("SELECT status FROM group_members WHERE group_id=? AND user_id=?", (gid, target_id)).fetchone()
    if target_member and target_member[0] in ("pending", "accepted"):
        conn.close()
        return {"ok": True, "status": target_member[0]}
    now = _db_now()
    conn.execute("INSERT OR REPLACE INTO group_members (group_id, user_id, status, invited_by, created_at, updated_at) VALUES (?,?,?,?,?,?)",
                 (gid, target_id, "pending", uid, now, now))
    conn.commit()
    actor = _load_user_by_id(uid)
    actor_name = actor.get("name", uid) if actor else uid
    _send_notification(conn, target_id, uid, "group_invite", gid, "group", "Group Invitation",
                       "%s invited you to join \"%s\"" % (actor_name, group[1]),
                       "groups.html?group=" + gid, now)
    conn.commit()
    conn.close()
    return {"ok": True, "status": "pending"}


def api_group_join(handler, data):
    """Accept (join) or decline a group invitation."""
    uid = _get_session_user_id(handler)
    if not uid:
        return {"error": "Not logged in"}
    gid = data.get("groupId", "")
    action = data.get("action", "accept")
    if not gid:
        return {"error": "groupId required"}
    conn = _db_conn()
    member = conn.execute("SELECT status FROM group_members WHERE group_id=? AND user_id=?", (gid, uid)).fetchone()
    if not member:
        conn.close()
        return {"error": "No invitation found"}
    now = _db_now()
    if action == "accept":
        conn.execute("UPDATE group_members SET status='accepted', updated_at=? WHERE group_id=? AND user_id=?", (now, gid, uid))
    else:
        conn.execute("DELETE FROM group_members WHERE group_id=? AND user_id=?", (gid, uid))
    conn.commit()
    conn.close()
    return {"ok": True, "status": action}


def api_group_list(handler, data):
    """List groups the current user belongs to."""
    uid = _get_session_user_id(handler)
    if not uid:
        return {"error": "Not logged in"}
    conn = _db_conn()
    rows = conn.execute("""
        SELECT g.id, g.name, g.owner_id, gm.status
        FROM groups g JOIN group_members gm ON g.id = gm.group_id
        WHERE gm.user_id = ? AND gm.status = 'accepted'
        ORDER BY g.created_at DESC
    """, (uid,)).fetchall()
    groups = []
    for r in rows:
        groups.append({"id": r[0], "name": r[1], "ownerId": r[2]})
    conn.close()
    return {"ok": True, "groups": groups}


def api_group_pending(handler, data):
    """List pending group invitations for the current user."""
    uid = _get_session_user_id(handler)
    if not uid:
        return {"error": "Not logged in"}
    conn = _db_conn()
    rows = conn.execute("""
        SELECT g.id, g.name, g.owner_id, gm.invited_by
        FROM groups g JOIN group_members gm ON g.id = gm.group_id
        WHERE gm.user_id = ? AND gm.status = 'pending'
        ORDER BY gm.created_at DESC
    """, (uid,)).fetchall()
    invitations = []
    for r in rows:
        inviter = _load_user_by_id(r[3])
        invitations.append({
            "groupId": r[0], "groupName": r[1], "ownerId": r[2],
            "invitedBy": r[3], "inviterName": inviter.get("name", r[3]) if inviter else r[3]
        })
    conn.close()
    return {"ok": True, "invitations": invitations}


def api_group_members(handler, data):
    """List members of a group."""
    uid = _get_session_user_id(handler)
    if not uid:
        return {"error": "Not logged in"}
    gid = data.get("groupId", "")
    if not gid:
        return {"error": "groupId required"}
    conn = _db_conn()
    rows = conn.execute("""
        SELECT gm.user_id, gm.status, gm.invited_by
        FROM group_members gm WHERE gm.group_id = ?
        ORDER BY gm.created_at
    """, (gid,)).fetchall()
    members = []
    for r in rows:
        user = _load_user_by_id(r[0])
        members.append({
            "userId": r[0], "name": user.get("name", r[0]) if user else r[0],
            "status": r[1], "invitedBy": r[2]
        })
    conn.close()
    return {"ok": True, "members": members}


def api_group_share_recipe(handler, data):
    """Share a recipe to a group."""
    uid = _get_session_user_id(handler)
    if not uid:
        return {"error": "Not logged in"}
    gid = data.get("groupId", "")
    recipe_id = data.get("recipeId", "")
    if not gid or not recipe_id:
        return {"error": "groupId and recipeId required"}
    conn = _db_conn()
    member = conn.execute("SELECT status FROM group_members WHERE group_id=? AND user_id=?", (gid, uid)).fetchone()
    if not member or member[0] != "accepted":
        conn.close()
        return {"error": "Not a member of this group"}
    existing = conn.execute("SELECT 1 FROM group_recipes WHERE group_id=? AND recipe_id=?", (gid, recipe_id)).fetchone()
    if existing:
        conn.close()
        return {"ok": True}
    now = _db_now()
    conn.execute("INSERT INTO group_recipes (group_id, recipe_id, shared_by, created_at) VALUES (?,?,?,?)",
                 (gid, recipe_id, uid, now))
    members = conn.execute("SELECT user_id FROM group_members WHERE group_id=? AND status='accepted' AND user_id!=?",
                           (gid, uid)).fetchall()
    actor = _load_user_by_id(uid)
    actor_name = actor.get("name", uid) if actor else uid
    group = conn.execute("SELECT name FROM groups WHERE id=?", (gid,)).fetchone()
    gname = group[0] if group else gid
    for m in members:
        _send_notification(conn, m[0], uid, "group_recipe", gid, "menu_book",
                           "Recipe Shared", "%s shared a recipe in \"%s\"" % (actor_name, gname),
                           "recipe-details.html?recipe=" + recipe_id, now)
    conn.commit()
    conn.close()
    return {"ok": True}


def api_group_recipes(handler, data):
    """List recipes shared to a group."""
    uid = _get_session_user_id(handler)
    if not uid:
        return {"error": "Not logged in"}
    gid = data.get("groupId", "")
    if not gid:
        return {"error": "groupId required"}
    conn = _db_conn()
    rows = conn.execute("""
        SELECT gr.recipe_id, gr.shared_by, gr.created_at
        FROM group_recipes gr WHERE gr.group_id = ?
        ORDER BY gr.created_at DESC
    """, (gid,)).fetchall()
    recipes = []
    for r in rows:
        recipe = conn.execute("SELECT * FROM recipes WHERE id=?", (r[0],)).fetchone()
        if recipe:
            recipes.append({"id": recipe["id"], "name": recipe["name"], "sharedBy": r[1], "sharedAt": r[2]})
    conn.close()
    return {"ok": True, "recipes": recipes}


# ---- Phase 8: GDPR export & account deletion ----

def api_export_my_data(handler, data):
    """GDPR-style export: return all data owned by the session user."""
    uid = _get_session_user_id(handler)
    if not uid:
        return {"error": "Not logged in"}
    db = _load_db()
    u = _find_by_id(db, uid)
    if not u:
        return {"error": "Account not found"}
    conn = _db_conn()
    # Gather per-table data
    def rows(q, args=(uid,)):
        return _rows_to_dicts(conn.execute(q, args).fetchall())
    # Profile
    prof = conn.execute("SELECT * FROM profiles WHERE owner_id=?", (uid,)).fetchone()
    prof = dict(prof) if prof else {}
    # Achievements
    ach = rows("SELECT badge_id, unlocked_at FROM achievements WHERE user_id=?", (uid,))
    # Kitchen / shopping / recipes / posts
    kitchen = rows("SELECT * FROM kitchen_items WHERE owner_id=?", (uid,))
    shopping = rows("SELECT * FROM shopping_items WHERE owner_id=?", (uid,))
    recipes_rows = rows("SELECT * FROM recipes WHERE owner_id=?", (uid,))
    # deserialize JSON fields for recipes
    for r in recipes_rows:
        for field in ("photos", "ingredients", "steps"):
            try:
                r[field] = json.loads(r.get(field, "[]"))
            except Exception:
                r[field] = []
    posts = rows("SELECT * FROM posts WHERE owner_id=?", (uid,))
    # Comments authored by user (any item_id)
    comments_authored = rows("SELECT * FROM comments WHERE owner_id=?", (uid,))
    # Likes given
    likes_given = rows("SELECT post_id, ts FROM likes WHERE user_id=?", (uid,))
    # Follows
    following = rows("SELECT following_id, ts FROM follows WHERE follower_id=?", (uid,))
    followers = rows("SELECT follower_id, ts FROM follows WHERE following_id=?", (uid,))
    # Notifications inbox
    notifs = rows("SELECT * FROM notifications WHERE owner_id=? ORDER BY ts DESC LIMIT 200", (uid,))
    # Notifications where user was actor (optional, for completeness)
    notifs_as_actor = rows("SELECT * FROM notifications WHERE actor_id=? ORDER BY ts DESC LIMIT 50", (uid,))
    conn.close()
    # Public user record (strip pass_hash)
    public_user = _to_public(u)
    # Also include server_content legacy if any (for recipes/posts that were via old JSON)
    export = {
        "ok": True,
        "exportedAt": _db_now(),
        "exportedAtIso": __import__("datetime").datetime.now().isoformat(),
        "userId": uid,
        "user": public_user,
        "profile": prof,
        "achievements": ach,
        "kitchenItems": kitchen,
        "shoppingItems": shopping,
        "recipes": recipes_rows,
        "posts": posts,
        "commentsAuthored": comments_authored,
        "likesGiven": likes_given,
        "following": following,
        "followers": followers,
        "notificationsInbox": notifs,
        "notificationsAsActor": notifs_as_actor,
    }
    return export


def api_delete_my_account(handler, data):
    """Delete the session user's account and all owned data (GDPR delete).
    Requires confirmation: data.confirm must equal the user's name (exact) or email.
    Prevents deleting the last remaining admin."""
    uid = _get_session_user_id(handler)
    if not uid:
        return {"error": "Not logged in"}
    confirm = str(data.get("confirm", "")).strip()
    db = _load_db()
    u = _find_by_id(db, uid)
    if not u:
        return {"error": "Account not found"}
    # Require confirmation to match name or email
    if confirm not in (u.get("name", ""), u.get("email", "")):
        return {"error": "Confirmation does not match. Type your username (%s) to confirm." % u.get("name", "")}
    # Prevent deleting the last admin
    if u.get("role") == "admin":
        admins = [x for x in db.get("users", []) if x.get("role") == "admin" and x.get("status") == "active"]
        if len(admins) <= 1:
            return {"error": "Cannot delete the last admin account. Promote another user to admin first."}
    # Collect image URLs before deleting DB rows (for filesystem cleanup)
    conn = _db_conn()
    image_urls = set()
    video_urls = set()
    # profile photo
    prow = conn.execute("SELECT photo FROM profiles WHERE owner_id=?", (uid,)).fetchone()
    if prow and prow[0] and prow[0].startswith("uploads/"):
        image_urls.add(prow[0])
    # recipe photos + videos
    for row in conn.execute("SELECT photos, img, video FROM recipes WHERE owner_id=?", (uid,)).fetchall():
        try:
            for p in json.loads(row[0] or "[]"):
                if p and p.startswith("uploads/"):
                    image_urls.add(p)
        except Exception:
            pass
        if row[1] and row[1].startswith("uploads/"):
            image_urls.add(row[1])
        if row[2] and row[2].startswith("uploads/"):
            video_urls.add(row[2])
    # Also collect post_ids and recipe_ids for comment cleanup
    post_ids = [r[0] for r in conn.execute("SELECT id FROM posts WHERE owner_id=?", (uid,)).fetchall()]
    recipe_ids = [r[0] for r in conn.execute("SELECT id FROM recipes WHERE owner_id=?", (uid,)).fetchall()]
    # Perform deletions
    try:
        # Likes: given by user + likes on user's posts (those will be orphaned anyway)
        conn.execute("DELETE FROM likes WHERE user_id=?", (uid,))
        if post_ids:
            placeholders = ",".join(["?"] * len(post_ids))
            conn.execute(f"DELETE FROM likes WHERE post_id IN ({placeholders})", post_ids)
        # Follows (both directions)
        conn.execute("DELETE FROM follows WHERE follower_id=? OR following_id=?", (uid, uid))
        # Notifications inbox + where user was actor
        conn.execute("DELETE FROM notifications WHERE owner_id=? OR actor_id=?", (uid, uid))
        # Achievements
        conn.execute("DELETE FROM achievements WHERE user_id=?", (uid,))
        # Comments authored by user
        conn.execute("DELETE FROM comments WHERE owner_id=?", (uid,))
        # Comments on user's posts/recipes (optional cleanup)
        if post_ids or recipe_ids:
            all_item_ids = post_ids + recipe_ids
            ph = ",".join(["?"] * len(all_item_ids))
            conn.execute(f"DELETE FROM comments WHERE item_id IN ({ph})", all_item_ids)
        # Posts / recipes / kitchen / shopping / profile
        conn.execute("DELETE FROM posts WHERE owner_id=?", (uid,))
        conn.execute("DELETE FROM recipes WHERE owner_id=?", (uid,))
        conn.execute("DELETE FROM kitchen_items WHERE owner_id=?", (uid,))
        conn.execute("DELETE FROM shopping_items WHERE owner_id=?", (uid,))
        conn.execute("DELETE FROM profiles WHERE owner_id=?", (uid,))
        conn.commit()
    except Exception as e:
        conn.close()
        return {"error": f"Failed to delete data: {e}"}
    conn.close()
    # Delete image files
    for url in image_urls:
        try:
            _delete_image_file(url)
        except Exception:
            pass
    for url in video_urls:
        try:
            _delete_video_file(url)
        except Exception:
            pass
    # Remove from server_users.json
    db["users"] = [x for x in db.get("users", []) if x.get("id") != uid]
    _save_db(db)
    # Invalidate all sessions for this user
    for tok in list(_SESSIONS.keys()):
        if _SESSIONS[tok].get("userId") == uid:
            del _SESSIONS[tok]
    # Audit log
    try:
        logAdminAction("delete_account", uid, u.get("name", uid), reason="self-delete")
    except Exception:
        pass
    return {"ok": True, "deletedUserId": uid}


class KitchenShareHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=APP_DIR, **kwargs)

    def log_message(self, fmt, *args):
        sys.stderr.write("%s - %s\n" % (self.log_date_time_string(), fmt % args))

    def do_GET(self):
        path = self.path.split("?", 1)[0]
        if path in ("", "/"):
            path = "/index.html"
        # GET /api/achievements/<userId> — achievement state (Phase 7)
        m = re.match(r"^/api/achievements/([^/]+)$", path)
        if m:
            body = json.dumps(api_achievements_list(self, {"userId": unquote_plus(m.group(1))})).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(body)
            return
        if "server_users.json" in path or "server_content.json" in path or path.endswith("server.py"):
            self.send_error(404)
            return
        # Serve uploaded files — block directory listings and path traversal
        if path.startswith("/uploads/"):
            if ".." in path or path.endswith("/"):
                self.send_error(403)
                return
            # Map /uploads/ to UPLOAD_DIR
            rel = path[len("/uploads/"):]
            fpath = os.path.join(UPLOAD_DIR, rel.replace("/", os.sep))
            if not os.path.isfile(fpath):
                self.send_error(404)
                return
            if path.startswith("/uploads/videos/"):
                return self._serve_video(path, fpath)
            ctype = self.guess_type(fpath)
            with open(fpath, "rb") as fh:
                data = fh.read()
            self._ks_cache_done = True
            self.send_response(200)
            self.send_header("Content-Type", ctype)
            self.send_header("Content-Length", str(len(data)))
            self.send_header("Cache-Control", "public, max-age=86400")
            self.end_headers()
            self.wfile.write(data)
            return
        self.path = path
        return self._send_static(path)

    def _send_static(self, path):
        """Static files with gzip compression + cache/revalidation headers."""
        fpath = self.translate_path(path)
        if not os.path.isfile(fpath):
            self.send_error(404)
            return
        ctype = self.guess_type(fpath)
        with open(fpath, "rb") as fh:
            data = fh.read()
        mtime = int(os.stat(fpath).st_mtime)
        lm = self.date_time_string(mtime)
        compressible = (ctype.startswith("text/") or
                        ctype in ("application/javascript", "application/json",
                                  "image/svg+xml", "application/xml"))
        cacheable = not path.endswith(".html")
        ims = self.headers.get("If-Modified-Since")
        if cacheable and ims and ims.strip() == lm:
            self._ks_cache_done = True
            self.send_response(304)
            self.send_header("Cache-Control", "public, max-age=3600")
            self.end_headers()
            return
        accept_enc = (self.headers.get("Accept-Encoding") or "").lower()
        if ("gzip" in accept_enc and len(data) > 1024 and compressible):
            data = gzip.compress(data, 6)
            self._ks_cache_done = True
            self.send_response(200)
            self.send_header("Content-Type", ctype)
            self.send_header("Content-Encoding", "gzip")
            self.send_header("Vary", "Accept-Encoding")
            self.send_header("Content-Length", str(len(data)))
            self.send_header("Last-Modified", lm)
            self.send_header("Cache-Control", "public, max-age=3600" if cacheable else "no-cache")
            self.end_headers()
            self.wfile.write(data)
            return
        self._ks_cache_done = True
        self.send_response(200)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Last-Modified", lm)
        self.send_header("Cache-Control", "public, max-age=3600" if cacheable else "no-cache")
        self.end_headers()
        self.wfile.write(data)

    def _serve_video(self, path, fpath=None):
        """Serve video files with HTTP Range request support for proper streaming."""
        if not fpath:
            fpath = self.translate_path(path)
        if not os.path.isfile(fpath):
            self.send_error(404)
            return
        ctype = self.guess_type(path)
        file_size = os.path.getsize(fpath)
        range_header = self.headers.get("Range")
        if range_header:
            m = re.match(r"bytes=(\d+)-(\d*)", range_header)
            if m:
                start = int(m.group(1))
                end = int(m.group(2)) if m.group(2) else file_size - 1
                if start >= file_size or end >= file_size or start > end:
                    self.send_response(416)
                    self.send_header("Content-Range", "bytes */%d" % file_size)
                    self.end_headers()
                    return
                length = end - start + 1
                self.send_response(206)
                self.send_header("Content-Type", ctype)
                self.send_header("Content-Range", "bytes %d-%d/%d" % (start, end, file_size))
                self.send_header("Content-Length", str(length))
                self.send_header("Accept-Ranges", "bytes")
                self.send_header("Cache-Control", "public, max-age=86400")
                self._ks_cache_done = True
                self.end_headers()
                with open(fpath, "rb") as fh:
                    fh.seek(start)
                    remaining = length
                    while remaining > 0:
                        chunk = fh.read(min(remaining, 65536))
                        if not chunk:
                            break
                        self.wfile.write(chunk)
                        remaining -= len(chunk)
                return
        self.send_response(200)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(file_size))
        self.send_header("Accept-Ranges", "bytes")
        self.send_header("Cache-Control", "public, max-age=86400")
        self._ks_cache_done = True
        self.end_headers()
        with open(fpath, "rb") as fh:
            remaining = file_size
            while remaining > 0:
                chunk = fh.read(min(remaining, 65536))
                if not chunk:
                    break
                self.wfile.write(chunk)
                remaining -= len(chunk)

    def end_headers(self):
        if getattr(self, "_ks_cache_done", False):
            return super().end_headers()
        if self.path.endswith((".html", ".js", ".css", ".json")):
            try:
                self.send_header("Cache-Control", "no-cache, must-revalidate")
            except Exception:
                pass
        elif "/uploads/" in self.path:
            try:
                self.send_header("Cache-Control", "public, max-age=86400")
            except Exception:
                pass
        return super().end_headers()

    def do_POST(self):
        path = self.path.split("?", 1)[0].strip("/")
        content_type_header = self.headers.get("Content-Type", "")
        is_multipart = "multipart/form-data" in content_type_header
        data = {}
        if not is_multipart:
            try:
                length = int(self.headers.get("Content-Length", 0))
                raw = self.rfile.read(length) if length else b""
                data = json.loads(raw.decode("utf-8")) if raw else {}
            except Exception:
                data = {}
        if path.startswith("api/"):
            action = path[len("api/"):]
            if not _api_gate(self, action):
                return
            r = {"error": "Unknown endpoint"}
            try:
                if action == "upload-image":
                    r = api_upload_image(self, data)
                elif action == "upload-video":
                    r = api_upload_video(self, data)
                elif action == "delete-image":
                    r = api_delete_image(self, data)
                elif action == "delete-video":
                    r = api_delete_video(self, data)
                elif action == "cleanup-images":
                    r = api_cleanup_images(self, data)
                elif action == "signup":
                    r = api_signup(data)
                elif action == "verify-email":
                    r = api_verify_email(data)
                elif action == "login":
                    r = api_login(data)
                elif action == "me":
                    r = api_me(self)
                elif action == "logout":
                    r = api_logout(self)
                elif action == "reset-request":
                    r = api_reset_request(data)
                elif action == "reset-confirm":
                    r = api_reset_confirm(data)
                elif action == "suspend":
                    r = api_suspend(data)
                elif action == "set-role":
                    r = api_set_role(data)
                elif action == "admin-reset-password":
                    r = api_admin_reset_password(data)
                elif action == "set-new-password":
                    r = api_set_new_password(self, data)
                elif action == "audit-log":
                    r = api_audit_log(data)
                elif action == "pending":
                    r = api_pending(data)
                elif action == "approve":
                    r = api_approve(data)
                elif action == "decline":
                    r = api_decline(data)
                elif action == "getContent":
                    r = api_get_content(data)
                elif action == "getUsers":
                    r = api_get_users(data)
                elif action == "saveProfile":
                    r = api_save_profile(data)
                elif action == "saveRecipe":
                    r = api_save_recipe(data)
                elif action == "deleteRecipe":
                    r = api_delete_recipe(data)
                elif action == "savePost":
                    r = api_save_post(data)
                elif action == "deletePost":
                    r = api_delete_post(data)
                elif action == "saveComments":
                    r = api_save_comments(data)
                elif action == "kitchen-list":
                    r = api_kitchen_list(self, data)
                elif action == "kitchen-add":
                    r = api_kitchen_add(self, data)
                elif action == "kitchen-update":
                    r = api_kitchen_update(self, data)
                elif action == "kitchen-remove":
                    r = api_kitchen_remove(self, data)
                elif action == "kitchen-clear":
                    r = api_kitchen_clear(self, data)
                elif action == "shop-list":
                    r = api_shop_list(self, data)
                elif action == "shop-add":
                    r = api_shop_add(self, data)
                elif action == "shop-update":
                    r = api_shop_update(self, data)
                elif action == "shop-toggle":
                    r = api_shop_toggle(self, data)
                elif action == "shop-remove":
                    r = api_shop_remove(self, data)
                elif action == "shop-clear-done":
                    r = api_shop_clear_done(self, data)
                elif action == "recipes-list":
                    r = api_recipes_list(self, data)
                elif action == "recipes-save":
                    r = api_recipes_save(self, data)
                elif action == "recipes-delete":
                    r = api_recipes_delete(self, data)
                elif action == "posts-list":
                    r = api_posts_list(self, data)
                elif action == "posts-list-user":
                    r = api_posts_list_user(self, data)
                elif action == "posts-save":
                    r = api_posts_save(self, data)
                elif action == "posts-delete":
                    r = api_posts_delete(self, data)
                elif action == "comments-list":
                    r = api_comments_list(self, data)
                elif action == "comments-save":
                    r = api_comments_save(self, data)
                elif action == "migrate":
                    r = api_migrate(self, data)
                elif action == "catalog-edit-save":
                    r = api_catalog_edit_save(self, data)
                elif action == "catalog-hidden-list":
                    r = api_catalog_hidden_list(self, data)
                elif action == "catalog-hidden-toggle":
                    r = api_catalog_hidden_toggle(self, data)
                elif action == "kitchen-save-all":
                    r = api_kitchen_save_all(self, data)
                elif action == "shop-save-all":
                    r = api_shop_save_all(self, data)
                elif action == "recipes-save-all":
                    r = api_recipes_save_all(self, data)
                elif action == "posts-save-all":
                    r = api_posts_save_all(self, data)
                elif action == "budget-list":
                    r = api_budget_list(self, data)
                elif action == "budget-save-all":
                    r = api_budget_save_all(self, data)
                elif action == "like":
                    r = api_like(self, data)
                elif action == "unlike":
                    r = api_unlike(self, data)
                elif action == "like-status":
                    r = api_like_status(self, data)
                elif action == "like-batch":
                    r = api_like_batch(self, data)
                elif action == "follow":
                    r = api_follow(self, data)
                elif action == "unfollow":
                    r = api_unfollow(self, data)
                elif action == "follow-status":
                    r = api_follow_status(self, data)
                elif action == "followers":
                    r = api_followers(self, data)
                elif action == "following":
                    r = api_following(self, data)
                elif action == "post-comments-list":
                    r = api_post_comments_list(self, data)
                elif action == "post-comments-save":
                    r = api_post_comments_save(self, data)
                elif action == "notifications-list":
                    r = api_notifications_list(self, data)
                elif action == "notifications-read":
                    r = api_notifications_read(self, data)
                elif action == "unread-count":
                    r = api_unread_count(self, data)
                elif action == "activity-feed":
                    r = api_activity_feed(self, data)
                elif action == "achievements-list":
                    r = api_achievements_list(self, data)
                elif action == "achievements-evaluate":
                    r = api_achievements_evaluate(self, data)
                elif action == "achievements-unlock":
                    r = api_achievements_unlock(self, data)
                elif action == "leaderboard":
                    r = api_leaderboard(self, data)
                elif action == "group-create":
                    r = api_group_create(self, data)
                elif action == "group-invite":
                    r = api_group_invite(self, data)
                elif action == "group-join":
                    r = api_group_join(self, data)
                elif action == "group-list":
                    r = api_group_list(self, data)
                elif action == "group-pending":
                    r = api_group_pending(self, data)
                elif action == "group-members":
                    r = api_group_members(self, data)
                elif action == "group-share-recipe":
                    r = api_group_share_recipe(self, data)
                elif action == "group-recipes":
                    r = api_group_recipes(self, data)
                elif action == "export-my-data":
                    r = api_export_my_data(self, data)
                elif action == "delete-my-account":
                    r = api_delete_my_account(self, data)
            except Exception as exc:  # pragma: no cover - safety net
                r = {"error": "Server error: %s" % exc}
        else:
            self.send_error(404)
            return
        body = json.dumps(r).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        # Set session cookie on login
        if r.get('token'):
            remember = r.get('remember', False)
            max_age = 30 * 24 * 3600 if remember else 0  # 30 days or session-only
            http_only = ' HttpOnly'
            cookie_val = 'ks_session=' + r['token']
            if max_age == 0:
                cookie_val += '; Path=/; HttpOnly; SameSite=Lax'  # session cookie
            else:
                cookie_val += '; Max-Age=%d; Path=/; HttpOnly; SameSite=Lax' % max_age
            self.send_header("Set-Cookie", cookie_val)
        self.end_headers()
        self.wfile.write(body)


def _local_ips():
    ips = set()
    try:
        import socket
        for host in socket.gethostbyname_ex(socket.gethostname())[2]:
            ips.add(host)
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ips.add(s.getsockname()[0])
        s.close()
    except Exception:
        pass
    return sorted(ips)


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_PORT
    bind = sys.argv[2] if len(sys.argv) > 2 else DEFAULT_BIND
    _init_data_db()  # Initialize SQLite data layer
    server = ThreadingHTTPServer((bind, port), KitchenShareHandler)
    print("KitchenShare server running on port %d (interface %s)" % (port, bind))
    print("  Shared directory: %s" % DB_PATH)
    print("  Local URLs:")
    for ip in _local_ips():
        print("    http://%s:%d/index.html" % (ip, port))
    print("  WireGuard/LAN devices should open one of the URLs above.")
    print("  Press Ctrl+C to stop.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")


if __name__ == "__main__":
    main()
