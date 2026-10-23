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
