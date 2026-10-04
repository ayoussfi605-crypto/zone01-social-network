import type { User } from "./user";

export type FollowStatus = "none" | "pending" | "accepted";

export interface UserProfile {
  user: User;
  restricted: boolean;
  follow_status: FollowStatus;
}

export interface FollowerSummary {
  id: number;
  first_name: string;
  last_name: string;
  avatar_path: string;
  nickname: string;
  online: boolean;
}
