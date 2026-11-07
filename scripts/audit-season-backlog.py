"""Build a bounded, read-only triage view from current annual evidence.
Recorded conflicts are not a fresh collision audit or every-point visibility proof.
"""
import hashlib,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
read=lambda p:json.loads((ROOT/p).read_text('utf8'))
records=read('src/circuits/season-review/inventory-2026.json')
coverage={r['circuitId']:r for r in read('src/circuits/elevation-source/coverage.json')}
findings=read('src/circuits/season-review/source-gaps-2026.json')
rows=[]
for r in records:
 cid=r['circuitId'];path=ROOT/f'src/circuits/generated/{cid}.json';d=json.loads(path.read_text('utf8'))
 assert len(d['spectatorZones'])==r['modeledAvailableCount']+r['withheldCount'],f'Refresh inventory: {cid}'
 problems=[{'zoneId':z['zoneId'],'availability':z['availability'],'issues':z.get('geometryReview',{}).get('issues',[])} for z in d['spectatorZones'] if z.get('geometryReview',{}).get('issues')]
 ga=[z['zoneId'] for z in d['spectatorZones'] if z['kind'] in ['grass','general-admission']]
 gaps=[f for f in findings if f['circuitId']==cid and f['status']=='unresolved']
 boundary_gaps=[f for f in findings if f['circuitId']==cid and f['status'] in ['citation-corrected-boundaries-missing','geographic-boundaries-missing']]
 priority=0 if gaps else 1 if r['withheldCount'] or r.get('confirmedMissingProducts') else 2 if not ga else 3
 elev=coverage.get(cid,{})
 rows.append(dict(circuitId=cid,name=d['location'],priority=priority,generatedSha256=hashlib.sha256(path.read_bytes()).hexdigest(),available=r['modeledAvailableCount'],withheld=r['withheldCount'],gaRegions=len(ga),annualInventoryComplete=r['inventoryComplete'],recordedGeometryProblems=problems,sourceGaps=gaps,elevation=dict(dataset=elev.get('dataset'),runtimeApplied=elev.get('runtimeApplied',False),source=elev.get('source')),inventoryEvidence=r.get('officialMapComparison'),nextAction=('核对当年雪邦主办方票区，替换误用的巴林开放来源' if gaps else '逐区核对被扣留轮廓与朝向，先解决道路相交' if r['withheldCount'] else '核对当年是否销售GA；有票再取得边界，不能把未记录当作不存在' if not ga else '补齐年度票区身份与边界，再核对设施和遮挡')))
 for field in ['withdrawnPublicModelCount','withdrawalFollowupCount','withdrawalFollowups','resolvedWithdrawalFollowupCount','resolvedWithdrawalFollowups','publicAccessQuestions','annualIdentityQuestions','confirmedMissingProducts','identitySourceReview','layerCoverageQuestions','annualTicketSourceReview','sectionProfileQuestions','modelRepresentationQuestions','boxparkSourceReview','geometryEvidenceQuestions','partialStandingProducts','additionalCoverageQuestions','generalAdmissionReview']:
  if field in r:rows[-1][field]=r[field]
 if r.get('groundCoverageReview',{}).get('accepted') and r['inventoryComplete']:
  rows[-1].update(priority=3,inventoryEvidence=r['publicInventorySourceReview'],nextAction='已按当年普通产品清单接入看台与具名山坡近似范围；精确围界、步道和局部遮棚作为后续细化，保留真实站姿与地形遮挡。')
 if cid=='mexico' and r.get('generalAdmissionReview',{}).get('status')=='not-listed-in-2026-public-sale-table':
  rows[-1].update(priority=3,nextAction='已核对2026公开价目表：18普通看台及独立蓝区无障碍平台，未列草地/站立票；不添加虚构GA。继续已建区域地形、设施与范围细化，关注年度补充公告。')
 if cid=='monaco':
  rows[-1]['nextAction']='Rocher四片来源范围已按用户允许近似接入15片站立地面，源IGN地形及1.65m眼高，排除已登记机动车道路4m与建筑0.5m带；票界、步道/挡墙及局部坡面仍近似。E/B/X1/X2已按明确近似模型接入，M年度身份仍待核，T1–T3分层仍待完善。见monaco-rocher-2026.json。'
 if cid=='yas-marina':
  rows[-1]['nextAction']='Hill、Marina、WestStraight、NorthStraight及West均已独立近似接入，WestClub共用West实体。Main已按公开座席M00–M09分别建立普通前层：前九区8排、末区6排，端部宽度不同；位置、高度和座宽为估计，未将后方楼层混成22排单坡。后方其他楼层、无障碍平台、顶棚及Club休息室仍待完善；Hill粗DEM仍可能挡住视线。见yas-main-2026.json和yas-marina-annual-access-2026.json。'
 if cid=='spa':
  rows[-1]['nextAction']='Gold7/Gold8/Bis/Ter已独立接入；旧Gold6/Gold11/Silver4三面按实际道路重建近似座席，Gold6仅54m受限范围，不保证完整座席覆盖；Silver3保留几何并解除0.0013m²数值碎片扣留。高度/排数及顶棚细节仍估计，完整GA及设施待补。见spa-repairs-2026.json。'
  rows[-1]['candidateReview']='src/circuits/europe/spa-gold7-candidate.json'
  rows[-1]['acceptedGold7Review']='src/circuits/europe/spa-gold7-2026.json'
  rows[-1]['acceptedGold8Review']='src/circuits/europe/spa-gold8-2026.json'
  rows[-1]['nextAction']='Gold7/Gold8均按独立近似轮廓接入，共享4条原生障碍，各自顶棚/支柱和坐姿高度；双官方全景支持物理关联，非2026票界/结构测绘。Bis已正式新增为独立露天近似看台，官方2026票页与独立全景支持；配对前后沿修复右端误挡。Ter原生集及2024/2026春季图未建立完整座席边界，2025夏季为空白；下一项找搭建期图层/结构图，不重复同批查询；其余4处扣留轮廓待修复'
 if cid=='montreal':
  rows[-1]['nextAction']='GA五组主要观赛范围已近似覆盖T6 Family、发夹弯前/入弯末段/T11出弯及赌场直道；保持1.65m眼高与T6自然遮挡，编号座席/设施/水体/Blue区排除。精确围界、路径及临时设施继续细化。见montreal-ga-remaining-2026.json。'
 if cid=='spielberg':
  rows[-1]['nextAction']='T8独立近似座席、Schönberg A/B两坡面已接入；北侧三片原生草地取实际道路北侧部分并排除近似Schönberg座席，GA只计部分覆盖。范围/高度为估计，黄色区逐日准入、其他GA和设施仍待核，不能整片绿色都开放。见spielberg-supplement-2026.json。'
 if cid=='lusail':
  rows[-1]['nextAction']='T16已按最后一弯入弯外侧建立100×18m/22排近似座席，Hill保留原事件图范围及粗DEM、站姿1.65m并接入；默认Hill地形遮挡仍存在，不将导出成功称作无遮挡。范围、高度与地形误差明确标注，不能代替精确坡面。见lusail-supplement-2026.json。'
 if cid=='singapore':
  rows[-1]['nextAction']='按用户2026-11-05允许合理近似的要求，Connaught已在赛道西侧重建约100×15m连续看台，坐姿1.2m；范围/排数/高度标估计，注册赛道/邻区无交叠。Turn1已按80×15m外侧连续座席带重建，旧穿路及Turn2交叠已消除；原有10区均可用，Republic/Raffles/PitExit/MarinaBay/ChicaneTurn2新增近似看台已接入，尺寸/排数/高度为估计。Walkabout的Padang/Esplanade/T5/开场PitExit/末段T19五处独立平台已接入，站姿1.65m，后三处仅Premier准入；其余平台仍缺，不能用单个平台收掉全族缺项；按实体与准入建模，不把整片活动区当观赛地面。见singapore-annual-access-2026.json与singapore-connaught-source-review-2026.json。'
 if cid=='austin':
  rows[-1]['nextAction']='年度主办方明确T1=30、T4=21、T9=35、T15普通席最大35、T19=21排，6面已纠正并保留总高/边界；T4旧缓冲区误框已被官方2026PAM具名约125×15m完整轮廓替换并恢复近似观赛，零路面/邻区/建筑/缓冲维修线交叠，441样点及正式三视口摄影通过；上部局部顶棚/前后支柱已按官方实景接入共享遮挡与摄影；覆盖起点/结构尺寸仍估计，非完整实测场景。见austin-t4-runoff-review-2026.json。主看台Trackside两端、Lower/Mezzanine/Club中段已按近似楼层接入，真实高度/分区边界未测绘；另需T12最大37排与两片模型的关系，T9/T12前方及T15第36排ADA已近似接入，真实坡道/护栏及主看台ADA分配待细化。T19局部顶棚仍待建；T4约半深覆盖为明确估计，不冒充官方排号界线。'
 if cid=='interlagos':
  rows[-1]['nextAction']='Porto Bank、Orange Tree Club独立近似座席及Estrela独立3m站立平台已接入；Gramado仅北侧80×25m部分草地，不收掉全族缺项。边界/排数/高度为作者估计，顶棚和Estrela星形建筑细节未还原；两Village产品18+且Estrela可入Gramado，反向不成立。仍核其他草地、T/N及GrandPrixClub身份与实际观赛范围，见interlagos-supplement-2026.json。'
 if cid=='mexico':
  rows[-1]['nextAction']='2026票表18个普通看台已全部有近似模型：新增6A/7/8/9/10/11/12，按独立具名位置图区分内外侧与相邻Box；尺寸/排数/高度均估计。6A改用实际后直道中心线定位，未用弯道端点插值。10/11/12后部顶棚尚待完善；另核无障碍平台和Box产品范围，Boletos Generales不是草地票。见mexico-supplement-2026.json。'
 if cid=='miami':
  rows[-1]['nextAction']='Marina North旧朝向错误已按实际道路和2026外侧座席区域重建50×16m近似座席并开放；高度/范围估计，不声称照片单应或完整测绘，顶棚待完善。见miami-marina-north-2026.json。'
 if cid=='las-vegas':
  rows[-1]['nextAction']='T8/T9已按实际弯道道路分开重建近似外侧座席，原路面184/44m²及彼此808m²交叠归零；两段同属T-Mobile票区，不冒充独立票种。范围/排数/高度估计，场景设施和完整GA仍待完善，见las-vegas-sphere-2026.json。'
 if cid=='hungaroring':
  rows[-1]['nextAction']='Fan已按年度图T11–T12外侧建立80×16m近似座席，东侧T10–T11一段95×20m草地按源DEM站立接入；范围/高度均估计。GA仅计部分覆盖，Fan2已由官方票务2026专属定位图确定在T11–T12外侧Fan上游，并以60×16m近似座席接入；T8–T10及T11–T14外侧新增近似草地带，分段排除现有看台/设施；完整票区范围仍保留部分覆盖。见hungaroring-supplement-2026.json和hungaroring-ga-access-2026.json。'
 if cid=='barcelona':
  rows[-1]['nextAction']='I和V已按2026主办方地图分别接入最后一弯外侧、J与Principal之间的近似座席，范围/排数/高度为估计，顶棚待完善；未借用GardenClub或服务楼。普通Pelouse四个具名地块、Jove、AlonsoLand及会员专属Privilege共七组近似范围已具备，准入各自独立；精确年度围界、步道及临时设施继续细化。见barcelona-supplement-2026.json。'
 if cid=='baku':
  rows[-1]['nextAction']='Khazar已用明确2026日期且列出票种的供应商正文补齐年度身份，50×15m/16排内陆侧近似座席开放；实际T6出口关系与道路交叠修复保留，范围高度仍估计。见baku-khazar-2026.json。'
 if cid=='suzuka':
  rows[-1]['nextAction']='J按明确近似范围开放，地形与站姿1.65m不变，保留6/15源地形视线受阻记录。未宣称独立精确配准或全点无遮挡；后续改善台地和边界来源。见suzuka-j-ground-review-2026.json'
 if cid=='zandvoort':
  rows[-1]['nextAction']='BenPon、Arena两外侧分面及ArenaIn四旧扣留区已按具名票区和实际道路重建近似座席，穿路归零；范围/排数/高度估计，不以几何分面重复计票种。仍核全部席位覆盖、GA及设施，见zandvoort-repairs-2026.json。'
  rows[-1]['nextAction']='四旧估计框交叠仍未修复；原生仅命名主看台。PDOK2026主直道及Arena裁切均已查，未建立临时座席完整边界；不取消年度票区。需搭建期实体图/可定位官方图层；海滩配套活动许可非赛车场资料，不重复该路径'
 if r.get('publicAccessQuestions'):rows[-1]['nextAction']='先核对'+ '、'.join(a['mapLabel'] for a in r['publicAccessQuestions'])+'的2026普通票准入，再修复其边界；不套用2027贵宾条款'
 if r.get('annualIdentityQuestions'):rows[-1]['nextAction']='核对'+ '、'.join(a['mapLabel'] for a in r['annualIdentityQuestions'])+'年度身份；补建已确认但缺模型的'+ '、'.join(a['mapLabel'] for a in r.get('confirmedMissingProducts',[]))
 if cid=='silverstone' and r.get('modelRepresentationQuestions'):rows[-1]['nextAction']='核实BOXPARK角色与原生边界、International Paddock漏建；Woodcote C仍需新几何'
 if r.get('standingSourceReview'):
  rows[-1].update(standingSourceReview=r['standingSourceReview'],standingCoverageQuestions=r['standingCoverageQuestions'])
  rows[-1]['standingGeometryReview']=r.get('standingGeometryReview')
  rows[-1]['nextAction']='The Loop、Woodcote C、BOXPARK站立露台与International Paddock已按明确近似模型接入；原仿射配准仍被拒绝。NPS、Vale和Farm前方已接入。Brooklands/Luffield外侧GA带39已定位，需核实804928144围网公众侧和65号平台边界/高度；平台周五六GA准入已证实，不推定周日。五处GA+已独立接入25×8m近似站立范围；普通GA五组地图带均有近似选点范围；完整票区边界仍非测绘确认，保留部分覆盖标记'
 if boundary_gaps:
  rows[-1]['geographicSourceGaps']=boundary_gaps
  if not r.get('standingSourceReview'):rows[-1]['nextAction']='年度GA存在已证实；取得正向地理边界，不重复核对已纠正的引用'
 for field in ['sourceCoverageAudit','sourceAssociationQuestions']:
  if field in r:rows[-1][field]=r[field]
 if r.get('confirmedMissingProducts'):
  rows[-1].update(priority=0,nextAction='补建已由年度来源确认的缺失区域：'+'、'.join(a.get('mapLabel',a.get('name',a['productId'])) for a in r['confirmedMissingProducts'])+'；不以已有区域总数替代完整覆盖核查。')
 if r.get('sourceAssociationQuestions'):
  rows[-1]['nextAction']+=' 同时核对'+str(len(r['sourceAssociationQuestions']))+'项已有区域/票型关联，避免重复建模。'
