#!/usr/bin/env python3
"""Check that a running emularity-config container still serves every file
that was served at a base git ref, with the same bytes and CORS header.

usage: check-url-parity.py BASE_URL [BASE_REF]

BASE_REF defaults to origin/main. Paths that were dropped on purpose are
listed in .github/url-parity-removed.txt (one path per line, # for comments).
"""
import fnmatch
import hashlib
import http.client
import subprocess
import sys
import urllib.parse

REMOVED_FILE = '.github/url-parity-removed.txt'
# The ignore list itself is served but isn't runtime content.
SKIP = {'.dockerignore'}


def git(*args):
    return subprocess.run(['git', *args], check=True, stdout=subprocess.PIPE).stdout


def ignored(path, patterns):
    # Like Docker, match patterns from the context root, against the path
    # itself or any directory above it.
    parts = path.split('/')
    prefixes = ['/'.join(parts[: i + 1]) for i in range(len(parts))]
    return any(fnmatch.fnmatch(prefix, p.rstrip('/')) for p in patterns for prefix in prefixes)


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    base_url = urllib.parse.urlparse(sys.argv[1])
    ref = sys.argv[2] if len(sys.argv) > 2 else 'origin/main'

    paths = git('ls-tree', '-r', '-z', '--name-only', ref).decode().split('\0')
    paths = [p for p in paths if p]
    dockerignore = git('show', f'{ref}:.dockerignore').decode().split('\n')
    patterns = [l.strip() for l in dockerignore if l.strip() and not l.startswith('#')]

    try:
        removed = {
            l.strip() for l in open(REMOVED_FILE) if l.strip() and not l.startswith('#')
        }
    except FileNotFoundError:
        removed = set()

    conn = http.client.HTTPConnection(base_url.hostname, base_url.port or 80, timeout=30)
    failures = []
    checked = 0

    for path in paths:
        if ignored(path, patterns) or path in removed or path in SKIP:
            continue
        expected = hashlib.sha256(git('show', f'{ref}:{path}')).hexdigest()
        conn.request('GET', '/' + urllib.parse.quote(path))
        res = conn.getresponse()
        body = res.read()
        checked += 1
        if res.status != 200:
            failures.append(f'{path}: status {res.status}')
        elif hashlib.sha256(body).hexdigest() != expected:
            failures.append(f'{path}: content differs from {ref}')
        elif res.getheader('Access-Control-Allow-Origin') != '*':
            failures.append(f'{path}: missing Access-Control-Allow-Origin: *')

    conn.request('GET', '/')
    res = conn.getresponse()
    res.read()
    if res.status != 200:
        failures.append(f'/: status {res.status}')

    print(f'checked {checked} paths against {ref}')
    if checked == 0:
        failures.append(f'no paths checked against {ref}')
    if failures:
        print(f'{len(failures)} failed:')
        for f in failures[:50]:
            print('  ' + f)
        sys.exit(1)
    print('ok')


if __name__ == '__main__':
    main()
