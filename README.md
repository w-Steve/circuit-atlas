# 赛道图鉴 · Circuit Atlas

[打开网站](https://w-steve.github.io/circuit-atlas/) · [数据来源](DATA_SOURCES.md) · [精度与限制](LIMITATIONS.md)

独立非官方 F1 历史赛道地点图鉴与 Web 3D 观赛摄影体验。

- 世界地图：78 个历史举办地点，2026 赛历地点特别标记，支持平移和缩放。
- 逐年赛历：1950–2026；完整图鉴支持赛道、城市、国家与原名搜索。
- 现有 23 条赛道提供地图和近似看台观赛；手机取景、0.5–30×变焦、快门与理想跟拍、PNG 导出。
- 历史地点档案不代表历史三维布局已复原，详见精度说明。

## 本次更新（2026-10-24）

23站接入有来源的地形与计时分段，地图工具和赛道档案布局精简，中英文界面可切换。新加坡连通水面统一估计水位，修复桥面被遮盖；上海迁移至共享高程系统。发车/计时位置仍为示意图配准估算，其中5站采用明确标注的2025参考文件。看台和草地完整性及几何限制详见 LIMITATIONS.md，未声称所有区域均已精确还原。

本次快照基于本地完成版本 `3cb583f`；未包含后续研究材料。浏览器测试覆盖桌面、平板、手机参数，非实体设备认证。`npm run test:e2e` 需要 Playwright 与 Edge；三端快门与布局回归详见测试。

## 本地开发

Node.js 24 LTS（最低 22.12）及 npm：

```sh
npm ci
npm run dev
npm test
npm run build
npm run preview
```

React + TypeScript + Vite + Three.js / React Three Fiber + Zustand。
241 项单测覆盖赛道、区域、物理、投影、曝光与历史资料完整性。
纯前端，无用户系统、API Key 或运行时地图服务。

## 部署

推送到 `main` 后，GitHub Actions 自动安装依赖、运行测试、按 GitHub Pages 子目录构建并部署。
GitHub Settings → Pages 的发布源为 GitHub Actions。构建产物 `dist` 由 Actions 生成，不提交依赖目录或构建目录。
路径使用 hash 路由，支持赛道/历史档案深链及刷新，无需服务器重写规则。

如需手动构建同一地址：

```sh
npm run build -- --base=/circuit-atlas/
```

## 数据与许可

历史数据来自 F1DB contributors，固定版本 v2026.17.0，CC BY 4.0；含 1950–1960 年计入锦标赛的 Indianapolis 500。
已举行记录截至 2026-10-11，2026 计划赛历核查于 2026-10-24。
世界底图为 Natural Earth 公共领域资料；赛道/区域公开 GIS 资料、字体与组件许可均保留在 `src/data/`、`public/licenses/` 和对应数据包。

`artifacts/atlas-source/` 仅保留构建许可与历史数据重建/校验所需的四份 JSON 及许可证。`python scripts/build-atlas.py` 可离线重建图鉴；普通构建无需 Python。

本仓库只包含运行、构建、验证和数据来源所需的文件；本地交付压缩包、截图、研究素材及开发缓存未上传。
项目与 Formula 1 公司无关联或认可；场馆与座席为近似模型，不保证购票座位视野。
