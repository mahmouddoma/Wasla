# Codex — Efficient Angular Development Rules

## Primary Goal
Complete tasks accurately with minimal token consumption, minimal tool calls, and minimal unnecessary testing.

## 1. Context & File Reading
- Read only files directly related to the requested task.
- Do not scan the entire repository unless absolutely necessary.
- Use targeted searches instead of recursively reading directories.
- Avoid repeatedly reading files whose content is already available.
- Do not inspect unrelated components, services, or modules.
- Respect existing project architecture and conventions.

## 2. Changes
- Make the smallest safe change that solves the request.
- Preserve existing functionality and business logic.
- Do not refactor unrelated code.
- Do not modify package.json or install dependencies unless explicitly requested.
- Reuse existing components, utilities, and design tokens.
- Remove obsolete code only when it directly relates to the task.

## 3. Testing Strategy
- Follow risk-based verification rather than running every available test.
- For HTML/CSS-only changes, inspect the affected code first. Do not run full unit or end-to-end suites by default.
- For TypeScript changes, prefer focused type checks or relevant unit tests.
- For shared services, routing, authentication, or build configuration changes, run relevant tests and a build when justified.
- Never rerun the same successful test without a relevant code change.
- Never execute tests in loops.
- Do not run the full Angular test suite unless explicitly requested or necessary.
- If verification fails, investigate the specific failure before rerunning.
- Do not hide skipped checks or claim unexecuted tests passed.

## 4. Browser & Playwright
- Do not launch Playwright automatically for every task.
- Use browser verification for visual tasks, interactive behavior, responsive changes, or when explicitly requested.
- Reuse an existing browser session where possible.
- Prefer one focused browser verification pass after related changes.
- Take additional screenshots only when needed to investigate or verify a fix.
- Avoid repeated navigation and unnecessary screenshots.

## 5. Token Efficiency
- Keep reasoning and explanations focused.
- Do not repeat task requirements.
- Avoid verbose plans for simple tasks.
- Do not print complete files unless requested.
- Prefer concise diffs and targeted edits.
- Avoid repeated tool calls that provide no new information.
- Do not generate documentation, reports, or summaries unless requested.

## 6. Final Response
Use a brief summary:
- What changed.
- Files modified.
- Verification performed, or explicitly skipped.
- Any remaining risks.

Keep the final response under 120 words unless detailed output is requested.

## 7. Exceptions
- Prioritize correctness, security, and data integrity over token savings.
- Never skip essential verification for authentication, permissions, payments, destructive operations, or other high-risk changes.
- If essential verification cannot run, explain the limitation clearly.