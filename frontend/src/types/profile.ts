import type { User } from "./user";

export type FollowStatus = "none" | "pending" | "accepted";

export interface ProfileStats {
  post_count: number;
  follower_count: number;
  following_count: number;
}

export interface UserProfile {
  user: User;
  restricted: boolean;
  follow_status: FollowStatus;
  stats: ProfileStats;
}

export interface FollowerSummary {
  id: number;
  first_name: string;
  last_name: string;
  avatar_path: string;
  nickname: string;
  online: boolean;
}

export interface DiscoverableUser extends FollowerSummary {
  follow_status: FollowStatus;
}

export interface UserDiscoveryPage {
  users: DiscoverableUser[];
  has_more: boolean;
}
