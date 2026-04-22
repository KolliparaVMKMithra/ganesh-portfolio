from __future__ import annotations

import base64
import json
import os
import sqlite3
import sys
from datetime import datetime, timezone
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from urllib.parse import parse_qs, urlparse

ROOT = Path(__file__).resolve().parent
SITE_DIR = ROOT / "site"
DATA_DIR = ROOT / "data"
DB_PATH = DATA_DIR / "visitors.sqlite3"


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def _ensure_db() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS visits (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              name TEXT NOT NULL,
              visited_at TEXT NOT NULL,
              user_agent TEXT,
              ip TEXT
            )
            """
        )
        conn.execute("CREATE INDEX IF NOT EXISTS idx_visits_visited_at ON visits(visited_at)")
        conn.commit()


def _json_response(handler: BaseHTTPRequestHandler, status: int, payload: dict[str, Any]) -> None:
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Content-Length", str(len(body)))
    handler.send_header("Cache-Control", "no-store")
    handler.end_headers()
    handler.wfile.write(body)


def _read_json(handler: BaseHTTPRequestHandler, max_bytes: int = 16_384) -> dict[str, Any] | None:
    try:
        length = int(handler.headers.get("Content-Length", "0"))
    except ValueError:
        return None
    if length <= 0 or length > max_bytes:
        return None
    raw = handler.rfile.read(length)
    try:
        return json.loads(raw.decode("utf-8"))
    except Exception:
        return None


def _guess_content_type(path: Path) -> str:
    ext = path.suffix.lower()
    return {
        ".html": "text/html; charset=utf-8",
        ".css": "text/css; charset=utf-8",
        ".js": "text/javascript; charset=utf-8",
        ".mjs": "text/javascript; charset=utf-8",
        ".json": "application/json; charset=utf-8",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".webp": "image/webp",
        ".svg": "image/svg+xml; charset=utf-8",
        ".ico": "image/x-icon",
        ".txt": "text/plain; charset=utf-8",
        ".woff": "font/woff",
        ".woff2": "font/woff2",
    }.get(ext, "application/octet-stream")


def _static_file_response(handler: BaseHTTPRequestHandler, rel: str) -> None:
    safe_rel = rel.lstrip("/").replace("\\", "/")
    if safe_rel == "":
        safe_rel = "index.html"
    requested = (SITE_DIR / safe_rel).resolve()
    if SITE_DIR not in requested.parents and requested != SITE_DIR:
        handler.send_error(HTTPStatus.NOT_FOUND)
        return
    if requested.is_dir():
        requested = (requested / "index.html").resolve()
    if not requested.exists() or not requested.is_file():
        handler.send_error(HTTPStatus.NOT_FOUND)
        return

    content = requested.read_bytes()
    handler.send_response(HTTPStatus.OK)
    handler.send_header("Content-Type", _guess_content_type(requested))
    handler.send_header("Content-Length", str(len(content)))
    handler.send_header("Cache-Control", "no-cache")
    handler.end_headers()
    handler.wfile.write(content)


def _require_admin(handler: BaseHTTPRequestHandler) -> bool:
    password = os.getenv("ADMIN_PASSWORD", "").strip()
    if not password:
        return True  # unsecured by default for local/dev use

    auth = handler.headers.get("Authorization", "")
    if not auth.startswith("Basic "):
        handler.send_response(HTTPStatus.UNAUTHORIZED)
        handler.send_header("WWW-Authenticate", "Basic realm=\"portfolio-admin\"")
        handler.end_headers()
        return False

    try:
        decoded = base64.b64decode(auth.split(" ", 1)[1]).decode("utf-8")
    except Exception:
        handler.send_response(HTTPStatus.UNAUTHORIZED)
        handler.end_headers()
        return False

    _, _, provided = decoded.partition(":")
    if provided != password:
        handler.send_response(HTTPStatus.UNAUTHORIZED)
        handler.send_header("WWW-Authenticate", "Basic realm=\"portfolio-admin\"")
        handler.end_headers()
        return False
    return True


class Handler(BaseHTTPRequestHandler):
    server_version = "PortfolioServer/1.0"

    def log_message(self, fmt: str, *args: Any) -> None:
        # keep logs readable on Windows terminals
        sys.stderr.write("%s - - [%s] %s\n" % (self.client_address[0], self.log_date_time_string(), fmt % args))

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        path = parsed.path

        if path == "/api/health":
            _json_response(self, 200, {"ok": True})
            return

        if path == "/api/admin/visits":
            if not _require_admin(self):
                return
            qs = parse_qs(parsed.query)
            limit = 500
            try:
                if "limit" in qs:
                    limit = max(1, min(5000, int(qs["limit"][0])))
            except Exception:
                limit = 500

            with sqlite3.connect(DB_PATH) as conn:
                rows = conn.execute(
                    "SELECT id, name, visited_at, user_agent, ip FROM visits ORDER BY visited_at DESC LIMIT ?",
                    (limit,),
                ).fetchall()

            visits = [
                {"id": r[0], "name": r[1], "visited_at": r[2], "user_agent": r[3] or "", "ip": r[4] or ""}
                for r in rows
            ]
            _json_response(self, 200, {"ok": True, "visits": visits, "secured": bool(os.getenv("ADMIN_PASSWORD"))})
            return

        if path == "/admin":
            _static_file_response(self, "admin.html")
            return

        if path.startswith("/"):
            _static_file_response(self, path)
            return

        self.send_error(HTTPStatus.NOT_FOUND)

    def do_POST(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path == "/api/visit":
            data = _read_json(self)
            if not data:
                _json_response(self, 400, {"ok": False, "error": "invalid_json"})
                return

            name = str(data.get("name", "")).strip()
            if not name or len(name) > 60:
                _json_response(self, 400, {"ok": False, "error": "invalid_name"})
                return

            ua = self.headers.get("User-Agent", "")
            ip = (self.headers.get("X-Forwarded-For") or self.client_address[0] or "").split(",")[0].strip()

            with sqlite3.connect(DB_PATH) as conn:
                conn.execute(
                    "INSERT INTO visits(name, visited_at, user_agent, ip) VALUES(?,?,?,?)",
                    (name, _now_iso(), ua[:500], ip[:80]),
                )
                conn.commit()

            _json_response(self, 200, {"ok": True})
            return

        _json_response(self, 404, {"ok": False, "error": "not_found"})


def main() -> int:
    _ensure_db()
    host = os.getenv("HOST", "127.0.0.1")
    port = int(os.getenv("PORT", "8000"))
    httpd = ThreadingHTTPServer((host, port), Handler)
    print(f"Serving on http://{host}:{port}")
    print("Admin dashboard: http://{host}:{port}/admin".format(host=host, port=port))
    if os.getenv("ADMIN_PASSWORD"):
        print("Admin auth: enabled (Basic Auth)")
    else:
        print("Admin auth: DISABLED (set ADMIN_PASSWORD to enable)")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

