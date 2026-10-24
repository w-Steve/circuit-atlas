## FIA计时资料与新加坡连通水面（2026-10-24）

- `src/circuits/timing/*.json`：23站逐站FIA场地图，保存精确URL、源PDF SHA256、页码、赛季、角标与提取日期。`scripts/extract-circuit-timing.py`需要本地research原PDF；运行产品只需派生JSON。18份2026文件；mexico/interlagos/las-vegas/lusail/yas-marina为2025参考，档案中明确说明。只分发事实坐标/数值，不分发FIA图稿、字体或Logo。
- 发车/计时旗标位置人工核对PDF后取图上中心点，以官方弯号标签和现有GIS弯点拟合二维相似变换、吸附真实道路。配准RMS约20–57m，反映示意图和GIS误差，不能标作测绘精度。S1/S2使用文件给出的弯道前后距离；Sepang的Entry T10保留入口语义，以S2图上位置近似定位，不冒充弯心。原始公布分段长度另存。
- Spielberg FIA2026表格三段总长4326m，与保留F1长度4318m相差8m；保留两者，不拉伸物理路面。Austin按公布分段长度从估计控制线推进与局部弯点可差约330m，故地图采用明确的局部弯前/后锚点，未声称高精度复现每段长度。
- 新加坡OSM水域relations9542146、9569901保持原岸线/孔洞。原来各自DEM中位数造成相连水域约4m台阶，遮住Esplanade Bridge。`scripts/build-water.py`改为连通区域合并采样1160点的原生GEDTM30中位数1.249m绝对高程，仍为估计水位。PUB说明滨海堤坝隔绝潮汐、维持库区水位：https://www.pub.gov.sg/public/places-of-interest/marina-barrage 。该资料并未提供本项目的数值水尺，1.249m不是现场实测。道路/赛车/观察者高度未改。

## 2026-10-24：上海实际接入地形

- 缺失原因：旧World仍渲染零高度平面，CircuitGeometry未传高程，17×17 SRTM只留元数据。此次迁移明确接入共享Terrain、上海道路与观众/设施统一高度基准；旧A层高、车体尺寸、速度和投影公式保留。
- 新源为 GEDTM30 v1.2.0：<https://zenodo.org/records/18887460>，CC BY 4.0；按已有上海边界提取原生约30m网格为65×65，4225值、绝对值约0.37–12.54m，保留原像元窗口SHA与取样记录。ground_elevation.py --apply --only shanghai可从保留JSON重放，不访问网络；覆盖表23站现均runtimeApplied，原SRTM摘要保留。
- 原DTM直接当赛车路面会产生约16.5%的短陡坡。只对估算路面做周期高斯距离平滑（sigma45m，截断3sigma），不截坡度、不缩放/拟合高差；原地面网格完全不变。2000点数值检查得到估算路面相对范围1.624–7.016m、最大切线竖分量0.0389；这不是官方精确坡度。局部路堤用估算路面与原地面衔接，防止平滑后悬空，地基只在既有设施包络裁切。
- 查阅黄绍铭、岳建勇、黄煜挺《采用减沉路堤桩处理大面积地面堆载下软土地基的设计与实践》，岩土工程学报35(7)，2013，1228–1238，第4.1节/图15：<https://cgejournal.com/cn/article/pdf/preview/15108.pdf>。原文确认堆筑赛道、近8m路面落差、原自然地面3.4–3.6m；其吴淞口基准与GEDTM正高基准不能混用。仅作历史背景核对，未复制图像/等高线，未把历史标高冒充2026实测。原PDF与检查图仅在本地research/artifacts。
- 赛车实体位置、俯仰与驾驶舱锚点现在统一采用三维路面；拍照仍借用/恢复真实实体，不改模拟时间。非A区域基准取原地面；A与P房保留相对高度并锚到主直道同一水平基础。标线保留与路面的高度差；围网与支持墙不再留在旧零高度。

## 2026-10-24：赞德沃特 GA1 / GA2

- 官方2026荷兰站场馆图 https://www.dutchgp.com/app/uploads/2026/07/2026_F1_Netherlands_WayfindingMap_Negative_VISUAL.pdf 明确标注 General Admission1–2。重新下载仍HTTP200，与本地690,774字节PDF完全一致，SHA256 `4803c1842b95c99abe39bad0ffde8566328427e29d90e3088f979b17fefe00d6`；图面及元数据为2026，未借用2027地图。原PDF只留本地研究，未打包。
- `zandvoort-general-admission.json`保留来源、原图事实性轮廓、地理配准边界、剔除面积及可重放区域。提取紫色GA1描边和GA2填充，按既有14弯道控制点局部仿射配准；控制点凸包外用全局仿射数学延拓保持连续，**不是新增实测地理控制点**。场馆示意图不是测绘图，地理边界低置信度近似。
- 排除已知路面+0.75m、看台/建筑/pit/水域+0.5m后，约3.09万m² GA1、4664m² GA2进入模型；以100m网格分成27+4块仅用于连续选点与局部观察，不表示真实票区分隔。轮廓简化容差0.1m，<4m²碎片未纳入；未移动看台、赛道或水体来清空检查。原始配准范围和去除面积保留，可在后续更精确场地图取得后重做。
- 新的显式 `terrainFollow` 表面读取原GEDTM30地面，按最长边8m细分，绝不凭空指定草坡rise或夸张高差。4cm渲染间隔用于避免与基础地形争深度，眼高仍1.2m（坐地观众）；插值曲面与原数据约0.2m数值预算不是源DTM的实测精度。未改赛车速度/尺寸、道路高程或手机投影。无排线地面默认看向当前点最近的实际道路，不强套整块区域的PCA座席朝向。
- 围网仅在近路、近似沿道路的公共区域边界生成，避开内部选点分块线；仍为估计屏障，不冒充现场屏障测绘。新增平面审计拒绝地面观赛区互相重叠或进入水域，保留岛屿孔洞。
- 211项单测与生产构建通过；新区域三端实际200km/h经过、可见红色赛车像素、1600px PNG下载及英语入口通过。上海A全流程与暂停车拍照不旋转三端回归也通过。区域边界/地面源仍有不确定性，不等同全23站看台及GA清单完成。
- 新发现：墨尔本两个官方2026 Visitor Map PDF地址当前404，虽搜索缓存仍有摘要，也不能据此直接新建精确GA边界，未用当前2027票务网页替代其2026场地图。

## 2026-10-24 后续：匈牙利主看台普通座席与建筑分离

