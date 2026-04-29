import AppLogoIcon from './app-logo-icon';

export default function AppLogo() {
    return (
        <div className="flex min-w-0 items-center gap-2 group-data-[collapsible=icon]:justify-center">
            <AppLogoIcon className="size-8 shrink-0 group-data-[collapsible=icon]:size-6" />
        </div>
    );
}
