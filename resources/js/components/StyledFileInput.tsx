import { useRef } from 'react';

export default function StyledFileInput({
    onFile,
    accept = 'image/*',
    className = '',
}: {
    onFile: (file: File | null) => void;
    accept?: string;
    className?: string;
}) {
    const inputRef = useRef<HTMLInputElement | null>(null);

    return (
        <div className={`flex items-center gap-3 ${className}`}>
            <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="rounded-lg border bg-white px-3 py-2 hover:bg-gray-50"
            >
                Choose photo
            </button>
            <input
                ref={inputRef}
                type="file"
                accept={accept}
                className="hidden"
                onChange={(e) => onFile(e.target.files?.[0] ?? null)}
            />
            <span className="text-sm text-[color:var(--muted-foreground)]">
                JPG, PNG — optional
            </span>
        </div>
    );
}
