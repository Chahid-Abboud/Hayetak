# Hayetak AI Coach Upgrade Guide

This file is a read-only reference for the current branch: `ChatbotReady`.

It explains:
- what changed in this branch compared with the earlier branch state
- how to start the project and the self-hosted chatbot
- how to update your local code when a branch changes
- how to switch to older or newer branches safely

For a shorter command-only version, see:
- `QUICK_COMMANDS.md`

## 1. Branch Title

**Branch name:** `ChatbotReady`

**Suggested title:** `Self-Hosted AI Coach + Thread-Aware UX + Admin Access`

## 2. What Changed In This Branch

### A. Self-Hosted AI Coach

The chatbot now runs locally with fully self-hosted components:
- `Ollama` for chat generation and embeddings
- `Qdrant` for the vector store
- Laravel services for orchestration, retrieval, safety, and deterministic fallbacks

Core backend pieces include:
- `app/Services/Ai/Chat/SelfHostedContextAwareChatService.php`
- `app/Services/Ai/Chat/SelfHostedOllamaClient.php`
- `app/Services/Ai/Chat/QdrantVectorStore.php`
- `app/Services/Ai/Chat/ChatOrchestrator.php`

### B. Personalized + General + Out-Of-Scope Modes

The coach now follows a three-path structure:
- `Personalized`
  Uses saved user data, restrictions, logs, and current-thread context
- `General guidance`
  Answers in-domain wellness, nutrition, and app-help questions without inventing personal facts
- `Out of scope`
  Refuses unrelated questions like weather, politics, philosophy, and trivia

Key logic lives in:
- `app/Services/Ai/Chat/ChatIntentClassifier.php`
- `app/Services/Ai/Chat/CoachDeterministicResponder.php`

### C. Better Personalized Reliability

The coach no longer depends only on loose vector matches.

It now uses a hybrid strategy:
- resolved user profile facts are injected directly when relevant
- vector search still adds extra user-specific context
- common calculations use deterministic backend logic

Important files:
- `app/Services/Ai/Chat/UserProfileFactResolver.php`
- `app/Services/Ai/Chat/UserContextSnapshotBuilder.php`
- `app/Services/Ai/Chat/ChatContextBuilder.php`

### D. Safer Nutrition And Restriction Handling

The coach now:
- avoids unsafe food suggestions based on saved allergies and diet type
- handles profile safety questions like `What are my allergies?`
- avoids false restriction blocks when the user is only asking for macros or safe alternatives
- keeps meal follow-ups tied to the current thread

Important files:
- `app/Services/Ai/Chat/ChatSafetyGuard.php`
- `app/Services/Ai/Chat/CoachDeterministicResponder.php`

### E. Deterministic Health Calculations

Important numeric answers now use backend calculations instead of relying only on the model.

Examples:
- protein target from saved weight
- meal macro totals for deterministic follow-ups

Key file:
- `app/Services/Ai/Chat/CoachNutritionCalculator.php`

### F. Better Chat UX

The `/coach` page was improved to feel more like a real chat experience:
- thread-aware messaging guidance
- cleaner composer behavior
- better loading state while the assistant is replying
- better wording for admin and user roles
- context debug shown only for admins

Main UI file:
- `resources/js/pages/ai/chat.tsx`

### G. Admin Access And Visibility

The `/coach` page is accessible to all authenticated and verified users, including admins.

Admin visibility was improved in 3 places:
- shared top navigation
- admin shell/sidebar
- admin dashboard shortcut

Key files:
- `routes/web.php`
- `resources/js/components/NavHeader.tsx`
- `resources/js/components/admin/AdminShell.tsx`
- `resources/js/pages/dashboard.tsx`

### H. One-Command Startup

A startup helper was added:
- `scripts/ai/selfhosted/start-coach.ps1`

This script:
- checks Ollama
- starts Ollama if needed
- starts Qdrant
- clears config
- syncs the coach vector context
- starts Laravel

## 3. One-Time Setup

Do this once on a new machine.

### Install Ollama

Download and install:
- `https://ollama.com/download/windows`

After install, pull the required models:

```powershell
ollama pull llama3.1:8b
ollama pull nomic-embed-text
```

### Install Docker Desktop

Download and install:
- `https://www.docker.com/products/docker-desktop/`

Open Docker Desktop and make sure it is running.

