import { Head } from '@inertiajs/react';

import AppearanceTabs from '@/components/appearance-tabs';
import { ProductSection } from '@/components/product/page';

import SettingsLayout from '@/layouts/settings/layout';

export default function Appearance() {
    return (
        <>
            <Head title="Appearance settings" />

            <SettingsLayout>
                <ProductSection
                    title="Appearance settings"
                    description="Choose the look that feels most comfortable across the product."
                >
                    <AppearanceTabs />
                </ProductSection>
            </SettingsLayout>
        </>
    );
}
