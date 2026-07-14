import type {
  BaseProvider,
  ProviderCapability,
  ProviderContext,
  ProviderHealth,
  ProviderResult,
  PublicationChannel,
  PublicationStatus,
} from "../shared/types";

export interface ScheduledPost {
  id: string;
  clientId: string;
  contentId: string;
  channel: PublicationChannel;
  scheduledAt: string;
  status: PublicationStatus;
  externalPostId?: string;
  publishedAt?: string;
  errorMessage?: string;
}

export interface ChannelInfo {
  id: PublicationChannel;
  label: string;
  connected: boolean;
  capabilities: string[];
}

export interface SocialSchedulerProvider extends BaseProvider {
  listChannels(ctx: ProviderContext): Promise<ProviderResult<ChannelInfo[]>>;
  createDraft(
    ctx: ProviderContext,
    contentId: string,
    channel: PublicationChannel,
    scheduledAt: string
  ): Promise<ProviderResult<ScheduledPost>>;
  schedule(ctx: ProviderContext, postId: string): Promise<ProviderResult<ScheduledPost>>;
  publish(ctx: ProviderContext, postId: string): Promise<ProviderResult<ScheduledPost>>;
  cancel(ctx: ProviderContext, postId: string): Promise<ProviderResult<void>>;
  getStatus(ctx: ProviderContext, postId: string): Promise<ProviderResult<ScheduledPost>>;
  getMetrics(ctx: ProviderContext, postId: string): Promise<ProviderResult<Record<string, number>>>;
}

const NOT_CONFIGURED_ERROR: ProviderResult<never> = {
  success: false,
  error: {
    code: "PROVIDER_NOT_CONFIGURED",
    message:
      "Social Scheduler não configurado. Provisione o Postiz e configure a integração.",
    retryable: false,
  },
};

const ALL_CHANNELS: PublicationChannel[] = [
  "instagram_feed",
  "instagram_story",
  "instagram_reel",
  "facebook_feed",
  "tiktok",
  "linkedin",
  "youtube",
  "pinterest",
  "x",
  "threads",
];

class PostizDisabledProvider implements SocialSchedulerProvider {
  readonly id = "postiz-disabled";
  readonly name = "Postiz (não configurado)";
  readonly status = "not_configured" as const;
  readonly blocker =
    "Postiz requer serviço self-hosted separado (VPS + Docker + Temporal). Configure a instância antes de ativar.";
  readonly capabilities: ProviderCapability[] = [
    { id: "feed", label: "Feed", supported: false },
    { id: "story", label: "Story", supported: false },
    { id: "reel", label: "Reel", supported: false },
    { id: "carousel", label: "Carrossel", supported: false },
    { id: "video", label: "Vídeo", supported: false },
    { id: "text", label: "Texto", supported: false },
    { id: "image", label: "Imagem", supported: false },
    { id: "schedule", label: "Agendar", supported: false },
    { id: "publish", label: "Publicar", supported: false },
    { id: "cancel", label: "Cancelar", supported: false },
    { id: "metrics", label: "Métricas", supported: false },
    { id: "webhooks", label: "Webhooks", supported: false },
  ];

  async healthCheck(): Promise<ProviderHealth> {
    return { status: "unknown", error: "Serviço não configurado" };
  }

  async listChannels(): Promise<ProviderResult<ChannelInfo[]>> {
    return {
      success: true,
      data: ALL_CHANNELS.map((id) => ({
        id,
        label: id.replace(/_/g, " "),
        connected: false,
        capabilities: [],
      })),
    };
  }

  async createDraft() { return NOT_CONFIGURED_ERROR; }
  async schedule() { return NOT_CONFIGURED_ERROR; }
  async publish() { return NOT_CONFIGURED_ERROR; }
  async cancel() { return NOT_CONFIGURED_ERROR; }
  async getStatus() { return NOT_CONFIGURED_ERROR; }
  async getMetrics() { return NOT_CONFIGURED_ERROR; }
}

export const POSTIZ_REVIEW_ENTRY = {
  id: "postiz",
  name: "Postiz",
  license: "AGPL-3.0",
  decision: "external_service_candidate",
  architecture: "NestJS + Prisma + Temporal + PostgreSQL + Redis",
  requiresDocker: true,
  requiresVPS: true,
  hasRestApi: true,
  hasSdk: true,
  sdkPackage: "@postiz/node",
  hasWebhooks: true,
  channels: [
    "Instagram",
    "YouTube",
    "LinkedIn",
    "TikTok",
    "Facebook",
    "Pinterest",
    "Threads",
    "X",
    "Slack",
    "Discord",
    "Mastodon",
    "Bluesky",
    "Reddit",
    "Dribbble",
  ],
  notes:
    "AGPL-3.0 — não incorporar código no LOKAT OS. Usar apenas via API REST e SDK @postiz/node como serviço externo.",
};

export function getSocialSchedulerProvider(): SocialSchedulerProvider {
  return new PostizDisabledProvider();
}
