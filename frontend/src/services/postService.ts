import type { ApiComment, ApiPost } from "../types/post";
import type {
  PostPrivacy,
  SocialComment,
  SocialPerson,
  SocialPost,
} from "../types/social";
import { API_URL, profileService } from "./profileService";

type Envelope<T> = { data: T };

const FALLBACK_AVATAR =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><rect width="96" height="96" fill="#C2DCFB"/><circle cx="48" cy="38" r="16" fill="#111827" opacity="0.25"/><rect x="20" y="60" width="56" height="40" rx="20" fill="#111827" opacity="0.25"/></svg>',
  );

function handleFrom(name: string, nickname: string) {
  const base = (nickname || name).replace(/^@/, "").replace(/\s+/g, "");
  return `@${base.toLowerCase() || "user"}`;
}

function avatarURL(path: string) {
  return path ? profileService.avatarURL(path) : FALLBACK_AVATAR;
}

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
    name: name || "Member",
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
      comment.author_nickname,
    ),
    text: comment.content,
    image: comment.image_path ? imageURL(comment.image_path) : undefined,
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
    image: imageURL(post.image_path),
    privacy: post.privacy,
    audienceIDs: post.allowed_user_ids ?? [],
    createdAt: post.created_at,
    comments: (post.comments ?? []).map(toSocialComment),
    commentCount: post.comment_count ?? 0,
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
  getPost: async (
    postID: number | string,
  ): Promise<{ post: SocialPost | null; reason: "ok" | "forbidden" | "not_found" | "error" }> => {
    try {
      const response = await postApi<Envelope<ApiPost>>(`/api/posts/${postID}`);
      return { post: toSocialPost(response.data), reason: "ok" };
    } catch (error) {
      const status = (error as { status?: number }).status;
      if (status === 403) return { post: null, reason: "forbidden" };
      if (status === 404) return { post: null, reason: "not_found" };
      return { post: null, reason: "error" };
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
