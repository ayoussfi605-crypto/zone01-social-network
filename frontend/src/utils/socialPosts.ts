import type { SocialPost } from "@/src/types/social";

const STORAGE_KEY = "vibe.social.posts.v1";

export const SELF: SocialPost["author"] = {
  id: 1,
  name: "Jordan Carter",
  handle: "@jordan_vibe",
  avatar:
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=160&q=85",
};

const STARTER_POSTS: SocialPost[] = [
  {
    id: "vibe-post-1",
    author: {
      id: 2,
      name: "Noah Bennett",
      handle: "@noahbennett",
      avatar:
        "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=160&q=85",
    },
    caption: "A slower morning, a longer walk, and nowhere else to be.",
    images: [
      "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1200&q=90",
    ],
    location: "Lake Bled, Slovenia",
    privacy: "public",
    audienceIDs: [],
    createdAt: "2026-10-04T09:20:00.000Z",
    likes: 248,
    liked: false,
    comments: [
      {
        id: "comment-1",
        author: SELF,
        text: "This feels like a deep breath.",
        createdAt: "2026-10-04T10:04:00.000Z",
      },
      {
        id: "comment-2",
        author: {
          id: 3,
          name: "Amara Okafor",
          handle: "@amaraokafor",
          avatar:
            "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=160&q=85",
        },
        text: "Adding this to my list.",
        createdAt: "2026-10-04T10:17:00.000Z",
      },
    ],
  },
  {
    id: "vibe-post-2",
    author: {
      id: 3,
      name: "Amara Okafor",
      handle: "@amaraokafor",
      avatar:
        "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=160&q=85",
    },
    caption: "Found a little color tucked between the city blocks.",
    images: [
      "https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=1200&q=90",
    ],
    location: "Brooklyn, New York",
    privacy: "public",
    audienceIDs: [],
    createdAt: "2026-10-03T18:05:00.000Z",
    likes: 96,
    liked: true,
    comments: [],
  },
  {
    id: "vibe-post-3",
    author: {
      id: 4,
      name: "Theo Martin",
      handle: "@theomartin",
      avatar:
        "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=160&q=85",
    },
    caption: "Golden hour did all the work today.",
    images: [
      "https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?auto=format&fit=crop&w=1200&q=90",
    ],
    location: "Big Sur, California",
    privacy: "public",
    audienceIDs: [],
    createdAt: "2026-10-02T16:42:00.000Z",
    likes: 412,
    liked: false,
    comments: [],
  },
];

export function loadSocialPosts(): SocialPost[] {
  if (typeof window === "undefined") return STARTER_POSTS;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return STARTER_POSTS;
    const parsed: unknown = JSON.parse(stored);
    return Array.isArray(parsed) ? (parsed as SocialPost[]) : STARTER_POSTS;
  } catch {
    return STARTER_POSTS;
  }
}

export function saveSocialPosts(posts: SocialPost[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
  window.dispatchEvent(new Event("vibe-social-posts-updated"));
}

export function canViewSocialPost(
  post: SocialPost,
  viewerID: number,
  followingIDs: number[],
) {
  if (post.author.id === viewerID || post.privacy === "public") return true;
  if (post.privacy === "almost_private") {
    return followingIDs.includes(post.author.id);
  }
  return post.audienceIDs.includes(viewerID);
}

export function subscribeToSocialPosts(onUpdate: () => void) {
  window.addEventListener("vibe-social-posts-updated", onUpdate);
  window.addEventListener("storage", onUpdate);
  return () => {
    window.removeEventListener("vibe-social-posts-updated", onUpdate);
    window.removeEventListener("storage", onUpdate);
  };
}

export function newSocialID(prefix: string) {
  return `${prefix}-${globalThis.crypto?.randomUUID?.() ?? Date.now()}`;
}
