export interface ChatMessage {
  id: string;
  sender: string;
  content: string;
  timestamp: Date;
  type: "text" | "notification";
}