# Keep the current bounded coverage result ahead of historical per-batch notes.
for row in rows:
 audit=row.get('sourceCoverageAudit')
 if audit and not audit['confirmedMissingGroups'] and not row.get('sourceAssociationQuestions'):
  row['nextAction']='本轮年度来源对照的具名看台/站立家族已有近似模型或显式关联；具体测绘边界、设施与票权限制见SEASON_COVERAGE_AUDIT.md及各站source review，不把历史批次待办继续算作未建区域。'
  if row['circuitId']=='silverstone':row['nextAction']+=' 外侧GA带39已定位，NPS、Vale和Farm前方已接入；源围界/平台精度限制仍独立保留。'
assert len(rows)==23 and len({r['circuitId'] for r in rows})==23
rows.sort(key=lambda r:(r['priority'],-r['withheld'],r['circuitId']))
base=ROOT/'src/circuits/season-review'
(base/'backlog-2026.json').write_text(json.dumps({'scope':'Current23-venue backlog; recorded metadata only, not whole-scene acceptance. All stations still require cross-device and facility acceptance.','rows':rows},ensure_ascii=False,indent=2)+'\n','utf8')
lines=['# 2026验收缺口优先表','', '由 scripts/audit-season-backlog.py 从当前包与年度清单生成。P0来源错误；P1有未开放或确认漏建区域；P2未记录GA；P3年度范围/设施待收口。按表逐站推进，不并行扩充。', '', '| 优先级 | 赛道 | 可用/扣留 | GA片区 | 高程 | 下一项 |','|---|---|---:|---:|---|---|']
for r in rows:lines.append(f"| P{r['priority']} | {r['circuitId']} | {r['available']}/{r['withheld']} | {r['gaRegions']} | {r['elevation']['dataset'] or '未记录'} | {r['nextAction']} |")
for r in rows:
 if r.get('withdrawnPublicModelCount'):lines+=['',f"撤下记录：{r['circuitId']} {r['withdrawnPublicModelCount']}项错误公众区模型，独立归档，不计作已还原区域。"]
 if r.get('withdrawalFollowupCount'):lines+=['',f"{r['circuitId']}撤下误框后仍需核对真实票区："+'、'.join(x['venueLabel'] for x in r['withdrawalFollowups'])+'。这类资料关联/补建任务不因扣留模型数量下降而消失。']
 if r.get('publicAccessQuestions'):lines+=['',f"{r['circuitId']}年度准入待证："+'、'.join(a['mapLabel'] for a in r['publicAccessQuestions'])+'。已证实相关2026贵宾产品，不等于已证实整个看台的普通票或专属准入。']
 if r.get('annualIdentityQuestions'):lines+=['',f"{r['circuitId']}最终公众图未列身份："+'、'.join(a['mapLabel'] for a in r['annualIdentityQuestions'])+'；未列不等于取消，须独立年度依据。']
 if r.get('confirmedMissingProducts'):lines+=['',f"{r['circuitId']}已确认但缺模型："+'、'.join(a['mapLabel'] for a in r['confirmedMissingProducts'])+'；已有其他GA模型不代表此项完成。']
 if r.get('layerCoverageQuestions'):lines+=['',f"{r['circuitId']}上下层覆盖待核："+'、'.join(a['mapLabel'] for a in r['layerCoverageQuestions'])+'；前侧模型可用不等于完整普通席层已还原。']
 if r.get('sectionProfileQuestions'):lines+=['',f"{r['circuitId']}座席断面待核："+'、'.join(a['zoneId'] for a in r['sectionProfileQuestions'])+'；源边界无相交不证明分区高度和排数已验收。']
