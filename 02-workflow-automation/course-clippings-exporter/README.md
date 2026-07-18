# 得到 Clippings 导出器

这是独立于 WorkBuddy 的新扩展，用来把得到文章直接保存成 Obsidian Clippings 风格 Markdown。

加载目录：

```text
02-workflow-automation/course-clippings-exporter/extension
```

刷新得到页面后，右上角会出现三个按钮：

```text
同步MD到Clippings vX.XX   ← 主按钮：导出、检查、补漏、改名、修复内容全合一
只导出当前文章             ← 调试用，单篇测试格式，已存在同名文件时另存为「-codex-test」
停止批量导出               ← 清队列、停止自动续跑（刷新页面也不会继续跑）
```

第一次导出时，Chrome 会要求选择文件夹。请选择：

```text
/Users/melodie2026/Documents/MelodieOS/Clippings
```

（也可以选别的目标文件夹，比如 Mini MBA 课程目录——每次都会弹出选择框，不锁死在 Clippings。）

建议先点「只导出当前文章」测试格式，确认标题、正文、图标都正常，再点「同步MD到Clippings」跑整门课。「同步」按钮是幂等的：已存在且正确的文件会跳过，缺失的会补，标题错的会改名，内容明显残缺的会重写——所以中途断了、或者想检查已跑完的课程有没有漏，直接在断点那篇文章上再点一次同步即可，不用从头开始。

工程细节和已知问题见 `ENGINEERING_CASE_STUDY.md`。
