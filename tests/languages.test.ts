import {afterEach,it,expect} from 'vitest';
import {useLanguage,t,tr,translate} from '../src/i18n';
import {localizeVenue,circuitName,zoneName,raceName} from '../src/i18n/data';
import {atlasVenues,loadCalendars,venueById} from '../src/atlas';
import {useApp} from '../src/store';
import en from '../src/i18n/en.json';
afterEach(()=>useLanguage.getState().setLanguage('zh'));
it('switches interface strings and interpolated values without resetting the simulator',()=>{
 const before=useApp.getState();useLanguage.getState().setLanguage('en');
 expect(t('拍照')).toBe('Take photo');expect(tr`${23} 站`).toBe('23 races');
 expect(useApp.getState()).toBe(before);
 useLanguage.getState().setLanguage('zh');expect(t('拍照')).toBe('拍照');
 for(const [key,value] of Object.entries(en)){expect(translate(key,'en')).toBe(value);expect(value).not.toMatch(/[\u4e00-\u9fff]/)}
});
it('supplies English venue metadata for all 78 places while retaining IDs, coordinates and dates',async()=>{
 useLanguage.getState().setLanguage('en');
 for(const v of atlasVenues){const localized=localizeVenue(v);expect([localized.name,localized.locality,localized.country].join(' ')).not.toMatch(/[\u4e00-\u9fff]/);expect(localized.id).toBe(v.id);expect(localized.coordinate).toBe(v.coordinate);expect(localized.years).toBe(v.years)}
 expect(circuitName('shanghai','上海国际赛车场')).toBe('Shanghai International Circuit');
 expect(zoneName('B 看台')).toBe('Grandstand B');expect(zoneName('C 草地')).toBe('Grass C');
 for(const r of (await loadCalendars())['2026'])expect(raceName(r,venueById.get(r.venueId)!)).not.toMatch(/[\u4e00-\u9fff]/);
});
