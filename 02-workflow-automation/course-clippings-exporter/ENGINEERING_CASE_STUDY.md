# Engineering Case · From One-Page Clipping to Course Sync

## Outcome

The v1.85 Chrome extension turns an authenticated course page into a local Markdown sync workflow. It can export the current article, continue through a course, skip correct files, rename mismatches, repair incomplete output and stop safely.

This is supporting build evidence. It is not presented as a growth outcome.

## 1. The real workflow

The original process was:

1. open one paid course article;
2. trigger a web clipper;
3. confirm the save;
4. handle navigation prompts;
5. repeat across courses containing tens or hundreds of articles.

The desired experience was intentionally simple: stay in the already authenticated browser, click one control and write readable Markdown to a folder the user chose.

## 2. Why the first approaches failed

### Browser automation outside the page

Puppeteer, AppleScript and shortcut simulation added profile locks, extension dependencies and operating-system permissions. They made the workflow harder for the operator to control.

### Extracting a complete URL list

The course sidebar was dynamically rendered, lazy-loaded and virtualized. Many entries were not stable links, so early versions that treated the page as a static list returned incomplete results.

### Treating extraction as plain text

A text dump lost the reading structure that mattered in Markdown: headings, emphasis, images, comments and speaker context. “A file was written” was not an adequate acceptance standard.

## 3. Product decisions

- Run as a Chrome content script inside the authenticated page.
- Use the File System Access API so the user chooses the destination.
- Identify saved articles by source URL, not filename alone.
- Treat the main control as **sync**, combining export, check, resume, rename and repair.
- Keep an explicit stop control that clears queued state.
- Walk the currently visible sidebar around the active article instead of assuming a complete manifest exists.
- Retain human QA on real course pages because DOM semantics are unstable.

## 4. Before → After

| Before | After |
|---|---|
| One article per manual save | Course-level sync from the current position |
| Static URL assumptions | Anchored navigation through a virtualized sidebar |
| Filename-only checks | Source URL, title and completeness checks |
| Restart from the beginning | Resume and repair existing output |
| No safe stop | Queue clearing and stop flag |
| “Text exists” acceptance | Readable Markdown structure verified in the destination |

## 5. The hardest production failure

Versions v1.82–v1.85 exposed a silent truncation bug. The parser tried to find the detected title inside the extracted body and removed everything before that match. When a sentence with a colon was misclassified as the title, valid opening paragraphs disappeared without an error.

The fixes moved from patches to a structural guard:

- prefer the active sidebar title when available;
- reject UI and navigation phrases as titles;
- require content after a title separator rather than accepting any colon;
- stop trimming when the candidate title appears implausibly deep in the article;
- preserve extra page chrome rather than risk deleting source content.

The lesson was operational: a plausible-looking file can be more dangerous than an explicit failure. Real output must be compared with the source.

## 6. What shipped

- Manifest V3 Chrome extension, version **1.85**.
- Current-article export.
- Course sync with persistent folder access.
- Source-based file identity.
- Resume, skip, rename and repair behavior.
- Stop control and legacy-state cleanup.
- Markdown handling for headings, emphasis, images and useful comments.

## 7. Human judgment versus AI implementation

| Melodie owned | AI supported |
|---|---|
| Defined the real end-to-end workflow and no-terminal constraint | Implemented and revised the extension code |
| Supplied real source/output comparisons | Diagnosed selectors, state and navigation failures |
| Rejected wrong titles, missing hierarchy and silent truncation | Shipped rapid fixes across iterations |
| Changed the product from export to sync | Implemented resume, repair and stop behavior |
| Decided what counted as readable and trustworthy | Did not own the acceptance decision |

## 8. Current boundary

- Very long virtualized courses can still require manual recovery.
- The parser depends on source-site DOM behavior and may require maintenance.
- There is no bundled paid content or automated fixture suite in the public repository.
- The extension is production evidence for one operator's workflow, not a supported commercial product.

## Verification

- [`extension/manifest.json`](./extension/manifest.json) — current version and permissions.
- [`extension/content.js`](./extension/content.js) — shipped implementation.
- [User-facing README](./README.md) — installation, controls and boundaries.
