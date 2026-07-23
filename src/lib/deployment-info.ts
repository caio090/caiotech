/**
 * Server-side-only deployment metadata for display on /admin/status.
 *
 * Reads only public, non-sensitive Vercel build metadata (VERCEL_ENV,
 * VERCEL_GIT_COMMIT_SHA, VERCEL_GIT_COMMIT_REF, VERCEL_URL,
 * VERCEL_DEPLOYMENT_ID) — never a secret, token, or private env value. Must
 * only be called from a Server Component; the result is passed down as
 * plain props.
 */

export type DeploymentEnvironmentLabel = "Production" | "Preview" | "Local";

export interface DeploymentInfo {
  environment: DeploymentEnvironmentLabel;
  branch: string | null;
  commitSha: string | null;
  commitShort: string | null;
  /** Real `dpl_...` deployment ID — only present when Vercel exposes
   * VERCEL_DEPLOYMENT_ID at runtime. Never derived from VERCEL_URL, which is
   * a hostname, not an ID (Fase 14 do hotfix canônico 1.0.1). */
  deploymentId: string | null;
  /** Fallback shown (labeled "Host do deployment", never "ID") when
   * deploymentId is unavailable. */
  deploymentHost: string | null;
}

export function getDeploymentInfo(): DeploymentInfo {
  const vercelEnv = process.env.VERCEL_ENV;
  const environment: DeploymentEnvironmentLabel =
    vercelEnv === "production" ? "Production" : vercelEnv === "preview" ? "Preview" : "Local";

  const commitSha = process.env.VERCEL_GIT_COMMIT_SHA?.trim() || null;
  const branch = environment === "Production" ? "main" : process.env.VERCEL_GIT_COMMIT_REF?.trim() || null;
  const deploymentId = process.env.VERCEL_DEPLOYMENT_ID?.trim() || null;
  const deploymentHost = process.env.VERCEL_URL?.trim() || null;

  return {
    environment,
    branch,
    commitSha,
    commitShort: commitSha ? commitSha.slice(0, 7) : null,
    deploymentId,
    deploymentHost,
  };
}
