"""Compare the candidate with independent IGN probes and current terrain.
Does not change simulator data or make a vertical-accuracy certification.
"""
import hashlib,json,math
from collections import Counter
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
read=lambda p:json.loads((ROOT/p).read_text('utf8'))
path=ROOT/'src/circuits/europe/monaco-rge-alti-candidate.json';raw=path.read_bytes();source=json.loads(raw)
data=read('src/circuits/generated/monaco.json');old=data['elevation']['grid']
def sample(grid,lon,lat):
 west,south,east,north=grid['bounds'];n=grid['size']
 if not west<=lon<=east or not south<=lat<=north:return None
 x=(lon-west)/(east-west)*(n-1);y=(lat-south)/(north-south)*(n-1);i=min(n-2,int(x));j=min(n-2,int(y));u=x-i;v=y-j
 h=[grid['heights'][k] for k in [j*n+i,j*n+i+1,(j+1)*n+i,(j+1)*n+i+1]]
 if any(z is None or not math.isfinite(z) for z in h):return None
 return h[0]*(1-u)*(1-v)+h[1]*u*(1-v)+h[2]*(1-u)*v+h[3]*u*v
missing=[]
# Check every point of a129-square target frame, including all interpolation
# stencils, rather than treating absence of missing nodes inside it as enough.
for j in range(129):
 for i in range(129):
  lon=old['bounds'][0]+i*(old['bounds'][2]-old['bounds'][0])/128;lat=old['bounds'][1]+j*(old['bounds'][3]-old['bounds'][1])/128
  if sample(source,lon,lat) is None:missing.append([lon,lat])
points=[]
for p in read('research/season-review/monaco2026/ign-dynamic-probe.json')['elevations']:
 z=sample(source,p['lon'],p['lat']);baseline=sample(old,p['lon'],p['lat'])
 native=next(m for m in p['measures'] if m.get('title')=='RGE Alti 1m : France métropolitaine + Corse')
 points.append(dict(lon=p['lon'],lat=p['lat'],independentApiMetres=p['z'],candidateMetres=z,currentMetres=baseline,interpolationDifferenceMetres=None if z is None else z-p['z'],acquisition=native['source_name']))
counts=Counter(source['acquisitionClasses'])
edgeResponse=ROOT/'research/season-review/monaco2026/ign-edge-direct-response.json'
edge=[]
if edgeResponse.exists():
 rows=json.loads(edgeResponse.read_bytes())['elevations']
 if len(rows)!=len(missing):raise ValueError('Direct edge probe count changed')
 for requested,p in zip(missing,rows):
  if abs(p['lon']-requested[0])>5e-8 or abs(p['lat']-requested[1])>5e-8:raise ValueError('Wrong direct edge probe')
  value=p['z'];valid=math.isfinite(value) and -500<value<9000
  edge.append(dict(lon=p['lon'],lat=p['lat'],metres=value if valid else None,valid=valid))
report=dict(circuitId='monaco',checkedAt='2026-10-26',candidateSha256=hashlib.sha256(raw).hexdigest(),baselineElevationSha256=hashlib.sha256(json.dumps(data['elevation'],sort_keys=True,separators=(',',':')).encode()).hexdigest(),
 validCount=source['validCount'],missingCount=source['missingCount'],acquisitionCounts={name:counts[i] for i,name in enumerate(source['acquisitionPalette'])},
 existingFrame129GridMissingStencils=len(missing),missingStencilCoordinates=missing,directEdgeProbes=edge,directEdgeResponseSha256=hashlib.sha256(edgeResponse.read_bytes()).hexdigest() if edge else None,independentProbes=points,applicationReady=False,
 sourceDecisions=[dict(url='https://www.arcgis.com/sharing/rest/content/items/fd0fff550d6b462fb76843e05734ee42',decision='Excluded: licence limits use to Monaco government services and associated applications. Tile imagery was not downloaded or used.'),
 dict(url='https://www.arcgis.com/sharing/rest/content/items/e4e457a2b90b4f5b98a7c63629a00cc2',decision='2023 circuit tour, not a2026 public ticket boundary. No photographs copied.'),
 dict(url=source['licenseEvidence'],decision='IGN RGE ALTI catalog identifies Licence Ouverte2.0; candidate numeric elevations retained with raw-response hashes and acquisition classes.')],
 limitations=['Native1m product spacing is not vertical accuracy; acquisition density/date vary or are unknown.','Missing elevations stay null. No filling, smoothing or observer fitting. Direct edge probes are retained separately, not silently inserted.','Sea elevations are not a bathymetric survey.','Rocher still needs independent geographic anchors; nearby OSM forest parcels are not ticket-access proof.','Live terrain and all current views remain unchanged until separate terrain/simulation review.'])
OUT=ROOT/'src/circuits/season-review/monaco-terrain-source-review.json';OUT.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n','utf8')
print('Current-frame missing stencils:',len(missing),'Independent sampled/API differences:',[None if p['interpolationDifferenceMetres'] is None else round(p['interpolationDifferenceMetres'],2) for p in points])
