"""Record completeness gaps separately from geometric compatibility checks.

No candidate becomes available merely by passing this inventory report.
Missing GA polygons and withheld areas remain explicit work, never fake passes.
"""
import json,hashlib
from _annual_identity import missing_product_is_modeled
from pathlib import Path
root=Path(__file__).resolve().parents[1]
calendar=json.loads((root/'src/circuits/season-review/calendar-verification-2026.json').read_text('utf8'))
assert calendar['season']==2026
records=[]
for summary in json.loads((root/'src/circuits/generated/summaries.json').read_text(encoding='utf-8')):
    data=json.loads((root/f'src/circuits/generated/{summary["circuitId"]}.json').read_text(encoding='utf-8'))
    zones=data['spectatorZones'];available=[z for z in zones if z['availability']=='available']
    withheld=[z for z in zones if z['availability']!='available'];ga=[z for z in zones if z['kind']!='grandstand']
    evidence=root/f'src/circuits/season-review/{data["circuitId"]}-public-inventory.json'
    complete=False
    if evidence.exists():
        inventory=json.loads(evidence.read_text(encoding='utf-8'))
        complete=inventory.get('inventoryComplete',False) and {a['zoneId'] for a in inventory['areas']}=={z['zoneId'] for z in zones}
    records.append({'circuitId':data['circuitId'],'season':2026,'calendarCheckedAt':calendar['checkedAt'],
      'calendarSource':calendar['calendarSource'],
      'modeledAvailableCount':len(available),'withheldCount':len(withheld),'nonGrandstandCount':len(ga),
      'inventoryComplete':complete,
      'requiredWork':([] if complete else ['Reconcile all public 2026 grandstands and general-admission areas against a complete organizer map.'])+
        (['Verify missing grass/general-admission inventory; no such areas are currently recorded.'] if not ga else [])+
        (['Re-digitize or reject withheld source polygons based on 2026 evidence, not mechanical relocation.'] if withheld else []),
      'areas':[{'zoneId':z['zoneId'],'name':z['name'],'kind':z['kind'],'availability':z['availability'],
          'source':z['source']['url'],'openingSource':z.get('openingSource',{}).get('url'),
          'geometryIssues':z.get('geometryReview',{}).get('issues',[])} for z in zones]})
    map_coverage_file=root/f'src/circuits/season-review/{data["circuitId"]}-map-coverage-2026.json'
    if map_coverage_file.exists():
        coverage=json.loads(map_coverage_file.read_text('utf8'))
        assert coverage['circuitId']==data['circuitId'] and coverage['season']==2026
        codes=[c for family in coverage['families'] for c in family['mapCodes']]
        assert len(codes)==len(set(codes)), 'Duplicate annual stand code'
        assert {f['modelZoneId'] for f in coverage['families']}=={z['zoneId'] for z in zones if z['kind']=='grandstand'}, 'Refresh annual stand family coverage'
        records[-1]['annualMapCoverage']={'sourceReview':str(map_coverage_file.relative_to(root)).replace('\\','/'),'namedCodes':len(codes),'modelGroups':len(coverage['families']),'approximateFamilyCoverageAccepted':coverage['approximateFamilyCoverageAccepted'],'individualBlockGeometryVerified':coverage['individualBlockGeometryVerified'],'ticketAllocationVerified':coverage['ticketAllocationVerified']}
    if evidence.exists() and inventory.get('groundCoverageReview'):
        records[-1].update(publicInventorySourceReview=str(evidence.relative_to(root)).replace('\\','/'),groundCoverageReview=inventory['groundCoverageReview'])
    row_fact_file=root/f'src/circuits/americas/{data["circuitId"]}-row-facts-2026.json'
    if row_fact_file.exists():
        row_facts=json.loads(row_fact_file.read_text('utf8'))
        if row_facts.get('modeledProfiles'):
            records[-1]['modeledSectionProfiles']=row_facts['modeledProfiles']
        if row_facts.get('accessibilityPlatforms'):
            records[-1]['accessibilityPlatforms']=row_facts['accessibilityPlatforms']
        records[-1].update(sectionProfileQuestions=[{'zoneId':q['zoneId'],'status':'unresolved','completionRequired':True,'reason':q['question'],'sourceReview':str(row_fact_file.relative_to(root)).replace('\\','/')} for q in row_facts['unresolvedProfiles']],inventoryComplete=False)
    identity_file=root/f'src/circuits/season-review/{data["circuitId"]}-public-map-identity-review.json'
    if identity_file.exists():
        identity=json.loads(identity_file.read_text('utf8'))
        assert identity['circuitId']==data['circuitId'] and identity['season']==data['season']==2026
        confirmed=identity['confirmedIdentities'];questions=identity['unresolvedIdentities']
        assert {a['zoneId'] for a in confirmed+questions}=={z['zoneId'] for z in zones},'Refresh annual map identity coverage'
        assert all(next(z for z in zones if z['zoneId']==a['zoneId'])['availability']!='available' for a in questions),'Unverified map identity must remain unavailable'
        missing=identity['confirmedMissingProducts']
        assert all(a['modelZoneId'] is None and not missing_product_is_modeled(a,data) for a in missing),'Reconcile newly modeled products'
        records[-1].update(annualIdentityQuestions=questions,confirmedMissingProducts=missing,identitySourceReview=str(identity_file.relative_to(root)).replace('\\','/'),inventoryComplete=False)
        if identity.get('excludedNonViewingProducts'):
            excluded=identity['excludedNonViewingProducts']
            assert not {x['productId'] for x in excluded}&{z['zoneId'] for z in zones},'Non-track-viewing product cannot become a viewpoint'
            records[-1]['excludedNonViewingProducts']=excluded
        if identity.get('additionalCoverageQuestions'):
            records[-1]['additionalCoverageQuestions']=identity['additionalCoverageQuestions']
        if identity.get('geographicRefinements'):
            records[-1]['geographicRefinements']=identity['geographicRefinements']
        if data['circuitId']=='mexico':
            review=identity['generalAdmissionReview']
            assert review['status']=='not-listed-in-2026-public-sale-table' and not ga
            assert sum(a['ticketClass']=='grandstand' for a in confirmed)==review['ordinaryGrandstandCount']
            assert sum(a['ticketClass']=='accessible-platform' for a in confirmed)==review['accessiblePlatformCount']
            assert sum(a['ticketClass']=='hospitality' for a in confirmed)==review.get('modeledHospitalityCount',0)
            assert len(confirmed)==review['ordinaryGrandstandCount']+review['accessiblePlatformCount']+review.get('modeledHospitalityCount',0)
            records[-1]['generalAdmissionReview']=review
            records[-1]['requiredWork']=[w for w in records[-1]['requiredWork'] if not w.startswith('Verify missing grass/')]
            records[-1]['requiredWork'].append('Published2026 catalog reconciled as seating plus accessible platform; no standing product listed. Preserve scoped absence statement, not an invented grass area.')
        practical=identity.get('practicalCoverageReview',{})
        if practical.get('accepted'):
            mapped={a['modelZoneId'] for a in practical['sectors']}
            assert mapped=={z['zoneId'] for z in ga},'Reconcile all approximate ground sectors'
            assert all(z['availability']=='available' for z in ga),'Accepted ground must be usable'
            records[-1]['approximateGroundCoverageAccepted']=True
            records[-1]['modeledStandingProducts']=[p for p in identity['modeledProducts'] if p.get('modelZoneIds')]
            records[-1]['geographicRefinements']=[practical['limits']]
        records[-1]['requiredWork'].append('Resolve unlisted final-map identities and model confirmed missing products; a nonzero GA count does not prove complete GA coverage.')
    ga_review_file=root/f'src/circuits/season-review/{data["circuitId"]}-ga-access-2026.json'
    if data['circuitId'] in ['yas-marina','singapore','las-vegas','miami','baku']:
        reviewPath=f'src/circuits/season-review/{data["circuitId"]}-annual-access-2026.json'
        review=json.loads((root/reviewPath).read_text('utf8'))
        assert review['circuitId']==data['circuitId'] and review['season']==data['season']==2026
        missing=review['confirmedMissingProducts']
        assert all(a['modelZoneId'] is None and not missing_product_is_modeled(a,data) for a in missing),'Reconcile newly modeled annual products'
        records[-1].update(confirmedMissingProducts=missing,annualTicketSourceReview=reviewPath,inventoryComplete=False)
        if data['circuitId'] in ['singapore','miami','baku']:records[-1]['additionalCoverageQuestions']=review['additionalCoverageQuestions']
        if data['circuitId']=='miami' and review.get('geographicRefinements'):
            records[-1]['geographicRefinements']=review['geographicRefinements']
        if review.get('modeledGrandstandProducts'):
            for product in review['modeledGrandstandProducts']:
                assert all(any(z['zoneId']==i and z['kind']=='grandstand' and z['availability']=='available' for z in zones) for i in product['modelZoneIds'])
            records[-1]['modeledGrandstandProducts']=review['modeledGrandstandProducts']
        if data['circuitId']=='baku':
            assert {i for p in review['modeledProducts'] for i in p['modelZoneIds']}=={z['zoneId'] for z in zones}
            records[-1].update(modeledPublicProducts=review['modeledProducts'],layerCoverageQuestions=review['layerCoverageQuestions'])
        if data['circuitId']=='las-vegas':
            assert {i for p in review['modeledProducts'] for i in p['modelZoneIds']}=={z['zoneId'] for z in ga}
            records[-1].update(modeledStandingProducts=review['modeledProducts'],geographicRefinements=[review['practicalCoverageReview']['limits']])
        if data['circuitId']=='singapore' and review.get('practicalCoverageReview',{}).get('accepted'):
            assert {i for p in review['modeledProducts'] for i in p.get('modelZoneIds',[])}=={z['zoneId'] for z in ga}
            records[-1].update(approximateGroundCoverageAccepted=True,geographicRefinements=[review['practicalCoverageReview']['limits']])
        if data['circuitId']=='miami':
            assert {i for p in review['modeledProducts'] for i in p['modelZoneIds']}=={z['zoneId'] for z in ga}
            records[-1]['modeledStandingProducts']=review['modeledProducts']
        records[-1]['requiredWork'].append(review['nextAction'])
    if data['circuitId']=='hungaroring' and ga_review_file.exists():
        ga_review=json.loads(ga_review_file.read_text('utf8'))
        assert ga_review['circuitId']==data['circuitId'] and ga_review['season']==data['season']==2026
        missing=ga_review['confirmedMissingProducts']
        assert all(a['modelZoneId'] is None and not missing_product_is_modeled(a,data) for a in missing),'Reconcile newly modeled GA'
        assert {z['zoneId'] for z in ga}=={'general-admission-east','general-admission-north','general-admission-south'} and ga_review['runtimeApplied'] and not ga_review['geographicBoundaryVerified'],'Refresh geographic review when changing Hungaroring partial GA'
        records[-1].update(confirmedMissingProducts=missing,annualTicketSourceReview=str(ga_review_file.relative_to(root)).replace('\\','/'),inventoryComplete=False)
        practical=ga_review.get('practicalCoverageReview',{})
        if practical.get('accepted'):
            assert {a['modelZoneId'] for a in practical['sectors']}=={z['zoneId'] for z in ga},'Match every accepted approximate GA sector'
            assert all(z['availability']=='available' for z in ga),'Accepted GA representation must be usable'
            records[-1]['modeledStandingProducts']=ga_review['modeledProducts']
            records[-1]['approximateGroundCoverageAccepted']=True
            records[-1]['geographicRefinements']=[practical['limits']]
        else:
            records[-1]['requiredWork'].append('Annual GA admission is confirmed; georeference the positive supplier map band and independent ground boundaries, excluding reserved areas.')
    if data['circuitId']=='spa':
        groundPath='src/circuits/season-review/spa-bronze-access-2026.json'
        ground=json.loads((root/groundPath).read_text('utf8'))
        assert ground['season']==2026 and ground['runtimeApplied'] and not ground['geographicBoundaryVerified']
        assert {z['zoneId'] for z in ga}=={i for p in ground['modeledProducts'] for i in p['modelZoneIds']},'Reconcile all six named Bronze sectors'
        assert all(z['availability']=='available' for z in ga)
        records[-1].update(modeledStandingProducts=ground['modeledProducts'],standingSourceReview=groundPath,standingCoverageQuestions=[],geographicRefinements=[ground['limits']])
        reviewPath='src/circuits/season-review/spa-la-source-2026.json'
        review=json.loads((root/reviewPath).read_text('utf8'))
        assert review['circuitId']=='spa' and review['season']==2026
        missing=review['confirmedMissingProducts']
        assert all(a['modelZoneId'] is None and a['productId'] not in {z['zoneId'] for z in zones} for a in missing),'Reconcile new La Source models'
        records[-1].update(confirmedMissingProducts=missing,annualTicketSourceReview=reviewPath,inventoryComplete=False)
        records[-1]['requiredWork'].append('Gold7, Gold8 and uncovered Bis are admitted as separate source-associated approximations with shared barriers and estimated vertical profiles; recover the independently pictured western Ter footprint. The January organizer map is not surveyed or guaranteed final.')
    if data['circuitId']=='silverstone':
        reviewPath='src/circuits/europe/silverstone-boxpark-2026.json'
        review=json.loads((root/reviewPath).read_text('utf8'))
        assert review['season']==data['season']==2026 and review['evidence']['eventYear']==2026
        approximationPath='src/circuits/europe/silverstone-supplement-2026.json'
        approximation=json.loads((root/approximationPath).read_text('utf8'))
        accepted={z['zoneId']:z for z in approximation['zones']}
        questions=[]
        for area in review['areas']:
            current=next(z for z in zones if z['zoneId']==area['zoneId'])
            assert current==accepted[area['zoneId']] and current['source']['method']=='estimated','Publish only reviewed explicit approximations'
        records[-1].update(modelRepresentationQuestions=questions,confirmedMissingProducts=review['confirmedMissingProducts'],boxparkSourceReview=reviewPath,inventoryComplete=False)
        records[-1]['requiredWork'].append('Two grandstands and dedicated standing terrace use distinct explicit approximate models; recover surveyed boundaries and full enclosure detail later.')
        woodcotePath='src/circuits/europe/silverstone-woodcote-c-review-2026.json'
        woodcote=json.loads((root/woodcotePath).read_text('utf8'))
        assert woodcote['season']==2026 and not woodcote['geometryAccepted'] and not woodcote['runtimeBoundaryPromoted']
        assert next(z for z in zones if z['zoneId']=='woodcote-c')==accepted['woodcote-c'],'Do not promote the rejected affine registration'
        records[-1]['approximationReview']=approximationPath
        records[-1]['geometryEvidenceQuestions']=[{'zoneId':'woodcote-c','completionRequired':False,'sourceReview':woodcotePath,'externalErrorMetres':woodcote['registration']['externalErrorMetres'],'geometryAccepted':False}]
        standingPath='src/circuits/season-review/silverstone-ga-access-2026.json'
        standing=json.loads((root/standingPath).read_text('utf8'))
        assert standing['season']==2026 and not standing['ordinaryGA']['geographicBoundaryVerified']
        assert all(not a['geographicBoundaryVerified'] for a in standing['gaPlus']['locations'])
        modeled={a['modelZoneId'] for a in standing['ordinaryGA'].get('modeledBandGroups',[])}
        assert {z['zoneId'] for z in zones if z['kind']!='grandstand' and z['availability']=='available'}==modeled|{'boxpark-hangar'}|{v['modelZoneId'] for v in standing['gaPlus']['locations']}|{v['modelZoneId'] for v in standing.get('modeledReservedEnclosures',[])},'Reconcile annual standing coverage when introducing a GA model'
        assert bool(modeled)==standing['runtimeApplied']
        plus=json.loads((root/'src/circuits/europe/silverstone-ga-plus-2026.json').read_text('utf8'))
        assert all(next(z for z in zones if z['zoneId']==v['zoneId'])==v for v in plus['zones'])
        accessible=standing.get('modeledAccessibleProducts',[])
        for a in accessible:
            zone=next(z for z in zones if z['zoneId']==a['modelZoneId'])
            assert zone['availability']=='available' and zone['kind']=='grandstand'
            assert all(s['rows']==1 and s['rise']==0 and s['eyeHeight']==1.2 for s in zone['surfaces']),'Accessible approximation must remain a flat seated platform'
        records[-1]['modeledAccessibleProducts']=accessible
        records[-1]['modeledReservedEnclosures']=standing.get('modeledReservedEnclosures',[])
        records[-1]['modeledReservedStandingProducts']=standing.get('modeledProducts',[])
        records[-1]['partialStandingProducts']=standing.get('partialStandingProducts',[])
        records[-1]['confirmedMissingProducts']+=standing['confirmedMissingProducts']
        records[-1].update(standingSourceReview=standingPath,standingCoverageQuestions=standing['accessibilityScopeQuestions']+standing['annualNameQuestions'],standingGeometryReview='src/circuits/season-review/silverstone-brooklands-ga-2026.json')
        records[-1]['requiredWork'].append('Major ordinary GA bands, five reserved GA+ products and a Luffield accessible approximation are represented. Exact enclosures,36/43 correspondence, ramps and rails remain documented refinements; Inside Nine/Copse Yard identity is cross-referenced to organizer2026 indexed help; refine the approximate infield envelope and genuinely omitted viewing sectors separately.')
    profileFile=root/'src/circuits/americas/montreal-33-2026.json'
    if data['circuitId']=='montreal' and profileFile.exists():
        candidate=json.loads(profileFile.read_text('utf8'))
        assert candidate['circuitId']=='montreal' and candidate['season']==data['season']==2026
        if candidate['profileReview']['unresolved']:
            model=next(z for z in zones if z['zoneId']=='grandstand-33')
            assert model['availability']!='available' and not candidate.get('sceneAcceptance',{}).get('accepted'),'Do not accept a known-invalid uniform section'
            records[-1]['sectionProfileQuestions']=[{'zoneId':'grandstand-33','completionRequired':True,'status':'unresolved','sourceReview':str(profileFile.relative_to(root)).replace('\\','/'),'reason':'Uniform bounding-box rows compress the narrow bank; obtain annual unequal-bank section correspondence.'}]
            records[-1]['requiredWork'].append('Resolve33 unequal-bank seating profile separately from its already sourced geographic footprint.')
        else:
            model=next(z for z in zones if z['zoneId']=='grandstand-33')
            assert candidate.get('sceneAcceptance',{}).get('accepted') and model==candidate['zone'] and model['availability']=='available','Resolved profile requires a matching scene-accepted runtime model'
    faceReviewFile=root/f'src/circuits/season-review/{data["circuitId"]}-5a-face-review-2026.json'
    if data['circuitId']=='mexico' and faceReviewFile.exists():
        faceReview=json.loads(faceReviewFile.read_text('utf8'))
        model=next(z for z in zones if z['zoneId']=='grada-5a')
        if not faceReview['runtimeApplied']:
            assert len(model['surfaces'])==faceReview['currentModeledFaceCount']
            records[-1].setdefault('modelRepresentationQuestions',[]).append({'zoneId':'grada-5a','completionRequired':True,'sourceReview':str(faceReviewFile.relative_to(root)).replace('\\','/'),'reason':'Source-associated south seating face missing; one valid north face is not complete5A coverage.'})
            records[-1]['requiredWork'].append('Add the independently identified5A south face while preserving its separate selection boundary and road-facing slope.')
        else:
            assert len(model['surfaces'])==faceReview['sourceAssociatedFaceCount'],'Reconcile accepted face coverage'
    annualSourceFile=root/f'src/circuits/season-review/{data["circuitId"]}-annual-ticket-source-review.json'
    if annualSourceFile.exists():
        annualSource=json.loads(annualSourceFile.read_text('utf8'))
        assert annualSource['circuitId']==data['circuitId'] and annualSource['season']==data['season']==2026
        layerQuestions=annualSource.get('layerCoverageQuestions',[])
        for question in layerQuestions:
            model=next(z for z in zones if z['zoneId']==question['zoneId'])
            assert question['completionRequired'],'Unresolved layer question must remain actionable'
            if question['zoneId']=='t-rascasse':
                assert '图示前侧观众区' in model.get('admissionNote',''),'Do not claim complete layer coverage from a front-band model'
            if question['zoneId']=='o-piscine':
                assert not any(r['zoneId']=='o-piscine' for r in (data.get('scene') or {}).get('regions',[])),'Reconcile newly mapped O layers'

        records[-1].update(layerCoverageQuestions=layerQuestions,annualTicketSourceReview=str(annualSourceFile.relative_to(root)).replace('\\','/'),inventoryComplete=False)
        if layerQuestions:records[-1]['requiredWork'].append('Reconcile complete ordinary seating layers; verified front-band models do not certify covered/high or overhead-VIP relationships.')
    withdrawal_file=root/f'src/circuits/season-review/{data["circuitId"]}-withdrawn-public-models.json'
    if withdrawal_file.exists():
        withdrawn=json.loads(withdrawal_file.read_text('utf8'))['withdrawn']
        assert not {x['zoneId'] for x in withdrawn}&{z['zoneId'] for z in zones},'Withdrawn model reappeared in ordinary public inventory'
        records[-1]['withdrawnPublicModelCount']=len(withdrawn)
        records[-1]['withdrawnPublicModels']=[{'zoneId':x['zoneId'],'classification':x['classification']} for x in withdrawn]
        followups=[{'withdrawnZoneId':x['zoneId'],**item} for x in withdrawn for item in x.get('requiredReconciliation',[])]
        if followups:
            resolved=[item for item in followups if item.get('resolved')]
            for item in resolved:
                model=next((z for z in zones if z['zoneId']==item['modelZoneId']),None)
                proof=json.loads((root/item['modelSource']).read_text('utf8'))
                assert model and model['availability']=='available' and proof.get('sceneAcceptance',{}).get('accepted') and model==proof['zone'],'Resolved bank association needs an accepted matching runtime model'
            records[-1]['withdrawalFollowupCount']=len(followups)-len(resolved)
            records[-1]['withdrawalFollowups']=[item for item in followups if not item.get('resolved')]
            if resolved:
                records[-1]['resolvedWithdrawalFollowupCount']=len(resolved)
                records[-1]['resolvedWithdrawalFollowups']=resolved
    access_file=root/f'src/circuits/season-review/{data["circuitId"]}-public-access-review.json'
    access_files=([access_file] if access_file.exists() else [])+sorted((root/'src/circuits/season-review').glob(f'{data["circuitId"]}-*-public-access-review.json'))
    for access_file in access_files:
        access=json.loads(access_file.read_text('utf8'))
        assert access['circuitId']==data['circuitId'] and access['season']==data['season']==2026,'Public-access review must match circuit and season'
        questions=[a for a in access['areas'] if not a['ordinaryAccessVerified'] and not a['wholeBankHospitalityExclusiveVerified']]
        for area in questions:
            model=next((z for z in zones if z['zoneId']==area['zoneId']),None)
            if model and model['availability']=='available':
                # An annual named physical bank can be explored as an explicit
                # approximation without claiming ordinary-ticket entitlement.
                assert area.get('approximateExperienceAccepted') and area.get('annualNamedStandPresenceCorroborated'),'Unverified unnamed access must stay unavailable'
                proof=json.loads((root/area['approximateModelReview']).read_text('utf8'))
                assert model in proof['zones'] and model.get('admissionNote') and area['ordinaryAccessVerified'] is False,'Do not turn conceptual availability into ticket access certification'
            else:
                assert model,'Access question must refer to an existing bank'
        if questions:
            records[-1].setdefault('publicAccessQuestions',[]).extend([{'zoneId':a['zoneId'],'mapLabel':a['mapLabel'],'sourceReview':str(access_file.relative_to(root)).replace('\\','/'),'nextAction':a['nextAction']} for a in questions])
            task='Resolve official 2026 ordinary-ticket access before opening hospitality-associated areas.'
            if task not in records[-1]['requiredWork']:records[-1]['requiredWork'].append(task)
    if evidence.exists() and inventory.get('allListedProductsRecorded'):
        records[-1]['sourceProductRecords']=len(inventory['ticketProducts'])
        records[-1]['productsWithoutVerifiedModelAssociation']=len(inventory['productsWithoutVerifiedModelAssociation'])
        if inventory.get('approximateFamilyCoverageAccepted'):
            assert all(p['modelZones'] and all(any(z['zoneId']==id and z['availability']=='available' for z in zones) for id in p['modelZones']) for p in inventory['ticketProducts']), 'Every accepted approximate source product requires a usable model association'
            records[-1]['approximateSourceProductCoverageAccepted']=True
            records[-1]['approximateSupplementReview']=inventory['approximateSupplementReview']
        if not complete:
            records[-1]['requiredWork'][0]=('All recorded2026 products have explicit approximate model-family associations; exact individual boundaries and ticket allocations remain refinements, not missing product families.' if inventory.get('approximateFamilyCoverageAccepted') else 'Match the recorded official2026 public products to complete, individually verified model areas; a same-name family is not full geometry coverage.')
    if evidence.exists() and inventory.get('missingPublicProducts'):
        missing=inventory['missingPublicProducts']
        records[-1]['missingPublicProducts']=missing
        records[-1]['inventoryComplete']=False
        records[-1]['requiredWork'].append('Recover source boundaries for recorded missing public products: '+', '.join(p['name'] for p in missing)+'. Never substitute a similarly named grandstand or a different season map.')
    map_audit=root/f'src/circuits/season-review/{data["circuitId"]}-footprint-audit.json'
    if map_audit.exists():
        audit=json.loads(map_audit.read_text('utf8'))
        current_sha=hashlib.sha256((root/f'src/circuits/generated/{data["circuitId"]}.json').read_bytes()).hexdigest()
        fresh=audit.get('generatedSha256')==current_sha
        comparison={'status':'current' if fresh else 'stale','source':audit['sourceUrl']}
        if fresh:
            offsets=[a['zoneId'] for a in audit['areas'] if a['centroidOffsetMetres']>50]
            conflicts=[a['zoneId'] for a in audit['areas'] if a['sourceRoadIntersectionMetres2']>1e-6]
            comparison.update(comparedZones=len(audit['areas']),triageOffsetMetres=50,largeOffsetZones=offsets,registeredSourceFootprintsIntersectingRoad=conflicts)
            if offsets or conflicts:
                records[-1]['inventoryComplete']=False
                records[-1]['requiredWork'].append('Reconcile official-map registration and displaced model footprints; the50m threshold is triage, not an accuracy certificate. Never enable an intersecting registered source footprint by trimming it.')
        else:
            records[-1]['inventoryComplete']=False
            records[-1]['requiredWork'].append('Refresh the official footprint audit after changing this generated circuit package.')
        records[-1]['officialMapComparison']=comparison
