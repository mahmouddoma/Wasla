# Angular baseline and version compatibility

- Prior uploaded agent says Angular 20, standalone components, Angular Material, Bootstrap 5, TypeScript, HTML and CSS.
- Actual checked-out project may differ: always inspect installed versions and style before coding.
- Don't use Angular 21+ Signal Forms APIs in an Angular 20 project; keep existing typed Reactive Forms unless explicit upgrade.
- Standalone components are typical in v20; follow actual code style and avoid mechanical refactors purely to apply latest syntax.
- Keep domain logic out of generic shared UI, and avoid feature-to-feature private imports.
- For data access prefer typed services and intentional state, not logic spread across component templates.
- Verify active Angular version against official Angular compatibility documentation when suggesting upgrades: https://angular.dev/reference/versions
