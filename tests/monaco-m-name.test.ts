import {it,expect} from 'vitest';
import review from '../src/circuits/season-review/monaco-m-name-review-2026.json';
import withdrawn from '../src/circuits/season-review/monaco-withdrawn-public-models.json';
import identity from '../src/circuits/season-review/monaco-public-map-identity-review.json';
import {loadCircuit} from '../src/circuits/registry';
it('retains a possible historical-name duplicate without asserting another annual bank or automatic alias',async()=>{
 const d=await loadCircuit('monaco');
 expect(review.aliasAccepted).toBe(false);expect(review.runtimeApplied).toBe(true);
 expect(d.spectatorZones.find(z=>z.zoneId===review.legacyZoneId)).toBeUndefined();expect(withdrawn.withdrawn[0].zone.availability).toBe('preparing');
 expect(d.spectatorZones.find(z=>z.zoneId===review.possibleCurrentZoneId)?.availability).toBe('available');
 expect(identity.unresolvedIdentities.some(a=>a.zoneId===review.legacyZoneId)).toBe(false);
 expect(d.spectatorZoneAliases?.[review.legacyZoneId]).not.toBe(review.possibleCurrentZoneId);
});
