# Workflow Automation

Supporting evidence of a reusable AI-assisted build pattern: when important work was trapped behind a manual web interface, I turned the workflow into structured files that could be reviewed and used by AI.

| Project | Scale | Evidence |
|---|---:|---|
| [Transcript exporter](./transcript-exporter) | 678 recordings | Private POST endpoint, request body and cursor pagination reverse-engineered; bulk export working |
| [Course clippings exporter](./course-clippings-exporter) | Whole-course batch export | DOM → Markdown, persistent folder access, v1.85 after real-content QA |

These projects demonstrate execution and architecture reuse. They are not presented as growth outcomes or packaged consumer products.
