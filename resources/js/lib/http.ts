export function getCsrfToken() {
    if (typeof document === 'undefined') {
        return '';
    }

    return (
        (
            document.querySelector(
                'meta[name="csrf-token"]',
            ) as HTMLMetaElement | null
        )?.content ?? ''
    );
}

export function jsonRequestInit(
    method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    body?: unknown,
): RequestInit {
    return {
        method,
        credentials: 'same-origin',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'X-CSRF-TOKEN': getCsrfToken(),
            'X-Requested-With': 'XMLHttpRequest',
        },
        body: body === undefined ? undefined : JSON.stringify(body),
    };
}
