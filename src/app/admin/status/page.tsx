import { getDeploymentInfo } from "@/lib/deployment-info";
import StatusPageClient from "./_status-client";

export default function StatusPage() {
  const deploymentInfo = getDeploymentInfo();
  return <StatusPageClient deploymentInfo={deploymentInfo} />;
}
