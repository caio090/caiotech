import { Suspense } from "react";
import { ContentosSubNav } from "./_contentos-subnav";

function SubNavFallback() {
  return (
    <div className="h-11 mb-6 bg-purple-50 border border-purple-100 rounded-xl animate-pulse" />
  );
}

export async function ContentosSubNavServer({
  initialClientId,
}: { initialClientId?: string } = {}) {
  return (
    <Suspense fallback={<SubNavFallback />}>
      <ContentosSubNav initialClientId={initialClientId} />
    </Suspense>
  );
}
