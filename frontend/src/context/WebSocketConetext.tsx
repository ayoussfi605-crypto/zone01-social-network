"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";

type WebSocketContextType = {
  conected: boolean;
  sendMessage: (message: string) => void;
  receiveMessage: (callback: (message: any) => void) => void;
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

  function sendMessage(message: string) {
    const ws = socketRef.current;

    if (!ws) {
      return;
    }
    if (ws.readyState !== ws.OPEN) {
      return;
    }
    ws.send(message);
  }

  function receiveMessage(callback: (message: any) => void) {
    console.log("receiveMessage called");
    const ws = socketRef.current;

    if (!ws) {
      return;
    }
    if (ws.readyState !== ws.OPEN) {
      return;
    }
    console.log("receiveMessage called and ws is open");
    ws.onmessage = (event) => {
      console.log(
        "receiveMessage called and ws is open and message received",
        event.data,
      );
      const data = JSON.parse(event.data);

      console.log("Received message:", data);
      callback(data);
    };
  }

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
