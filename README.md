# Realboard - HydroOJ 实时滚榜插件

> **项目来源说明**: 本项目是基于 [Hydro 官方 onsite-toolkit](https://github.com/hydro-dev/Hydro/tree/master/packages/onsite-toolkit) 的 fork 版本，遵循 [GNU Affero General Public License v3.0 (AGPL-3.0)](LICENSE) 开源协议。

这是一个为 [HydroOJ](https://hydro.js.org/) 系统设计的插件，旨在提供一个功能丰富、动画流畅的实时比赛排名展示板（滚榜）。它通过 WebSocket 接收实时的提交数据，并以动态、可视化的方式将其呈现给观众。

## 效果展示

0.  进入

![进入](/test/0.png)

1.  封榜前+排名变化
   
![封榜前+排名变化](/test/1.gif)

2.  封榜后

![封榜后](/test/2.gif)

## ✨ 主要功能

- **双阶段提交流程**:
    - **A 阶段 (Pending)**: 新的提交会首先进入一个独立的"等待评测"区域，以橙黄色闪烁效果显示，此时不影响队伍的现有排名。
    - **B 阶段 (Final Verdict)**: 当评测结果返回后，对应的"等待评测"项会消失，同时最终结果会作为一个新的条目，从B区底部平滑滑入，并根据评测结果更新队伍的排名和得分。

- **分离的显示区域**:
    - **B 区 (主榜单)**: 位于上方，用于展示获得最终结果的提交。该区域可容纳最多9条记录，并带有微妙的奇偶行背景色区分，视觉上清晰明了。
    - **A 区 (等待区)**: 位于下方，同一时间只展示一个"等待评测"的提交，后续的提交会进入一个待处理队列，依次显示。

- **流畅的动画效果**:
    - 使用 `react-spring` 驱动所有动画，确保了流畅性和高性能。
    - 新的B阶段条目会从榜单底部滑入指定位置，而不会干扰或"推开"已经存在的条目。
    - A阶段到B阶段的切换自然、无缝。

- **完善的封榜逻辑 (Freeze)**:
    - 当比赛进入冻结时间后，所有新的提交虽然仍会显示，但其最终结果会被标记为 `FROZEN`。
    - 封榜后的提交**不会**影响队伍在公开榜单上的排名、得分和罚时，完美模拟真实比赛的封榜场景。

- **健壮的状态管理**:
    - 使用 React Hooks 和统一的状态管理逻辑，确保即使在短时间内收到大量并发提交时，系统也能独立、正确地处理每一个提交的状态和动画，避免了状态错乱或动画异常。
    - 能够正确处理重复提交已AC题目的情况（显示提交结果但不影响分数）。

- **技术栈**:
    - 前端框架: React
    - 语言: TypeScript
    - 动画库: `react-spring`
    - 实时通信: WebSocket

## 🚀 如何使用

1.  先执行 `hydrooj addon create` 命令（如果您还没有执行过）。
2.  将该插件放置于 HydroOJ 的 `/root/.hydro/addons/` 目录下。
3.  进入 `/root/.hydro/addons/realboard/` 目录下，执行 `yarn install` 命令。
4.  使用 `pm2 restart hydrooj` 重启。
5.  可以在 `acm` 赛制的 `scoreboard` 中看到，请确保您有看到隐藏榜单的权限 `PERM_VIEW_CONTEST_HIDDEN_SCOREBOARD`。

## ⚙️ 配置项

目前，大部分配置项都在前端代码中以常量的形式定义：

- `frontend/realboard.page.tsx`:
    - `MAX_QUEUE`: B 区榜单可以显示的最大条目数（当前为 9）。
    - `FADEOUT_TIME`: 条目在榜单上显示的最长时间（默认为 5000 毫秒）。

您可以根据需要直接修改这些常量来调整滚榜的行为。 

## 📄 版权和许可证

本项目基于 [Hydro 官方 onsite-toolkit](https://github.com/hydro-dev/Hydro/tree/master/packages/onsite-toolkit) 开发，遵循 [GNU Affero General Public License v3.0 (AGPL-3.0)](LICENSE) 开源协议。

### 原始项目
- **Hydro onsite-toolkit**: [https://github.com/hydro-dev/Hydro/tree/master/packages/onsite-toolkit](https://github.com/hydro-dev/Hydro/tree/master/packages/onsite-toolkit)
- **许可证**: GNU Affero General Public License v3.0

### 本项目的修改
本项目在原始 onsite-toolkit 的基础上进行了以下主要改进：
- 实现了双阶段提交流程（Pending 和 Final Verdict）
- 添加了分离的显示区域（A 区和 B 区）
- 优化了动画效果和用户体验
- 完善了封榜逻辑

根据 AGPL-3.0 协议的要求，如果您在网络服务器上运行本软件的修改版本，您必须向该服务器的用户提供修改版本的源代码。

## 🤝 贡献

欢迎提交 Issue 和 Pull Request 来改进这个项目。请确保您的贡献也遵循 AGPL-3.0 协议。 