#!/usr/bin/env python3
import hashlib
import hmac
import html
import json
import os
import re
import ssl
import threading
import time
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

DEFAULT_USERNAME = 'phone'
SIGN_VALID_SECONDS = 3600
CACHE_REFRESH_SECONDS = 2 * 60 * 60
CACHE_DIR = os.getenv('CACHE_DIR', '/root/dingdang-frame-cache')


def log(message):
    print('[dingdang-frame] ' + message, flush=True)


class Config(object):
    def __init__(self):
        self.cos_secret_id = require_env('TENCENT_COS_SECRET_ID')
        self.cos_secret_key = require_env('TENCENT_COS_SECRET_KEY')
        self.cos_bucket = os.getenv('TENCENT_COS_BUCKET', 'cloudflare-static-1252612849').strip()
        self.cos_region = os.getenv('TENCENT_COS_REGION', 'na-ashburn').strip()
        self.cos_base_url = os.getenv('TENCENT_COS_BASE_URL', 'https://%s.cos.%s.myqcloud.com' % (self.cos_bucket, self.cos_region)).strip().rstrip('/')
        self.password_file_suffix = os.getenv('PASSWORD_FILE_SUFFIX', '.txt').strip() or '.txt'
        self.request_timeout_ms = int(os.getenv('REQUEST_TIMEOUT_MS', '20000'))
        self.bind_host = os.getenv('BIND_HOST', '0.0.0.0')
        self.port = int(os.getenv('PORT', '18082'))
        self.public_base_url = os.getenv('PUBLIC_BASE_URL', '').strip().rstrip('/')
        self.default_names = [name.strip() for name in os.getenv('DEFAULT_NAMES', DEFAULT_USERNAME).split(',') if name.strip()]


CONFIG = Config()
SSL_CONTEXT = ssl.create_default_context()
SSL_CONTEXT.check_hostname = False
SSL_CONTEXT.verify_mode = ssl.CERT_NONE
CACHE_LOCK = threading.Lock()


def ensure_cache_dir():
    os.makedirs(CACHE_DIR, exist_ok=True)


def cache_path(name):
    safe = re.sub(r'[^a-zA-Z0-9._-]+', '_', name)
    return os.path.join(CACHE_DIR, safe + '.json')


def write_cache(name, payload):
    ensure_cache_dir()
    with open(cache_path(name), 'w', encoding='utf-8') as fp:
        json.dump(payload, fp, ensure_ascii=False)


def read_cache(name):
    with open(cache_path(name), 'r', encoding='utf-8') as fp:
        return json.load(fp)


def encode_cos(value):
    return urllib.parse.quote(value, safe='').replace('!', '%21').replace("'", '%27').replace('(', '%28').replace(')', '%29').replace('*', '%2A')


def sha1_hex(text):
    return hashlib.sha1(text.encode('utf-8')).hexdigest()


def hmac_sha1_hex(key, message):
    return hmac.new(key.encode('utf-8'), message.encode('utf-8'), hashlib.sha1).hexdigest()


def build_cos_authorization(method, pathname, headers, query_items, now):
    start = int(now)
    end = start + SIGN_VALID_SECONDS
    key_time = '%s;%s' % (start, end)
    sign_key = hmac_sha1_hex(CONFIG.cos_secret_key, key_time)
    header_entries = sorted((k.lower(), v) for k, v in headers.items())
    header_list = ';'.join(k for k, _ in header_entries)
    http_headers = '&'.join('%s=%s' % (encode_cos(k), encode_cos(v)) for k, v in header_entries)
    query_entries = sorted((k.lower(), v) for k, v in query_items)
    param_list = ';'.join(k for k, _ in query_entries)
    http_parameters = '&'.join('%s=%s' % (encode_cos(k), encode_cos(v)) for k, v in query_entries)
    http_string = '%s\n%s\n%s\n%s\n' % (method.lower(), pathname, http_parameters, http_headers)
    string_to_sign = 'sha1\n%s\n%s\n' % (key_time, sha1_hex(http_string))
    signature = hmac_sha1_hex(sign_key, string_to_sign)
    return 'q-sign-algorithm=sha1&q-ak=%s&q-sign-time=%s&q-key-time=%s&q-header-list=%s&q-url-param-list=%s&q-signature=%s' % (
        CONFIG.cos_secret_id, key_time, key_time, header_list, param_list, signature)


