# Wasla Senior Angular Agent — Installation / دليل التثبيت

## What's inside?
- `.agents/AGENTS.md`: light global role, routing and strict guardrails.
- `.agents/rules/*.md`: scoped rules with the **current Antigravity YAML `trigger: model_decision`** schema.
- `.agents/skills/*/SKILL.md`: 11 focused skills, automatically discoverable and manually invokable as slash commands.
- `.agents/knowledge/`: source-of-truth discovery aids, never substitute for backend code and Jira.
- `.agents/templates/`: practical reviews, testing and acceptance templates.
- `.agents/reference-library/`: selected old instructions for reference only.

## Install into the **Wasla Angular frontend repository root**
1. **Back up** your current `.agents` folder, and any existing root `AGENTS.md` / `GEMINI.md` / `.agent` customizations.
2. Extract the downloaded ZIP. Copy **the hidden `.agents` directory** (not just `skills`) beside your project's `package.json` and `angular.json`.
3. For a clean migration, *replace the old workspace `.agents` directory after backup* — do not merge duplicate rule files and old active skills into the new directory. Merging reintroduces conflicts and extra tokens.
4. Restart/reload Antigravity in that project. Check Customizations > Rules / Skills to see the entries; `.agents/AGENTS.md` should apply automatically and `wasla-*` skills be discoverable.
5. Test in read-only mode: **"Audit the mobile reservation page as Wasla Senior Angular UX lead; do not edit files. Show mobile-vs-desktop differences and exact test limitations."**
6. To test Jira without making changes: **"Review ticket WAS-XXX and build an acceptance matrix. Do not edit project code or transition Jira."** Replace XXX with a real accessible ticket.

### Important
- No code was changed in your Wasla app to build this package; this is agent configuration only.
- No Jira connector, GitHub backend, browser or real app build was exercised as part of construction.
- Official Wasla color hex values and endpoint models **must be read from the actual project**, never presumed from a template.
- Protect `AGENTS.md`/`GEMINI.md` duplicates in repository roots and global configuration: Antigravity may load them cumulatively. Review those separately.

## Option: Windows PowerShell
```powershell
Expand-Archive -Path '.\Wasla_Senior_Angular_Agent.zip' -DestinationPath '.\wasla-agent-extract' -Force
# Backup your existing .agents before any replacement.
# Copy the extracted .agents folder into the Wasla frontend repository root.
```

## Recommended first command in Antigravity
> Act as Wasla Senior Angular Product Engineer. Inspect the installed Angular version, the actual shared design tokens, routes, auth/permissions and service layout **read-only**. Compare them to `.agents/knowledge/`; report validated facts vs gaps. Do not modify code.
