"use client";
import React, { createContext, useContext, ReactNode } from "react";
import { useChat as useChatState } from "@/hooks/use-chat";

const ChatContext = createContext<ReturnType<typeof useChatState> | null>(null);

interface ChatProviderProps {
  children: ReactNode;
}

export function ChatProvider({ children }: ChatProviderProps) {
  const chat = useChatState();
  return <ChatContext.Provider value={chat}>{children}</ChatContext.Provider>;
}

export function useChatContext() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChatContext must be used within a ChatProvider");
  }
  return context;
}