### Prepare The App

From the project root:

```powershell
cd c:\Users\User\hayetaravel
php artisan config:clear
php artisan ai:setup-self-hosted-chat --sync-existing=1
```

## 4. What To Run Every Time You Start The Project

Use this exact command:

```powershell
cd c:\Users\User\hayetaravel
powershell -ExecutionPolicy Bypass -File .\scripts\ai\selfhosted\start-coach.ps1
```

Then open:

```text
http://localhost:8000/coach
```

What this script does:
- starts Ollama if it is not already running
- starts Qdrant through Docker
- clears Laravel config
- syncs chatbot context
- starts the Laravel app

## 5. Quick Startup Checklist

If the coach is not working, check these URLs:

```powershell
Invoke-WebRequest http://127.0.0.1:11434/api/tags -UseBasicParsing
Invoke-WebRequest http://127.0.0.1:6333/collections -UseBasicParsing
```

If both work, the self-hosted services are up.

## 6. How To Check Which Branch You Are On

```powershell
git branch --show-current
```

## 7. How To View All Branches

### Local branches

```powershell
git branch
```

### Local + remote branches

```powershell
git branch -a
```

## 8. How To Update The Code On Your Current Branch

### Step 1: Check for local changes

```powershell
git status
```

### Step 2: Fetch the latest remote changes

```powershell
git fetch --all --prune
```

### Step 3: Pull the latest code for your current branch

```powershell
git pull
```

If your branch is not tracking a remote branch correctly, use:

```powershell
git pull origin <branch-name>
```

Example:

```powershell
git pull origin ChatbotReady
```

## 9. How To Switch To Another Branch

### Switch to a branch you already have locally

```powershell
git switch <branch-name>
```

Example:

```powershell
git switch main
git switch ChatbotReady
```

### Switch to a remote branch you do not yet have locally

```powershell
git fetch --all --prune
git switch --track origin/<branch-name>
```

Example:

```powershell
git switch --track origin/older-branch-name
```

## 10. How To Safely Move Between Branches If You Have Uncommitted Work

### Check your current changes

```powershell
git status
```

### If needed, stash your work before switching

```powershell
git stash push -u -m "temporary branch switch"
```

### Switch branches

```powershell
git switch <branch-name>
```

### Bring your work back later

```powershell
git stash pop
```

## 11. How To Look At Older Branches

### Simple method: switch to the older branch

```powershell
git switch <older-branch-name>
```

### Return to the current branch later

```powershell
git switch ChatbotReady
```

### Optional safer method: create a separate worktree for another branch

This lets you keep the current branch open while viewing another branch in a different folder.

```powershell
git worktree add ..\hayetak_old_branch <older-branch-name>
```

Example:

```powershell
git worktree add ..\hayetak_main main
```

## 12. What To Run After Switching Branches

After switching branches, it is a good idea to run:

```powershell
composer install
npm install
php artisan config:clear
```

If that branch also uses the self-hosted coach, run:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\ai\selfhosted\start-coach.ps1
```

## 13. Main Files To Review For This Branch

If you want to inspect the most important changes manually, start with:

```text
routes/web.php
resources/js/components/NavHeader.tsx
resources/js/components/admin/AdminShell.tsx
resources/js/pages/dashboard.tsx
resources/js/pages/ai/chat.tsx
app/Services/Ai/Chat/ChatIntentClassifier.php
app/Services/Ai/Chat/CoachDeterministicResponder.php
app/Services/Ai/Chat/ChatOrchestrator.php
app/Services/Ai/Chat/ChatContextBuilder.php
app/Services/Ai/Chat/SelfHostedContextAwareChatService.php
app/Services/Ai/Chat/UserProfileFactResolver.php
app/Services/Ai/Chat/UserContextSnapshotBuilder.php
app/Services/Ai/Chat/ChatSafetyGuard.php
scripts/ai/selfhosted/start-coach.ps1
```

## 14. Short Version

### Daily startup

```powershell
cd c:\Users\User\hayetaravel
powershell -ExecutionPolicy Bypass -File .\scripts\ai\selfhosted\start-coach.ps1
```

### Update current branch

```powershell
git status
git fetch --all --prune
git pull
```

### View all branches

```powershell
git branch -a
```

### Switch branches

```powershell
git switch <branch-name>
```
