# Repo rules

## Sync at task start

Before editing anything in this repo, run these checks in order. Stop and tell the user if any one fails. Do not fix a failure yourself.

1. `git rev-parse --show-toplevel` must be the fourth-down-lab checkout, and `git remote get-url origin` must point to martindavies-code/fourth-down-lab.
2. `git branch --show-current` must be `main`, and `git rev-parse --abbrev-ref @{upstream}` must be `origin/main`.
3. `git status --porcelain` must be empty (clean tree).
4. `git fetch origin`, then `git rev-list --left-right --count HEAD...origin/main` must show no local-only commits (left side 0).
5. If origin/main is ahead, run `git pull --ff-only`. Never merge, rebase, reset, stash, force-pull or discard anything to make this work.

This applies once at the start of each task, not in the background. Do not push unless the user asked for it.
