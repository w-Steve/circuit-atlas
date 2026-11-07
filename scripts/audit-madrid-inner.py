"""Quarantine the legacy inner rectangle; do not invent GD bank geometry."""
import copy
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
read = lambda p: json.loads(p.read_text('utf8'))
package = ROOT/'src/circuits/generated/madrid.json'
source = ROOT/'src/circuits/europe/madrid-inner-2026.json'
raw = ROOT/'research/season-review/madrid2026/map-xl.webp'
sha = hashlib.sha256(raw.read_bytes()).hexdigest()
assert sha == '99ac1e3d5f822f0b650da0f727956c7f8c7d64c9616327f4cfc0cedebacaf241'
assert "('Monumental 内侧看台',1048,231,86,18,80)" in (ROOT/'scripts/build-europe-spectators.py').read_text('utf8'), 'Legacy source identity changed'
data = read(package)
current = next(z for z in data['spectatorZones'] if z['zoneId']=='monumental-12')
previous = read(source) if source.exists() else None
old = previous['oldZone'] if previous else copy.deepcopy(current)
assert previous is None or current in [old, previous['zone']], 'Preserve independently edited bank'
assert old['availability']=='available' and len(old['boundary'])==5
zone = copy.deepcopy(old)
zone['availability'] = 'preparing'
zone['geometryReview'] = {
    'checkedAt':'2026-10-27',
    'issues':['Legacy source rectangle crosses central hospitality facilities instead of following the separate inner GD seating arcs.'],
    'method':'Manual final2026 source identity review; no new geographic boundary inferred.'}
report = {
    'circuitId':'madrid','season':2026,
    'sourceUrl':'https://www.madring.com/img/xl/mapa-madring/mapa_web_11_8_26_ing.webp',
    'sourceSha256':sha,
    'geometryFingerprint':hashlib.sha256(json.dumps({k:data[k] for k in ['trackGeometry','corners','elevation']},sort_keys=True,separators=(',',':')).encode()).hexdigest(),
    'legacySourceRectangle':{'center':[1048,231],'width':86,'depth':18,'angleDegrees':80},
    'sourceIdentity':{'centralSymbol6':'Azotea hospitality facility, not a public grandstand boundary',
                      'actualSeating':'Separate purple GD seating arcs around the central facilities',
                      'inspectedCrop':[1000,175,1100,287]},
    'nextAction':'Register each visible GD seating arc to the road independently; verify annual public access and row profile. Do not substitute the central hospitality footprint.',
    'geometryAvailable':False,'inventoryComplete':False,'zone':zone,'oldZone':old}
source.write_text(json.dumps(report,ensure_ascii=False,separators=(',',':'))+'\n','utf8')
data['spectatorZones'][data['spectatorZones'].index(current)] = zone
data['spectatorZoneIds'] = [z['zoneId'] for z in data['spectatorZones'] if z['availability']=='available']
package.write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')),'utf8')
summaries = ROOT/'src/circuits/generated/summaries.json'
entries = read(summaries)
next(s for s in entries if s['circuitId']=='madrid')['spectatorZoneIds'] = data['spectatorZoneIds']
summaries.write_text(json.dumps(entries,ensure_ascii=False,separators=(',',':')),'utf8')
print('monumental-12 quarantined; original preserved; GD arcs still require actual geometry')
