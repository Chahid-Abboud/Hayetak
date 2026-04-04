<!doctype html>
<html lang="en">
    <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>419 Session Expired</title>
        <style>
            body {
                margin: 0;
                min-height: 100vh;
                font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
                background: radial-gradient(circle at top, #f7f9fc 0%, #eef2f7 52%, #e8edf4 100%);
                color: #0f172a;
                display: grid;
                place-items: center;
                padding: 24px;
            }
            .card {
                width: 100%;
                max-width: 760px;
                background: rgba(255, 255, 255, 0.92);
                border: 1px solid #e2e8f0;
                border-radius: 22px;
                padding: 28px;
                box-shadow: 0 24px 64px -42px rgba(15, 23, 42, 0.4);
            }
            h1 {
                margin: 8px 0 0;
                font-size: 1.65rem;
            }
            p {
                color: #334155;
                line-height: 1.6;
            }
            .muted {
                font-size: 0.78rem;
                letter-spacing: 0.18em;
                text-transform: uppercase;
                color: #64748b;
                font-weight: 700;
            }
            .details {
                margin-top: 20px;
                padding: 14px;
                border-radius: 14px;
                border: 1px solid #fde68a;
                background: #fffbeb;
                font-size: 0.95rem;
            }
            code {
                font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
            }
            .actions {
                margin-top: 18px;
                display: flex;
                gap: 10px;
                flex-wrap: wrap;
            }
            .btn {
                text-decoration: none;
                border-radius: 10px;
                padding: 10px 14px;
                font-size: 0.92rem;
                font-weight: 600;
                border: 1px solid #cbd5e1;
                color: #0f172a;
                background: #fff;
            }
            .btn.primary {
                background: #0f172a;
                border-color: #0f172a;
                color: #fff;
            }
        </style>
    </head>
    <body>
        <section class="card">
            <div class="muted">Error 419</div>
            <h1>Session expired</h1>
            <p>
                Your session timed out, the CSRF token changed, or this request came from a stale tab.
                Refresh and try again.
            </p>

            <div class="actions">
                <a href="{{ url('/dashboard') }}" class="btn primary">Back to dashboard</a>
                <a href="{{ url()->current() }}" class="btn">Refresh page</a>
            </div>

            @if (config('app.debug'))
                <div class="details">
                    <div><strong>Code:</strong> <code>{{ $details['code'] ?? 'CSRF_TOKEN_MISMATCH' }}</code></div>
                    <div><strong>Hint:</strong> {{ $details['hint'] ?? 'Session expired or CSRF mismatch.' }}</div>
                    <div><strong>Request:</strong> <code>{{ $details['method'] ?? 'GET' }} {{ $details['path'] ?? '/' }}</code></div>
                </div>
            @endif
        </section>
    </body>
</html>
