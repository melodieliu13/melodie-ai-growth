# Meeting Transcript Exporter · v0.6.1

A Chrome extension for exporting transcripts from an authenticated iFlyRec account into structured Markdown.

## The problem

The archive contained **678 recordings**, but the web interface did not provide a useful full-history bulk export. Opening and saving each record manually made the material effectively unusable for later review.

## Before → After

| Before | After |
|---|---|
| Open one recording at a time | Load the authenticated recording list with cursor pagination |
| Copy transcript text manually | Export speaker labels and transcript text to Markdown |
| Repeat across the archive | Select records in a batch-export panel and save them consistently |

## What runs

- **Single export:** adds an export button on a transcript-detail page.
- **Batch export:** loads the user's recording history through the authenticated private POST endpoint, including request body and pagination cursor.
- **Output:** speaker-labelled Markdown files.

## Install

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Choose **Load unpacked**.
4. Select this project's `extension` folder.
5. Open iFlyRec while signed in.

## What broke

- The first version supported only a single detail page and did not address the archive-scale problem.
- Full-history loading required reconstructing the real POST request, request body and cursor pagination rather than scraping only the visible list.
- Speaker identity must be corrected in the source interface before export when the original labels are ambiguous.

## Boundary

- The extension does not bypass authentication or access records outside the signed-in user's account.
- No recording, transcript, token or account data is included in this repository.
- The **678-recording** figure describes the production archive tested by the operator; it is not bundled demo data.
