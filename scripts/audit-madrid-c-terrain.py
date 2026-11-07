"""Offline comparison of a downloaded IGN MDT05 C-area clip; no runtime migration.

Run from repository root after the saved WCS GetCoverage request has been fetched.
Raw TIFF and request remain local in research; the report contains facts only.
"""
import hashlib
import json
import math
from pathlib import Path

import numpy as np
from PIL import Image
from pyproj import Transformer
from scipy.ndimage import map_coordinates

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / 'research/season-review/madrid2026'


def main():
    metric = json.loads((ROOT / 'artifacts/goal-review/madrid-main/metric.json').read_text(encoding='utf-8'))
    circuit = json.loads((ROOT / 'src/circuits/generated/madrid.json').read_text(encoding='utf-8'))
    for key, value in metric['inputs'].items():
        assert circuit[key] == value, f'Stale metric export: {key}'
    exposure = json.loads((ROOT / 'src/circuits/europe/madrid-c-visibility-review.json').read_text(encoding='utf-8'))
    tif = RAW / 'ign-mdt05-c.tif'
    request = json.loads((RAW / 'ign-mdt05-c-request.json').read_text(encoding='utf-8'))
    image = Image.open(tif)
    step = image.tag_v2[33550]
    tie = image.tag_v2[33922]
    keys = image.tag_v2[34735]
    entries = [keys[i:i+4] for i in range(4, len(keys), 4)]
    assert (3072, 0, 1, 25830) in entries, 'Expected ETRS89 / UTM 30N'
    assert (1025, 0, 1, 1) in entries, 'Expected RasterPixelIsArea'
    assert step[:2] == (5., 5.) and tie[:3] == (0., 0., 0.)
    assert 'Elevacion25830_5' in request['url']
    assert request['url'].startswith('https://servicios.idee.es/wcs-inspire/mdt?')
    values = np.asarray(image).astype(float)
    assert np.isfinite(values).all() and values.min() > 500 and values.max() < 800
    origin, calibration = metric['origin'], metric['calibration']
    transform = Transformer.from_crs(4326, 25830, always_xy=True)
    samples = []
    for key in ('observerPosition', 'cockpitPosition'):
        x, _, z = exposure[key]
        lon = origin[0] + x / (111320 * math.cos(math.radians(origin[1])) * calibration)
        lat = origin[1] - z / (111320 * calibration)
        east, north = transform.transform(lon, lat)
        col, row = (east - tie[3]) / step[0] - .5, (tie[4] - north) / step[1] - .5
        assert 0 <= col < image.width-1 and 0 <= row < image.height-1, 'Sample outside downloaded clip'
        height = float(map_coordinates(values, [[row], [col]], order=1, mode='constant', cval=np.nan)[0])
        assert math.isfinite(height)
        samples.append({'position': key, 'longitude': lon, 'latitude': lat, 'heightMetres': height})
    report = {
        'circuitId': 'madrid', 'zoneId': 'ga-c-straight', 'checkedOn': '2026-10-26',
        'source': {'provider': 'IGN/CNIG', 'requestUrl': request['url'], 'coverageId': 'Elevacion25830_5',
                   'sha256': hashlib.sha256(tif.read_bytes()).hexdigest(), 'bytes': tif.stat().st_size,
                   'resolutionMetres': 5, 'crs': 'EPSG:25830', 'shape': [image.height, image.width],
                   'acquisitionDate': None, 'heightQuantizationMetres': 1},
        'samples': samples, 'groundDifferenceMetres': samples[1]['heightMetres']-samples[0]['heightMetres'],
        'regionalFlightEvidence': [
            {'url': 'https://pnoa.ign.es/pnoa-lidar/segunda-cobertura', 'madridFlightRange': ['2016-08', '2016-09']},
            {'url': 'https://pnoa.ign.es/pnoa-lidar/tercera-cobertura', 'madridFlightRange': ['2024-03', '2024-05']},
            {'url': 'https://www.madring.com/en/press-releases/circuit-construction', 'publishedOn': '2025-04-15', 'constructionStarts': '2025-04'}],
        'conclusion': 'The separate 5m official coverage also places the observer ground below the nearby road location. It does not certify the built 2026 cross-section or prove visibility. Regional flight dates must not be assigned to this undated WCS clip.',
        'runtimeApplied': False,
        'nextAction': 'Obtain the built C-area road/GA cross-section or dated post-construction elevation before accepting the ground candidate.'}
    output = ROOT / 'src/circuits/europe/madrid-c-terrain-review.json'
    output.write_text(json.dumps(report, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    print(json.dumps({'samples': samples, 'groundDifferenceMetres': report['groundDifferenceMetres'], 'runtimeApplied': False}))


if __name__ == '__main__':
    main()
