export type GroupInvite = {
  group_id: number;
  title: string;
  description: string;
  creator_id: number;
  creator_first_name: string;
  creator_last_name: string;
  created_at: string;
};

export type GroupSummary = {
  id: number;
  creator_id: number;
  title: string;
  description: string;
  created_at: string;
};

export type GroupMembershipStatus =
  | "none"
  | "member"
  | "pending_invite"
  | "pending_request";

export type GroupDiscovery = GroupSummary & {
  membership_status: GroupMembershipStatus;
  is_creator: boolean;
  member_count: number;
};

export type GroupMember = {
  id: number;
  first_name: string;
  last_name: string;
  avatar_path: string;
};

export type GroupJoinRequest = {
  user_id: number;
  first_name: string;
  last_name: string;
  avatar_path: string;
};

export type GroupComment = {
  id: number;
  post_id: number;
  author_id: number;
  author_name: string;
  author_avatar: string;
  content: string;
  created_at: string;
};

export type GroupPost = {
  id: number;
  group_id: number;
  author_id: number;
  author_name: string;
  author_avatar: string;
  content: string;
  created_at: string;
  comments: GroupComment[];
};

export type GroupEvent = {
  id: number;
  group_id: number;
  creator_id: number;
  creator_name: string;
  title: string;
  description: string;
  event_time: string;
  created_at: string;
  going_count: number;
  not_going_count: number;
  my_response: "" | "going" | "not_going";
};

export type GroupChatMessage = {
  id?: number;
  type?: "message_group";
  group_id: number;
  sender_id: number;
  sender_name: string;
  message: string;
  timestamp: string;
};
