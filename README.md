<p align="center">
  <img src="icon.ico" width="100" alt="Gitnote">
</p>

<h1 align="center">栈知 Gitnote</h1>

<p align="center">本地优先的 Markdown 笔记，用 Git 管理你的知识。</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-1.0.2-blue" alt="version">
  <img src="https://img.shields.io/badge/electron-35.7-purple" alt="electron">
  <img src="https://img.shields.io/badge/react-18.3-cyan" alt="react">
  <img src="https://img.shields.io/badge/license-MIT-green" alt="license">
</p>

---

## 为什么做这个

市面上的笔记工具，要么把你的数据锁在私有格式里，要么强制云端同步。Gitnote 的思路很简单：

- 数据就是 Markdown 文件，存在你本地磁盘上
- 同步走你自己的 GitHub 仓库，不经过任何第三方服务器
- 你可以用任何 Markdown 编辑器打开这些文件，它们就是普通的 `.md`

## 功能一览

### 编辑体验

- **块编辑器** — 每段内容是一个独立块，支持拖拽排序
- **斜杠命令** — 输入 `/` 快速插入标题、代码块、待办清单、图片等
- **Markdown 原生** — 实时渲染，也支持切换到纯源码模式
- **Emoji + 标签** — 给笔记设置图标和标签，方便管理

### 数据管理

- **本地存储** — 每篇笔记独立文件夹，包含 `.md` 内容和 `config.json` 元数据
- **导出** — 支持 Markdown 导出，图片可选 Base64 嵌入或分离存储
- **完全可控** — 不依赖任何云服务，你的数据只在你手里

### GitHub 同步

- **双向同步** — 批量同步或单篇同步，按时间戳自动处理冲突
- **图片处理** — 同步时自动处理图片存储方式（Base64 / 文件分离）
- **重命名清理** — 改名后自动清理远端旧文件

### 界面设计

- **三栏布局** — 频道列表、笔记列表、编辑器，简洁高效
- **明暗主题** — 支持浅色、深色、跟随系统
- **中英双语** — 界面支持中文和英文

## 快速开始

```bash
# 安装依赖
npm install

# 浏览器预览（无需 Electron）
npx vite

# Electron 开发模式
npm run dev

# 构建
npm run build

# 打包安装包
npm run dist
```

## GitHub 同步配置

1. 打开设置（左上角齿轮图标）
2. 填入 GitHub Personal Access Token
   - 经典 Token：需要勾选 `repo` 权限
   - 细粒度 Token：需要开启 `Contents` 读写权限
3. 填写仓库所有者、仓库名、分支名
4. 点击「测试连接」确认配置正确
5. 点击同步按钮即可

## 项目结构

```
Gitnote/
├── electron/               # Electron 主进程
│   ├── main.ts             # 窗口管理、文件读写、GitHub API
│   ├── preload.ts          # IPC 桥接层
│   └── types.ts            # 类型定义
├── src/
│   ├── components/
│   │   ├── editor/         # 块编辑器
│   │   ├── layout/         # 三栏布局、设置、导出
│   │   └── ui/             # 标题栏、Emoji 选择器
│   ├── stores/             # Zustand 状态管理
│   ├── lib/                # 工具函数、国际化、主题
│   └── types/              # 前端类型定义
├── index.html
├── vite.config.ts
└── tailwind.config.js
```

## 技术栈

| 层面 | 技术 |
|------|------|
| 桌面壳 | Electron 35 |
| 前端框架 | React 18 + TypeScript |
| 构建工具 | Vite 6 |
| 样式 | Tailwind CSS 3 |
| 状态管理 | Zustand 5 |
| 图标 | Lucide React |

## License

MIT
