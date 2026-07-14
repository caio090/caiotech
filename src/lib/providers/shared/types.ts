export type ProviderStatus =
  | "not_configured"
  | "configured"
  | "testing"
  | "active"
  | "blocked"
  | "error"
  | "disabled";

export interface ProviderCapability {
  id: string;
  label: string;
  supported: boolean;
}

export interface ProviderHealth {
  status: "healthy" | "degraded" | "unreachable" | "unknown";
  latencyMs?: number;
  lastCheckedAt?: string;
  error?: string;
}

export interface ProviderError {
  code: string;
  message: string;
  retryable: boolean;
}

export interface ProviderContext {
  clientId: string;
  profileId: string;
  role: string;
  organizationId?: string;
}

export interface ProviderResult<T = void> {
  success: boolean;
  data?: T;
  error?: ProviderError;
}

export interface BaseProvider {
  readonly id: string;
  readonly name: string;
  readonly status: ProviderStatus;
  readonly capabilities: ProviderCapability[];
  readonly blocker?: string;
  healthCheck(): Promise<ProviderHealth>;
}

export type DesignFormat =
  | "feed_square"
  | "story_vertical"
  | "carousel"
  | "banner"
  | "ad"
  | "thumbnail"
  | "outdoor"
  | "presentation";

export interface DesignFormatSpec {
  id: DesignFormat;
  label: string;
  width: number;
  height: number;
  ratio: string;
}

export const DESIGN_FORMATS: DesignFormatSpec[] = [
  { id: "feed_square", label: "Feed", width: 1080, height: 1080, ratio: "1:1" },
  { id: "story_vertical", label: "Story", width: 1080, height: 1920, ratio: "9:16" },
  { id: "carousel", label: "Carrossel", width: 1080, height: 1350, ratio: "4:5" },
  { id: "banner", label: "Banner", width: 1200, height: 628, ratio: "1.91:1" },
  { id: "ad", label: "Anúncio", width: 1200, height: 628, ratio: "1.91:1" },
  { id: "thumbnail", label: "Thumbnail", width: 1280, height: 720, ratio: "16:9" },
  { id: "outdoor", label: "Outdoor", width: 3000, height: 2000, ratio: "3:2" },
  { id: "presentation", label: "Apresentação", width: 1920, height: 1080, ratio: "16:9" },
];

export type PublicationChannel =
  | "instagram_feed"
  | "instagram_story"
  | "instagram_reel"
  | "facebook_feed"
  | "tiktok"
  | "linkedin"
  | "youtube"
  | "pinterest"
  | "x"
  | "threads";

export type PublicationStatus =
  | "draft"
  | "internal_review"
  | "internal_approved"
  | "client_review"
  | "client_approved"
  | "ready_to_schedule"
  | "scheduled"
  | "published"
  | "failed";
