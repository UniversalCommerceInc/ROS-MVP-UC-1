import { Header } from '@kit/ui/marketing';

import { AppLogo } from '~/components/app-logo';

import { SiteHeaderAccountSection } from './site-header-account-section';
import { SiteNavigation } from './site-navigation';

export function SiteHeader() {
  return (
    <Header
      logo={
        <AppLogo className="w-[85px] md:w-[95px]" />
      }
      navigation={<SiteNavigation />}
      actions={<SiteHeaderAccountSection />}
    />
  );
}
