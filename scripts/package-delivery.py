"""Package the current source, verified dist and final evidence without caches."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import hashlib

root = Path(__file__).resolve().parent.parent
target = root / 'F1-Spectator-Phase2-delivery.zip'
folders = ['src', 'public', 'tests', 'e2e', 'scripts', 'dist', 'artifacts/europe-spectators', 'artifacts/terrain-polish', 'artifacts/desktop-camera-fence', 'artifacts/parked-pose', 'artifacts/selection-orbit', 'artifacts/unified-camera', 'artifacts/shanghai-polish', 'artifacts/map-fixes', 'artifacts/final', 'artifacts/feedback-direct-selection']
folders += ['artifacts/map-audit']
folders += ['artifacts/asia-spectators', 'artifacts/americas-spectators', 'artifacts/world-home']
folders += ['artifacts/atlas-source', 'artifacts/historical-atlas']
files = [p for p in root.iterdir() if p.is_file() and p.suffix in {'.md', '.json', '.ts', '.html', '.toml'} and p.name != 'tsconfig.tsbuildinfo']
files += [root / '.gitignore']
for folder in folders:
    files += [p for p in (root / folder).rglob('*') if p.is_file() and '__pycache__' not in p.parts]
with ZipFile(target, 'w', ZIP_DEFLATED, compresslevel=7) as archive:
    for file in sorted(set(files)):
        archive.write(file, file.relative_to(root).as_posix())
with ZipFile(target) as archive:
    assert archive.testzip() is None
    for required in ['dist/index.html', 'dist/licenses/THIRD_PARTY_NOTICES.txt', 'dist/licenses/europe-zones-ODbL.txt', 'dist/licenses/asia-zones-ODbL.txt', 'dist/licenses/americas-zones-ODbL.txt', 'dist/licenses/world-Natural-Earth.txt', 'dist/fonts/BarlowCondensed-SemiBold.ttf', 'src/main.tsx', 'PROGRESS.md']:
        assert required in archive.namelist(), required
digest = hashlib.sha256(target.read_bytes()).hexdigest()
target.with_suffix('.zip.sha256').write_text(f'{digest}  {target.name}\n', encoding='utf-8')
print(f'{target.name}: {len(files)} files, {target.stat().st_size:,} bytes, CRC verified\nSHA256 {digest}')
