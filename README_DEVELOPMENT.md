# 赛道图鉴：后续开发指南

本文介绍当前代码的框架、运行链路与修改入口，供接手项目的开发者使用。核对日期：2026-11-07。

项目是可静态部署的赛车观赛与摄影模拟网站。首页包含世界地图、历年赛历和历史赛道档案；有模型的赛道可以进入鸟瞰地图、连续选择观赛位置、观看赛车和导出照片。历史档案与三维模型是两套关联的数据，不是所有历史地点都有三维场景。

## 1. 本地运行

技术栈：React 19、TypeScript、Vite 7、Three.js、React Three Fiber、Drei、Zustand；样式使用普通 CSS 与 Tailwind Vite 插件，测试使用 Vitest 和 Playwright。

建议使用 Node.js 24，与现有 GitHub Actions 保持一致；依赖版本以 `package-lock.json` 为准。

```powershell
npm ci
npm run dev

# 生产版本及其本地预览
npm run build
npm run preview -- --port 4173
```

预览地址为 `http://127.0.0.1:4173/`。`preview` 提供的是 `dist/`，修改源码后需要重新构建；开发时使用 `dev` 获得热更新。

Python 主要用于资料处理、几何检查和数据迁移，不是网站运行时依赖。不同脚本可能需要 Shapely、NumPy 等额外包，执行前查看脚本导入；不要把整套离线处理环境作为前端启动条件。

## 2. 从哪里读代码

推荐顺序：`src/main.tsx` → `src/app/navigation.ts` → `src/circuits/registry/index.ts` → `src/app/CircuitContext.tsx` → `src/app/CircuitExperience.tsx`。

|目录 / 文件|职责|
|---|---|
|`src/main.tsx`|应用挂载、Hash 路由分发、页面懒加载及上下文缓存入口|
|`src/pages/`|首页 `CatalogPage`、历史档案 `AtlasVenuePage`、地图浏览后备页 `CircuitMapPage`|
|`src/app/`|共享赛道体验、独立运行上下文、上下文缓存、导航及世界地图进入动画状态|
|`src/store.ts`|`createAppStore` 工厂；每个赛道拥有自己的模式、选点、朝向和摄影参数|
|`src/components/`|世界地图、地形、标签布局、计时标注、导航、场景辅助及通用界面组件|
|`src/systems/`|车辆、观察相机、观赛区域、选点、手机控制、测量和遥测|
|`src/camera/`|曝光时间采样、运动模糊预览、照片生成、取景辅助和着色器预热|
|`src/circuits/`|三维赛道数据、统一类型、数据加载器及几何计算|
|`src/atlas/`|历史地点、赛历、布局记录、简介和来源记录|
|`src/i18n/`|语言状态、界面译文与赛道 / 地区名称本地化|
|`src/design-system/tokens.css`、`src/style.css`|设计变量和主要界面样式；部分组件另有配套 CSS|
|`scripts/`|离线生成、迁移、资料审计和几何验证脚本|
|`tests/`、`e2e/`|单元 / 几何回归，以及真实浏览器流程测试|
|`research/`、`artifacts/`|本地资料原件、截图与诊断产物；不应整目录上传|

`src/systems/` 中也保留了一些早期兼容模块。判断实际执行路径时沿当前入口的 import 查看，不能仅凭文件名认定模块仍是主实现。

## 3. 页面与运行链路

项目使用自有 Hash 路由，没有引入 React Router。静态托管可以直接刷新深层页面。

|地址|页面 / 模式|
|---|---|
|`#/circuits` 或空 Hash|世界地图、赛历与图鉴首页|
|`#/atlas/shanghai`|上海历史档案|
|`#/circuits/shanghai/map`|上海鸟瞰地图|
|`#/circuits/shanghai/zones/a/select`|A 看台连续选点|
|同一路径末尾改成 `eye` / `phone`|肉眼观赛 / 手机摄影|

