import '../css/app.css';

import { createInertiaApp } from '@inertiajs/react';
import axios from 'axios';
import type { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { initializeTheme } from './hooks/use-appearance';
import { type SharedData } from './types';

window.MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

const appName = import.meta.env.VITE_APP_NAME || 'Hayetak';
const CSRF_REFRESH_PATH = '/csrf-token';

let nativeFetch: typeof window.fetch | null = null;
let csrfRefreshPromise: Promise<string | null> | null = null;

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

    axios.interceptors.response.use(
        (response) => response,
        async (error: AxiosError) => {
            const response = error.response;
            const config = error.config as RetriableAxiosConfig | undefined;

            if (
                response?.status !== 419 ||
                !config ||
                config.__csrfRetry ||
                !isSameOriginUrl(config.url)
            ) {
                return Promise.reject(error);
            }

            config.__csrfRetry = true;
            const csrfToken = await refreshCsrfToken();

            if (!csrfToken) {
                return Promise.reject(error);
            }

            setAxiosHeader(config, 'X-CSRF-TOKEN', csrfToken);
            setAxiosHeader(config, 'X-Requested-With', 'XMLHttpRequest');

            return axios(config);
        },
    );

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
    nativeFetch = originalFetch;

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        const request = new Request(input, init);
        const method = request.method.toUpperCase();
        const url = new URL(request.url, window.location.origin);
        if (url.origin !== window.location.origin) {
            return originalFetch(request);
        }

        const headers = new Headers(request.headers);
        const credentials =
            init?.credentials ?? request.credentials ?? 'same-origin';
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
                    credentials,
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

        const preparedRequest = new Request(request, {
            headers,
            credentials,
        });
        const retryRequest = preparedRequest.clone();
        const response = await originalFetch(preparedRequest);

        if (response.status !== 419 || url.pathname === CSRF_REFRESH_PATH) {
            return response;
        }

        const refreshedToken = await refreshCsrfToken();

        if (!refreshedToken) {
            return response;
        }

        const retryHeaders = new Headers(retryRequest.headers);
        retryHeaders.set('X-CSRF-TOKEN', refreshedToken);
        retryHeaders.set('X-Requested-With', 'XMLHttpRequest');

        return originalFetch(
            new Request(retryRequest, {
                headers: retryHeaders,
                credentials,
            }),
        );
    };
}

function CsrfTokenSynchronizer({ csrfToken }: { csrfToken?: string }) {
    syncCsrfToken(csrfToken);

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

type RetriableAxiosConfig = InternalAxiosRequestConfig & {
    __csrfRetry?: boolean;
};

function isSameOriginUrl(url?: string) {
    if (typeof window === 'undefined' || !url) {
        return true;
    }

    return new URL(url, window.location.origin).origin === window.location.origin;
}

function setAxiosHeader(
    config: InternalAxiosRequestConfig,
    name: string,
    value: string,
) {
    const headers = config.headers as unknown;

    if (
        headers &&
        typeof (headers as { set?: unknown }).set === 'function'
    ) {
        (headers as { set: (key: string, value: string) => void }).set(
            name,
            value,
        );

        return;
    }

    config.headers = {
        ...(headers as Record<string, string> | undefined),
        [name]: value,
    } as InternalAxiosRequestConfig['headers'];
}

async function refreshCsrfToken() {
    if (typeof window === 'undefined') {
        return null;
    }

    if (!csrfRefreshPromise) {
        csrfRefreshPromise = (async () => {
            const fetcher = nativeFetch ?? window.fetch.bind(window);
            const response = await fetcher(CSRF_REFRESH_PATH, {
                cache: 'no-store',
                credentials: 'same-origin',
                headers: {
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
            });

            if (!response.ok) {
                return null;
            }

            const data = (await response.json()) as {
                csrf_token?: string | null;
            };

            if (!data.csrf_token) {
                return null;
            }

            syncCsrfToken(data.csrf_token);

            return data.csrf_token;
        })().finally(() => {
            csrfRefreshPromise = null;
        });
    }

    return csrfRefreshPromise;
}
