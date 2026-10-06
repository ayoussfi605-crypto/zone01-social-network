export type NotificationType =
  | "follow_request"
  | "group_invite"
  | "group_join_request"
  | "group_event";

export type AppNotification = {
  id: number;
  user_id: number;
  type: NotificationType | string;
  actor_id: number;
  actor_name: string;
  actor_avatar: string;
  group_id?: number;
  group_title?: string;
  event_id?: number;
  event_title?: string;
  text: string;
  is_read: boolean;
  created_at: string;
};
