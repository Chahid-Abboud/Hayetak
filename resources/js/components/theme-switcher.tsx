import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAppearance } from '@/hooks/use-appearance';
import { cn } from '@/lib/utils';
import { Monitor, Moon, Sun } from 'lucide-react';

export function ThemeSwitcher() {
    const { appearance, updateAppearance } = useAppearance();

    const icons = {
        light: Sun,
        dark: Moon,
        system: Monitor,
    };

    const CurrentIcon = icons[appearance];

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                        'h-9 w-9 rounded-md',
                        appearance === 'dark'
                            ? 'text-[var(--logo-color)]'
                            : 'text-neutral-700 dark:text-neutral-300',
                    )}
                >
                    <CurrentIcon className="size-5" />
                    <span className="sr-only">Toggle theme</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem
                    onClick={() => updateAppearance('light')}
                    className="flex items-center gap-2"
                >
                    <Sun className="size-4 text-neutral-700 dark:text-neutral-300" />
                    <span>Light</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                    onClick={() => updateAppearance('dark')}
                    className="flex items-center gap-2"
                >
                    <Moon className="size-4 text-neutral-700 dark:text-neutral-300" />
                    <span>Dark</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                    onClick={() => updateAppearance('system')}
                    className="flex items-center gap-2"
                >
                    <Monitor className="size-4 text-neutral-700 dark:text-neutral-300" />
                    <span>System</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
