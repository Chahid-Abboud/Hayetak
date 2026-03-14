<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" @class(['dark' => ($appearance ?? 'system') === 'dark'])>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">

        <script>
            (function () {
                const appearance = '{{ $appearance ?? "system" }}';

                if (appearance === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                    document.documentElement.classList.add('dark');
                }
            })();
        </script>

        <title>403 - {{ config('app.name', 'Hayetak') }}</title>

        <link rel="preconnect" href="https://fonts.bunny.net">
        <link href="https://fonts.bunny.net/css?family=instrument-sans:400,500,600,700" rel="stylesheet" />

        @vite('resources/css/app.css')
    </head>
    <body class="min-h-screen bg-background font-sans text-foreground antialiased">
        @php
            $rawMessage = trim($exception->getMessage() ?: 'You do not have permission to access this area.');
            $isPendingVerification = str_contains(strtolower($rawMessage), 'pending account verification');

            $title = $isPendingVerification ? 'Pending Account Verification' : 'Access Forbidden';
            $message = $isPendingVerification
                ? 'You cannot take appointments or talk to clients until verified, but you can still explore the rest of Hayetak as a client.'
                : $rawMessage;
            $homeUrl = auth()->check() ? route('dashboard') : route('landing');
        @endphp

        <main class="relative isolate flex min-h-screen items-center justify-center overflow-hidden px-4 py-10 sm:px-6">
            <div class="pointer-events-none absolute inset-0">
                <div class="absolute inset-x-0 top-0 h-56 bg-[radial-gradient(circle_at_top,rgba(14,165,164,0.18),transparent_65%)] dark:bg-[radial-gradient(circle_at_top,rgba(45,212,191,0.18),transparent_65%)]"></div>
                <div class="absolute left-0 top-24 h-64 w-64 rounded-full bg-primary/8 blur-3xl"></div>
                <div class="absolute right-0 bottom-0 h-72 w-72 rounded-full bg-secondary/10 blur-3xl"></div>
            </div>

            <section class="relative w-full max-w-3xl rounded-[32px] border border-border/70 bg-card/90 p-8 shadow-2xl shadow-black/5 backdrop-blur sm:p-10 dark:shadow-black/25">
                <div class="mb-6 inline-flex rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-primary">
                    Error 403
                </div>

                <div class="grid gap-8 md:grid-cols-[120px_minmax(0,1fr)] md:items-start">
                    <div class="text-6xl font-semibold tracking-tight text-primary sm:text-7xl">
                        403
                    </div>

                    <div>
                        <h1 class="text-3xl font-semibold tracking-tight sm:text-4xl">
                            {{ $title }}
                        </h1>

                        <p class="mt-4 text-base leading-7 text-muted-foreground sm:text-lg">
                            {{ $message }}
                        </p>

                        @if (! $isPendingVerification && $rawMessage !== $message)
                            <p class="mt-3 text-sm text-muted-foreground">
                                {{ $rawMessage }}
                            </p>
                        @endif

                        <div class="mt-8 flex flex-wrap gap-3">
                            <a
                                href="{{ $homeUrl }}"
                                class="inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
                            >
                                Go to Hayetak
                            </a>

                            <a
                                href="{{ url()->previous() }}"
                                class="inline-flex items-center justify-center rounded-full border border-border bg-background px-5 py-2.5 text-sm font-semibold transition hover:bg-muted"
                            >
                                Go back
                            </a>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    </body>
</html>