- 设计方 DVM Group 的已建项目页 https://www.dvmgroup.com/en/references/projects/hungaroring 及其 project-hungaroring-01/02/06/08/09/10.jpg 实景明确展示普通下部坡面、后方Platinum阳台、屋顶，不能把整栋建筑全部作为32排座席。主办方2025-06-19落成报道 https://hungaroring.hu/site/en/media/news/hungaroring-the-future-has-begun 交叉确认新结构于2025投入使用。研究用照片只留本地，未随网站打包。
- 本轮在原OSM建筑内配置独立普通座席条带：前沿从建筑朝路一侧退6m（估计范围4–8m），17排×0.85m踏面深度（估计范围0.70–1.00m），深14.45m；阶梯riser仍估计0.4m、rise6.4m。尺寸是照片辅助的低置信度模型参数，**不是从建筑师平剖面图测得，也不是现场测绘**。纵向端部暂随原建筑，不表示每段楼梯和座位边界均准确。完整原建筑边界保留于seatFootprint.sourceBuildingBoundary；Platinum尚未另行开放，未混作普通层。
- `groundReference`显式将普通层前排楼面锚到座席前沿中点的原GEDTM30地面，而非上坡侧整栋屋顶的中心。原2.2m楼面离地估计及1.2m眼高不变；地面、路面和赛车没有被抬高/缩放。该改动仅用于有独立源配置的表面，其他站点仍保留旧基准。约30m源网格不能测出基础、纵向地面细节。
- 取得源配置后重跑实际主看台阶梯/支持墙射线，9个选点对赛车参考点均无自身实体遮挡；全站53/1953仍需核验（匈牙利21/135）。三端真实200km/h经过、3倍手机取景、暂停拍照均取得可见赛车像素和1600px PNG下载，保留真实围网遮挡。此结果不是全站票区或真实座席测绘验收。

## 2026-10-24：匈牙利普通座席排数复核（部分）

- `europe/hungaroring-structural-datums.json`：11处普通看台改用独立观赛指南 Oversteer48 的座席图及文字排数，均保留逐区URL、中置信度与检查日期：T1 26、Grand Prix 1 29、Grand Prix 2 16、Apex 2 33、Grid 1/2/3为25/29/25、Pit Exit 1/2为12/13、Podium16、Chicane 3为17。图面已实际查看，GP2最后排16来自配套文字，未冒充图面标签。不是主办方测绘或完整2026售票清单。
- 主看台普通层17排来自座席图，但OSM边界是整栋建筑。实际应用后截图和实体射线发现新前缘遮挡，已撤回该处模型变更；排数证据仅存unappliedEvidence，须先分离普通层/屋顶/Platinum边界。原32排/16m估计暂保留，不冒充已完成校正。
- 每级0.4m（范围0.3–0.5m）仍为低置信度假设；rise=(rows-1)*0.4。只更改原先由轮廓深度猜测的排数/阶梯总升高，不改变地面、前排楼面、眼高、边界、车辆或真实障碍。主看台Platinum五排上层与Pit Exit1无障碍平台未混入普通排面；Apex1的分段25/33排需要拆分后再配置，未将最大排数强加全部区域。Chicane1来源本身写“I believe”，未提升为已核实排数；Chicane2页面404。
- 主办方2026交通页 https://hungaroring.hu/site/en/races/2026-formula-1-aws-magyar-nagydij/travel-2026 保留带24–26 July 2026日期的交通图，图面只用于整体位置交叉检查，不提供精确楼层高程。官方2026 FAQ明确GA存在且Gate8仅对看台票开放；不能据此臆造整片GA可达边界。Media Kit页面有标题但无实际PDF，猜测PDF地址返回普通HTML，不作有效证据。
- 现有23/135条匈牙利实体视线仍需核验（全站55/1953），包括前排看台、坡面与粗DEM基准误差。GP2前排实际可能被前方看台遮挡，独立指南及官方票务描述支持其观赛布局，未为射线通过而抬高后排或删掉实体。不能将平面0相交等同所有座席无遮挡。

## 2026-10-24：铃鹿永久座席与年度来源分离

- 主办方座席PDF：`https://www.suzukacircuit.jp/eng/f1/ticket/images/seat/pdf/f1_b1.pdf`、`f1_b2.pdf`、`f1_q1.pdf`、`f1_q2.pdf`分别标有最大9、22、12、15排。用于已有永久结构的行数上限，不声称合并分面各座位都具有相同排数。链接由当前2027详情页提供、图本身未标年，**不能证明2026售票状态**。
- 原先以弧形footprint的PCA包围盒深度乘坡度推导行数/高度，B1被推到10.47m、B2达16m。现在按源最大行数建阶梯，riser采用0.40m估计（范围0.30–0.50m），所以rise分别3.2/8.4/4.4/5.6m；每级高度不是实测。配置与来源在 `asia/suzuka-structural-datums.json`，通过 `apply-spectator-datums.py` 进入源包。
- B2/B1、Q2/Q1按主办方详细位置图、座席照片和Q2需爬楼的说明建立后排关联：上部前沿=下部后沿+2m估计连接高差（范围1–3m）。这是固定结构近似，不从射线结果求高度；原footprint、眼高1.2m、赛车尺寸/车速/投影不变。
- B1/B2/R可跟随源弯曲排线的局部法线作为默认观察方向；其他区域保持原法线规则。B2前沿绿色护栏在主办方照片 https://www.suzukacircuit.jp/eng/f1/ticket/images/seat/b2/img_b2_02.jpg 中可见，独立建模在上层楼面前缘（估计高1.1m、金属杆截面40mm），没有在抬高楼面后顺便删除真实遮挡。它与地面赛道catch fence分开，参与实际渲染及照片深度遮挡。
- S家庭看台新增：OSM way183394069虽然带有冲突的big_wheel标签，但其六节点长条轮廓经2026场馆图和主办方S位置/座席图确认，不能只凭标签认定。2026图的镜像URL https://www.coloma.it/images/F1E-Japan-2026-Circuit-Map.pdf 于本次重新下载，与本地保留的1,392,541字节PDF的SHA256完全一致；元数据标题2026_F1_Japan_WayfindingMap_Positive_VISUAL，创建2026-03-04，图面明确2026。来源是镜像，未冒充主办方域名。S最大23排来自现有座席图，riser0.4m为估计；不将S-BOX包厢一起冒充完成。
- 再次确认来源会滚动：搜索摘要标为2026的主办方zh-tw/f1/ticket/pdf/sheet.pdf实际已替换为2027票务文件；旧today.pdf与Mobilityland媒体55469地址404。不把这些内容用于2026票区证明，也未拿2027临时H/I/A2布局直接开放2026模型。

