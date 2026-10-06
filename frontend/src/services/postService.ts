import type { ApiComment, ApiPost } from "../types/post";
import type {
  PostPrivacy,
  SocialComment,
  SocialPerson,
  SocialPost,
} from "../types/social";
import { API_URL, profileService } from "./profileService";

type Envelope<T> = { data: T };

// Neutral placeholder for users without an uploaded avatar.
const FALLBACK_AVATAR =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><rect width="96" height="96" fill="#C2DCFB"/><circle cx="48" cy="38" r="16" fill="#111827" opacity="0.25"/><rect x="20" y="60" width="56" height="40" rx="20" fill="#111827" opacity="0.25"/></svg>',
  );

function handleFrom(name: string, nickname: string) {
  const base = (nickname || name).replace(/^@/, "").replace(/\s+/g, "");
  return `@${base.toLowerCase() || "Socil Network"}`;
}

function avatarURL(path: string) {
  return path ? profileService.avatarURL(path) : FALLBACK_AVATAR;
}

// image_path may be a stored /media/... path or an absolute remote URL
// chosen from the composer's quick-pick gallery.
function imageURL(path: string) {
  if (!path) return "";
  return /^https?:\/\//.test(path) ? path : profileService.avatarURL(path);
}

export function toSocialPerson(
  id: number,
  name: string,
  avatarPath: string,
  nickname = "",
): SocialPerson {
  return {
    id,
    name: name || "Socil Network member",
    handle: handleFrom(name, nickname),
    avatar: avatarURL(avatarPath),
  };
}

export function toSocialComment(comment: ApiComment): SocialComment {
  return {
    id: String(comment.id),
    author: toSocialPerson(
      comment.author_id,
      comment.author_name,
      comment.author_avatar,
    ),
    text: comment.content,
    image: comment.image_path
      ? profileService.avatarURL(comment.image_path)
      : undefined,
    createdAt: comment.created_at,
  };
}

export function toSocialPost(post: ApiPost): SocialPost {
  return {
    id: String(post.id),
    author: toSocialPerson(
      post.author_id,
      post.author_name,
      post.author_avatar,
      post.author_nickname,
    ),
    caption: post.content,
    images: post.image_path ? [imageURL(post.image_path)] : [],
    location: "",
    privacy: post.privacy,
    audienceIDs: post.allowed_user_ids ?? [],
    createdAt: post.created_at,
    likes: 0,
    liked: false,
    comments: (post.comments ?? []).map(toSocialComment),
  };
}

async function postApi<T>(path: string, options: RequestInit = {}): Promise<T> {
  const isForm =
    typeof FormData !== "undefined" && options.body instanceof FormData;
  const response = await fetch(`${API_URL}${path}`, {
    credentials: "include",
    ...(!isForm
      ? { headers: { "Content-Type": "application/json", ...options.headers } }
      : {}),
    ...options,
  });

  const text = await response.text();
  let payload: unknown = text;
  try {
    payload = JSON.parse(text) as unknown;
  } catch {
    // Keep plain-text backend errors readable.
  }

  if (!response.ok) {
    const message =
      typeof payload === "string"
        ? payload
        : typeof payload === "object" && payload !== null && "error" in payload
          ? String(payload.error)
          : "Post request failed";
    const error = new Error(message) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }

  return payload as T;
}

export type NewPostInput = {
  content: string;
  privacy: PostPrivacy;
  allowedUserIDs?: number[];
  image?: File | null;
  imageUrl?: string;
};

export const postService = {
  toSocialPost,
  getFeed: () =>
    postApi<Envelope<ApiPost[]>>("/api/posts").then((response) =>
      (response.data ?? []).map(toSocialPost),
    ),
  getUserPosts: (userID: number | string) =>
    postApi<Envelope<ApiPost[]>>(`/api/users/${userID}/posts`).then(
      (response) => (response.data ?? []).map(toSocialPost),
    ),
  getPost: async (postID: number | string): Promise<SocialPost | null> => {
    try {
      const response = await postApi<Envelope<ApiPost>>(`/api/posts/${postID}`);
      return toSocialPost(response.data);
    } catch (error) {
      if ((error as { status?: number }).status === 403) return null;
      throw error;
    }
  },
  createPost: (input: NewPostInput) => {
    const form = new FormData();
    form.append("content", input.content);
    form.append("privacy", input.privacy);
    if (input.allowedUserIDs?.length) {
      form.append("allowed_user_ids", input.allowedUserIDs.join(","));
    }
    if (input.image) {
      form.append("image", input.image);
    } else if (input.imageUrl) {
      form.append("image_url", input.imageUrl);
    }
    return postApi<Envelope<ApiPost>>("/api/posts", {
      method: "POST",
      body: form,
    }).then((response) => response.data.id);
  },
  createComment: (
    postID: number | string,
    input: { content: string; image?: File | null },
  ) => {
    const form = new FormData();
    form.append("content", input.content);
    if (input.image) {
      form.append("image", input.image);
    }
    return postApi<Envelope<ApiComment>>(`/api/posts/${postID}/comments`, {
      method: "POST",
      body: form,
    }).then((response) => toSocialComment(response.data));
  },
  deletePost: (postID: number | string) =>
    postApi<Envelope<{ status: string }>>(`/api/posts/${postID}`, {
      method: "DELETE",
    }),
};
