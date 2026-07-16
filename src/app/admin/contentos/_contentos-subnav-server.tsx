import { ContentosSubNav } from "./_contentos-subnav";

export async function ContentosSubNavServer({ initialClientId }: { initialClientId?: string } = {}) {
  return <ContentosSubNav initialClientId={initialClientId} />;
}
