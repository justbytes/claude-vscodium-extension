"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initialWebviewContext = void 0;
const vscode = require("vscode");
const nonce_1 = require("../utils/nonce");
const initialWebviewContext = (extensionUri, panel, currentChat) => {
    // Get paths to resource files
    const srcPath = vscode.Uri.joinPath(extensionUri, "src");
    const indexStylePath = vscode.Uri.joinPath(srcPath, "styles", "index.css");
    const navbarStylePath = vscode.Uri.joinPath(srcPath, "styles", "navbar.css");
    const messagesStylePath = vscode.Uri.joinPath(srcPath, "styles", "messages.css");
    const promptStylePath = vscode.Uri.joinPath(srcPath, "styles", "prompt.css");
    const navbarLogicPath = vscode.Uri.joinPath(srcPath, "logic", "navbar.js");
    const messagesLogicPath = vscode.Uri.joinPath(srcPath, "logic", "messages.js");
    const promptLogicPath = vscode.Uri.joinPath(srcPath, "logic", "prompt.js");
    const indexStyleUri = panel.webview.asWebviewUri(indexStylePath);
    const navbarStyleUri = panel.webview.asWebviewUri(navbarStylePath);
    const messagesStyleUri = panel.webview.asWebviewUri(messagesStylePath);
    const promptStyleUri = panel.webview.asWebviewUri(promptStylePath);
    const navbarLogicUri = panel.webview.asWebviewUri(navbarLogicPath);
    const messagesLogicUri = panel.webview.asWebviewUri(messagesLogicPath);
    const promptLogicUri = panel.webview.asWebviewUri(promptLogicPath);
    const nonce = (0, nonce_1.getNonce)();
    panel.webview.html = `<!DOCTYPE html>
      <html lang="en">
      <head>

        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${panel.webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
        <link href="${indexStyleUri}" rel="stylesheet">
        <link href="${navbarStyleUri}" rel="stylesheet">
        <link href="${messagesStyleUri}" rel="stylesheet">
        <link href="${promptStyleUri}" rel="stylesheet">
    
        <title>Chat with Claude</title>
      </head>
      <body id="app">
        
        <nav class="chat-nav">
            <button id="new-chat-btn" class="nav-button">New Chat</button>
            <button id="old-chat-btn" class="nav-button">History</button> 
        </nav>
        
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
                <button id="submit-prompt">↑</button>
                <button class="attachment">📎</button>
            </div>
        </div>
  
        <script nonce="${nonce}" src="${promptLogicUri}"></script>
        <script nonce="${nonce}">
            window.currentChat = ${JSON.stringify(currentChat)};
        </script>
        
        <script nonce="${nonce}" src="${navbarLogicUri}"></script>
        
 
          
      </body>
      </html>`;
};
exports.initialWebviewContext = initialWebviewContext;
//# sourceMappingURL=chatLayout.js.map