## 2026-10-24：水域、地面与维修通道复核

- 22个共享赛道的65×65地面网格为 GEDTM30 v1.2.0（https://zenodo.org/records/18887460，CC BY 4.0）。原发布端TLS证书失效时使用 OpenTopography 官方公共镜像 https://opentopography.s3.sdsc.edu/raster/GEDTM30/GEDTM30_be/gedtm_rf_m_30m_s_20060101_20151231_go_epsg.4326.3855_v1.2.tif；摩纳哥/新加坡原生窗口SHA与已保留发布端数据一致。未关闭TLS校验。
- 19站水域来自已保留 OSM 原始岸线/水域，逐特征保留 way/relation URL、检查日期与水位来源。海岸线按陆左水右规则构面并裁切到地形范围，完整岛屿作为孔洞；新加坡 Marina Reservoir 9542146、Singapore River 9569901 与蒙特利尔 Saint Lawrence 1775822 另取 OSM `/api/0.6/relation/{id}/full` 补齐局部提取缺失的成员。
- 里海不能用海洋零米或原DEM的约+1m海上填充值：巴库采用俄罗斯科学院海洋研究所2026-08-13发布的2025盆地水位-29.4m（https://www.ocean.ru/en/index.php/novosti-instituta/1268-caspian-sea-day-why-the-unique-body-of-water-is-drying-up）。这是可视化近似基准，不是2026巴库实测水位；海岸线年代和垂直基准仍有不确定性。其他内陆水面用水域内源网格中位数估算，海洋用0m显示基准。只裁切地形显示，不改原DEM/路面/座席/车辆。
- 雪邦：FIA 2026 Bahrain GP in Malaysia场地图与pit lane drawing（https://www.fia.com/system/files/decision-document/2026_bahrain_grand_prix_in_malaysia_-_competition_notes_-_circuit_map_pit_lane_drawing_emergency_exits_map_and_red_zone.pdf）显示T15内侧进站。使用 OSM way23410526 接主维修通道 way144359483；剔除误入的南短赛道备用pit lane way107364027，未编造两条线之间的连接。原始图面仅留本地研究，不随产品分发。
- 5处低置信度边界矫正在 `src/circuits/season-review/footprint-constraints.json` 明列。优先保留OSM建筑或维修通道，裁掉人工估计边界相交的角部，并留0.6–0.75m建模间隔；没有平移真实看台、抬高眼位或声称测绘精度。全部22站236个可用分面完成独立平面相交与pit端点/方向检查。
- 雪邦与银石的7m估计pit lane宽度包络局部进入车库footprint；改为按原建筑边界裁切显示路面，留0.15m建模间隔，源道路中心线和建筑不动。裁切轮廓随facility构建脚本生成并在实际网格回归中检查，不代表获取了真实逐段道路宽度。
- 围网：原先每片看台向赛道统一推出4m的逻辑删除。共享模型使用实际路面/维修通道净距限制估计前沿围网，逐段检查曲面弦线；高度取当前位置地面，不从上层楼面减固定值生成悬浮网。结构关联的上层不再重复生成赛道catch fence。围网仍是估计模型，不代表已取得真实赛道屏障测绘。

## 铃鹿永久上层结构（2026-10-24）

V1下层/V2上层关系来源主办方 https://www.suzukacircuit.jp/eng/f1/ticket/seat_v2.html 和对应V1页面。当前售票页面已切换2027，因此这里只提取永久结构关系，不据此确认2026票区总表。上层前排以现有下层后排+2m连接高度估计（可能范围1–3m）；不是实测高度，source confidence=low。关系JSON及重建脚本独立留存，模型/眼位/地面修切共享相同基准。B2/Q2不自动套用此关系。

世界地图新增定位及云层动效仍使用现有Natural Earth边界与F1DB经纬度；云层为本项目CSS绘制，无新增外部素材。

---

## GEDTM30 地面高程更新（2026-10-24）

新加坡与摩纳哥采用 Ho、Hengl / OpenGeoHub 发布的 GEDTM30 v1.2.0（2026-03-06），来源 https://zenodo.org/records/18887460 ，方法论文 https://doi.org/10.7717/peerj.19673 ，CC BY 4.0。两站局部原生1角秒（约30m）COG窗口双线性抽取65×65点，完整来源、坐标窗口、原生Float32数据SHA256与网格保存在 `src/circuits/elevation-source/ground-grids/`；`ground_elevation.py --fetch singapore monaco --apply` 可获取，`--apply` 可离线重建。获取依赖rasterio/numpy，前端不依赖它们或在线服务。

v1.2发布元数据明确Float32、米、scale=1；COG仍留有旧整数版本的0.1 scale标签。存储数值已经是米，未再乘0.1；人工源像素复核（勃朗峰6.8652/45.8326约4795.7m，摩纳哥7.4205/43.7312约66.5m）与版本说明一致。保留这一差异，不应把真实高差缩小10倍。未进行平滑、削峰、随意海平面替换或高度放大。

新加坡网格范围-4.845..34.991m、摩纳哥0..201.468m（以实际JSON为准）；旧SRTM响应哈希仍保存在coverage的srtmBaseline。此DTM为区域地面预测，不证明实测赛道路面/看台/桥隧。署名随生产构建输出 `/licenses/GEDTM30-CC-BY-4.0.txt`。

赛季资料注意：新加坡官网 `/web/2026/circuit-park-map/` 当前图内标题已为2027，虽印制日期为2026-10-15，仍不能作为2026票区清单证据。不得仅凭URL年份认定赛季。仅保留研究，不分发原图，不据此新增2026票区。

---

# 历史地点图鉴资料（2026-10-23）

