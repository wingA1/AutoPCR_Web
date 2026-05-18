
# AutoPCR_Web

AutoPCR 的前端管理面板项目。

该项目负责提供账号管理、配置编辑、任务执行结果查看等 Web 界面，最终构建产物会部署到服务器后端的静态资源目录中，由后端统一对外提供访问。

## 项目定位

`AutoPCR_Web` 是一个独立的前端工程，主要职责包括：

- 提供 AutoPCR 的 Web 管理界面
- 对接后端 API 完成登录、账号管理、配置同步、任务结果展示
- 构建后的静态资源用于部署到服务器
- 不直接作为最终运行环境，最终以服务器部署效果为准

## 技术栈

当前前端基于以下技术构建：

- React
- TypeScript
- Vite
- TanStack Router
- Chakra UI
- Axios

## 目录说明

```text
AutoPCR_Web
├─ src/                  # 前端源码
├─ public/               # 本地预览资源（不纳入正式仓库）
├─ dist/                 # 构建产物
├─ package.json          # 前端依赖与脚本
├─ vite.config.ts        # Vite 配置
└─ tsconfig.json         # TypeScript 配置


## 本地开发

### 安装依赖

```bash
npm install
```

### 启动开发环境

```bash
npm run dev
```

### 生产构建

```bash
npm run build
```

构建成功后会生成 `dist/` 目录。

## 部署方式

该项目不直接在服务器上运行 Node 开发服务。

标准流程是：

1. 在本地完成前端修改
2. 执行 `npm run build`
3. 将构建产物打包
4. 上传到服务器
5. 通过后端项目内置脚本释放到静态资源目录

服务器上的目标目录通常为：

```text
/home/pcr/autopcr-main/autopcr/http_server/ClientApp
```

在服务器中可通过后端项目脚本处理静态资源，例如：

```bash
python3 _download_web.py ./static.zip
```

## 与后端的关系

前端项目只负责页面和交互逻辑，最终依赖后端提供：

- 登录接口
- 账号管理接口
- 配置读写接口
- 任务执行与结果查询接口

因此前端是否“真正可用”，需要同时满足：

- 前端构建成功
- 静态资源已正确部署到服务器
- 后端服务正常运行
- API 可正常响应

## 当前维护原则

后续维护时建议遵循以下原则：

- 本地只负责开发、构建和预览
- 最终效果以服务器部署结果为准
- 前端升级时优先确认静态资源是否真正落盘到服务器
- 遇到页面未更新时，先检查部署目录而不是先怀疑构建失败

## GitHub 仓库

项目地址：

- [wingA1/AutoPCR_Web](https://github.com/wingA1/AutoPCR_Web)

## 说明

当前仓库不包含 GitHub Actions 工作流配置，相关自动化文件已暂时排除。

如果后续需要恢复自动构建或自动发布，可在确认权限与安全策略后再补回对应 workflow。
```