source_audit_file=root/'src/circuits/season-review/coverage-audit-2026.json'
if source_audit_file.exists():
    source_audit=json.loads(source_audit_file.read_text('utf8'))
    assert source_audit['season']==2026 and len(source_audit['rows'])==23
    for audit in source_audit['rows']:
        record=next(r for r in records if r['circuitId']==audit['circuitId'])
        package=json.loads((root/f'src/circuits/generated/{audit["circuitId"]}.json').read_text('utf8'))
        unresolved=[]
        for gap in audit['confirmedMissingGroups']+audit.get('resolvedGroups',[]):
            matches=[z for z in package['spectatorZones'] if z['zoneId'] in gap['expectedZoneIds']]
            if matches:
                proof_file=root/gap['modelReview']
                assert proof_file.exists(),'Newly modeled source gap needs its explicit source/model review'
                proof=json.loads(proof_file.read_text('utf8'))
                assert all(z in proof['zones'] and z['availability']=='available' for z in matches),'Reconcile newly modeled source group before claiming coverage'
            else:
                unresolved.append({**gap,'mapLabel':gap['name'],'sourceReview':'src/circuits/season-review/coverage-audit-2026.json'})
        record.setdefault('confirmedMissingProducts',[]).extend(unresolved)
        record['sourceCoverageAudit']={'sourceReview':'src/circuits/season-review/coverage-audit-2026.json','confirmedMissingGroups':len(unresolved),'reviewStatus':audit['reviewStatus']}
        if audit['associationFollowups']:record['sourceAssociationQuestions']=audit['associationFollowups']
        if audit.get('resolvedAssociations'):
            proof=json.loads((root/'src/circuits/europe/spa-annual-supplement-2026.json').read_text('utf8'))
            for relation in audit['resolvedAssociations']:
                assert relation in proof['productAssociations']
                zone=next(z for z in package['spectatorZones'] if z['zoneId']==relation['zoneId'])
                assert set(relation['surfaceIds'])<={s['surfaceId'] for s in zone['surfaces']}
            record['sourceResolvedAssociations']=audit['resolvedAssociations']
