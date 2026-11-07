"""Offline regressions: source replay, corruption, no-data and extrapolation."""
import importlib.util
import struct
import unittest
from pathlib import Path

spec=importlib.util.spec_from_file_location('ea',Path(__file__).with_name('uk_ea_elevation.py'))
ea=importlib.util.module_from_spec(spec)
spec.loader.exec_module(ea)

def fixture():
    return {'grid':{'size':2,'bounds':[-1,52,0,53],'heights':[127.5]*4},
            'nativeSupport':{'sampleCount':4,'rasterSize':[3,3],
                'nativeMinMetres':100,'nativeMaxMetres':180,
                'valuesFloat32':ea.pack(struct.pack('<16f',*([100,120,140,180]*4))),
                'fractionsFloat64':ea.pack(struct.pack('<8d',*([.25,.5]*4))),
                'pixelIndicesInt32':ea.pack(struct.pack('<8i',*([0,0]*4)))}}

class Replay(unittest.TestCase):
    def test_bilinear_preserves_native_metres(self):
        self.assertEqual(ea.validate(fixture()),0)

    def test_rejects_corruption_output_tamper_and_missing_samples(self):
        for mutate in [
            lambda r:r['nativeSupport']['valuesFloat32'].update(sha256='0'*64),
            lambda r:r['grid']['heights'].__setitem__(0,128),
            lambda r:r['grid']['heights'].pop(),
            lambda r:r['grid']['heights'].__setitem__(0,float('nan')),
        ]:
            r=fixture();mutate(r)
            with self.assertRaises(ValueError):ea.validate(r)

    def test_rejects_extrapolation_and_finite_nodata(self):
        for key,payload in [
            ('fractionsFloat64',struct.pack('<8d',*([1,.5]*4))),
            ('pixelIndicesInt32',struct.pack('<8i',*([2,0]*4))),
            ('valuesFloat32',struct.pack('<16f',*([-3.4028234663852886e38,120,140,180]*4))),
        ]:
            r=fixture();r['nativeSupport'][key]=ea.pack(payload)
            with self.assertRaises(ValueError):ea.validate(r)

    def test_retained_source_is_replayable_and_runtime_matches_acceptance(self):
        r=ea.read(ea.OUT)
        self.assertLessEqual(ea.validate(r),.000501)
        self.assertTrue(r['runtimeApplied'])
        self.assertTrue(r['sceneAcceptance']['accepted'])
        self.assertEqual(r['survey']['year'],'2019')
        self.assertEqual(r['verticalDatum'],'Ordnance Datum Newlyn')
        self.assertTrue(r['horizontalTransform']['bestAvailable'])
        runtime=ea.read(ea.ROOT/'src/circuits/generated/silverstone.json')
        self.assertEqual(runtime['elevation'],ea.elevation_replacement(r))

if __name__=='__main__':unittest.main()
