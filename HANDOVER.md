# Data-refresh repair, 6 November 2026

The scheduled refresh stopped in actions/setup-python because pip caching had no dependency manifest to hash. Added root requirements.txt matching the workflow's existing dependency list. No model or editorial logic changed.

Checks: Python 3.11 pipeline tests 41/41; frontend tests 39/39; production build passed. The repair-branch GitHub refresh successfully installed dependencies, passed tests, generated refreshed data and committed the results. Full local refresh exceeded local memory, so the hosted runner supplied end-to-end validation instead. Partial local JSON files were not published.

Verification run: https://github.com/martindavies-code/fourth-down-lab/actions/runs/42244567644

Scheduled Tuesday/Friday refresh timing is unchanged. Pull the final merged main before resuming edits. The manifest currently mirrors the workflow dependency list; keep both in sync when changing packages.
