"""Reproduce only the source-model relative profile, never infer metre altitude."""
import json, math
from pathlib import Path

root = Path(__file__).resolve().parents[1]
record = json.loads((root / 'src/circuits/season-review/yas-marina-marina-relative-profile-2026.json').read_text('utf8'))
points = {p['seatId']: p['position'] for p in record['points']}
assert set(points) == {'S_MR04-A-46', 'S_MR04-A-47', 'S_MR04-R-47'}
a, b, r = (points[k] for k in ['S_MR04-A-46', 'S_MR04-A-47', 'S_MR04-R-47'])
assert all(len(p) == 3 and all(math.isfinite(v) for v in p) for p in points.values())
assert abs(a[1] - b[1]) < 1e-8
run, rise = math.hypot(r[0] - b[0], r[2] - b[2]), r[1] - b[1]
assert run > 0 and rise > 0
assert math.isclose(rise / run, record['relativeGeometry']['viewpointGradeRatio'], abs_tol=1e-10)
assert record['relativeGeometry']['numberedRowIntervals'] == 15
assert not record['runtimeApplied']
print(f'MR04 source-model viewpoint grade {rise / run:.6f}; no metre scale or absolute floor accepted.')