- 用户确定首批范围：1950 年以来实际举办过 F1 世界锦标赛正赛的地点，包含当时计入锦标赛的 1950–1960 Indianapolis 500，不包含非锦标赛、冲刺赛或只提出但未举办的地点。
- F1DB contributors，固定发布版本 [v2026.17.0](https://github.com/f1db/f1db/releases/tag/v2026.17.0)，[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)。下载 `f1db-json-splitted.zip` SHA256 与官方发布页一致：`0f1717eaebae646b7ced9ca96f6be3282c1c1d435d0a9d75f2c00f40feb7d2a8`。
- 保留原始 circuits/races/grands-prix/countries 四个 JSON 与完整许可于 `artifacts/atlas-source/`；各文件哈希在 `src/atlas/provenance.json`。`scripts/build-atlas.py` 做选择、归档、中文名与别名整理，不依赖在线服务。
- 1950–2025 年 1,149 场正赛，2026 已举行记录截至该源的 10 月 11 日。共 78 个举办地点、77 个年份；2026 下半年未来分站不计入地点的已举行场数。2026 计划赛历继续采用项目 10 月 23 日核对的 F1 官方 23 站快照；两种时间含义在界面区分。
- 对照官方 [1950 结果](https://www.formula1.com/en/results/1950/races) 的七场与 Indianapolis 例外，以及 [2020 结果](https://www.formula1.com/en/results/2020/races) 的 17 场、同地点双赛。完整历史逐场日期/地点/布局 ID 通过测试与保留源快照比对，并不声称逐场人工核查。
- 地点用 F1DB circuit ID 去重：例如 2020 银石两场只有一个地图地点；纽博格林不同布局在档案中分别记录；Zeltweg 机场与 Spielberg、Caesars Palace 与 Las Vegas Strip 仍为不同地点。坐标是来源地点锚点，不表示可入场座位或精确地块边界。
- 图鉴与现有 23 条模拟包通过明确 ID 映射连接。无包的地点只显示真实档案，不生成假路线、假看台。历史长度与弯数来自对应比赛，不把当前三维模型当作历史复原。
- 网页页脚、档案页与 `public/licenses/atlas-F1DB.txt` 保留署名、许可链接及改编说明，完整许可证随 `F1DB-CC-BY-4.0.txt` 发布。世界陆地仍为 Natural Earth 公共领域资料。

---

# Data sources / 数据来源与可校准假设

核查日期：2026-10-22。坐标：1 单位=1米，X东、Y上、Z南。地面零高程；无地形测量。

| 关键参数               | 数值/配置                                          | 来源与方法                                                            | 置信度与限制                                                                       |
| ---------------------- | -------------------------------------------------- | --------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| 正赛长度               | 5451 m                                             | F1 官方 2026 China 赛道页及 Circuit Guide，资料提取                   | 高；是公开长度，不代表本项目取得测绘数据                                           |
| 完整赛道经纬中心线     | src/data/shanghai.geojson                          | bacinger/f1-circuits cn-2004，MIT；公开 GIS 提取                      | 中；非 2026 新测；与 FIA 2026 场地图核对形状、主直道、长直道、螺旋弯关系及运行方向 |
| 世界比例               | 局部经纬投影后，曲线弧长统一缩放至5451m            | CircuitGeometry.rawLength / calibration 可检查；允许校准偏差<5%的测试 | 近似，不是实际赛道每点精确坐标；不校正局部 GIS 误差                                |
| 道路宽度               | 14 m 恒宽                                          | 工程估算，可配置 roadWidth                                            | 低；真实不同位置宽度变化，未测量                                                   |
| A 看台位置朝向         | 中心距源轨迹原点上游220m，位于主直道外侧；长380m   | 结合 FIA 主直道关系和公开场地资料建立局部坐标框架；米制位置估算       | 低至中；没有座位图配准，不声称厘米/米级实测                                        |
| A 下层                 | 距轨道中心32–50m，表面3–13m，深18m，约29.1°        | 合理工程估算；stand.lower\*集中配置                                   | 低；需实地测量校准                                                                 |
| A 上层                 | 距轨道中心55–78m，表面17–32m，深23m，约33.1°       | 合理工程估算；独立可选坡面，保留层间空隙                              | 低；未复制真实座位分布                                                             |
| 坐姿眼高               | 表面+1.2m                                          | 用户目标指定的默认值                                                  | 可调；非任何观众的生理保证                                                         |
| 屋顶                   | 高度38m，深42m                                     | 结构简化估算                                                          | 低；未还原全部屋顶曲面与场馆建筑细节                                               |
| P 房                   | 长340m、宽24m、高15m，主直道内侧偏移42m            | FIA 2026 pit lane drawing 确认相对位置、车库门面对维修通道；尺寸估算  | 低至中；33个简化车库开口，不含车队品牌、室内设备                                   |
| P 房距离参考           | 建筑前沿中心，X局部0、偏移-30m、高3m               | 本项目明确定义的固定参考点                                            | 距离算法精确，参考点本身基于估算建筑                                               |
| 维修通道、维修墙       | 通道偏移-22m宽13m；墙偏移-12m高1.3m                | 简化估算                                                              | 低；无完整 pit entry / exit 精细结构                                               |
| 发车线与计时线         | 分别 length-180 与 length-245m                     | FIA 2026 map 明确显示两条独立标线；本项目约65m间距为估算              | 分开设置的事实高置信；米制位置低置信，未从非比例图虚构实测                         |
| 发车格                 | 22格交错布置                                       | 简化示意，估算                                                        | 低；展示空间用途，非精确官方2026发车位测绘                                         |
| 围网                   | 距轨道中心13m、高3.5m                              | 必要遮挡的工程估算                                                    | 低；合并线段参与真实深度测试，无人头遮挡                                           |
| 轮胎墙                 | 局部-256m起30列，偏移9m，4层，高约2.11m            | 必要遮挡工程估算，可配置 tyres                                        | 低；实际布置需现场校准；使用实例化实体圆柱，不用屏幕遮罩                           |
| 赛车宽度、轴距         | 1.9m、3.4m                                         | FIA 2026 regulation announcement，资料提取，选取公布最大尺度          | 高（公开规格）；不是特定车队赛车，也未宣称模型符合全部FIA法规                      |
| 赛车长度、高度、驾驶舱 | 5.2m、.95m；锚点y .75m、纵向-.4m，相对车体地面上方 | 现代F1外形的工程估算，car配置                                         | 低至中；没有引用未验证的精确2026整车长度                                           |
| 手机相机               | 1×24mm，全画幅对角线43.27mm、4:3等对角线成像       | 用户目标指定1×；标准透视几何                                          | 几何精确，非真实手机光学画质模型                                                   |

## 已核查资料

- https://www.formula1.com/en/racing/2026/china
- https://www.formula1.com/en/information/china-shanghai-interational-circuit-shanghai.7ESK3ZQ5DHqihx3DpPZKWL
- https://english.shanghai.gov.cn/en-SportsEvents/20260311/933bcc13c7c44363a04a036b4888a7de.html
- https://github.com/bacinger/f1-circuits/blob/master/circuits/cn-2004.geojson （授权见同目录 LICENSE-circuit.md）
- https://www.fia.com/system/files/decision-document/2026_chinese_grand_prix_-_competition_notes_-_circuit_map_pit_lane_drawing_emergency_exits_map_battery_containment_area_and_red_zone.pdf
  已下载并检查其第2页 Circuit Map、第3页 Pit Lane Drawing。资料日期2026-03-12，Document 7。用于形状与设施关系核查；原图不作为网页素材。
- https://www.fia.com/news/new-era-competition-fia-showcases-future-focused-formula-1-regulations-2026-and-beyond

未采用 OSM 数据。如未来更换 OSM 来源，须另行履行 ODbL 署名与数据库许可要求。参考体验站 https://shijiao.xingpaste.com/ 无法直接获取；没有复制其代码、素材或界面。

## Phase 2 核查补充（2026-10-22）

- 有效赛历：https://www.formula1.com/en/racing/2026 ，当前23站。没有把季前测试计入赛道。
- 移站公告：https://www.formula1.com/en/latest/article/formula-1-and-fia-confirm-malaysia-will-join-2026-calendar-as-host-venue-for-bahrain-grand-prix.6lL7vjFEM2VVynRHvg1TCf.6lL7vjFEM2VVynRHvg1TCf ，比赛地Sepang/Malaysia，赛事名保留Bahrain GP。
- FIA交叉核查：https://www.fia.com/events/fia-formula-one-world-championship/season-2026/2026-fia-formula-one-world-championship ，同样记录SEPANG和Malaysia。
- 上海官方2026售票：https://www.shanghai.gov.cn/nw17239/20251209/b2b6c8cdfe014ce181304a4459664eb8.html ，确认A铂金/A其他、B/E/H/K与C/F/J草地，尚需图上几何配准。
- 独立品牌参考规则：https://www.formula1.com/en/information/guidelines.4EOKE9RRqevL4niTK9kWyt ，使用原创品牌，不打包官方Logo、字体或摄影素材。
- 全赛道轨迹候选：https://github.com/bacinger/f1-circuits/blob/master/f1-circuits.geojson ，MIT；已下载至research用于核查，未视为全部2026布局验证通过，不直接公开未验证地图。

- Madrid版本差异：https://www.formula1.com/en/racing/2026/spain 显示2026赛道5.414km、22弯；候选GeoJSON属性5474m。需进一步核对线路版本，不能把旧候选直接标为2026已验证地图。

## Gate B / Gate C准备补充

- Barlow Condensed：Google Fonts官方开源仓库 https://github.com/google/fonts/tree/main/ofl/barlowcondensed ，下载SemiBold字体和OFL许可证至public/fonts，自托管，不使用F1字体。
- OpenF1场次候选：https://api.openf1.org/v1/sessions?year=2026&session_name=Race 。25条含两站取消；Sepang的country_name字段仍Bahrain，需以F1/FIA移站公告为准。只作API key配对研究，不作为独立的国家核查结论。
- MultiViewer角点API：https://api.multiviewer.app/api/v1/circuits/{circuit_key}/2026 ，请求协议见FastF1源码 https://github.com/theOehrly/Fast-F1/blob/master/fastf1/mvapi/api.py 。返回实际年份2019–2025且部分404；原始数据仅研究缓存，尚未把这些位置标为2026验证通过。未假定FastF1代码许可证等于全部API数据许可证。
# Phase 2 多赛道资料（2026-10-23 更新）

最终验收于2026-10-23再次打开F1官方2026赛历核查，仍为23个有效轮次/独立场地；日期更新到首页。各包此前的checkedAt保留原几何/资料核对日期，不能把赛历复查冒充重新测量全站几何。同日复核用户提供的F1品牌使用指引；网站使用原创APEX / SIGHTLINE标识、合法字体与事实性赛道名称，不分发官方Logo/品牌素材，并保留非官方声明。

发布构建保留已安装生产依赖的完整许可/NOTICE、Barlow OFL、GIS MIT与上海区域ODbL署名，输出在`public/licenses`和`dist/licenses`；构建脚本从本地依赖读取，不调用外部服务。原始来源URL和观赛区域的派生数据包含在源码包内，官方地图研究截图不进入网站或最终交付压缩包。

摄影模型为本项目实现的时间积分：曝光中点均匀采样，车辆使用同一米制弧长函数，以快门瞬间的实际速度推进各样本；固定镜头锁定相机矩阵，理想跟拍以两时刻驾驶舱视线的旋转乘初始相机姿态，保持参考点原屏幕坐标。色彩采用同一Three显影后的帧，按IEC sRGB转换到线性值累积再编码；不是完整传感器HDR曝光。Three .180实际WebGLRenderer源代码确认普通renderTarget绕开显示显影，因此沿用同一画布色彩管线，逐样本恢复实时画面后才让出执行。没有使用CSS blur或外部摄影资产。

上海观赛区域：2026正式开放由 https://www.shanghai.gov.cn/nw17239/20251209/b2b6c8cdfe014ce181304a4459664eb8.html 的售票图与英文2026活动指南核对，A上/下/铂金、B/E/H/K和C/F/J草地。2026正式场地图含E与赛事日期，缓存research/shanghai-2026-grandstand-locations.png；A铂金位于A上层中央，由票务示意图限定中央子区估算，非精确座位划界。

OSM官方API `https://api.openstreetmap.org/api/0.6/map?bbox=121.205,31.330,121.235,31.355`，2026-10-23获取。A way107371135（原模拟仍保留旧近似坡面）、B 156341844/156341848/156341851、E弧形11段1569744xx/156974500/156974506、H1372223261、K1372223262、F485553716、J485553709。每段ID在zones.json source内完整保留。历史L未开放2026普通票，排除。C暂无具名多边形，以正式场地图T5–T6外侧估计，低精度。OSM建筑footprint是有效观察区的平面参考，不是座席测量；表面高度/坡度、围网边界均为可校准估计。B/E/H/K分别采用独立的2.5+13、2+14、2+9、2.5+11米阶梯；C/F/J分别为0.6+3.2、0.5+2、0.8+4.5米草坡，坐姿眼高另加1.2m。数据参数不是实测高程。ODbL署名与许可在src/data/LICENSE-zones.md，网页保留可点击的©OpenStreetMap contributors。

- 有效赛历核查：2026-10-22，https://www.formula1.com/en/racing/2026 ，23 个独立场地。移站后的巴林大奖赛在马来西亚雪邦举行，国家字段为马来西亚；不保留取消的 Sakhir/Jeddah 赛事记录。赛事名称和举办国分开保存。
- 每站 GIS：bacinger/f1-circuits 的 MIT GeoJSON；源缓存 research/f1-circuits.geojson，生产包各自位于 src/circuits/generated/。地理方向 X 东、Z 南，投影后按公开圈长统一校准；路宽为明确的 14m 示意估算，非逐段测绘。原 MIT 署名保留 src/data/LICENSE-circuit.md。
- 21 站编号参考来自公开 MultiViewer circuit API，经参考轨迹与地理中心线的闭环相似配准后吸附。接口请求 2026 **实际返回 2019–2025 布局年**，每条角点 source.notes 保留返回年份和配准 RMS；不冒称当年测绘。RMS 约3.1–9.5m；原始候选只留研究目录，不作为网页资产。Hungaroring 的 1A/12A 属附加字母标记，剔除后实际14弯。Singapore GIS原顺序反向，已修正为正赛方向。脚本 scripts/align-corner-candidates.py、alignment-report.json 可复核。
- 雪邦：FIA 2026 Bahrain GP in Malaysia Doc7，2026-10-01，Circuit Map 第2页，公开原文件镜像 https://cdn.jsdelivr.net/gh/TracingInsights/DDocs@86676c9e4b5c5f5ef9585b1cf05a45e14a7dafa6/documents/2026/bahrain-grand-prix/competition-notes-circuit-map-pit-lane-drawing-emergency-exits-map-and-red-zone.pdf 。4 个地标相似配准 RMS2.77px，15个手工角点吸附最大6.34m。仅使用事实位置，不在网站分发官方图像。脚本 register-sepang-corners.py。
- 地形：OpenTopoData SRTM v3 90m，https://www.opentopodata.org/datasets/srtm/ 。8站各17×17网格，离线请求与结果留 research/elevation*；双线性插值，垂直米制不缩放，圈长校准只调整水平位置。只代表区域 DEM，不解析桥梁、隧道、路肩和精确横坡；状态 partial。采集脚本 fetch-elevation.ps1 使用临时单请求代理，不修改系统配置。
- Madrid 正式官方线路参考 https://www.madring.com/circuito 、官方 SVG mapa-curva-1.svg 与 F1 2026 Spain 页面（5.414km/22弯）。GIS旧属性5474m；当前官方SVG与GIS拟合 RMS8.52m。实际浏览主办方编号图后人工标定22个弯心，剔除5A/20A附加弯，吸附偏移最大10.88m，已接入地图。按钮的CSS坐标不当作弯心，research/madrid-numbered-map.png/positions.json可复核，register-madrid-corners.py保留人工输入。近似位置约15–25m，不声称测绘验证；不是仅靠旧属性缩放。
- 缺失高程和维修区坐标保持 unavailable/null，不从示意图编造精确数据。生成脚本 scripts/build-season-packages.py 可重新生成独立包及真实缩略轮廓。


2026-10-23交互反馈修订：移除顶部模式导航、二维选点框和选点方向箭头；三维表面圆点经真实相机射线与对应看台mesh求交，A铂金仍约束原子区。新增Pro实时曝光预览：同一冻结时刻、sampleTimes/sampleDistance/exposureQuaternion和真实车体，GPU直接复制与照片相同的已显影样本、解码sRGB并用HalfFloat在线性光累积，避免二次显影。每帧恢复车体/渲染状态，不改实时仿真。预览低样本与照片高样本分开；普通模式和暂停不伪造拖影。

2026-10-23地图修订：铃鹿立交上下关系依据SUPER GT官方赛道介绍 https://supergt.net/en/circuit/suzuka ，西直道为上层、Degner出口为下层；约7m路面间距与余弦渐变引桥为可配置低精度估计，不能用作净空测量。道路表面沿中心线高程，不再将桥面重新吸回地面DEM。非上海地图的加宽实心底带改为两条独立边缘带，近邻近似平行路段按间距限制示意宽度（不宣称真实逐段路宽）；没有改变地理中心线。地图不再放大高差，可靠DEM区域可显示高度渐变和5m等高线，缺失DEM的区域不生成虚假地形。

2026-10-23相机交互修订：删除pro/setPro状态与单帧普通拍照分支，所有照片及取景统一使用当前快门/跟拍。0.5–30×＝12–720mm等效，沿用同一对角线等效投影公式；无新几何来源或车体尺度变化。

2026-10-23地形视觉修订：沿用原始高程网格与双线性采样，未新增高程来源或修改数值。灰绿配色、5m/25m等高线及边缘透明度属于显示处理。

后续显示修订：按用户反馈取消边缘透明渐隐，保留清晰边界；原始数据不变。


## 欧洲看台扩展（核查2026-10-23）

OSM静态轮廓从公开map API提取，按主办方看台名称/区域人工列入允许清单，未将范围内所有建筑自动作为看台。离线原始JSON：`src/circuits/europe/osm/`；每个zone.source保留way编号。区域类型、原图控制点、人工矩形边界、OSM家族合并及特殊GIS参照记录在`src/circuits/europe/review.json`与`scripts/build-europe-spectators.py`。

| 赛道 | 2026参考来源 | 方法与限制 |
| --- | --- | --- |
| 摩纳哥 | [ACM 2026官方场地图](https://acm.mc/wp-content/uploads/2025/05/Hospitalites_ACM_F12026_F-3.pdf) | 临时看台人工配准；A区辅以GIS弯道关系估计；14区 |
| 巴塞罗那 | [场馆2026看台/会员资料](https://www.circuitcat.com/es/abonados-modalidades/) | 15个具名OSM家族；建筑不等于售票边界 |
| 红牛环 | [主办方2026场馆说明](https://www.redbullring.com/en/events-tickets/formula-1/glossary/) | 7个OSM家族、T3近似边界；8区 |
| 银石 | [官方2026看台指南](https://www.silverstone.co.uk/news/silverstones-guide-grandstands) | OSM常设看台与官方弯道关系人工估计；28区，非每张票种 |
| 斯帕 | [主办方看台资料](https://www.spagrandprix.com/en/ticketing/access-tickets) | 4个OSM具名家族与9个弯道相对位置估计；13区；实时页面可能已换到下一季 |
| 亨格罗宁 | [2026售票方场地图](https://homewww.gpticketshop.com/en/f1/hungarian-f1-grand-prix/pdfpricelist.html) | 15个OSM家族；旧称通过现有具名数据对应；不包括独立Club/全部新增分块 |
| 赞德福特 | [主办方2026 Wayfinding Map](https://www.dutchgp.com/app/uploads/2026/07/2026_F1_Netherlands_WayfindingMap_Negative_VISUAL.pdf) | 主看台OSM，其余临时看台以弯道控制点人工配准；14区 |
| 蒙扎 | [场馆2026正式看台图](https://www.monzanet.it/wp-content/uploads/2026/06/GP_F1_2026_LISTINO_PREZZI_6_17.pdf) | 18个OSM具名家族，多块Laterale/Alta Velocita合并，不代表全票种 |
| 马德里 | [主办方2026官方场地图与交通说明](https://www.madring.com/en/press-releases/mobility-plan) | 15个可定位看台片区，按弯道/主直道分组；没有把图中的入口或贵宾区当作普通看台 |

人工图面配准采用弯道地理控制点上的局部仿射转换；示意图并非等比例地图，无法由此推导精确座位坐标。2026-10-23复核撤销了自动向外平移边界的做法，恢复原始配准坐标。完整多边形与实际渲染道路三角形相交、人工边界方位严重存疑、或座席正面找不到对应道路的区域，保留来源记录并标为preparing，不渲染、不选点、不拍照。原始图像/PDF仅用于本地研究，网站和交付包不包含这些版权图像。

新增`frontReference`记录座席宽面对应的道路地理点，用于确定前排、坡向、默认视线和演示路段，避免取看台端部附近的错误路段。参考点由几何推导，仍为估计，不是现场座椅朝向。检查结果：101个近似区域开放、39个待核验，详见`src/circuits/europe/geometry-review.json`。`build-europe-spectators.py`会依次导出真实道路网格并执行完整相交检查；需要NumPy、SciPy、Shapely。网页运行/普通构建无需Python和联网。

欧洲坡面高度配置由边界深度生成可配置的简化台阶并明确标为低置信度估计，眼点加1.2m。存在SRTM网格的站叠加原始参考高程，保持真实纵向米制，不增加坡度夸张或伪造城市高程。相关数据许可见`src/data/LICENSE-europe.md`，部署产物同步保留ODbL署名与来源。

道路纵向显示在4000个水平样点上使用同一DEM插值，再按实际三维弧长校准；这用于避免稀疏GIS顶点的高度样条穿过地形，不提高90m源数据精度。立交附加抬升独立保留；观赛路面偏移0.2m与原上海相同，车轮基准0.22m。

## B组亚洲与大洋洲扩展（2026-10-23）

赛历再次参考[F1 2026有效赛历](https://www.formula1.com/en/racing/2026)，保留现有8站分组；雪邦赛事名称为巴林大奖赛（马来西亚），未替换成巴林旧场地。上海数据与物理配置保持原样。

| 赛道 | 定位依据 | 开放/待核验 |
| --- | --- | --- |
| 墨尔本 | [2026独立看台位置注释图](https://oversteer48.com/brabham-grandstand/)；[主办方2026游客图原链接](https://www.grandprix.com.au/uploads/images/F126_009_Visitor-Map_A3_V9-Digi-3.pdf)现已撤下。未将独立图冒称官方测绘图；用已知弯道作局部配准 | 17 / 1 |
| 铃鹿 | 具名OSM看台轮廓，对照主办方2026 Wayfinding Map；[留存的主办方PDF副本](https://www.coloma.it/images/F1E-Japan-2026-Circuit-Map.pdf)。未把未具名建筑强行命名为票区 | 18 / 0 |
| 巴库 | [主办方2025 Wayfinding图留存副本](https://f1destinations.com/wp-content/uploads/2025/09/2025_F1-Wayfinding-Map_Positive_Azerbaijan_VISUAL.pdf)作位置参照；2026票区名称另查官方票务/套餐资料。当前主办方网站已切换2027 | 9 / 1 |
| 雪邦 | OSM的K1/F与主看台建筑；[巴林赛事官方2026场地图原链接](https://www.bahraingp.com/blog/events/venue-map/)及公开2026票务说明。双面主看台只取两侧长座席带，中央通道与塔楼不作为座席；不借用MotoGP票种作为F1开放依据 | 4 / 0 |
| 新加坡 | [2026官方票务页面](https://singaporegp.sg/en/tickets/general-tickets/grandstands/saturday/)与公开位置图；2026文件路径现已返回2027图，真实年份记为2027，只作相邻年份低精度位置参照。提取已知票区形状作地理配准，未分发图案/文字/官方图像 | 8 / 2 |
| 卢赛尔 | OSM看台轮廓，对照[主办方2026说明](https://www.lcsc.qa/faq/formula-1r-qatar-airways-qatar-grand-prix-2026)及T2/T3/T16票区资料；没有用无可靠边界的区域凑数 | 3 / 1 |
| 亚斯码头 | OSM具名Main/South/North，对照[主办方2026票务](https://www.abudhabigp.com/en/formula1/tickets-2026)。北看台U形按实际建筑边界分三个朝向，非三个官方票种 | 5 / 0 |

事实来源与way ID保留在`src/circuits/asia/osm/`；配准控制点、矩形/轮廓事实、年份和估计比例在`src/circuits/asia/review.json`、`diagram-footprints.json`和`scripts/build-asia-spectators.py`。两点局部配准避免三点仿射的极端剪切，仍不能消除非等比例图的地理偏差。69个候选中的64个仅通过几何相容性筛查，5个失败区域不可选；完整审查见`src/circuits/asia/geometry-review.json`。OSM许可与说明另存`src/data/LICENSE-asia.md`，构建会同步到`dist/licenses/asia-zones-ODbL.txt`。


## C组美洲观赛数据 · 核查2026-10-23

OSM事实包`src/circuits/americas/osm`（保留way ID/tags），人工匹配与图面控制点`review.json`和`build-americas-spectators.py`；完整道路三角网检查在`geometry-review.json`。所有座席/遮挡高度为估计，没有以DEM或建筑轮廓冒充座椅测绘。

| 站点 | 2026名称/位置核验资料 | 用途与年份限制 |
| --- | --- | --- |
| 迈阿密 | https://f1miamigp.com/news/press-release/tickets-on-sale-now-for-the-return-of-formula-1-to-miami-in-2026/ 及 https://s40320.pcdn.co/wp-content/uploads/2025/10/F1_-Interactive-Map_Updated_Discovery_2-scaled-e1779901726996.jpg | 官方2026公告核对Start/Finish、Turn1 North、Turn18、Beach/Marina；当前官方图未标年份，仅作近似位置参考；Turn1 East排除；OSM网球看台不使用 |
| 蒙特利尔 | https://gpcanada.ca/wp-content/uploads/2026/05/guide-du-visiteur-2026-en-1.pdf 及 https://raceexperiences.com/wp-content/uploads/2026/04/F1-Ticket-tips-Canada.pdf | 官方2026指南确认赛事/11/12；独立2026票区图核对其他家族与局部位置；官网现为2027，不以此证明2026边界。OSM仅使用与F1家族可匹配轮廓；未匹配的划船/球场设施排除 |
| 奥斯汀 | https://help.thecircuit.com/hc/en-us/articles/40009157954324-Grandstand-Seating 及 https://circuitoftheamericas.com/ticket/grandstands-and-reserved-seating-f1/ | 官方明确2026普通7家族：Main/T1/T4/T9/T12/T15/T19；OSM永久轮廓优先。T4/T9区位参照2025主办方图存于 https://f1destinations.com/wp-content/uploads/2025/10/2025-United-States-GP-COTA-Spectator-Map.pdf ，相邻年份不代表2026精确搭建 |
| 墨西哥城 | https://www.mexicogp.mx/boletos-generales/ 及 https://www.mexicogp.mx/mapa-del-circuito | 官网当前JS引用`images/map_2D_tiles_2026/MGP_Mapa_2026_01.png`；2026票区名称与OSM对应，2025官方标名图仅辅助识别家族，不用来证明2026开放；球场/体育馆看台排除 |
| 英特拉格斯 | https://f1saopaulo.com.br/arquibancadas/ 及 https://f1saopaulo.com.br/wp-content/uploads/2026/08/Mapa-completo.webp | 当前主办方区位/描述与OSM核对；M/B/PitStop/A用OSM，D/H/R/G人工估计地理中心和尺度；等距图不能精确量距。主办方也明确图片可能来自往届、搭建可能调整 |
| 拉斯维加斯 | https://www.f1lasvegasgp.com/tickets/grandstands/ | 2026官方家族与7月分区图。Turn3已迁到新的位置，按当前说明/图面处理；Main/Lewis Hamilton/T-Mobile/Turn3/Heineken单独记录source.url，Sphere分面后缀不当作官方票区 |

原始官方图片/PDF仅在忽略目录`research/americas`供研究，产品和zip不包含参考图像、品牌/票务资产。ODbL出处与再分发说明`src/data/LICENSE-americas.md`，构建复制`public/licenses/americas-zones-ODbL.txt`。几何审核是与当前模型的一致性检查，不代表座席已实地验证。


## 首页世界地图与赛历（2026-10-23）

- Natural Earth 1:110m陆地海岸线： https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_110m_land.geojson 。公共领域许可说明 https://www.naturalearthdata.com/about/terms-of-use/ 。裁剪至南纬60°/北纬82°、0.16°保形简化，输出119个离线SVG路径，约36KB；等距圆柱投影，不显示行政边界。生成器`scripts/build-world-map.py`，资产`src/assets/world-land.json`，许可随构建复制`licenses/world-Natural-Earth.txt`。
- 23个赛道锚点取已核验赛道包中心线第一个地理点，不用城市中心或猜测位置。`src/circuits/season2026.json`只保留锚点和周末日期，首页不需要加载23个3D赛道包。
- 比赛日期重新核对 https://www.formula1.com/en/racing/2026 ，仍为有效23轮快照：巴库9月24–26日、雪邦10月2–4日，墨西哥10月30日–11月1日，拉斯维加斯11月19–21日；季前测试不作为比赛卡片。不包含胜负/排名/实时赛事状态。


## 2026-10-24 本地打磨资料

- 历史概念图：F1DB v2026.17.0，固定提交 `3c980fd510ef97ea0de577aff7ecee193869de65` 的 `src/assets/circuits/white/`。来源：https://github.com/f1db/f1db/tree/3c980fd510ef97ea0de577aff7ecee193869de65/src/assets/circuits 。78 张原始 SVG 随 `public/atlas-layouts/` 自托管；每张取该地点最后已举行正赛的布局，不宣称全部为现今线路。F1DB / Jules Roy 与贡献者，CC BY 4.0；许可见同目录 ATTRIBUTION.txt 和 public/licenses/F1DB-CC-BY-4.0.txt。`src/atlas/layout-provenance.json` 保存 Git blob 哈希，生成脚本逐张校验。介绍按原始类型、方向、首次日期、比赛数及布局版本数整理，不增补无来源轶事。
- P 房与维修通道：22 站独立数据位于 `src/circuits/facilities/`，各特征保留 OSM way URL。2026-10-23 核对；20 站确认建筑平面，摩纳哥/马德里仅有通道。采用 ODbL，见 src/data/LICENSE-facilities.md。建筑高度优先 OSM height 标签，其余显式 heightEstimated；通道宽度估计为 7m，立面车库数量为示意重复。
- 银石采用国际赛道 Wing（way 227332429）与国际维修通道（227902927），未用国家赛道旧维修区。斯帕采用 Stand F1（77352246）及 F1 通道（323851541），未用耐力赛维修区。卢赛尔采用 F1 入口（1037707300），排除 MotoGP 入口（1004121314）。亚斯 way 176695255 原始 layer=-1，保留 underground 标记，不作为地表通道绘制。
- 上海继续使用原独立设施；未用此轮通用 OSM P 房替换旧上海模型、物理或投影。
- DEM 视觉修补只向下切除粗网格遮住路缘的地面，未提高/夸张地形，未修改车辆路径或桥面高程。标签、俯瞰相机变化均为产品交互，不是新增测绘数据。


## 2026-10-24 高程与完整票区二次核对

全部23站区域网格来自 https://www.opentopodata.org/datasets/srtm/ 的SRTM v3 90m数据；每站17×17点，原响应在本地research/elevation缓存，导出heights与来源保存在独立赛道包。src/circuits/elevation-source/coverage.json记录采样数、绝对范围及每份响应SHA256。289点是项目查询网格，不能把查询点间距当成90m原生采样精度；网格间采用双线性插值。原生SRTM是区域表面高程，会受树木、建筑影响；不能据此声称地下/看台/道路测绘准确。八站原网格保留，十五站新增。

再次查看官方2026赛历 https://www.formula1.com/en/racing/2026 ，仍23站，包含马来西亚雪邦举办的Bahrain Grand Prix；不恢复已取消的其他地点。此轮不改已举行统计截至日。

ACM 2026票务说明 https://acm.mc/epreuves/formula-1-grand-prix-de-monaco/infos-pratiques/informations-liees-a-lachat-de-billet-ou-de-package/ 明确区分座席与Z、Rocher站立区域。该证据仅确认票区类型/年份，不确认其地理边界。FIA 2026摩纳哥媒体资料 https://www.fia.com/sites/default/files/media_kit_2026_gb_03.06_1.pdf 下载校核为63 PDF页，交通及媒体限制区不能替代完整普通观众售票地图。上述原图仅本地研究，不打包进产品。

双语英文地点和原始赛事名称使用现有F1DB别名/逐场资料；界面翻译为本项目原创，赛事/看台专名保留，不更改source ID、坐标、日期或几何。完整票区核对记录在src/circuits/season-review，未核实项目不计为完成。
