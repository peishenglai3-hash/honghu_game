# 《红色源代码：洪湖篇》

> 以洪湖革命历史为叙事背景的像素风 2D 叙事探索 RPG。玩家通过场景探索、人物对话、物品调查与关键选择，走过从当代实践队到 1927 年洪湖的章节故事。

## 项目现状

截至 2026-11-05，序章及第一至第四章已集成为连续可玩的游戏闭环，故事从序章进入历史场景，经过各章行动与回返，最终抵达第四章结算和人物画像。项目在浏览器游戏基础上，也集成了 PWA 离线入口与 Electron 桌面壳。

> **分支说明：** 当前包含完整章节、PWA 与 Electron 集成的代码基线位于 [feature/pwa-resource-loading](https://github.com/peishenglai3-hash/honghu_game/tree/feature/pwa-resource-loading)。GitHub 默认分支 [main](https://github.com/peishenglai3-hash/honghu_game/tree/main) 仍是较早的代码基线，尚未包含 PWA 与 Electron 集成。下方运行说明以集成分支为准。

| 篇章 | 主要内容 |
| --- | --- |
| 序章 | 当代实践队走访洪湖革命遗址，在纪念碑广场和实践驻地探索、整理材料并作出选择，随后进入历史叙事。 |
| 第一章 | 玩家在陈继南家中醒来，经历状纸闪回、院墙接头与告别。 |
| 第二章 | 在陈家祠堂及相关场景中经历抓壮丁闪回、部署、纪律与物资准备。 |
| 第三章 | 围绕杜家大院展开观察、行动路线选择、战斗、历史节点与战后清点。 |
| 第四章 | 从王爷庙戏台进入意识交错与现代回返，完成最终补写并进入人物画像结算。 |

## 游戏与技术基础

- **场景与剧情：** Phaser 负责地图、角色移动、碰撞、互动和场景流程；章节、对话、任务、物品、选择及状态配置由 TypeScript 与 JSON 数据共同驱动。
- **界面：** Vue 3 和 Pinia 提供任务、对话、选择、物品、暂停、回顾、转场与结算等 HUD。
- **选择与状态：** 剧情旗标在章节间传递；行动风险与人物画像分别记录和结算，玩家界面不展示内部数值和阈值。
- **存档与重玩：** 包含自动存档、手动槽位、固定回退点、章节入口快照及章节重玩流程。
- **表现与音频：** 包含逐帧角色动画、场景遮挡、章节视频、转场音效、背景音乐、战斗界面、结局画像与致谢字幕。
- **移动端：** 提供触屏操作和横屏提示，可在支持的移动浏览器中体验。
- **PWA：** 提供 Web App Manifest、Service Worker、离线入口和同源资源运行时缓存。离线可用内容取决于已经缓存的页面与资源；标准安装需通过 HTTPS 等安全上下文访问（本机 localhost 开发环境除外）。
- **Electron：** 提供桌面应用基础壳与 Windows x64 安装包配置。Electron 使用隔离的 preload 桥接，不向游戏页面开放 Node.js 集成。

## 技术栈

Phaser 3.90 · Vite 6 · Vue 3 · Pinia · TypeScript · Electron

## 获取代码与运行

以下命令使用包含完整集成成果的 feature/pwa-resource-loading 分支：

    git clone -b feature/pwa-resource-loading https://github.com/peishenglai3-hash/honghu_game.git
    cd honghu_game
    npm install
    npm run dev

本地 Vite 开发服务器默认地址为 http://127.0.0.1:5175/。生产构建和预览：

    npm run build
    npm run preview

Windows 桌面壳：

    npm run desktop:dev
    npm run desktop:package

PWA 预览与对应的自动化检查入口：

    npm run build
    npm run preview
    npm run e2e:pwa

## 操作方式

- **移动：** WASD 或方向键
- **互动：** E
- **推进对话或执行战斗动作：** Space
- **任务面板 / 战斗换武器：** Q
- **暂停：** Esc
- **移动端：** 使用画面内触控操作

## 开发与验证入口

仓库提供内容、系统、章节契约、资源清单、移动端、PWA 和 Electron 等检查脚本。需要时按本地改动选择运行：

    npm run test:content
    npm run test:systems
    npm run test:asset-manifest
    npm run test:ch03:contract
    npm run test:ch04:contract
    npm run e2e
    npm run e2e:mobile
    npm run e2e:pwa
    npm run e2e:electron

## 主要目录

- src/scenes/：序章与各章节 Phaser 场景
- src/components/：Vue HUD 与流程覆盖层
- src/stores/：游戏状态、流程控制及存档
- public/data/：章节场景与剧情数据
- public/assets/：地图、人物、音频、视频、物品和界面素材
- electron/：Electron 主进程与 preload
- scripts/：内容、系统、资源与端到端检查脚本

## 许可

仓库顶层 LICENSE 采用 MIT 许可。该许可说明不自动覆盖所有图片、音频、视频、字体、商标或第三方素材；再利用具体资源前，请核对其来源和适用授权。
