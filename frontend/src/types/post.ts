import type { PostPrivacy } from "./social";

export type ApiComment = {
  id: number;
  post_id: number;
  author_id: number;
  author_name: string;
  author_avatar: string;
  author_nickname: string;
  content: string;
  image_path: string;
  created_at: string;
};

export type ApiPost = {
  id: number;
  author_id: number;
  author_name: string;
  author_avatar: string;
  author_nickname: string;
  content: string;
  image_path: string;
  privacy: PostPrivacy;
  created_at: string;
  comments: ApiComment[];
  comment_count: number;
  allowed_user_ids?: number[];
};
