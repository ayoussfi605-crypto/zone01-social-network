"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";

type WebSocketContextType = {
  conected: boolean;
  snedMessage: (message: string) => void;
};

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export function WsProdider({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const socketRef = useRef<WebSocket | null>(null);
  const [conected, setconected] = useState<boolean>(false);

  useEffect(() => {
    const ws = new WebSocket("ws://localhost:8080/api/ws");
    socketRef.current = ws;

    ws.onopen = () => {
      console.log("heloo websocket");
      setconected(true);
    };
    ws.onclose = () => {
      console.log("WebSocket disconnected");
      setconected(false);
    };

    ws.onerror = (e) => {
      console.log("WebSocket err", e);
    };
    return () => {
      ws.close();
      socketRef.current = null;
    };
  }, []);

  function snedMessage(message: string) {
    const ws = socketRef.current;

    if (!ws) {
      return;
    }
    if (ws.readyState !== ws.OPEN) {
      return;
    }
    ws.send(message);
  }

  return (
    <>
      <WebSocketContext.Provider
        value={{
          conected,
          snedMessage,
        }}
      >
        {children}
      </WebSocketContext.Provider>
      ;
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