def cos_request(method, url):
    parsed = urllib.parse.urlparse(url)
    now = time.time()
    headers = {
        'date': time.strftime('%a, %d %b %Y %H:%M:%S GMT', time.gmtime(now)),
        'host': parsed.netloc,
        'user-agent': 'Mozilla/5.0 DingdangFrameServer/1.0',
    }
    query_items = urllib.parse.parse_qsl(parsed.query, keep_blank_values=True)
    auth = build_cos_authorization(method, parsed.path or '/', headers, query_items, now)
    req = urllib.request.Request(url, method=method.upper(), headers={'Authorization': auth, 'Date': headers['date'], 'User-Agent': headers['user-agent']})
    return urllib.request.urlopen(req, timeout=CONFIG.request_timeout_ms / 1000.0, context=SSL_CONTEXT)


def object_exists(key):
    try:
        response = cos_request('HEAD', CONFIG.cos_base_url + '/' + key)
        response.close()
        return True
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return False
        raise RuntimeError('COS HEAD failed: %s' % e.code)


def assert_authorized(name):
    suffix = CONFIG.password_file_suffix if CONFIG.password_file_suffix.startswith('.') else '.' + CONFIG.password_file_suffix
    password = name
    candidates = ['%s/%s%s' % (name, password, suffix), '%s%s' % (password, suffix)]
    for key in candidates:
        if object_exists(key):
            return
    raise RuntimeError('用户名或密码错误')


def parse_list_xml(xml_text):
    root = ET.fromstring(xml_text)
    ns = ''
    if root.tag.startswith('{'):
        ns = root.tag.split('}')[0] + '}'
    out = []
    for content in root.findall(ns + 'Contents'):
        key = content.findtext(ns + 'Key', '')
        if not key:
            continue
        out.append({'key': html.unescape(key), 'updated_at': content.findtext(ns + 'LastModified', '1970-01-01T00:00:00Z')})
    return out


def read_image_size(data):
    if len(data) >= 24 and data[:8] == b'\x89PNG\r\n\x1a\n':
        return int.from_bytes(data[16:20], 'big'), int.from_bytes(data[20:24], 'big')
    if len(data) >= 4 and data[:2] == b'\xff\xd8':
        offset = 2
        while offset + 9 < len(data):
            if data[offset] != 0xFF:
                break
            marker = data[offset + 1]
            length = int.from_bytes(data[offset + 2:offset + 4], 'big')
            if 0xC0 <= marker <= 0xC3:
                h = int.from_bytes(data[offset + 5:offset + 7], 'big')
                w = int.from_bytes(data[offset + 7:offset + 9], 'big')
                return w, h
            offset += 2 + length
    raise RuntimeError('不支持的图片格式')


def compute_latest(name):
    assert_authorized(name)
    list_url = CONFIG.cos_base_url + '/?list-type=2&prefix=' + urllib.parse.quote(name + '/')
    xml_text = cos_request('GET', list_url).read().decode('utf-8')
    images = []
    for item in parse_list_xml(xml_text):
        if not re.search(r'\.(png|jpe?g|webp)$', item['key'], re.I):
            continue
        body = cos_request('GET', CONFIG.cos_base_url + '/' + item['key']).read()
        w, h = read_image_size(body)
        if w > 1280 and h > 800:
            images.append({'key': item['key'], 'updated_at': item['updated_at']})
    if not images:
        raise RuntimeError('暂无符合条件的图片')
    images.sort(key=lambda x: x['updated_at'], reverse=True)
    current_url = None
    try:
        current_url = read_cache(name).get('imageUrl')
    except Exception:
        current_url = None
    chosen = images[0]
    if current_url:
        for item in images:
            candidate_url = CONFIG.cos_base_url + '/' + item['key']
            if candidate_url != current_url:
                chosen = item
                break
    payload = {
        'name': name,
        'imageUrl': CONFIG.cos_base_url + '/' + chosen['key'],
        'updatedAt': chosen['updated_at'],
        'refreshedAt': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
    }
    write_cache(name, payload)
    log('cache refreshed for %s -> %s' % (name, payload['imageUrl']))
    return payload


def refresh_loop():
    while True:
        try:
            with CACHE_LOCK:
                for name in CONFIG.default_names:
                    compute_latest(name)
        except Exception as e:
            log('background refresh failed: %s' % e)
        time.sleep(CACHE_REFRESH_SECONDS)


def load_cached(name):
    with CACHE_LOCK:
        return read_cache(name)


def render_home():
    return '<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Dingdang Frame</title><style>body{margin:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"PingFang SC","Microsoft YaHei",sans-serif;background:#000;color:#fff}.wrap{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}.card{width:min(92vw,720px);background:#111;border-radius:20px;padding:28px;box-shadow:0 18px 60px rgba(0,0,0,.35)}h1{margin:0 0 12px;font-size:40px}p{color:#bbb;font-size:20px;line-height:1.5}</style></head><body><div class="wrap"><div class="card"><h1>叮当电子相框</h1><p>请使用直达地址，例如：<br><strong>?name=phone</strong></p></div></div></body></html>'


