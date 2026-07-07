Update the project BACKLOG.md by extracting improvement items from a DOCX file.

**DOCX path:** `$ARGUMENTS`

## Steps

1. **Extract text from the DOCX** using macOS `textutil`:
   ```
   textutil -convert txt -stdout "$ARGUMENTS"
   ```
   Capture the output as the source text. If the command fails, tell the user and stop.

2. **Read the current BACKLOG.md** at `beat-sequencer/BACKLOG.md` (relative to the project root at `/Users/ed/apps/Sequencer/beat-sequencer/BACKLOG.md`).

3. **Parse the DOCX text** into discrete improvement items:
   - Look for numbered lists, bullet points, section headings, or any clearly enumerated items
   - Group items by section if the DOCX has sections (e.g. "UI", "Audio", "Export", etc.)
   - Each item should be a single actionable improvement or feature request

4. **For each extracted item**, decide where it belongs:
   - If it clearly matches something already in `## ✅ Done` — skip it (already done)
   - If it matches something in `## 🔄 In Progress` — skip or note it's already tracked
   - Otherwise — add it to `## 📋 Backlog`

5. **Format new backlog entries** as:
   ```markdown
   - **[Item title]** — [brief description if available]
     *(Source: <filename>, <date>)*
   ```
   Group under a sub-heading if the DOCX had sections, e.g.:
   ```markdown
   ### UI Improvements *(from MyDoc.docx, 2026-03-03)*
   - ...
   ```

6. **Write the updated BACKLOG.md** with the new items appended to `## 📋 Backlog`.

7. **Summarise in chat**: list what was added (item count, sections), what was skipped (already done/in-progress), and any items that were ambiguous.
