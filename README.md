# 成长·升学一体化工作台 — M0 基座原型

> 这是开发实施方案（Roadmap M0 基座）的可运行原型：能跑的壳 + 大厂级设计系统 + 导航 + 成长驾驶舱首页 + 本地存储 + 响应式。
> 定位：自用私人 AI 成长教练团（教育/升学/心理/职业/亲子/身心/营养 七专家）。

## 隐私 & 数据原则
- **本地优先**：所有记录默认保存在浏览器 localStorage，刷新/换浏览器可导出导入。
- **云同步可选**：开启后通过飞书 Base + 阿里云 FC 代理同步，**敏感密钥（飞书 app_secret / API Key）只放在云端 FC 服务端**，前端 / GitHub 仓库都不碰。
- **公开仓库零隐私**：本仓库不含孩子姓名、学校、成绩、账号；`.gitignore` 已挡掉 `node_modules/` `dist/` `_tmp/` `.workbuddy/` `.env` 等。

## 技术栈（与开发方案一致）
- React 18 + TypeScript + Vite
- Ant Design 5（自定义 Design Token：沉静蓝绿主色 #0EA5A4、圆角 10、暗色模式）
- ECharts（驾驶舱成长曲线 / 各模块图表）
- Zustand + persist（本地存储，刷新保留主题/折叠/孩子档案/预警）
- 响应式：PC 左栏导航；手机底部 Tab Bar

## 已包含（M0）
- 左侧可折叠分组导航（18 模块域 A–S + 设置）
- 顶部全局栏：孩子头像/学校、搜索、多维预警铃铛（可点击详情 + 已读角标 -1）、同步状态、AI 教练按钮、浅/暗主题切换、设置（云同步/读伴/备份）
- 成长驾驶舱首页：今日状态卡、预警摘要、临近节点倒计时、成长曲线 mini、全部模块快捷入口
- 18 个真模块 A 成绩 / B 身心 / C 兴趣与阅读（含加德纳 8 大智能 + 4 大天赋信号）/ D 亲子 / E 择校决策 / F 中高考升学助手 / G 成长档案 / H 时间管理与习惯 / I 目标管理 / J 生涯启蒙 / K 五育综评 / L 多维预警中心 / M 家庭资源 / N 隐私合规 / O 营养膳食 / P 学习能力 / R 职业体验 / T 家校沟通
- AI 教练抽屉：七专家人格选择 UI
- 本地存储持久化 + 手机端底部 Tab + 移动端表格横滑 + 学科按重要性平铺 + 大厂图表审美

## 本地运行
```bash
npm install
npm run dev      # 开发预览 http://localhost:5173
npm run build    # 产出 dist/ 静态文件，可托管/部署
```

## 部署（GitHub Pages）
- 已配 `.github/workflows/deploy.yml`：`push` 到 `master` 自动 `npm ci && npm run build && 发布到 GitHub Pages`。
- 在 GitHub 仓库 Settings → Pages → Source = `GitHub Actions` 即可启用。
- HashRouter 已配置，子路径部署无白屏。

## 与整体方案的关系
- 本文档/工程 = 开发方案 Roadmap 的 **M0 基座**。
- 18 模块功能在 M1–M4 按 Epic（E1–E12）逐步落地；数据模型见开发方案「数据模型」一节。
- 择校决策追踪卡（Q 模块，已并入 E 择校卡子功能）、饮食正向化 UI 原则（O 模块）为后续可优先落地的轻量项。

## 目录
```
src/
  main.tsx            入口
  App.tsx             ConfigProvider + 布局挂载
  theme.ts            AntD 设计 Token
  store/              Zustand 本地存储（每个模块一个 store + feishuSync 同步层）
  data/modules.ts     18 模块定义 A–S + 分组
  data/sample.ts      示例数据（今日状态/节点/生长曲线）
  layout/             布局（Sidebar/HeaderBar/MobileTabBar/AppLayout）
  pages/              18 模块 Manager + Dashboard + SettingManager
  components/         ModuleCard / GrowthMiniChart / AiCoachDrawer / ...
  utils/chartStyle.ts 共享图表样式（大厂审美）
  hooks/useWindowWidth.ts 窗口宽度 hook（移动端响应式）
  mobile.css          全局移动端 CSS
.workbuddy/           （已 .gitignore 挡掉，含孩子记忆 / 配置）
.github/workflows/    自动部署到 GitHub Pages
```
