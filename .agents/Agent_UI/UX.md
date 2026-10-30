# Angular UI/UX Guidelines

## Stack
- Angular 20, standalone components
- Angular Material and Bootstrap 5
- TypeScript, HTML, CSS

## Design Principles
- Premium, minimal enterprise interfaces.
- Prefer solid colors over gradients.
- Avoid excessive shadows and blur.
- Avoid generic AI-style layouts.
- Use consistent typography and spacing.
- Support responsive desktop and mobile layouts.

## Code Quality
- Preserve existing functionality.
- Reuse existing components and CSS variables.
- Do not duplicate CSS selectors.
- Remove unused styles when safe.
- Keep HTML, CSS and TypeScript separated.
- Do not introduce unnecessary dependencies.
- Do not rewrite business logic for visual changes.

## UI Verification
- Use Playwright MCP when available.
- Inspect the current UI before editing.
- Capture screenshots before and after changes.
- Check desktop, tablet and mobile.
- Test interactive states.
- Run the Angular build.
- Never treat build success as visual verification.