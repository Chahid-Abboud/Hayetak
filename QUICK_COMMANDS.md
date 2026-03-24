# Hayetak Quick Commands

This is the shortest command reference for daily use.

## 1. Start The Project + AI Coach

```powershell
cd c:\Users\User\hayetaravel
powershell -ExecutionPolicy Bypass -File .\scripts\start-coach.ps1
```

Open:

```text
http://localhost:8000/coach
```

## 2. Check Which Branch You Are On

```powershell
git branch --show-current
```

## 3. See All Branches

```powershell
git branch -a
```

## 4. Update Your Current Branch

```powershell
git status
git fetch --all --prune
git pull
```

If your branch needs an explicit remote:

```powershell
git pull origin <branch-name>
```

## 5. Safest Fast Workflow For Older And Newer Versions

Use `git worktree`.

Why:
- keeps your current branch intact
- avoids losing uncommitted work
- lets you keep multiple branch versions side by side
- avoids reinstalling dependencies every time you switch after each worktree is set up once

### Create a separate folder for an older branch

```powershell
cd c:\Users\User\hayetaravel
git fetch --all --prune
git worktree add ..\hayetak_old <older-branch-name>
```

Example:

```powershell
git worktree add ..\hayetak_main main
```

### Create a separate folder for another newer branch

```powershell
git worktree add ..\hayetak_new <newer-branch-name>
```

### Open the older branch folder

```powershell
cd ..\hayetak_old
```

### Open the current branch folder again

```powershell
cd c:\Users\User\hayetaravel
```

## 6. One-Time Setup Per Worktree

Only the first time you create a new worktree, run:

```powershell
composer install
npm install
php artisan config:clear
```

After that, you usually do not need to reinstall dependencies every time you move between those already-prepared worktrees.

## 7. Start The Older Or Newer Worktree Version

From inside that worktree folder:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-coach.ps1
```

## 8. If You Prefer Simple Branch Switching In One Folder

### Save your current uncommitted work first

```powershell
git status
git stash push -u -m "temporary switch"
```

### Switch branches

```powershell
git switch <branch-name>
```

### Return later and restore your work

```powershell
git switch ChatbotReady
git stash pop
```

## 9. Best No-Data-Loss Recommendation

Use this pattern:

```powershell
git fetch --all --prune
git worktree add ..\hayetak_main main
git worktree add ..\hayetak_old <older-branch-name>
git worktree add ..\hayetak_new <newer-branch-name>
```

Then each branch lives in its own folder, with its own already-installed dependencies after the first setup.

## 10. Important Note

No Git command can guarantee zero reinstall work if a branch changes:
- `composer.lock`
- `package-lock.json`
- `package.json`
- framework or build dependencies

But `git worktree` is the best practical way to:
- avoid data loss
- avoid repeated reinstalling on every switch
- move between older and newer versions quickly
