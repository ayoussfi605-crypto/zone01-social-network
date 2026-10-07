"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useWebSocket } from "./WebSocketConetext";
import { authService } from "../services/authService";

type NotificationContextType = {
  notifications: number;
  resetNotifications: () => void;
  messagesCount: number;
  resetMessages: () => void;
};

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined,
);

export function NotificationCounter({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const [notifications, setNotifications] = useState(0);
  const [messagesCount, setMessagesCount] = useState(0);

  const ws = useWebSocket();

  useEffect(() => {
    return ws.receiveMessage(async (e) => {
      if (e.type === "notification") {
        setNotifications((prev) => prev + 1);
      }

      if (e.type == "message_private") {
        console.log("here is privite message ", e.type);

        const user_id = await (async () => {
          const res = await authService.me();
          return res.data.id;
        })();

        if (e.receiver_id == user_id) {
          setMessagesCount((prev) => prev + 1);
        }
      }
      if (e.type == "message") {
        console.log("here message ", e.type);

        const user_id = await (async () => {
          const res = await authService.me();
          return res.data.id;
        })();

        // if (e.receiver_id == user_id) {
        setMessagesCount((prev) => prev + 1);
        // }
      }
    });
  }, [ws]);

  const resetNotifications = () => {
    setNotifications(0);
  };
  const resetMessages = () => {
    setMessagesCount(0);
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        resetNotifications,
        messagesCount,
        resetMessages,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);

  if (context === undefined) {
    throw new Error("useNotifications must be used inside NotificationCounter");
  }

  return context;
}
