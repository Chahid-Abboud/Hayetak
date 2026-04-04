# Laravel + React Starter Kit

## Project Guide

For this repo's Hayetak-specific startup, AI coach, and branch workflow instructions, read:

- [START_HERE_READ_ONLY.md](./START_HERE_READ_ONLY.md)
- [QUICK_COMMANDS.md](./QUICK_COMMANDS.md)

## Self-Hosted AI Coach

The chatbot can run fully self-hosted with:

- `Ollama` for local chat inference and CPU-friendly local embeddings
- `Qdrant` for per-user vector retrieval
- Laravel services under `app/Services/Ai/Chat/`

One-time setup:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\setup-selfhosted-ai.ps1
```

Daily start:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-coach.ps1
```

## AI Planner

The first AI planner feature now uses a traced Laravel orchestration flow with:

- provider selection between `OpenAI Responses API` and a local `Ollama` model
- prompt templates stored in `resources/ai/prompts/planner/`
- strict JSON schema enforcement in `app/Services/Ai/Schemas/PlannerSchema.php`
- Laravel validation, safety checks, and persistence under `app/Services/Ai/`
- normalized user restriction/history tables plus active workout/nutrition plans

Architecture notes for the senior-project framing live in:

- [docs/ai/planner-architecture.md](./docs/ai/planner-architecture.md)

## Introduction

Our React starter kit provides a robust, modern starting point for building Laravel applications with a React frontend using [Inertia](https://inertiajs.com).

Inertia allows you to build modern, single-page React applications using classic server-side routing and controllers. This lets you enjoy the frontend power of React combined with the incredible backend productivity of Laravel and lightning-fast Vite compilation.

This React starter kit utilizes React 19, TypeScript, Tailwind, and the [shadcn/ui](https://ui.shadcn.com) and [radix-ui](https://www.radix-ui.com) component libraries.

## Official Documentation

Documentation for all Laravel starter kits can be found on the [Laravel website](https://laravel.com/docs/starter-kits).

## Contributing

Thank you for considering contributing to our starter kit! The contribution guide can be found in the [Laravel documentation](https://laravel.com/docs/contributions).

## Code of Conduct

In order to ensure that the Laravel community is welcoming to all, please review and abide by the [Code of Conduct](https://laravel.com/docs/contributions#code-of-conduct).

## License

The Laravel + React starter kit is open-sourced software licensed under the MIT license.
