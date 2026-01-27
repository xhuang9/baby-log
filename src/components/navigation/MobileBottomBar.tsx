import { AppNavItems } from './AppNavItems';

type MobileBottomBarProps = {
  locale: string;
};

export const MobileBottomBar = ({ locale }: MobileBottomBarProps) => {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 px-3 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] backdrop-blur md:hidden">
      <div className="grid grid-cols-4 gap-1">
        <AppNavItems locale={locale} variant="bottom" />
      </div>
    </nav>
  );
};