链接应通过 `circuitPath`、`navigate` 等现有辅助函数生成，返回逻辑见 `ExperienceNavigation.tsx`。不要在页面中散落自行拼接的跳转和强制刷新。

一次赛道体验的主要调用链是：

```text
Hash 路由
  → loadCircuit(id)：按需读取赛道包及附加图层
  → createCircuitContext(data)：构建独立的几何、选点、状态与车辆模拟
  → CircuitExperience：Context Provider + Canvas + 界面
  → ObserverCamera / Vehicle / SpectatorAreas / CaptureBridge 等共享组件
```

上海与其他已开放模拟的赛道使用同一个 `CircuitExperience`。`scenes/` 中的定制场馆数据由共享场景组件处理，不是另一个上海专用模拟引擎。仅可浏览地图的站点仍有 `CircuitMapPage` 后备入口，不能把所有历史档案直接送入模拟器。

## 4. 运行上下文与状态归属

`createCircuitContext(data)` 是模拟功能的主要边界，创建并持有：

- `geometry`：米制赛道曲线、地面采样及路径计算。
- `spectators`：可用区域的座席 / 地面几何、连续选点和默认朝向。
- `store`：该赛道自己的 Zustand 状态。
- `simulation`：该赛道的 `VehicleSimulation` 实例。
- `observer`、`observerFloor`、`lookTarget`、`selectAt`：UI、相机和选点共用的坐标接口。
- 相机、控制器、赛车对象和快门桥接引用，以及鸟瞰视角记忆。

组件通过 `useCircuit()` 和 `useCircuitStore()` 访问当前实例。新增运行时功能应放在实例或组件生命周期内，避免恢复“全局当前赛道”、共享可变车辆实例等单例设计。

`CircuitContextCache` 默认保留最近两个完整运行上下文；淘汰时保存轻量状态快照，回来后恢复。GPU 资源属于挂载的 Canvas / 组件，缓存 CPU 上下文不代表缓存所有 GPU 场景。新增几何、材质、纹理或渲染目标时，要确认卸载时的释放责任。

选点、肉眼和摄影模式应保持同一赛道体验，避免切模式就重建大场景。世界地图重新进入赛道与赛道内部返回的视角策略不同，相关入口记忆见 `circuitVisit.ts`、`ObserverCamera.tsx`；修改时同时检查两种路径。

## 5. 数据包与加载顺序

以 `src/circuits/types.ts` 为类型定义的唯一依据，不要根据本文手写另一套接口。

|数据位置|用途|
|---|---|
|`generated/<id>.json`|运行时赛道包：线路、弯道、高程、观赛区域、来源等|
|`generated/summaries.json`|注册表摘要及功能开放状态|
|`generated/outlines.json`|卡片等位置使用的轻量轮廓数据|
|`scenes/<id>.json`|可选的定制场景及同名观赛区域覆盖数据|
|`facilities/<id>.json`|建筑、P 房与维修路线|
|`water/<id>.json`|水体范围与水面参数|
|`timing/<id>.json`|发车 / 计时位置及计时段定义|
|`barriers/<id>*.json`|同一赛道可组合加载的围网 / 屏障图层|
|`asia/`、`europe/`、`americas/` 等|来源核查、作者配置、补充模型与迁移前记录|
|`season-review/`|年度覆盖、资料缺口、库存、待办与空间审计结果|

`loadCircuit` 用 `import.meta.glob` 按需加载。先取主体包，再合并可选场景、计时、水体、屏障和设施。**同名 `scenes` 观赛区域会覆盖主体区域**，因此排查“改了 JSON 为什么没生效”时，先检查是否存在覆盖层。

水体、计时、设施等资源有各自的失败降级行为；屏障身份、重复 ID 和必需围网等错误会被校验拦截。不要把所有异常统一吞掉，否则可能开放缺失关键遮挡物的错误视点。

图鉴通过 `AtlasVenue.modelId` 关联三维赛道 ID；无模型的地点只展示档案。历史布局长度、弯数和年度比赛记录不能直接拿当前三维布局替代。

