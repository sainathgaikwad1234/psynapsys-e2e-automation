# PSYNAPSYS E2E Framework Review (Post-Fix)
*Reviewed: 2026-03-16 | Reviewer: ThinkHead Analyst*
*Previous review: 2026-03-13 | Previous rating: 6.5/10*

## Executive Summary

The seven targeted fixes have all landed and are verified. `waitForTimeout` dropped from 663 to 11 (all marked TODO), `page: any` is fully eliminated, local `disableLoadingOverlay` duplicates are gone, workers are explicit, and the ESLint rule is properly promoted to `error`. However, deeper inspection reveals a new class of systemic issues: 138 silent `.catch(() => {})` suppressors across 45 spec files, 441 no-op `expect(body).toBeVisible()` assertions, 27-way duplication of `resolveClientId`, 93 uses of `Escape` to close dialogs (documented as dangerous), and over-broad `skipNetworkMonitoring` usage that disables a key safety net on 307 tests. The framework has improved from "hazardous" to "functional but fragile."

## Rating: 7.5/10

### Score Breakdown

| Dimension | Previous | Current | Max | Change |
|-----------|----------|---------|-----|--------|
| Architecture | 8 | 8 | 10 | -- |
| Reliability | 5 | 6 | 10 | +1 (fewer timeouts, typed Page) |
| Maintainability | 4 | 6 | 10 | +2 (shared helpers, no local overlay dupes) |
| CI/CD Readiness | 8 | 8.5 | 10 | +0.5 (explicit workers) |
| Mantine Handling | 7 | 7.5 | 10 | +0.5 (centralized overlay, readFileSync fixed) |
| Security/Config | 5 | 5 | 5 | -- |
| **Total** | **37** | **41** | **55** | **+4** |
| **Normalised /10** | **6.5** | **7.5** | **10** | **+1.0** |

---

## Fixes Verified

- [x] **Local `disableLoadingOverlay` removed**: 0 `function disableLoadingOverlay` in `e2e/` (was 3)
- [x] **`waitForTimeout` reduced**: 11 remaining across 5 files (was ~663), all marked `// TODO`
- [x] **`group-crud.spec.ts` fixed**: uses `test.skip()`, `Array.from()`, `cancelDialog()`, specific assertions
- [x] **`page: any` eliminated**: 0 occurrences in `e2e/` (was widespread)
- [x] **`playwright.config.ts` workers**: `process.env.CI ? '50%' : 4` — confirmed at line 45
- [x] **`eslint.config.js`**: `'playwright/no-wait-for-timeout': 'error'` — confirmed at line 46
- [x] **`mantine-helpers.ts`**: uses `await fs.promises.readFile` in `uploadToDropzone` — confirmed at line 277

---

## What Works Well (Strengths)

- **Well-designed helper layer** — `wait-helpers.ts`, `dialog-helpers.ts`, `mantine-helpers.ts` cover all major Mantine interaction patterns with proper fallbacks
- **`waitForAnimation` uses Web Animations API** — correct approach, not arbitrary delays
- **`waitForPageReady` cascading strategy** — domcontentloaded → networkidle (capped) → spinner check
- **Robust global-setup** — retry with backoff, credential validation, cached session fallback, parallel auth
- **Custom fixtures** — `authRequest`, `testPatient`, `testAppointment` with auto-cleanup
- **React fiber fallback** — `selectFirstOption` and `fillMultiSelect` handle Mantine portal edge cases
- **Network monitor with exclude patterns** — correct for SPA 404 false positives
- **`_nativeDomClick` in dialog-helpers** — properly immune to overlay re-renders
- **Typed `Page` everywhere** — proper imports from `@playwright/test`
- **ESLint gates `waitForTimeout` at error level** — prevents regression
- **Domain separation enforced** — CDN frontend vs API server correctly separated
- **Tenant header handled in fixtures** — `Tenant-Name: test` injected automatically
- **Timestamp-based unique test data** — `Date.now()` suffix prevents cross-run collisions

---

## Remaining Issues

