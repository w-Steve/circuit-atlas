"""Reapply source-reviewed structural relationships without rebuilding footprints."""
import json
from pathlib import Path
root=Path(__file__).resolve().parents[1]
for source in sorted(path for region in ('asia','europe') for path in (root/f'src/circuits/{region}').glob('*-structural-datums.json')):
    config=json.loads(source.read_text('utf-8'))
    path=root/f'src/circuits/generated/{config["circuitId"]}.json'
    data=json.loads(path.read_text('utf-8'))
    for area in config['areas']:
        zone=next(z for z in data['spectatorZones'] if z['zoneId']==area['zoneId'])
        surface=next(s for s in zone['surfaces'] if s['surfaceId']==area['surfaceId'])
        if 'seatFootprint' in area:
            footprint=area['seatFootprint']
            surface['boundary']=footprint['boundary']
            zone['source']=footprint['source']
            if len(zone['surfaces'])==1:
                zone['boundary']=footprint['boundary']
                zone['surface']['depth']=footprint['depthMetres']
        if 'groundReference' in area:surface['groundReference']=area['groundReference']
        if 'rowBearing' in area:surface['rowBearing']=area['rowBearing']
        if 'frontRailing' in area:surface['frontRailing']=area['frontRailing']
        if 'rowProfile' in area:
            profile=area['rowProfile'];rows=profile['rows'];riser=profile['riserMetres']
            if not isinstance(rows,int) or rows<2 or not 0<riser<1:raise ValueError('Invalid seating profile')
            surface.update(rows=rows,rise=round((rows-1)*riser,4),rowRiserMetres=riser,rowCountSource=profile['rowCountSource'])
            zone['surfaceSource']=profile['riseSource']
            if surface['surfaceId']==zone['surfaces'][0]['surfaceId']:zone['surface']['rise']=surface['rise']
        if 'baseReference' in area:
            surface['baseReference']=area['baseReference']
            if 'rowProfile' not in area:zone['surfaceSource']=area['baseReference']['source']
    path.write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')),'utf-8')
