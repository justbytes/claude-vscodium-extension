import * as vscode from "vscode";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface Chat {
  id: string;
  messages: ChatMessage[];
  createdAt: string;
  title: string;
}

export class ChatStorage {
  constructor(private storage: vscode.Memento) {}

  private async getChats(): Promise<{ [key: string]: Chat }> {
    return this.storage.get("chats", {});
  }

  private async saveChats(chats: { [key: string]: Chat }): Promise<void> {
    await this.storage.update("chats", chats);
  }

  async createChat(): Promise<Chat> {
    const chats = await this.getChats();
    const newChat: Chat = {
      id: Date.now().toString(),
      messages: [],
      createdAt: new Date().toISOString(),
      title: `Chat ${Object.keys(chats).length + 1}`,
    };
    chats[newChat.id] = newChat;
    await this.saveChats(chats);
    return newChat;
  }

  async getChat(id: string): Promise<Chat | undefined> {
    const chats = await this.getChats();
    return chats[id];
  }

  async getAllChats(): Promise<Chat[]> {
    const chats = await this.getChats();
    return Object.values(chats).sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async addMessageToChat(chatId: string, message: ChatMessage): Promise<void> {
    const chats = await this.getChats();
    if (chats[chatId]) {
      chats[chatId].messages.push(message);
      await this.saveChats(chats);
    }
  }
}
