# Project Rules & Constraints

## 1. GitHub & Git Operations Constraint
- **CRITICAL**: Do not access, pull, modify, commit, push, or store anything to GitHub/Git unless the user explicitly requests it **in that specific message**. Do NOT push proactively after completing any task. Always wait for a direct, per-message instruction such as "깃허브에 저장해줘" before performing any git operation.

## 2. Pre-Modification Backup Protocol
- **CRITICAL**: Before modifying any source files, you must immediately create a backup of the original unmodified file under the `E:\EditPlus_backup\` directory.
- Maintain the original directory structure inside the backup path.
  - *Example*: Backing up `d:\myData\home_page\keyword_tables\motion_editor_wasm\effect_editor\js\core.js` should copy to `E:\EditPlus_backup\D_\myData\home_page\keyword_tables\motion_editor_wasm\effect_editor\js\core.js.YYYYMMDD_HHMMSS.bak`.

## 3. Deployment Directory Protection
- **CRITICAL**: Never make any modifications (creation, deletion, or edits) to any files inside the `dist_web/` deployment directory under any circumstances, unless explicitly instructed by the user. Keep it clean and unmodified.