## 6. 坐标、选点与物理约定

- 地理数据通常为 `[经度, 纬度]`。世界坐标 `Y` 向上，`X` 向东，`Z` 向南；距离和高度使用米。
- `createCircuitGeometry` 负责地理投影、长度校准与路面高程。附属设施必须使用同一套转换和校准，不能混用原始经纬度、未校准米制坐标与最终世界坐标。
- 区域由 `zoneId` 标识，一个区域可以有多个 `surfaceId`。区域数量不等于票种数量，也不等于座席块数量。
- `u/v` 是连续选点参数；普通多表面区域的 `u` 与分层区域局部 `u` 不是同一语义。交互转换使用 `runtime.selectAt`，观察位置使用 `runtime.observer`，不要在 UI 里另算。
- 看台保持坐姿眼高 **1.2m**，草地 / 站立区域保持 **1.65m**。地板高程与人的视高分开；被坡地、座席或围网挡住并不自动意味着计算错误。
- `terrainSpectatorZones` 在创建上下文时统一解析地面和楼层基准。`groundReference` 指定地面参考，`baseReference` 关联父座席顶层；避免重复叠加海拔。
- `terrainFollow` 用于未设座的地面区域，不能用来绕过看台座席建模。`rowStrip` 表达成对前后缘，`rowDirection` / `rowBearing` 表达行方向；短而深的座席不能盲目依赖 PCA 自动判断。

车辆主实现见 `VehicleDynamics.ts`，模型外形见 `VehicleGeometry.ts` / `Vehicle.tsx`。速度、位移、测量、投影和照片必须使用同一真实时间与空间；不要通过放大赛车、移动围网或降低速度改善视觉效果。

## 7. 摄影链路

`PhoneControls.tsx` 的 `CaptureBridge` 将界面与快门连接；`PhoneCamera.ts` 管理焦距 / 视角；`Exposure.ts` 定义快门瞬间和时域样本；`TemporalCapture.ts` 负责多次渲染、线性颜色累积与 PNG 输出。实时预览见 `ExposurePreview.tsx`。

拍照时记录不可变的 `ExposureMoment`，所有样本都从这个瞬间推导，不能让采样循环推进现场车辆状态。固定镜头保持朝向，理想跟拍按车辆视线变化旋转。暂停或停止时样本速度为零。

`withVehicleSample` 会借用实际赛车对象，随后在 `finally` 恢复位置、四元数和世界矩阵；渲染器的视口、裁剪和目标也需要恢复。修改这里必须回归“暂停后拍照赛车不旋转 / 不位移”和异常恢复，不能用 CSS 模糊代替曝光采样。

## 8. 修改赛道数据的工作流

1. 阅读该站来源记录、作者配置和实际加载包，确认年度身份、道路侧与模型分组。来源不足时明确记录估计，不直接导入下一年度票权。
2. 修改对应作者配置，并维护 `apply-*.py` 迁移；已有迁移通常保存 `beforeZones`，防止覆盖独立改动。只编辑 `generated` 会在后续重放时丢失。
3. 同时检查区域 ID、附加图层、深链别名以及摘要。新增赛道还需准备主体包、注册摘要、轮廓和图鉴关联；加载器通常无需新增赛道分支。
4. 先运行该站迁移 / 几何测试，再更新相关清单；不要为一次小改动盲目重跑所有数据生成器。
5. 构建后实际检查鸟瞰、连续选点、肉眼、相机及照片。记录来源、估计范围和限制。

常用审计命令（`python` 指向本机已配置的 Python 环境）：

```powershell
python scripts/sync-circuit-summaries.py --write
python scripts/audit-season-inventory.py
python scripts/audit-season-backlog.py

# 需要重新做全站空间筛查时，必须先导出当前场景，再分析
node node_modules/vite-node/vite-node.mjs scripts/export-season-spatial-review.ts
python scripts/audit-season-spatial-readonly.py
```

