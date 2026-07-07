# 讯飞听见 转写导出器 v0.1

在讯飞听见转写详情页(`aboutPage`)加一个"导出转写(.md)"按钮，点击后直接调用页面自带的
`transcriptResults` 接口拿完整转写文字（说话人 + 原文），存成 Markdown 文件下载。

## 安装（Chrome 加载已解压的扩展程序）

1. 打开 `chrome://extensions`
2. 右上角打开"开发者模式"
3. 点击"加载已解压的扩展程序"，选择本项目里的 `extension` 文件夹
4. 打开任意一条讯飞听见转写详情页（URL 形如 `iflyrec.com/aboutPage/?orderId=...&fileSource=...&originAudioId=...`）
5. 右上角会出现蓝色"导出转写(.md)"按钮，点击即下载

## 遇到问题

按钮点击后如果弹出错误提示，打开 Chrome 开发者工具（Cmd+Option+I）→ Console 标签，截图发给 Claude 诊断。

## 现状（v0.1）

- 只支持单条转写页面导出，还没做首页批量导出
- 是否需要批量版本（在"我的文件"列表页批量勾选导出多条），视这一版实测效果决定