target=root/'src/circuits/season-review';target.mkdir(exist_ok=True)
(target/'inventory-2026.json').write_text(json.dumps(records,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
monaco={'circuitId':'monaco','season':2026,'checkedAt':'2026-10-24',
  'source':'https://acm.mc/epreuves/formula-1-grand-prix-de-monaco/infos-pratiques/informations-liees-a-lachat-de-billet-ou-de-package/',
  'evidence':'Organizer explicitly distinguishes seated tickets from standing places in sectors Z and Rocher.',
  'confirmedStandingAreas':[{'name':'Z','zoneId':'z-quai-kennedy','modelClassification':'general-admission','geometryResolved':False},
                            {'name':'Secteur Rocher','zoneId':None,'modelPresent':False}],
  'scope':'Confirms ticket class and season, not geographic boundaries. Hospitality map alone is not a complete public ticket inventory.'}
standing=root/'src/circuits/europe/monaco-standing-2026.json'
if standing.exists():
    source=json.loads(standing.read_text('utf8'))
    monaco.update(checkedAt=source['checkedAt'],sourceMap=source['sourceUrl'],sourceMapSha256=source['sourceSha256'],sourceMapPublishedAt=source['sourcePublishedAt'])
    for area,geometry in zip(monaco['confirmedStandingAreas'],source['areas']):
        if area['name']!=geometry['name']:raise ValueError('Standing product order changed')
        area['sourceBoundaryParts']=len(geometry['sourceParts']);area['geometryResolved']=False
    monaco['scope']='Official2026 public map confirms image-space standing extents. Geographic registration, slope and obstacles are not yet verified. Source pieces are not separate ticket products.'
    registered=root/'src/circuits/europe/monaco-standing-world.json'
    if registered.exists():
        world=json.loads(registered.read_text('utf8'))
        package=json.loads((root/'src/circuits/generated/monaco.json').read_text('utf8'))
        current=next(z for z in package['spectatorZones'] if z['zoneId']=='z-quai-kennedy')
        if world.get('sceneAcceptance',{}).get('accepted') and world['zones'][0]==current and current['availability']=='available':
            fingerprint=hashlib.sha256(json.dumps({k:package[k] for k in ['trackGeometry','corners','elevation']},sort_keys=True,separators=(',',':')).encode()).hexdigest()
            if fingerprint!=world['geometryFingerprint']:raise ValueError('Z registration audit is stale')
            monaco['confirmedStandingAreas'][0].update(geometryResolved=True,geometryPrecision='Approximate source-map registration and regional terrain; default/sampled acceptance, not surveyed access or every-point visibility.')
            monaco['scope']='Z has reviewed approximate registration and three-viewport default simulation. Rocher has no accepted runtime geometry. Local slopes/obstacles and complete public inventory are not certified.'
(target/'monaco-standing-evidence.json').write_text(json.dumps(monaco,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(f'{len(records)} circuits; {sum(r["modeledAvailableCount"] for r in records)} available; {sum(r["withheldCount"] for r in records)} withheld; {sum(r["nonGrandstandCount"]==0 for r in records)} without GA model records (not an annual coverage-completion count)')
