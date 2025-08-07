import { SiteFooter } from '~/(marketing)/_components/site-footer';
import { SiteHeader } from '~/(marketing)/_components/site-header';
import { withI18n } from '~/lib/i18n/with-i18n';

function SiteLayout(props: React.PropsWithChildren) {
  return (
    <div className={'flex min-h-[100vh] flex-col'}>
      <SiteHeader />

      {props.children}

      <SiteFooter />
    </div>
  );
}

export default withI18n(SiteLayout);
