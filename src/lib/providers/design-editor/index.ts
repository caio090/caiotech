import type {
  BaseProvider,
  ProviderCapability,
  ProviderContext,
  ProviderHealth,
  ProviderResult,
  DesignFormat,
} from "../shared/types";

export interface DesignProject {
  id: string;
  clientId: string;
  title: string;
  format: DesignFormat;
  width: number;
  height: number;
  status: "draft" | "in_review" | "approved" | "archived";
  createdAt: string;
  updatedAt: string;
}

export interface DesignVersion {
  id: string;
  projectId: string;
  version: number;
  previewUrl?: string;
  createdBy: string;
  createdAt: string;
  providerData?: Record<string, unknown>;
}

export interface DesignEditorProvider extends BaseProvider {
  createProject(
    ctx: ProviderContext,
    format: DesignFormat,
    title: string
  ): Promise<ProviderResult<DesignProject>>;
  loadProject(ctx: ProviderContext, projectId: string): Promise<ProviderResult<DesignProject>>;
  saveDraft(
    ctx: ProviderContext,
    projectId: string,
    data: Record<string, unknown>
  ): Promise<ProviderResult<DesignVersion>>;
  createVersion(ctx: ProviderContext, projectId: string): Promise<ProviderResult<DesignVersion>>;
  restoreVersion(ctx: ProviderContext, versionId: string): Promise<ProviderResult<DesignProject>>;
  generatePreview(ctx: ProviderContext, projectId: string): Promise<ProviderResult<{ url: string }>>;
  exportProject(
    ctx: ProviderContext,
    projectId: string,
    format: "png" | "jpg" | "pdf"
  ): Promise<ProviderResult<{ url: string }>>;
}

const DISABLED_CAPABILITIES: ProviderCapability[] = [
  { id: "canvas", label: "Canvas", supported: false },
  { id: "text", label: "Texto", supported: false },
  { id: "images", label: "Imagens", supported: false },
  { id: "shapes", label: "Formas", supported: false },
  { id: "layers", label: "Camadas", supported: false },
  { id: "templates", label: "Templates", supported: false },
  { id: "brandAssets", label: "Assets de marca", supported: false },
  { id: "autosave", label: "Autosave", supported: false },
  { id: "versions", label: "Versões", supported: false },
  { id: "pngExport", label: "Exportar PNG", supported: false },
  { id: "jpgExport", label: "Exportar JPG", supported: false },
  { id: "pdfExport", label: "Exportar PDF", supported: false },
];

const NOT_CONFIGURED_ERROR: ProviderResult<never> = {
  success: false,
  error: {
    code: "PROVIDER_DISABLED",
    message: "EditorOS não configurado. Aguardando decisão de licença.",
    retryable: false,
  },
};

class DisabledDesignEditorProvider implements DesignEditorProvider {
  readonly id = "disabled";
  readonly name = "EditorOS (não configurado)";
  readonly status = "disabled" as const;
  readonly blocker =
    "Nenhum motor de design foi configurado. Aguardando validação de licença (LidoJS ou CE.SDK).";
  readonly capabilities = DISABLED_CAPABILITIES;

  async healthCheck(): Promise<ProviderHealth> {
    return { status: "unknown", error: "Provider não configurado" };
  }
  async createProject() { return NOT_CONFIGURED_ERROR; }
  async loadProject() { return NOT_CONFIGURED_ERROR; }
  async saveDraft() { return NOT_CONFIGURED_ERROR; }
  async createVersion() { return NOT_CONFIGURED_ERROR; }
  async restoreVersion() { return NOT_CONFIGURED_ERROR; }
  async generatePreview() { return NOT_CONFIGURED_ERROR; }
  async exportProject() { return NOT_CONFIGURED_ERROR; }
}

