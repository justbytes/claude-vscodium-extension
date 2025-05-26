import * as vscode from 'vscode';
import Anthropic from '@anthropic-ai/sdk';
import { Chat, ChatMessage, ChatArchive } from './ChatArchive';
import { initialWebviewContext } from './static/chatLayout';

export class App {
  private static _current: App | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private readonly _anthropic: Anthropic;
  private readonly _chatStorage: ChatArchive;
  private _currentChat: Chat;
  private _disposables: vscode.Disposable[] = [];
  private _attachmentStorage: Map<string, Buffer> | undefined;

  private constructor(
    extensionUri: vscode.Uri,
    anthropic: Anthropic,
    chatStorage: ChatArchive,
    currentChat: Chat
  ) {
    this._panel = vscode.window.createWebviewPanel(
      'claudeChat',
      'Chat with Claude',
      vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'src')],
      }
    );

    this._anthropic = anthropic;
    this._chatStorage = chatStorage;
    this._currentChat = currentChat;

    // Set initial content
    initialWebviewContext(extensionUri, this._panel, this._currentChat);

    // Listen for panel disposal
    this._panel.onDidDispose(() => this._onDispose(), null, this._disposables);

    // Handle messages from webview
    this._panel.webview.onDidReceiveMessage(
      async message => {
        // Add debugging
        console.log('Extension received message:', message.command);

        switch (message.command) {
          case 'sendMessage':
            await this._handleSendMessage(message.text);
            break;

          case 'createNewChat':
            await this._handleCreateNewChat();
            break;

          case 'loadChat':
            await this._handleLoadChat(message.chatId);
            break;

          case 'getAllChats':
            await this._handleGetAllChats();
            break;

          case 'deleteChat':
            await this._handleDeleteChat(message.chatId);
            break;

          case 'confirmDeleteChat':
            await this._handleConfirmDeleteChat(message.chatId);
            break;
          case 'attachFile':
            await this._handleFileAttachment(
              message.fileName,
              message.fileContent,
              message.fileType
            );
            break;

          default:
            console.log('Unknown command received:', message.command);
            break;
        }
      },
      null,
      this._disposables
    );
  }

  public static async createOrShow(
    extensionUri: vscode.Uri,
    chatStorage: ChatArchive
  ): Promise<void> {
    const config = vscode.workspace.getConfiguration('claudeAI');
    const apiKey = config.get<string>('apiKey');

    if (!apiKey) {
      vscode.window.showErrorMessage('Please set your Claude API key in settings');
      return;
    }

    const anthropic = new Anthropic({ apiKey });

    // If we already have a panel, show it
    if (App._current) {
      App._current._panel.reveal(vscode.ViewColumn.Beside);
      return;
    }

    // Try to get all chats and find the most recent one
    let currentChat: Chat;
    try {
      const allChats = await chatStorage.getAllChats();

      if (allChats.length > 0) {
        // Chats are already sorted by creation date (newest first)
        currentChat = allChats[0];
      } else {
        // Create a new chat if none exists
        currentChat = await chatStorage.createChat();
      }
    } catch (error) {
      console.error('Error loading chats:', error);
      // Create a new chat if there was an error
      currentChat = await chatStorage.createChat();
    }

    // Create new panel instance
    App._current = new App(extensionUri, anthropic, chatStorage, currentChat);
  }

  private async _handleSendMessage(text: string): Promise<void> {
    try {
      // Get all existing chat messages
      const allMessages = this._currentChat.messages;

      // Initialize context with system prompt
      let systemPrompt = `You are Claude, an AI assistant integrated into VSCode.
You excel at helping users with coding tasks, explanations, and software development.
You should provide contextually relevant, concise, and accurate responses.

When dealing with code:
- Explain your reasoning step-by-step
- Suggest best practices and optimizations
- Format code blocks with proper syntax highlighting using markdown
- Be specific about language and framework versions when relevant

You're viewing a code project in VSCode. The user's current context is a Claude extension for VSCode.`;

      // Advanced context management approach
      let contextMessages: ChatMessage[] = [];

      // Always include the first message if it exists (may contain context/setup)
      if (allMessages.length > 0) {
        contextMessages.push(allMessages[0]);
      }

      // Intelligent context selection
      if (allMessages.length > 1) {
        // Parameters for context management
        const MAX_CONTEXT_MESSAGES = 10;
        const MAX_TOKENS_ESTIMATE = 4000; // Conservative estimate
        const RECENCY_THRESHOLD = 3; // Always include last 3 messages

        // Start with the most recent messages
        const recentMessages = allMessages.slice(
          Math.max(1, allMessages.length - RECENCY_THRESHOLD)
        );

        // Add file attachments from the conversation
        const fileAttachments = allMessages.filter(
          msg => msg.attachments && msg.attachments.length > 0
        );

        // Find messages that might be relevant based on text similarity
        // This is a simplified approach - a production system would use embeddings
        const userQuery = text.toLowerCase();
        const keyTerms = userQuery.split(/\s+/).filter(term => term.length > 3);

        const relevantMessages = allMessages
          .slice(1, -RECENCY_THRESHOLD)
          .filter(msg => {
            const msgContent = msg.content.toLowerCase();
            return keyTerms.some(term => msgContent.includes(term));
          })
          .slice(-5); // Take up to 5 relevant messages

        // Combine messages, prioritizing:
        // 1. First message (context/setup)
        // 2. File attachments
        // 3. Messages relevant to current query
        // 4. Most recent messages
        contextMessages = [
          ...contextMessages,
          ...fileAttachments,
          ...relevantMessages,
          ...recentMessages,
        ];

        // Deduplicate messages
        const seenIds = new Set<string>();
        contextMessages = contextMessages.filter(msg => {
          // Create a unique ID for each message based on content and timestamp
          const msgId = `${msg.timestamp}-${msg.content.substring(0, 20)}`;
          if (seenIds.has(msgId)) {
            return false;
          }
          seenIds.add(msgId);
          return true;
        });

        // Limit to maximum context messages
        if (contextMessages.length > MAX_CONTEXT_MESSAGES) {
          // Keep first message, then take latest messages up to limit
          contextMessages = [
            contextMessages[0],
            ...contextMessages.slice(-(MAX_CONTEXT_MESSAGES - 1)),
          ];
        }
      }

      // Add the new user message
      const userMessage: ChatMessage = {
        role: 'user',
        content: text,
        timestamp: new Date().toISOString(),
      };

      // Convert to Claude API format
      const previousMessages = contextMessages.map(message => {
        // Handle messages with attachments
        if (message.attachments && message.attachments.length > 0) {
          // For now, just include text about the attachment
          return {
            role: message.role,
            content:
              message.content +
              '\n(File attachment: ' +
              message.attachments.map(a => a.fileName).join(', ') +
              ')',
          };
        }

        // Regular message
        return {
          role: message.role,
          content: message.content,
        };
      });

      // Add the new user message to the API request
      previousMessages.push({ role: 'user', content: text });

      // If context was truncated, inform Claude
      if (allMessages.length > contextMessages.length + 1) {
        systemPrompt += `\nNote: Some earlier messages in this conversation have been omitted for context management. The history provided is a subset of the complete conversation.`;
      }

      // Call Claude API with the optimized context
      const response = await this._anthropic.messages.create({
        model: 'claude-3-7-sonnet-20250219',
        max_tokens: 4000,
        messages: previousMessages,
        system: systemPrompt,
        temperature: 1,
        thinking: { type: 'enabled', budget_tokens: 2000 },
      });

      // Save messages to storage
      await this._chatStorage.addMessageToChat(this._currentChat.id, userMessage);

      let responseText = '';

      // Loop through content blocks to extract text
      for (const block of response.content) {
        if (block.type === 'text') {
          responseText += block.text;
        }
        // You can also handle other block types like 'tool_use' if needed
      }

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: responseText,
        timestamp: new Date().toISOString(),
      };

      await this._chatStorage.addMessageToChat(this._currentChat.id, assistantMessage);

      // Send response back to webview
      this._panel.webview.postMessage({
        command: 'receiveMessage',
        text: responseText,
        chatId: this._currentChat.id,
      });
    } catch (error) {
      console.error('Error communicating with Claude:', error);
      vscode.window.showErrorMessage('Error communicating with Claude: ' + error);

      // Send error message to webview
      this._panel.webview.postMessage({
        command: 'receiveMessage',
        text: 'I encountered an error while processing your request. Please check the VS Code logs for details or try again.',
        chatId: this._currentChat.id,
      });
    }
  }

  private async _handleCreateNewChat(): Promise<void> {
    try {
      console.log('Creating new chat');
      const newChat = await this._chatStorage.createChat();
      this._currentChat = newChat;

      console.log('New chat created:', newChat.id);

      // Send response back to webview
      this._panel.webview.postMessage({
        command: 'chatCreated',
        chat: newChat,
      });
    } catch (error) {
      console.error('Error creating new chat:', error);
      vscode.window.showErrorMessage('Error creating new chat: ' + error);
    }
  }

  private async _handleGetAllChats(): Promise<void> {
    try {
      console.log('Getting all chats');
      const allChats = await this._chatStorage.getAllChats();

      console.log('Found chats:', allChats.length);

      // Send chats back to webview
      this._panel.webview.postMessage({
        command: 'allChatsLoaded',
        chats: allChats,
      });
    } catch (error) {
      console.error('Error getting all chats:', error);
      vscode.window.showErrorMessage('Error loading chats: ' + error);
    }
  }

  private async _handleLoadChat(chatId: string): Promise<void> {
    try {
      console.log('Loading chat:', chatId);
      const chatToLoad = await this._chatStorage.getChat(chatId);
      if (chatToLoad) {
        this._currentChat = chatToLoad;

        console.log('Chat loaded with', chatToLoad.messages.length, 'messages');

        // Send loaded chat back to webview
        this._panel.webview.postMessage({
          command: 'chatLoaded',
          chat: chatToLoad,
        });
      } else {
        console.error('Chat not found:', chatId);
        vscode.window.showErrorMessage('Chat not found');
      }
    } catch (error) {
      console.error('Error loading chat:', error);
      vscode.window.showErrorMessage('Error loading chat: ' + error);
    }
  }

  private async _handleDeleteChat(chatId: string): Promise<void> {
    console.log('Deleting Chat ', chatId);

    const success = await this._chatStorage.deleteChat(chatId);
    if (success) {
      // Otherwise just notify the webview that the chat was deleted
      this._handleGetAllChats();
    } else {
      vscode.window.showErrorMessage('Failed to delete chat');
    }
  }

  private async _handleConfirmDeleteChat(chatId: string): Promise<void> {
    const result = await vscode.window.showWarningMessage(
      'Are you sure you want to delete this chat?',
      { modal: true },
      'Delete',
      'Cancel'
    );

    if (result === 'Delete') {
      await this._handleDeleteChat(chatId);
    }
  }

  private async _handleFileAttachment(
    fileName: string,
    fileContent: string,
    fileType: string
  ): Promise<void> {
    try {
      // Convert base64 back to binary
      const binaryContent = Buffer.from(fileContent, 'base64');

      // Create a message for the file attachment
      const fileMessage: ChatMessage = {
        role: 'user',
        content: `I'm attaching a file: ${fileName}`,
        timestamp: new Date().toISOString(),
        attachments: [
          {
            fileName: fileName,
            fileType: fileType,
            // Store a reference to the file content
            contentRef: `attachment_${Date.now()}`,
          },
        ],
      };

      // Save attachment content to a temporary storage
      if (!this._attachmentStorage) {
        this._attachmentStorage = new Map<string, Buffer>();
      }

      if (fileMessage.attachments && fileMessage.attachments.length > 0) {
        this._attachmentStorage.set(fileMessage.attachments[0].contentRef, binaryContent);
      }
      // Add the message to the chat
      await this._chatStorage.addMessageToChat(this._currentChat.id, fileMessage);

      // Update the UI
      this._panel.webview.postMessage({
        command: 'fileAttached',
        fileName: fileName,
      });

      // Now we'll send a message to Claude about the file
      let analysisPrompt = `I've attached a file named "${fileName}". `;

      if (
        fileType.includes('text') ||
        fileType.includes('javascript') ||
        fileType.includes('typescript') ||
        fileType.includes('json') ||
        fileType.includes('html') ||
        fileType.includes('css')
      ) {
        // For text files, we'll send the content directly
        const textContent = binaryContent.toString('utf-8');
        analysisPrompt += `Here is the content of the file:\n\n\`\`\`\n${textContent}\n\`\`\`\n\nPlease analyze this file and provide insights.`;
      } else if (fileType.includes('image')) {
        analysisPrompt += `This is an image file. Please let me know what you can do with image files.`;
      } else if (fileType.includes('pdf')) {
        analysisPrompt += `This is a PDF file. Please let me know what you can do with PDF files.`;
      } else {
        analysisPrompt += `Please let me know if you can work with this type of file (${fileType}).`;
      }

      // Send this message through the regular message handler
      await this._handleSendMessage(analysisPrompt);
    } catch (error) {
      console.error('Error handling file attachment:', error);
      vscode.window.showErrorMessage('Error processing file: ' + error);
    }
  }

  private _onDispose(): void {
    App._current = undefined;

    while (this._disposables.length) {
      const disposable = this._disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }
}
