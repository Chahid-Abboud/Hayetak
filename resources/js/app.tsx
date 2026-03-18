import '../css/app.css';

import axios from 'axios';
import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { createRoot } from 'react-dom/client';
import { initializeTheme } from './hooks/use-appearance';

window.MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
(
    mapboxgl as typeof mapboxgl & {
        setTelemetryEnabled?: (enabled: boolean) => void;
    }
).setTelemetryEnabled?.(false);

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

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

        root.render(<App {...props} />);
    },
    progress: {
        color: '#4B5563',
    },
});

// This will set light / dark mode on load...
initializeTheme();

function installAxiosDefaults() {
    if (typeof window === 'undefined') {
        return;
    }

    const csrfToken = document
        .querySelector('meta[name="csrf-token"]')
        ?.getAttribute('content');

    axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';

    if (csrfToken) {
        axios.defaults.headers.common['X-CSRF-TOKEN'] = csrfToken;
    }

    axios.defaults.withCredentials = true;
}

function installFetchDefaults() {
    if (typeof window === 'undefined') {
        return;
    }

    const originalFetch = window.fetch.bind(window);

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        const request = new Request(input, init);
        const method = request.method.toUpperCase();

        if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
            return originalFetch(request);
        }

        const url = new URL(request.url, window.location.origin);
        if (url.origin !== window.location.origin) {
            return originalFetch(request);
        }

        const headers = new Headers(request.headers);
        const csrfToken = document
            .querySelector('meta[name="csrf-token"]')
            ?.getAttribute('content');

        if (csrfToken && !headers.has('X-CSRF-TOKEN')) {
            headers.set('X-CSRF-TOKEN', csrfToken);
        }
        if (!headers.has('X-Requested-With')) {
            headers.set('X-Requested-With', 'XMLHttpRequest');
        }

        return originalFetch(
            new Request(request, {
                headers,
                credentials: init?.credentials ?? request.credentials,
            }),
        );
    };
}
