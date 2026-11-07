"""Reapply source-reviewed structural relationships without rebuilding footprints."""
import argparse,json
from pathlib import Path
root=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser();parser.add_argument('--circuit');args=parser.parse_args()
for source in sorted(path for region in ('asia','europe','americas') for path in (root/f'src/circuits/{region}').glob('*-structural-datums.json')):
    config=json.loads(source.read_text('utf-8'))
    if args.circuit and config['circuitId']!=args.circuit:continue
    path=root/f'src/circuits/generated/{config["circuitId"]}.json'
    data=json.loads(path.read_text('utf-8'))
    for area in config['areas']:
        zone=next(z for z in data['spectatorZones'] if z['zoneId']==area['zoneId'])
        surface=next(s for s in zone['surfaces'] if s['surfaceId']==area['surfaceId'])
        if 'previousSurface' in area:
            replacement={**area['previousSurface'],**{k:area[k] for k in ['groundReference','rowStrip','rowBearing'] if k in area}}
            if surface not in [*area.get('previousSurfaces',[area['previousSurface']]),replacement]:raise ValueError('Preserve independent structural edits')
        if 'seatFootprint' in area:
            footprint=area['seatFootprint']
            surface['boundary']=footprint['boundary']
            zone['source']=footprint['source']
            if len(zone['surfaces'])==1:
                zone['boundary']=footprint['boundary']
                zone['surface']['depth']=footprint['depthMetres']
        if 'groundReference' in area:surface['groundReference']=area['groundReference']
        if 'rowBearing' in area:surface['rowBearing']=area['rowBearing']
        if 'rowStrip' in area:surface['rowStrip']=area['rowStrip']
        if 'rowFrontEdge' in area:surface['rowFrontEdge']=area['rowFrontEdge']
        if 'frontReference' in area:surface['frontReference']=area['frontReference']
        if 'openingSource' in area:zone['openingSource']=area['openingSource']
        if 'geometryReview' in area:zone['geometryReview']=area['geometryReview']
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
