/**
 * Sprint Recovery 2.1.3 — configuração canônica do ambiente local de QA.
 * Única fonte da verdade para porta/URL de QA e de Production local; nenhum
 * script ou doc deve redigitar esses valores separadamente.
 *
 * Importado tanto por scripts Node standalone (`scripts/qa-*.ts`, via
 * import relativo com extensão `.ts` explícita — Node 24 native type
 * stripping exige isso para módulos locais) quanto, no futuro, por UI.
 */

export interface LocalQaConfig {
  projectName: string;
  qaHost: string;
  qaPort: number;
  qaBaseUrl: string;
  productionLocalPort: number;
  productionLocalBaseUrl: string;
  freeDevPort: number;
  timezone: string;
  expectedRoutes: string[];
  expectedUnauthenticatedStatus: {
    root: number;
    adminRedirect: number;
  };
  logDirectory: string;
  sessionFile: string;
}

export const LOCAL_QA_CONFIG: LocalQaConfig = {
  projectName: "LOKAT OS",
  qaHost: "127.0.0.1",
  qaPort: 3100,
  qaBaseUrl: "http://127.0.0.1:3100",
  productionLocalPort: 3200,
  productionLocalBaseUrl: "http://127.0.0.1:3200",
  freeDevPort: 3000,
  timezone: "America/Fortaleza",
  expectedRoutes: [
    "/",
    "/admin/dashboard",
    "/admin/ecossistema",
    "/admin/meu-negocio",
    "/admin/contentos",
    "/admin/relatorios",
    "/admin/calendario",
    "/admin/visualizar",
  ],
  expectedUnauthenticatedStatus: {
    root: 200,
    adminRedirect: 307,
  },
  logDirectory: ".tmp",
  sessionFile: ".tmp/local-qa-session.json",
};

/** 3000 nunca pode ser citado como ambiente oficial de QA (Fase "Regra das Portas"). */
export function isOfficialQaPort(port: number): boolean {
  return port === LOCAL_QA_CONFIG.qaPort;
}
