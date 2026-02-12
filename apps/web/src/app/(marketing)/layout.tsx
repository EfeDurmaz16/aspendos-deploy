import { SiteDock } from '@/components/layout/site-dock';

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            {children}
            <SiteDock />
        </>
    );
}