def render_frame(image_url, updated_at, name):
    return f'''<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover"><meta http-equiv="refresh" content="7200"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="mobile-web-app-capable" content="yes"><title>Dingdang Frame</title><style>html,body{{margin:0;padding:0;width:100%;height:100%;background:#000;overflow:hidden;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;touch-action:manipulation}}img{{position:fixed;inset:0;width:100%;height:100%;object-fit:cover;background:#000;-webkit-touch-callout:none}}*{{-webkit-tap-highlight-color:transparent}}</style></head><body><img id="frame" src="{html.escape(image_url, quote=True)}" alt="相框图片"><script>(function(){{var el=document.documentElement;var req=el.requestFullscreen||el.webkitRequestFullscreen||el.mozRequestFullScreen||el.msRequestFullscreen;if(req){{try{{req.call(el);}}catch(e){{}}}}document.body.ondblclick=function(){{return false;}};document.body.onselectstart=function(){{return false;}};}})();</script></body></html>'''


def render_error(message):
    return '<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>加载失败</title><style>body{margin:0;background:#000;color:#fff;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"PingFang SC","Microsoft YaHei",sans-serif;display:flex;min-height:100vh;align-items:center;justify-content:center;padding:24px}.card{background:#111;padding:24px;border-radius:18px;max-width:720px}a{color:#8ab4ff}</style></head><body><div class="card"><h1>加载失败</h1><p>%s</p><p><a href="/">返回说明</a></p></div></body></html>' % html.escape(message)


class Handler(BaseHTTPRequestHandler):
    server_version = 'DingdangFrameServer/2.0'

    def send_bytes(self, status, body, content_type, extra=None):
        self.send_response(status)
        self.send_header('Content-Type', content_type)
        self.send_header('Content-Length', str(len(body)))
        if extra:
            for k, v in extra.items():
                self.send_header(k, v)
        self.end_headers()
        self.wfile.write(body)

    def send_json(self, status, payload):
        self.send_bytes(status, json.dumps(payload, ensure_ascii=False).encode('utf-8'), 'application/json; charset=utf-8', {'Cache-Control': 'no-store'})

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path.startswith('/health'):
            self.send_json(200, {'ok': True, 'cacheNames': CONFIG.default_names})
            return
        query = urllib.parse.parse_qs(parsed.query)
        name = (query.get('name') or [''])[0].strip()
        if name:
            try:
                cached = load_cached(name)
                self.send_bytes(200, render_frame(cached['imageUrl'], cached['updatedAt'], name).encode('utf-8'), 'text/html; charset=utf-8', {'Cache-Control': 'no-store'})
            except Exception as e:
                self.send_bytes(502, render_error(str(e)).encode('utf-8'), 'text/html; charset=utf-8', {'Cache-Control': 'no-store'})
            return
        self.send_bytes(200, render_home().encode('utf-8'), 'text/html; charset=utf-8', {'Cache-Control': 'no-store'})

    def do_POST(self):
        if self.path == '/frame':
            self.handle_frame_json(); return
        self.send_json(405, {'ok': False, 'code': 'METHOD_NOT_ALLOWED', 'message': 'Unsupported route'})

    def handle_frame_json(self):
        try:
            length = int(self.headers.get('Content-Length', '0'))
        except ValueError:
            length = 0
        raw = self.rfile.read(length).decode('utf-8')
        try:
            payload = json.loads(raw or '{}')
        except Exception:
            self.send_json(400, {'ok': False, 'code': 'BAD_REQUEST', 'message': 'Request body must be valid JSON'})
            return
        username = str(payload.get('username', '')).strip()
        if not username:
            self.send_json(400, {'ok': False, 'code': 'BAD_REQUEST', 'message': 'username is required'})
            return
        try:
            self.send_json(200, load_cached(username))
        except Exception as e:
            self.send_json(502, {'ok': False, 'code': 'REQUEST_FAILED', 'message': str(e)})

    def log_message(self, fmt, *args):
        pass


if __name__ == '__main__':
    ensure_cache_dir()
    with CACHE_LOCK:
        for name in CONFIG.default_names:
            try:
                compute_latest(name)
            except Exception as e:
                log('startup refresh failed for %s: %s' % (name, e))
    thread = threading.Thread(target=refresh_loop, daemon=True)
    thread.start()
    server = ThreadingHTTPServer((CONFIG.bind_host, CONFIG.port), Handler)
    log('server listening on %s:%s' % (CONFIG.bind_host, CONFIG.port))
    server.serve_forever()
