"""슈퍼알까기 카드 스튜디오 — 로컬 서버
- 정적 파일 제공
- 이미지 생성 API 호출을 대신 전달(프록시): 브라우저의 CORS/네트워크 차단을 피하고 실제 오류를 그대로 돌려줌
- 작업 데이터 저장: 보관함 그림·프레임·아이콘·설정을 프로젝트의 data/ 폴더에 파일로 저장
  (git 커밋이나 폴더 복사에 함께 포함됨)
API 키는 파일로 저장하지 않습니다. 요청 헤더로 받은 것을 그대로 전달만 합니다.

실행:  python server.py   →  http://localhost:8765
"""
import base64
import http.server
import json
import os
import re
import shutil
import socketserver
import ssl
import sys
import urllib.error
import urllib.request

PORT = int(os.environ.get("PORT", "8765"))
ROOT = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(ROOT, "data")
UPSTREAMS = {
    "openai": "https://api.openai.com",
    "gemini": "https://generativelanguage.googleapis.com",
    "vertex": "https://aiplatform.googleapis.com",
}
FORWARD_HEADERS = ("authorization", "content-type", "x-goog-api-key")
STORES = {"iconSets", "frameGroups", "arts"}
SAFE = re.compile(r"^[A-Za-z0-9_-]{1,80}$")
EXT = {"image/png": "png", "image/jpeg": "jpg", "image/webp": "webp"}
SECRET_KEYS = {"openaiKey", "geminiKey"}


def write_files(obj, folder, rel, name):
    """레코드 안의 {"$blob": base64} 를 파일로 쓰고 {"$file": 경로} 로 바꿈"""
    if isinstance(obj, dict) and "$blob" in obj:
        ext = EXT.get(obj.get("type", "image/png"), "png")
        fname = f"{name}.{ext}"
        with open(os.path.join(folder, fname), "wb") as f:
            f.write(base64.b64decode(obj["$blob"]))
        return {"$file": f"{rel}/{fname}"}
    if isinstance(obj, dict):
        return {k: write_files(v, folder, rel, f"{name}_{k}" if name else k) for k, v in obj.items()}
    if isinstance(obj, list):
        return [write_files(v, folder, rel, f"{name}_{i}") for i, v in enumerate(obj)]
    return obj


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=ROOT, **kw)

    def log_message(self, fmt, *args):
        sys.stderr.write("[%s] %s\n" % (self.log_date_time_string(), fmt % args))

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def _json(self, code, obj):
        body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _body(self):
        length = int(self.headers.get("Content-Length") or 0)
        return self.rfile.read(length) if length else b""

    # ---------- 저장소 ----------
    def _store_list(self, store):
        base, out = os.path.join(DATA, store), []
        if os.path.isdir(base):
            for rid in sorted(os.listdir(base)):
                p = os.path.join(base, rid, "record.json")
                if SAFE.match(rid) and os.path.isfile(p):
                    with open(p, encoding="utf-8") as f:
                        out.append(json.load(f))
        return self._json(200, out)

    def _store_put(self, store, rid):
        rec = json.loads(self._body() or b"{}")
        rec["id"] = rid
        final = os.path.join(DATA, store, rid)
        tmp = final + ".tmp"
        shutil.rmtree(tmp, ignore_errors=True)
        os.makedirs(tmp)
        rec = write_files(rec, tmp, f"data/{store}/{rid}", "")
        with open(os.path.join(tmp, "record.json"), "w", encoding="utf-8") as f:
            json.dump(rec, f, ensure_ascii=False, indent=1)
        shutil.rmtree(final, ignore_errors=True)
        os.replace(tmp, final)
        return self._json(200, {"ok": True})

    def _store_delete(self, store, rid):
        shutil.rmtree(os.path.join(DATA, store, rid), ignore_errors=True)
        return self._json(200, {"ok": True})

    def _settings_path(self):
        return os.path.join(DATA, "settings.json")

    def do_GET(self):
        if self.path == "/proxy/ping":
            return self._json(200, {"ok": True, "storage": "files"})
        if self.path == "/api/settings":
            p = self._settings_path()
            if os.path.isfile(p):
                with open(p, encoding="utf-8") as f:
                    return self._json(200, json.load(f))
            return self._json(200, {})
        parts = self.path.split("?")[0].split("/")  # ['', 'api', 'db', store]
        if len(parts) == 4 and parts[1] == "api" and parts[2] == "db" and parts[3] in STORES:
            return self._store_list(parts[3])
        return super().do_GET()

    def do_POST(self):
        parts = self.path.split("?")[0].split("/")
        if len(parts) >= 2 and parts[1] == "api":
            try:
                if parts[2:3] == ["settings"]:
                    data = json.loads(self._body() or b"{}")
                    if isinstance(data.get("settings"), dict):  # API 키는 파일에 저장하지 않음
                        data["settings"] = {k: v for k, v in data["settings"].items() if k not in SECRET_KEYS}
                    os.makedirs(DATA, exist_ok=True)
                    with open(self._settings_path(), "w", encoding="utf-8") as f:
                        json.dump(data, f, ensure_ascii=False, indent=1)
                    return self._json(200, {"ok": True})
                if len(parts) == 5 and parts[2] in ("db", "db-delete") and parts[3] in STORES and SAFE.match(parts[4]):
                    if parts[2] == "db":
                        return self._store_put(parts[3], parts[4])
                    return self._store_delete(parts[3], parts[4])
            except Exception as e:
                return self._json(500, {"error": {"message": f"저장 실패: {type(e).__name__}: {e}"}})
            return self._json(404, {"error": {"message": "unknown api path"}})
        return self._proxy(parts)

    # ---------- API 프록시 ----------
    def _proxy(self, _):
        parts = self.path.split("/", 3)  # ['', 'proxy', '<name>', '<rest>']
        if len(parts) < 4 or parts[1] != "proxy" or parts[2] not in UPSTREAMS:
            return self._json(404, {"error": {"message": "unknown proxy path"}})
        url = UPSTREAMS[parts[2]] + "/" + parts[3]
        data = self._body() or None
        headers = {k: v for k, v in self.headers.items() if k.lower() in FORWARD_HEADERS}
        req = urllib.request.Request(url, data=data, headers=headers, method="POST")
        try:
            with urllib.request.urlopen(req, timeout=300, context=ssl.create_default_context()) as r:
                body, code, ctype = r.read(), r.status, r.headers.get("Content-Type", "application/json")
        except urllib.error.HTTPError as e:
            body, code, ctype = e.read(), e.code, e.headers.get("Content-Type", "application/json")
        except Exception as e:  # 네트워크 / 타임아웃 / SSL
            return self._json(502, {"error": {"message": f"프록시 연결 실패 ({parts[2]}): {type(e).__name__}: {e}"}})
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


class Server(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    allow_reuse_address = True


if __name__ == "__main__":
    with Server(("127.0.0.1", PORT), Handler) as httpd:
        print(f"카드 스튜디오 실행 중 →  http://localhost:{PORT}   (데이터 폴더: {DATA})   종료: Ctrl+C")
        httpd.serve_forever()
