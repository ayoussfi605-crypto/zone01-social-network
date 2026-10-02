export interface ChatMessage {
  id: string;
  sender: string;
  content: string;
  timestamp: Date;
  type: "text" | "notification";
}

export interface ChatUsers {
  id: string;
  name: string;
  fullName: string;
  handle: string;
  avatar: string;
  time: string;
  lastMessage: string;
  unread: number;
  online: boolean;
  // coverPhoto: string;
}