lines+=['','数字代表模型记录，不等于票种数量、测绘精度或全区域无遮挡。未记录GA不证明没有GA。现有高程是已接入的数据集，精度、跨桥层级、水岸与局部坡面仍须验证。几何问题沿用各区已有记录，不冒充本轮重新碰撞检测。','', '资料顺序：当年主办方观众/票务图 → FIA赛事图 → 合法公开地理数据；高程优先当地测绘机构。动态页面换年时查存档。原件留research，审计JSON只留必要事实与来源。']
(ROOT/'DEVELOPMENT_PLAN.md').write_text('\n'.join(lines)+'\n','utf8')
print(f"23 circuits; {sum(r['available'] for r in rows)} available; {sum(r['withheld'] for r in rows)} withheld; {sum(not r['gaRegions'] for r in rows)} without GA records; {sum(f['status']=='unresolved' for f in findings)} unresolved admission-citation findings; {sum(len(r.get('publicAccessQuestions',[])) for r in rows)} annual access question")
print(f"Additional annual coverage: {sum(len(r.get('annualIdentityQuestions',[])) for r in rows)} unproven map identities; {sum(len(r.get('confirmedMissingProducts',[])) for r in rows)} confirmed products without models; {sum(len(r.get('layerCoverageQuestions',[])) for r in rows)} layer coverage questions")

print(f"Section-profile questions: {sum(len(r.get('sectionProfileQuestions',[])) for r in rows)}")
print(f"Geographic boundary source gaps: {sum(len(r.get('geographicSourceGaps',[])) for r in rows)}; independent from admission citation checks")
