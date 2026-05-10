import AppWordmark from './app-wordmark';

export default function AppLogo() {
    return (
        <div className="flex min-w-0 items-center group-data-[collapsible=icon]:justify-center">
            <AppWordmark
                className="group-data-[collapsible=icon]:justify-center"
                iconClassName="size-8 group-data-[collapsible=icon]:size-6"
                textClassName="text-[1.42rem] group-data-[collapsible=icon]:hidden"
            />
        </div>
    );
}
