import '../css/app.css';

import { createInertiaApp } from '@inertiajs/react';
import axios from 'axios';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { initializeTheme } from './hooks/use-appearance';
import { type SharedData } from './types';

window.MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
(
    mapboxgl as typeof mapboxgl & {
        setTelemetryEnabled?: (enabled: boolean) => void;
    }
).setTelemetryEnabled?.(false);

const appName = import.meta.env.VITE_APP_NAME || 'Hayetak';

installAxiosDefaults();
installFetchDefaults();

createInertiaApp({
    title: (title) => (title ? `${title} - ${appName}` : appName),
    resolve: (name) =>
        resolvePageComponent(
            `./pages/${name}.tsx`,
            import.meta.glob('./pages/**/*.tsx'),
        ),
    setup({ el, App, props }) {
        const root = createRoot(el);

        root.render(
            <App {...props}>
                {({ Component, key, props: pageProps }) => (
                    <>
                        <CsrfTokenSynchronizer
                            csrfToken={
                                (pageProps as unknown as SharedData | undefined)
                                    ?.csrf_token
                            }
                        />
                        <Component key={key} {...pageProps} />
                    </>
                )}
            </App>,
        );
    },
    progress: {
        color: '#8FC73F',
    },
});

// This will set light / dark mode on load...
initializeTheme();

function installAxiosDefaults() {
    if (typeof window === 'undefined') {
        return;
    }

    axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';
    axios.defaults.withCredentials = true;

    syncCsrfToken(
        document
            .querySelector('meta[name="csrf-token"]')
            ?.getAttribute('content'),
    );
}

function installFetchDefaults() {
    if (typeof window === 'undefined') {
        return;
    }

    const originalFetch = window.fetch.bind(window);

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        const request = new Request(input, init);
        const method = request.method.toUpperCase();
        const url = new URL(request.url, window.location.origin);
        if (url.origin !== window.location.origin) {
            return originalFetch(request);
        }

        const headers = new Headers(request.headers);
        const isApiRequest =
            url.pathname === '/api' || url.pathname.startsWith('/api/');

        if (isApiRequest && !headers.has('Accept')) {
            headers.set('Accept', 'application/json');
        }
        if (isApiRequest && !headers.has('X-Requested-With')) {
            headers.set('X-Requested-With', 'XMLHttpRequest');
        }

        if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
            return originalFetch(
                new Request(request, {
                    headers,
                    credentials:
                        init?.credentials ??
                        request.credentials ??
                        'same-origin',
                }),
            );
        }

        const csrfToken = getCurrentCsrfToken();

        if (csrfToken && !headers.has('X-CSRF-TOKEN')) {
            headers.set('X-CSRF-TOKEN', csrfToken);
        }
        if (!headers.has('X-Requested-With')) {
            headers.set('X-Requested-With', 'XMLHttpRequest');
        }

        return originalFetch(
            new Request(request, {
                headers,
                credentials:
                    init?.credentials ?? request.credentials ?? 'same-origin',
            }),
        );
    };
}

function CsrfTokenSynchronizer({ csrfToken }: { csrfToken?: string }) {
    useEffect(() => {
        syncCsrfToken(csrfToken);
    }, [csrfToken]);

    return null;
}

function getCurrentCsrfToken() {
    if (typeof document === 'undefined') {
        return '';
    }

    return document
        .querySelector('meta[name="csrf-token"]')
        ?.getAttribute('content');
}

function syncCsrfToken(csrfToken?: string | null) {
    if (typeof document === 'undefined' || !csrfToken) {
        return;
    }

    let meta = document.querySelector(
        'meta[name="csrf-token"]',
    ) as HTMLMetaElement | null;

    if (!meta) {
        meta = document.createElement('meta');
        meta.name = 'csrf-token';
        document.head.appendChild(meta);
    }

    if (meta.content !== csrfToken) {
        meta.content = csrfToken;
    }

    axios.defaults.headers.common['X-CSRF-TOKEN'] = csrfToken;
}
