# 赛道图鉴 · 世界赛道与观赛视野

可静态部署的赛车观赛与摄影模拟网站：世界地图与历史赛历 → 赛道档案 → 三维地图与连续选点 → 肉眼观赛 / 手机摄影 → PNG 导出。

后续开发先读 [开发框架与接手指南](README_DEVELOPMENT.md)。原 README 的历史进度与阶段说明已完整保存在 [README_HISTORY.md](README_HISTORY.md)，其中的旧统计和待办不作为当前状态。

## 本地开发

推荐 Node.js 24，依赖版本以 `package-lock.json` 为准。在项目根目录运行：

```powershell
npm ci
npm run dev

# 类型检查与生产构建
npm run build
npm run preview -- --port 4173

# 单元回归；浏览器测试使用生产构建
npm test -- --maxWorkers=2
npm run test:e2e
```

开发与预览仅绑定本机；预览地址为 `http://127.0.0.1:4173/`。日常前端开发不需要 Python、联网取数或重跑数据生成器。浏览器配置及项目见 `playwright.config.ts`。

## 项目框架

技术栈：React 19、TypeScript、Vite 7、Three.js、React Three Fiber、Drei、Zustand；Vitest + Playwright 验证。

```text
src/main.tsx                         应用挂载、Hash 路由、页面懒加载
├─ pages/                            首页、历史档案、后备地图页
├─ app/                              共享赛道体验、独立上下文与缓存、导航
│  └─ CircuitExperience.tsx           同一 Canvas 内切换选点 / 观赛 / 摄影
├─ circuits/registry/                 按需加载主体包与场景、设施等附加图层
│  ├─ generated/                     赛道主体、摘要与轮廓
│  └─ scenes/、facilities/ 等         定制场景、设施、水体、计时、屏障
├─ systems/                          车辆、观察相机、座席选点、手机与测量
├─ camera/                           曝光采样、实时预览、照片渲染与 PNG 导出
├─ atlas/                            历史地点、赛历、布局与来源
├─ components/、i18n/                 通用界面与场景组件、双语文案
└─ store.ts、style.css、design-system/ 实例状态与样式

scripts/                             离线生成、数据迁移、审计、交付工具
public/                              字体及静态许可资源
tests/、e2e/                         单元 / 几何回归与浏览器流程
research/、artifacts/                 研究原件与验收证据，不整目录发布
```

运行链路：Hash 路由 → `loadCircuit(id)` → `createCircuitContext(data)` → `CircuitExperience` → 共享车辆、选点、相机与曝光组件。各站独立保存状态；历史档案通过 `modelId` 关联三维赛道，无模型的档案不进入模拟器。

修改入口、数据覆盖顺序、坐标与物理约定、迁移保护、摄影管线及验证方法详见 [开发指南](README_DEVELOPMENT.md)。

## 当前数据与资料入口

2026-11-07 已记录的本地验收基线为 **23 站、470 个可用近似区域**。这表示近似模型数量，不代表逐座测绘、所有票种覆盖或准入已全部核实。历史测试数量仅对应当时版本。

| 文档 | 用途 |
| --- | --- |
| [README_DEVELOPMENT.md](README_DEVELOPMENT.md) | 代码框架、运行链路、修改入口和验证 |
| [SEASON_COVERAGE_AUDIT.md](SEASON_COVERAGE_AUDIT.md) | 年度覆盖与验收范围 |
| [DATA_SOURCES.md](DATA_SOURCES.md) | 数据来源与许可说明 |
| [LIMITATIONS.md](LIMITATIONS.md) | 几何、票权、设施与视野限制 |
| [PROGRESS.md](PROGRESS.md) | 开发与验收记录 |
| [DEVELOPMENT_PLAN.md](DEVELOPMENT_PLAN.md) | 脚本生成的待办视图 |
| [README_HISTORY.md](README_HISTORY.md) | 整理前 README 的完整历史快照 |
| [CLOUD_SYNC_PAUSED.md](CLOUD_SYNC_PAUSED.md) | 云端同步约束 |

## 构建、部署与许可

`npm run build` 输出 `dist/`，构建前自动生成第三方许可。静态托管需上传完整 `dist/`，保留 `assets/`、字体及许可；相对资源路径与 Hash 路由支持 GitHub Pages 子路径。Vercel / Netlify 配置位于根目录。

当前云端同步暂停，本地修改不触发推送或部署。离线资料与原始参考图片不进入网站。GIS、OpenStreetMap、字体及依赖许可见 [DATA_SOURCES.md](DATA_SOURCES.md) 与构建产物的 `licenses/`。

`python scripts/package-delivery.py` 用于重新生成交付 ZIP；根目录现有 ZIP 是历史快照，不能代替当前源码构建。
