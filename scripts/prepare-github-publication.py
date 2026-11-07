"""Copy a minimal publishable working snapshot; never rewrite local Git history.

The public repository is independently versioned because local history contains
delivery ZIPs over GitHub's per-file limit. This script does not commit or push.
It does not remove existing files; inspect the publication checkout before push.
"""
from pathlib import Path
import hashlib
import json
import re
import shutil

root = Path(__file__).resolve().parents[1]
if (root / 'CLOUD_SYNC_PAUSED.md').exists():
    raise SystemExit('Cloud sync is paused by the user. Keep changes local until explicitly resumed.')
target = root / '.tools/github-publication'
target.mkdir(parents=True, exist_ok=True)
folders = ['src', 'public', 'tests', '.github', 'artifacts/atlas-source']
files = ['package.json', 'package-lock.json', 'tsconfig.json', 'vite.config.ts',
         'vitest.config.ts', 'index.html', 'DATA_SOURCES.md', 'LIMITATIONS.md',
         'scripts/generate-notices.mjs', 'scripts/build-atlas.py']
for folder in folders:
    files += [p.relative_to(root).as_posix() for p in (root / folder).rglob('*') if p.is_file()]
patterns = [r'-----BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY-----',
            r'gh[pousr]_[A-Za-z0-9]{30,}', r'github_pat_[A-Za-z0-9_]{30,}']
manifest = []
for name in sorted(set(files)):
    source = root / name
    assert source.is_file(), name
    assert source.stat().st_size < 40*1024*1024, name
    if source.suffix in {'.ts', '.tsx', '.json', '.md', '.yml', '.mjs', '.py', '.txt', '.html'}:
        text = source.read_text(encoding='utf-8')
        assert not any(re.search(p, text) for p in patterns), f'Credential-like content: {name}'
    dest = target / name
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(source, dest)
    manifest.append({'path': name, 'bytes': source.stat().st_size,
                     'sha256': hashlib.sha256(source.read_bytes()).hexdigest()})
(target / '.gitignore').write_text('node_modules/\ndist/\n.tools/\n*.tsbuildinfo\n.env\n.env.*\n', encoding='utf-8')
report = root / 'artifacts/github-deployment'
report.mkdir(parents=True, exist_ok=True)
(report / 'publication-manifest.json').write_text(json.dumps(manifest, indent=2)+'\n', encoding='utf-8')
print(f'{len(manifest)} necessary files, {sum(f["bytes"] for f in manifest):,} bytes -> {target}')
