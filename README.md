# Public docs

公开资料与 HTML 文档。

网站：https://docs.myakuraku.com

仓库：https://github.com/aaronjin2023/public-docs

## 已公开资料

- [OpenEC 功能介绍](https://docs.myakuraku.com/projects/openec/)：含 3D 滚动场景和定价交互的完整 HTML 导览。
- [OpenEC 界面原型](https://docs.myakuraku.com/projects/openec-prototype/)：工作区、商品页和定价规则编辑页，使用演示数据，不连接真实店铺。
- [观潮 · 跨领域热点观察](https://docs.myakuraku.com/projects/guanchao/)：公开事件、来源短摘录和研究关系的静态阅读版。本次快照为 2026-10-25 21:37 JST，包含 236 条已归类事件、170 个研究节点和 85 条分析关系。

本站只提供在线阅读入口，不提供文档、数据或资料包的下载/导出按钮；后续新增资料也遵循此规则。

介绍页按提供的原始文件完整发布；Google Fonts 和 Three.js 使用其原有外部 CDN，显示这些资源需要网络连接。首页预览图取自该介绍页的实际 3D 场景。

原型包的四个 HTML 文件同样按原始字节发布，页面间的相对链接保留；原型使用原有 Google Fonts、React、ReactDOM 和 htm CDN，运行时需要网络连接。原型预览图来自其实际工作区页面。

观潮按项目提供的无下载入口静态包原样发布，所需字体与数据快照随页面提供。采集和分析继续在本机运行，公开页读取已发布快照；收藏只保存在当前浏览器，人工反馈及审核仍留在本机。本次没有设置自动发布任务，后续快照经确认后再更新。预览图来自本次静态页面。

## 上传资料

直接在 GitHub 网页选择 **Add file → Upload files**，或通过 Git 推送到 `main`。GitHub Pages 从 `main` 分支根目录发布，提交后会自动更新网站，无需安装构建工具。

建议按用途放置文件：

```text
index.html                   网站首页及资料索引
reports/example/index.html   报告
guides/example/index.html    说明与教程
projects/example/index.html  项目公开资料
assets/                      图片、样式等共享资源
```

例如 `reports/example/index.html` 对应 `https://docs.myakuraku.com/reports/example/`。新增资料后，在首页添加相应链接；只上传文件不会自动生成目录。HTML 引用的图片、CSS、JavaScript 需要一起上传，推荐使用相对路径。

`.nojekyll` 让文件直接作为静态内容发布。保留根目录的 `CNAME`，其内容为 `docs.myakuraku.com`；同时保留仓库 Settings → Pages 中的自定义域名设置。

## 公开范围

仓库及网站均公开，包括提交历史。仅上传允许公开分享的内容；没有明确许可的第三方资料不会因为放在此仓库中而自动获得开放许可。当前未对所有资料统一指定许可证，各资料以自身声明为准。