空间报告写入 `artifacts/goal-review/season-spatial/`。导出、报告和提交的审计记录应对应同一版本的包；不能仅改摘要哈希冒充重新测量。平面无交叠也不能证明围网正确、票区完整或每个座位无遮挡。

批量构建脚本会依次应用历史补丁，旧迁移也可能碰到后来的合法改动。新增补丁时检查前后迁移兼容、幂等性和独立编辑保护；不要关闭保护强行覆盖。

## 9. 验证与部署

```powershell
# 常规检查
npm run build
npm test -- --maxWorkers=2

# 示例：只验证本次修改涉及的模块
npx vitest run tests/circuit-context.test.ts tests/exposure.test.ts

# 浏览器测试使用4173生产预览，可复用已启动服务
npx playwright test e2e/spa-annual-supplement.spec.ts --project=desktop --project=mobile --workers=2
```

Playwright 配置默认使用 Edge；移动项目使用 Chromium 设备模拟，不等于真机 Safari 验证。浏览器测试使用 `dist/`，运行前确认已重新构建；照片导出成功不等于画面或物理正确，还要检查照片内容。

性能排查优先看重复创建上下文 / 几何、每帧触发 React 更新、标签重排、曝光采样数与 GPU 资源释放。复用现有按需加载、`SceneWarmup`、`ShaderWarmup` 和缓存机制，不要靠改变物理规则提速。

静态部署使用 `dist/`；`vite.config.ts` 的 `base: './'` 配合 Hash 路由支持 GitHub Pages 子路径。`prebuild` 自动生成第三方许可说明，发布时保留字体、地理数据和依赖许可。

现有 `.github/workflows/pages.yml` 在推送 `main` 或手动触发时部署。**截至本文核对日期，用户要求暂停云端同步；完成本地修改不代表可以推送或触发部署。** 后续发布须依据用户新的明确要求，只上传必要源码、配置、合法资源及文档。

## 10. 当前基线与接手资料

2026-11-07 本地验收基线：23站、470个可用近似区域；228个测试文件、704项测试通过；本批30条桌面 / 手机摄影流程通过。数字是该版本的记录，新增修改后需重新验证，不是长期固定常量。

- [SEASON_COVERAGE_AUDIT.md](SEASON_COVERAGE_AUDIT.md)：年度覆盖与本轮验收范围。
- [DATA_SOURCES.md](DATA_SOURCES.md)：资料来源和使用说明。
- [LIMITATIONS.md](LIMITATIONS.md)：精度、票权、设施与视野限制。
- [PROGRESS.md](PROGRESS.md)：开发历史和最新验收记录。
- [DEVELOPMENT_PLAN.md](DEVELOPMENT_PLAN.md)：脚本生成的待办视图。

[README_HISTORY.md](README_HISTORY.md) 和部分历史记录包含不同时期的进度数字、旧待办。冲突时以当前运行包、最新验收清单和实际测试为准，不要把历史段落重新计作当前缺建任务。


## 11. 框架整理与保留边界（2026-11-07）

主 README 仅保留运行方式、框架导航、资料入口及发布说明；整理前原文（含当时未提交的新增说明）完整归档到根目录 `README_HISTORY.md`，相对文档和资源路径继续以项目根目录解析。

已检查 `src`、`tests`、`e2e`、`scripts` 的 TypeScript / JavaScript 导入关系及注册表的动态加载方式。删除未被引用的 `src/circuits/shanghai/summary.ts`：它只重复读取 `generated/summaries.json` 中的上海摘要，当前注册表直接读取统一摘要。

上海兼容几何和车辆模块仍有测试或工具引用，保留。数据生成器、历史迁移及 Python 回归脚本参与重建与编辑保护，不按文件年代清理。`research/`、`artifacts/` 和现有交付 ZIP 保留研究、验收或交付用途；忽略规则不代表它们可以删除。依赖、构建目录及本地工具缓存也未纳入本轮删除范围。
