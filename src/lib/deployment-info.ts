/**
 * Server-side-only deployment metadata for display on /admin/status.
 *
 * Reads only public, non-sensitive Vercel build metadata (VERCEL_ENV,
 * VERCEL_GIT_COMMIT_SHA, VERCEL_GIT_COMMIT_REF, VERCEL_URL) — never a
 * secret, token, or private env value. Must only be called from a Server
 * Component; the result is passed down as plain props.
 */

export type DeploymentEnvironmentLabel = "Production" | "Preview" | "Local";

export interface DeploymentInfo {
  environment: DeploymentEnvironmentLabel;
  branch: string | null;
  commitSha: string | null;
  commitShort: string | null;
  deploymentHost: string | null;
}

export function getDeploymentInfo(): DeploymentInfo {
  const vercelEnv = process.env.VERCEL_ENV;
  const environment: DeploymentEnvironmentLabel =
    vercelEnv === "production" ? "Production" : vercelEnv === "preview" ? "Preview" : "Local";

  const commitSha = process.env.VERCEL_GIT_COMMIT_SHA?.trim() || null;
  const branch = environment === "Production" ? "main" : process.env.VERCEL_GIT_COMMIT_REF?.trim() || null;
  const deploymentHost = process.env.VERCEL_URL?.trim() || null;

  return {
    environment,
    branch,
    commitSha,
    commitShort: commitSha ? commitSha.slice(0, 7) : null,
    deploymentHost,
  };
}
