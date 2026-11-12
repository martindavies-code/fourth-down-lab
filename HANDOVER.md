# Data freshness and refresh alerts, 12 November 2026

## Changes
- Header shows the metadata timestamp and week coverage on every tab, wrapping rather than clipping on small screens. Removed the hardcoded fallback date: missing metadata says unavailable.
- Refresh schedule (UTC): Sunday 23:00; Monday and Tuesday 08:00/12:00; Friday 08:00/12:00. Sunday catches early games, Monday catches the rest of Sunday, Tuesday follows MNF, Friday follows TNF. Upstream data availability still governs when games appear.
- A separate failure-only job opens a GitHub issue or updates the existing bot-owned issue with the latest failed-run link. Issue write permission is limited to that job. Alert jobs are serialized to avoid duplicate issues. Close the issue after confirming recovery.

## Checks before merge
- Python pipeline suite: 45 passed (four upstream Polars deprecation warnings).
- Frontend tests, production build and actionlint validation passed.
- Chromium checks: stamp visible at 1280, 390 and 320px; missing metadata shows unavailable. Desktop and mobile screenshots inspected.
- Failure-alert create/update paths tested with a mocked GitHub API, without manufacturing a failed production run or test issue.

## Remaining verification
- Confirm PR checks, merge once, then verify Pages deployment and live timestamp.
- A real future scheduled refresh and a real failure will confirm the external scheduling/issue permissions end to end. No intentional production failure was introduced.

Pull the final merged main with a clean tree before resuming edits. No model or data files changed.
