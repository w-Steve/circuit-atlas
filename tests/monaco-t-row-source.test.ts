import {it,expect} from 'vitest';
import annual from '../src/circuits/season-review/monaco-annual-ticket-source-review.json';
import {loadCircuit} from '../src/circuits/registry';
it('keeps verified2026 T row categories separate from unverified upper platform geometry',async()=>{
 const r=annual.annualTRowEvidence;
 expect(r.documentEvent).toContain('2026');expect(r.reviewedVisually).toBe(true);
 expect(r.products).toEqual([{name:'T Low',rowRange:['A','M'],rowCount:13},{name:'T High',rowRange:['N','W'],rowCount:10},{name:'T1 Covered',topRows:4}]);
 const d=await loadCircuit('monaco'),t=d.spectatorZones.find(z=>z.zoneId==='t-rascasse')!;
 expect(t.surfaces![0].rows).toBe(13);
 expect(annual.approximateLayerReviews.find(q=>q.zoneId==='t-rascasse')).toMatchObject({accepted:true,actualTierBoundaryVerified:false,exactRealTotalRowCountVerified:false});
 expect(r.geographicBoundaryVerified).toBe(false);
});
