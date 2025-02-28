import * as vscode from "vscode";
import { getNonce } from "../utils/nonce";
import { Chat, ChatMessage, ChatArchive } from "../ChatArchive";

export const initialWebviewContext = (
  extensionUri: vscode.Uri,
  panel: vscode.WebviewPanel,
  currentChat: Chat
): void => {
  // Get paths to resource files
  const srcPath = vscode.Uri.joinPath(extensionUri, "src");
  const indexStylePath = vscode.Uri.joinPath(srcPath, "styles", "index.css");
  const navbarStylePath = vscode.Uri.joinPath(srcPath, "styles", "navbar.css");
  const messagesStylePath = vscode.Uri.joinPath(
    srcPath,
    "styles",
    "messages.css"
  );
  const promptStylePath = vscode.Uri.joinPath(srcPath, "styles", "prompt.css");
  const oldChatsStylePath = vscode.Uri.joinPath(
    srcPath,
    "styles",
    "chatArchive.css"
  );

  const navbarLogicPath = vscode.Uri.joinPath(srcPath, "logic", "navbar.js");
  const messagesLogicPath = vscode.Uri.joinPath(
    srcPath,
    "logic",
    "messages.js"
  );
  const promptLogicPath = vscode.Uri.joinPath(srcPath, "logic", "prompt.js");
  const oldChatsLogicPath = vscode.Uri.joinPath(
    srcPath,
    "logic",
    "chatArchive.js"
  );

  const indexStyleUri = panel.webview.asWebviewUri(indexStylePath);
  const navbarStyleUri = panel.webview.asWebviewUri(navbarStylePath);
  const messagesStyleUri = panel.webview.asWebviewUri(messagesStylePath);
  const promptStyleUri = panel.webview.asWebviewUri(promptStylePath);
  const oldChatsStyleUri = panel.webview.asWebviewUri(oldChatsStylePath);

  const navbarLogicUri = panel.webview.asWebviewUri(navbarLogicPath);
  const messagesLogicUri = panel.webview.asWebviewUri(messagesLogicPath);
  const promptLogicUri = panel.webview.asWebviewUri(promptLogicPath);
  const oldChatsLogicUri = panel.webview.asWebviewUri(oldChatsLogicPath);

  const nonce = getNonce();

  panel.webview.html = `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${
          panel.webview.cspSource
        } https://cdnjs.cloudflare.com 'unsafe-inline'; script-src 'nonce-${nonce}' https://cdnjs.cloudflare.com; connect-src https://cdnjs.cloudflare.com; img-src ${
    panel.webview.cspSource
  } https:; font-src ${panel.webview.cspSource} https:;">
        <link href="${indexStyleUri}" rel="stylesheet">
        <link href="${navbarStyleUri}" rel="stylesheet">
        <link href="${messagesStyleUri}" rel="stylesheet">
        <link href="${promptStyleUri}" rel="stylesheet">
        <link href="${oldChatsStyleUri}" rel="stylesheet">
        
        <!-- Add Highlight.js for syntax highlighting -->
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/styles/vs2015.min.css">
        <script nonce="${nonce}" src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/highlight.min.js"></script>
        <!-- Common language pack -->
        <script nonce="${nonce}" src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/languages/javascript.min.js"></script>
        <script nonce="${nonce}" src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/languages/typescript.min.js"></script>
        <script nonce="${nonce}" src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/languages/python.min.js"></script>
        <script nonce="${nonce}" src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/languages/java.min.js"></script>
        <script nonce="${nonce}" src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/languages/csharp.min.js"></script>
        <script nonce="${nonce}" src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/languages/bash.min.js"></script>
        <script nonce="${nonce}" src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/languages/json.min.js"></script>
        <script nonce="${nonce}" src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/languages/html.min.js"></script>
        <script nonce="${nonce}" src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/languages/css.min.js"></script>
    
        <title>Chat with Claude</title>
      </head>
      <body id="app">
       
          <nav class="chat-nav">
              <button id="new-chat-btn" class="nav-button">+</button>
              <button id="old-chat-btn" class="nav-button">🕑</button> 
          </nav>
          <div id="main-container">
            <div id="chat-container">
              <div id="messages"></div>
            </div>

            <div class="prompt-container">
              <div class="long-box">
                  <div class="context"></div>
                  <div class="prompt-textarea">
                      <textarea 
                      id="message-input" 
                      class="auto-resize-textarea"
                      placeholder="Type your message..."
                      ></textarea>
                  </div>
              </div>
              <div class="prompt-btns">
                  <button id="submit-prompt" class="prompt-btn">↑</button>
                  <button id="attachment" class="prompt-btn">📎</button>
              </div>
            </div> 
          </div>
          
          <div id="old-chats-container"></div>
        
        <script nonce="${nonce}">
            // Initialize vscode API ONCE in the global scope
            const vscode = acquireVsCodeApi();
            
            // Define global toggleView function
            window.toggleView = function(view) {
              console.log("Toggling view to: " + view);
              const mainContainer = document.getElementById('main-container');
              const oldChatsContainer = document.getElementById('old-chats-container');
              
              if (view === 'old-chats') {
                  // Switch to old chats view
                  if (mainContainer) mainContainer.style.display = 'none';
                  if (oldChatsContainer) oldChatsContainer.style.display = 'flex';
                  
                  // Request all chats from extension
                  vscode.postMessage({ command: "getAllChats" });
              } else if (view === 'chat') {
                  // Switch back to chat view
                  if (mainContainer) mainContainer.style.display = '';
                  if (oldChatsContainer) oldChatsContainer.style.display = 'none';
                  
                  // No need to request or change anything about the current chat
                  // It's already loaded in window.currentChat
              }
            };
            
            // Store current chat data
            window.currentChat = ${JSON.stringify(currentChat)};
            
            // Initialize highlight.js
            window.addEventListener('DOMContentLoaded', (event) => {
              if (typeof hljs !== 'undefined') {
                console.log('highlight.js loaded successfully');
                hljs.configure({
                  languages: ['javascript', 'typescript', 'python', 'java', 'csharp', 'html', 'css', 'bash', 'json'],
                  ignoreUnescapedHTML: true
                });
                
                // Apply highlighting to any existing code blocks
                document.querySelectorAll('pre code').forEach((block) => {
                  hljs.highlightElement(block);
                });
              } else {
                console.error('highlight.js failed to load!');
              }
            });
            
            // Debug log to verify initialization
            console.log("Webview initialized with chat ID:", window.currentChat.id);
        </script>
        <script nonce="${nonce}" src="${promptLogicUri}"></script>
        <script nonce="${nonce}" src="${navbarLogicUri}"></script>
        <script nonce="${nonce}" src="${oldChatsLogicUri}"></script>
      </body>
      </html>`;
};
