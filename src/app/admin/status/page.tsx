import { getDeploymentInfo } from "@/lib/deployment-info";
import { getRecentLktActivity, getLatestMovement } from "@/lib/lkt-activity/store";
import StatusPageClient from "./_status-client";

export default function StatusPage() {
  const deploymentInfo = getDeploymentInfo();
  const activity = getRecentLktActivity(20);
  const latestMovement = getLatestMovement();
  return (
    <StatusPageClient
      deploymentInfo={deploymentInfo}
      activity={activity}
      latestMovement={latestMovement}
    />
  );
}