| # | Severity | File:Line | Issue | Fix |
|---|----------|-----------|-------|-----|
| 1 | **Critical** | 27 spec files | `resolveClientId()` duplicated identically in 27 files. Each copy opens a browser context, navigates to `/app/client`, and scrapes the first row. Any change to the client list page breaks 27 files simultaneously. | Extract to `support/helpers/client-helpers.ts` and import everywhere. Or better: use `testPatient` fixture to get a known ID. |
| 2 | **Critical** | 45 spec files (138 occurrences) | `.catch(() => {})` silently swallows errors on `waitForDialogOpen`, `waitForDropdownOptions`, `waitForDialogClose`, `page.goBack()`, etc. When these fail, the test continues against incorrect state, producing false greens or misleading failures. | Remove `.catch(() => {})` from wait-helper calls — the helpers already have timeouts. If optional behavior, use `if/else` with `isVisible()` instead. |
| 3 | **High** | 49 spec files (441 occurrences) | `expect(page.locator('body')).toBeVisible()` used as a no-op assertion placeholder. This always passes and asserts nothing about application state. Tests using this as their only assertion are false greens. | Replace with meaningful assertions: visible heading, expected URL, specific element. For early-return paths, use `test.skip()` with a reason. |
| 4 | **High** | 24 spec files (93 occurrences) | `page.keyboard.press('Escape')` still used in 24 files to close dialogs/dropdowns. Memory and helpers both document this as dangerous (closes parent modal in Mantine). | Replace all with `cancelDialog(page)` from dialog-helpers, or `page.keyboard.press('Tab')` for dropdowns. |
| 5 | **High** | 50 spec files (307 occurrences) | `skipNetworkMonitoring` annotation applied to ~80% of tests. The network error monitor exists to catch real API errors but is disabled on most of the suite. This defeats its purpose. | Reserve `skipNetworkMonitoring` for tests that intentionally trigger error responses (auth failure, invalid input). All CRUD happy-path tests should have monitoring enabled. |
| 6 | **High** | `wait-helpers.ts:69,72,79,261,275,291` | `waitForPageReady` and `waitForAnimation` internally use `.catch(() => {})`, silently swallowing failures. If `domcontentloaded` times out, it proceeds as if the page loaded. Spinner check silently passes if spinner never hides. | At minimum, log a warning on catch. For `waitForAnimation`, add `console.warn` on failure. |
| 7 | **Medium** | `dialog-helpers.ts:89` | `confirmDialog` has dead code: `typeof label === 'string' ? label : label` — both branches return the same value. | Simplify to just `{ name: label }`. |
| 8 | **Medium** | 4 spec files | `clickRowAction` helper duplicated in `cpt-code-crud.spec.ts`, `icd-code-crud.spec.ts`, `cancellation-policy-crud.spec.ts`, `settings-crud.spec.ts`. All have identical implementations. | Extract to `support/helpers/table-helpers.ts`. |
| 9 | **Medium** | 46 spec files (49 serial describes) | Every CRUD spec uses `test.describe.serial`. Serial execution is correct for CRUD ordering, but with 46+ serial blocks and only 4 workers, one slow test blocks an entire file's chain. No `test.afterEach` cleanup exists in most files. | Add `test.afterEach` hooks to close any open dialogs. Consider extracting common cleanup to a shared `afterEach` fixture. |
| 10 | **Medium** | `global-setup.ts:108-121` | `attemptLogin` launches a new browser per user in `Promise.all`. Two simultaneous Chromium instances under memory pressure may cause flakiness. No explicit `headless: true`. | Add explicit `headless: true`. Consider sequential auth with shared browser instance. |
| 11 | **Medium** | `custom-fixtures.ts:104,135` | Cleanup `.catch(() => {})` on DELETE requests. If cleanup fails (e.g., 500 error), test data accumulates in QA environment. No logging. | Log: `.catch((e) => console.warn('Cleanup failed:', e))`. |
| 12 | **Low** | `auth-provider.ts:58-71` | Legacy aliases (`default-user`, `provider`, `patient`) mapped to therapist/client. Dead code if no test uses them. | Remove legacy aliases or add deprecation warning. |
| 13 | **Low** | `mantine-helpers.ts:80,158` | React fiber fallback depends on `__reactProps` internal key. React 19 may change the prefix. | Add version check comment and consider `dispatchEvent` as second fallback. |
| 14 | **Low** | `support/page-objects/` | Only 2 page objects exist (`login-page.ts`, `dashboard-page.ts`), and only `login-page.ts` is imported (by 1 file). 68 of 69 spec files use raw locators. The pattern is effectively abandoned. | Either commit to POM or remove the directory. Shared helpers already serve the abstraction role. |

---

## Recommendations (Priority Order)

1. **Extract `resolveClientId` to shared helper** — highest impact, eliminates 27-way duplication
2. **Audit and remove `.catch(() => {})`** — 138 silent suppressors are the top reliability risk
3. **Replace `expect(body).toBeVisible()`** with meaningful assertions or `test.skip()`
4. **Replace `Escape` key usage** with `cancelDialog()` or `Tab` in all 24 files
5. **Reduce `skipNetworkMonitoring`** to only tests that intentionally trigger errors
6. **Extract `clickRowAction`** to `support/helpers/table-helpers.ts`
7. **Add `afterEach` cleanup hooks** to close stale dialogs in serial CRUD suites
8. **Add warning logging** to catch blocks in `wait-helpers.ts` internals
9. **Decide on page objects**: commit or remove the directory
10. **Add `headless: true`** explicitly to `global-setup.ts` browser launch

---

## Improvement History

| Date | Rating | Key Changes |
|------|--------|-------------|
| 2026-03-13 | 6.5/10 | Initial review: 663 waitForTimeout, page:any, local overlay dupes, undefined workers |
| 2026-03-16 | 7.5/10 | waitForTimeout 663→11, page:any eliminated, overlay centralized, workers=4, ESLint error-level, readFileSync→async, group-crud false-green fixed |

---

## Verdict

The targeted fixes raised the framework from "hazardous" to "solid foundation with known technical debt." The helper layer is well-designed and now properly adopted across the suite. The remaining issues are systemic (27x `resolveClientId` duplication, 138 silent catch suppressors, 441 no-op assertions, 93 Escape key uses) and represent the next wave of cleanup. Addressing items 1–5 above would push the rating past **8.5/10**.
