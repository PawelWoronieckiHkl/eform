---
name: Bugfix Ticket to Delivery
description: "Use when you have a bug ticket and want implementation-ready changes with validation and rollout notes."
argument-hint: "Opis bledu, kroki reprodukcji, oczekiwane zachowanie, zakres plikow i kryteria akceptacji."
agent: "Efor developer"
---

You are implementing a bugfix from a ticket.

Input ticket:
{{input}}

Process:
1. Restate root cause hypothesis and impacted modules.
2. Implement the minimal safe fix (backend/frontend as needed).
3. Keep SOLID boundaries and avoid hidden side effects.
4. Add or update tests when behavior changes.
5. Validate and report exactly what was verified.
6. Provide release notes with risk level and rollback hint.

Output:
- Root cause summary
- Code changes by file
- Verification results
- Residual risks
- Release note snippet
