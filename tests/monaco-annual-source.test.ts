import {expect,it} from 'vitest';
import report from '../src/circuits/season-review/monaco-annual-ticket-source-review.json';
import source from '../src/circuits/europe/monaco-t-2026.json';
import inventory from '../src/circuits/season-review/inventory-2026.json';
import backlog from '../src/circuits/season-review/backlog-2026.json';
import {loadCircuit} from '../src/circuits/registry';
import {translate} from '../src/i18n';
import e from '../src/circuits/europe/monaco-e-2026.json';
import xs from '../src/circuits/europe/monaco-x-2026.json';

it('rejects successful responses when they belong to another year or another Monaco event',()=>{
 expect(report.retrievals.every(s=>s.acceptedAs2026OrdinaryInventory===false)).toBe(true);
 const historic=report.retrievals.find(s=>s.finalUrl.includes('historique'))!;
 expect(historic.status).toBe(200);expect(historic.observedYear).toBe(2026);
 expect(historic.observedEvent).toBe('Monaco Historic Grand Prix');
 expect(report.retrievals.some(s=>s.observedYear===2025&&s.acceptedAs2026OrdinaryInventory===false)).toBe(true);
 expect(report.unresolvedOrdinaryLabels).toEqual([]);expect(report.unresolvedLegacyLabels).toEqual(['M']);
});
it('keeps complete T layer coverage required while retaining the verified front-band model',async()=>{
 const d=await loadCircuit('monaco'),t=d.spectatorZones.find(z=>z.zoneId==='t-rascasse')!;
 expect(t.availability).toBe('available');expect(t.admissionNote).toContain('分界、高度、顶棚为近似');
 expect(translate(t.admissionNote!,'en')).toContain('Dividers, heights and roof are approximate.');
 expect(source.coverageScope.completeOrdinaryCoverage).toBe(false);expect(source.sceneAcceptance.accepted).toBe(true);
 expect(report.layerCoverageQuestions).toEqual([]);expect(report.approximateLayerReviews.find(r=>r.zoneId==='t-rascasse')).toMatchObject({accepted:true,actualTierBoundaryVerified:false});
 expect(inventory.find(r=>r.circuitId==='monaco')!.layerCoverageQuestions).toEqual(report.layerCoverageQuestions);
 expect(backlog.rows.find(r=>r.circuitId==='monaco')!.layerCoverageQuestions).toEqual(report.layerCoverageQuestions);
});
it('uses independent annual E/X evidence while keeping unverified M unavailable',async()=>{
 const d=await loadCircuit('monaco');
 expect(d.spectatorZones.find(z=>z.zoneId==='m-piscine')).toBeUndefined();
 expect(report.annualSupplierEvidence.eventDates).toEqual(['2026-06-04','2026-06-07']);
 expect(report.annualSupplierEvidence.products).toContain('Grandstand E - Sunday');
 expect(report.annualXSupplierEvidence.header).toBe('Monaco Grand Prix 2026 RACE TICKETS');
 expect(report.annualXSupplierEvidence.products).toEqual(['Grandstand X1','Grandstand X2']);
 for(const z of [...e.zones,...xs.zones]){
  expect(d.spectatorZones.find(a=>a.zoneId===z.zoneId)).toEqual(z);
  expect(z.availability).toBe('available');
  expect([report.annualSupplierEvidence.url,report.annualXSupplierEvidence.url]).toContain(z.openingSource.url);
 }
 expect(report.inventoryComplete).toBe(false);expect(report.verifiedCurrentMedia.pdfPage).toBe(21);
});
