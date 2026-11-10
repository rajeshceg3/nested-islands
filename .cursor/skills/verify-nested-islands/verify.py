#!/usr/bin/env python3
"""Purpose-fit verification for nested-islands.

Syntax check plus a real headless-Chrome render of the map story,
offline-safe (external tile hosts are unresolvable by design here).
Exit 0 and FAILURES=0 mean green.
"""
import http.server
import json
import os
import re
import shutil
import socket
import subprocess
import sys
import tempfile
import threading

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..'))
CHROME = os.environ.get('CHROME_BIN', '/usr/bin/google-chrome')

checks = []
failures = []


def record(name, ok, detail=''):
    checks.append({'name': name, 'ok': bool(ok), 'detail': detail})
    print(('PASS' if ok else 'FAIL') + ' ' + name + (' :: ' + detail if detail else ''))
    if not ok:
        failures.append(name)


def main():
    record('doctor: node on PATH', shutil.which('node') is not None, shutil.which('node') or 'not found')
    record('doctor: chrome available', os.path.exists(CHROME), CHROME)
    if failures:
        return finish()

    chk = subprocess.run(['node', '--check', 'app.js'], cwd=REPO_ROOT, capture_output=True, text=True)
    record('syntax: app.js', chk.returncode == 0, chk.stderr.strip()[-200:])

    with socket.socket() as s:
        s.bind(('127.0.0.1', 0))
        port = s.getsockname()[1]
    server = http.server.ThreadingHTTPServer(('127.0.0.1', port), http.server.SimpleHTTPRequestHandler)
    server.RequestHandlerClass.log_message = lambda *a: None
    os.chdir(REPO_ROOT)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    try:
        dom_dir = tempfile.mkdtemp(prefix='verify-nested-islands-dom-')
        dom_path = os.path.join(dom_dir, 'dom.html')
        with open(dom_path, 'w') as dom, open(os.path.join(dom_dir, 'console.log'), 'w') as cons:
            subprocess.run([CHROME, '--headless=new', '--no-sandbox', '--disable-gpu',
                            '--enable-logging=stderr', '--v=0',
                            '--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1',
                            '--virtual-time-budget=6000',
                            '--dump-dom', 'http://127.0.0.1:%d/' % port],
                           stdout=dom, stderr=cons, timeout=90)
        dom = open(dom_path).read()
        console = open(os.path.join(dom_dir, 'console.log')).read()
    finally:
        server.shutdown()
    record('chrome render: page and map boot',
           'Islands All the Way Down' in dom and 'leaflet-pane' in dom,
           'title + leaflet panes rendered' if 'Islands All the Way Down' in dom else dom[:200])
    errors = [l for l in console.splitlines()
              if re.search(r'console.*(error|uncaught)', l, re.I)
              and 'GPU' not in l and 'dbus' not in l.lower()]
    record('chrome render: no JS console errors', not errors, '; '.join(errors[:3]))
    return finish()


def finish():
    evidence_dir = tempfile.mkdtemp(prefix='verify-nested-islands-')
    with open(os.path.join(evidence_dir, 'evidence.json'), 'w') as f:
        json.dump({'repo': 'nested-islands', 'checks': checks, 'failures': failures}, f, indent=2)
    print('EVIDENCE_DIR=' + evidence_dir)
    print('FAILURES=%d' % len(failures))
    return 0 if not failures else 1


if __name__ == '__main__':
    sys.exit(main())
