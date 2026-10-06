import type { PostPrivacy, SocialPost } from "@/src/types/social";

const DRAFT_STORAGE_KEY = "vibe.social.drafts.v1";

export type SocialDraft = {
  id: string;
  caption: string;
  images: string[];
  location: string;
  privacy: PostPrivacy;
  audienceIDs: number[];
  category: string;
  tags: string[];
  updatedAt: string;
};

export const SELF: SocialPost["author"] = {
  id: 1,
  name: "Jordan Carter",
  handle: "@jordan_vibe",
  avatar:
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=160&q=85",
};

export function loadSocialDrafts(): SocialDraft[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = window.localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!stored) return [];
    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    return (parsed as Partial<SocialDraft>[]).map((draft) => ({
      id: draft.id ?? newSocialID("draft"),
      caption: draft.caption ?? "",
      images: Array.isArray(draft.images) ? draft.images : [],
      location: draft.location ?? "",
      privacy: draft.privacy ?? "public",
      audienceIDs: Array.isArray(draft.audienceIDs) ? draft.audienceIDs : [],
      category: typeof draft.category === "string" ? draft.category : "",
      tags: Array.isArray(draft.tags) ? draft.tags : [],
      updatedAt: draft.updatedAt ?? new Date().toISOString(),
    })) as SocialDraft[];
  } catch {
    return [];
  }
}

export function saveSocialDrafts(drafts: SocialDraft[]) {
  window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(drafts));
}

export function newSocialID(prefix: string) {
  return `${prefix}-${globalThis.crypto?.randomUUID?.() ?? Date.now()}`;
}
