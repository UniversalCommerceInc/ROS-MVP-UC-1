import { AppBreadcrumbs } from '@kit/ui/app-breadcrumbs';
import { PageHeader } from '@kit/ui/page';

import UserSettingsPage, { generateMetadata } from '../../(user)/settings/page';

export { generateMetadata };

export default function Page() {
  return (
    <>
      <PageHeader title={'User Settings'} description={<AppBreadcrumbs />} />
      <UserSettingsPage />
    </>
  );
}