class MockDesignEditorProvider implements DesignEditorProvider {
  readonly id = "mock";
  readonly name = "EditorOS (modo avaliação)";
  readonly status = "testing" as const;
  readonly blocker = "Motor mock para avaliação. Não usar em produção. Sem persistência real.";
  readonly capabilities: ProviderCapability[] = [
    { id: "canvas", label: "Canvas", supported: true },
    { id: "text", label: "Texto", supported: true },
    { id: "images", label: "Imagens", supported: true },
    { id: "shapes", label: "Formas", supported: true },
    { id: "layers", label: "Camadas", supported: false },
    { id: "templates", label: "Templates", supported: false },
    { id: "brandAssets", label: "Assets de marca", supported: false },
    { id: "autosave", label: "Autosave", supported: false },
    { id: "versions", label: "Versões", supported: true },
    { id: "pngExport", label: "Exportar PNG", supported: false },
    { id: "jpgExport", label: "Exportar JPG", supported: false },
    { id: "pdfExport", label: "Exportar PDF", supported: false },
  ];

  async healthCheck(): Promise<ProviderHealth> {
    return { status: "healthy", latencyMs: 0, lastCheckedAt: new Date().toISOString() };
  }

  async createProject(
    ctx: ProviderContext,
    format: DesignFormat,
    title: string
  ): Promise<ProviderResult<DesignProject>> {
    return {
      success: true,
      data: {
        id: `mock_${Date.now()}`,
        clientId: ctx.clientId,
        title,
        format,
        width: 1080,
        height: 1080,
        status: "draft",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };
  }

  async loadProject(ctx: ProviderContext, projectId: string): Promise<ProviderResult<DesignProject>> {
    return {
      success: true,
      data: {
        id: projectId,
        clientId: ctx.clientId,
        title: "Rascunho (mock)",
        format: "feed_square",
        width: 1080,
        height: 1080,
        status: "draft",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };
  }

  async saveDraft(ctx: ProviderContext, projectId: string): Promise<ProviderResult<DesignVersion>> {
    return {
      success: true,
      data: {
        id: `v_${Date.now()}`,
        projectId,
        version: 1,
        createdBy: ctx.profileId,
        createdAt: new Date().toISOString(),
      },
    };
  }

  async createVersion(ctx: ProviderContext, projectId: string): Promise<ProviderResult<DesignVersion>> {
    return {
      success: true,
      data: {
        id: `v_${Date.now()}`,
        projectId,
        version: 1,
        createdBy: ctx.profileId,
        createdAt: new Date().toISOString(),
      },
    };
  }

  async restoreVersion(): Promise<ProviderResult<DesignProject>> {
    return {
      success: false,
      error: { code: "NOT_IMPLEMENTED", message: "Restauração indisponível no modo mock", retryable: false },
    };
  }

  async generatePreview(): Promise<ProviderResult<{ url: string }>> {
    return {
      success: false,
      error: { code: "NOT_IMPLEMENTED", message: "Preview indisponível no modo mock", retryable: false },
    };
  }

  async exportProject(): Promise<ProviderResult<{ url: string }>> {
    return {
      success: false,
      error: { code: "NOT_IMPLEMENTED", message: "Exportação indisponível no modo mock", retryable: false },
    };
  }
}

export const LIDO_REVIEW_ENTRY = {
  id: "lido-review",
  name: "LidoJS (canva-clone)",
  status: "blocked" as const,
  decision: "architecture_reference",
  licenseStatus: "license_review_required",
  blocker:
    "Repositório sem arquivo LICENSE. GitHub API retorna license:null. Todos os direitos reservados por padrão. Requer validação jurídica.",
};

export const CESDK_REVIEW_ENTRY = {
  id: "cesdk-review",
  name: "CE.SDK (img.ly)",
  status: "blocked" as const,
  decision: "commercial_sdk_candidate",
  licenseStatus: "commercial_license_required",
  blocker:
    "SDK proprietário da img.ly. Requer licença comercial. Trial gratuito disponível para avaliação técnica.",
};

export function getDesignEditorProvider(mode?: "mock"): DesignEditorProvider {
  if (mode === "mock") return new MockDesignEditorProvider();
  return new DisabledDesignEditorProvider();
}
