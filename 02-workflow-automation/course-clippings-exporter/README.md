# Course Clippings Exporter · v1.85

A Chrome extension that saves purchased course articles as readable Markdown through the browser's File System Access API.

## The problem

Dozens of paid courses were trapped behind a one-article-at-a-time interface. Manual clipping required repeated navigation, confirmation and cleanup, while long courses introduced missed pages, duplicates and broken resume points.

## Before → After

| Before | After |
|---|---|
| Save each article manually | Sync a course from the current article forward |
| Accept inconsistent filenames and formatting | Preserve titles, headings, emphasis, images and useful comments |
| Restart after interruption | Resume, skip correct files, rename mismatches and repair incomplete output |
| Close the page to stop a bad loop | Use an explicit stop control that clears pending state |

## Controls

```text
Sync Markdown v1.85     — export, check, resume, rename and repair
Export current article  — one-page test and debugging
Stop batch export       — clear the queue and prevent automatic resume
```

## Install

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Choose **Load unpacked**.
4. Select this project's `extension` folder.
5. Open the course site while signed in and choose an output folder when prompted.

## What broke

- Early URL extraction failed because the course sidebar was a virtualized SPA rather than a stable link list.
- Broad title heuristics silently truncated article openings when a sentence inside the body was mistaken for the title.
- Small courses passed while 400+ article courses exposed navigation and resume failures.
- Fixing headings or images sometimes caused regressions in comments or formatting, making real-content QA essential.

## Boundary

- v1.85 is a working production tool, not a packaged consumer product.
- Very long virtualized course lists can still require manual recovery.
- DOM changes on the source site may require parser updates.
- No paid article content, account data or local notes are included in this repository.

[Read the concise engineering case](./ENGINEERING_CASE_STUDY.md)
