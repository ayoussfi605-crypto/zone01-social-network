"use client";

import { useWebSocket } from "@/src/context/WebSocketConetext";
import { ChangeEvent, useState } from "react";

export function ChatWindow() {
  const [Message, setMessage] = useState<string>("");

  const ws = useWebSocket();
  function HandleChange(e: ChangeEvent<HTMLInputElement, HTMLInputElement>) {
    const { value } = e.target;
    setMessage(value);
  }

  function HAndleSend() {
    ws.snedMessage(Message);
  }
  return (
    <>
      <h1>ChatWindow</h1>
      <input
        type="text"
        onChange={(e) => {
          HandleChange(e);
        }}
      />
      <button onClick={HAndleSend}>send</button>
    </>
  );
}
