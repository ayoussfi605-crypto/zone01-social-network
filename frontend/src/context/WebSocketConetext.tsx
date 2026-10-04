"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { ChatEvent } from "../types/chat";

type WebSocketContextType = {
  conected: boolean;
  sendMessage: (message: string) => void;
  receiveMessage: (callback: (message: ChatEvent) => void) => () => void;
};

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export function WsProdider({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const socketRef = useRef<WebSocket | null>(null);
  const messageListeners = useRef(new Set<(message: ChatEvent) => void>());
  const [conected, setconected] = useState<boolean>(false);

  useEffect(() => {
    let disposed = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
    let currentSocket: WebSocket | null = null;

    const connect = () => {
      if (disposed) return;

      const ws = new WebSocket("ws://localhost:8080/api/ws");
      currentSocket = ws;
      socketRef.current = ws;

      ws.onopen = () => setconected(true);
      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as ChatEvent;
          messageListeners.current.forEach((listener) => listener(message));
        } catch (error) {
          console.error("Invalid websocket message:", error);
        }
      };
      ws.onclose = () => {
        if (socketRef.current === ws) socketRef.current = null;
        setconected(false);
        if (!disposed) {
          reconnectTimer = setTimeout(connect, 1500);
        }
      };
      ws.onerror = () => ws.close();
    };

    connect();

    return () => {
      disposed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      currentSocket?.close();
      socketRef.current = null;
    };
  }, []);

  const sendMessage = useCallback((message: string) => {
    const ws = socketRef.current;

    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(message);
  }, []);

  const receiveMessage = useCallback(
    (callback: (message: ChatEvent) => void) => {
      messageListeners.current.add(callback);
      return () => {
        messageListeners.current.delete(callback);
      };
    },
    [],
  );

  return (
    <>
      <WebSocketContext.Provider
        value={{
          conected,
          sendMessage,
          receiveMessage,
        }}
      >
        {children}
      </WebSocketContext.Provider>
    </>
  );
}

export function useWebSocket() {
  const context = useContext(WebSocketContext);

  if (!context) {
    throw new Error("useWebSocket must be used inside WebSocketProvider");
  }

  return context;
}
