"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

type NotificationContextType = {
  notifications: number;
  addNotification: () => void;
  resetNotifications: () => void;
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

  const addNotification = () => {
    setNotifications((prev) => prev + 1);
  };

  const resetNotifications = () => {
    setNotifications(0);
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        addNotification,
        resetNotifications,
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
