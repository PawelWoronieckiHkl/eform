---
description: "Use when building or refactoring frontend UI in templates, CSS, and browser scripts. Enforces Nielsen heuristics and pragmatic UX quality checks."
name: "Frontend Nielsen Guidelines"
applyTo: "templates/**/*.njk, public/scripts/**/*.js, public/styles/**/*.css"
---
# Frontend Guidelines (Nielsen + Delivery)

## Scope
Apply these rules when changing UI behavior, layout, text labels, forms, or frontend interactions.

## UX Checklist (Nielsen 10)
1. Visibility of system status: show loading, success, and error states.
2. Match between system and real world: use user language, not internal jargon.
3. User control and freedom: support cancel, undo, or safe back paths.
4. Consistency and standards: reuse existing UI patterns and naming.
5. Error prevention: validate early and block invalid actions.
6. Recognition rather than recall: keep context visible and labels explicit.
7. Help users recover from errors: actionable messages with next steps.
8. Flexibility and efficiency: preserve keyboard and power-user flows.
9. Aesthetic and minimalist design: avoid noisy or redundant UI.
10. Help and documentation: add concise helper text where needed.

## Implementation Rules
- Keep behavior deterministic; avoid hidden side effects in event handlers.
- Prefer progressive enhancement over brittle DOM assumptions.
- Preserve mobile usability and check responsive behavior after UI changes.
- Update related strings/translations when labels or messages change.

## Delivery Standard
- Explain which heuristics were addressed for each non-trivial UI change.
- Report residual UX risks if any heuristic cannot be fully satisfied.
