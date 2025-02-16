import * as vscode from "vscode";
import Anthropic from "@anthropic-ai/sdk";
import { getNonce } from "./utilities";

export function activate(context: vscode.ExtensionContext) {
  let disposable = vscode.commands.registerCommand(
    "vscodium-claude.askClaude",
    async () => {
      // Get API key from configuration
      const config = vscode.workspace.getConfiguration("claudeAI");
      const apiKey = config.get<string>("apiKey");

      if (!apiKey) {
        vscode.window.showErrorMessage(
          "Please set your Claude API key in settings"
        );
        return;
      }

      // Create Anthropic client
      const anthropic = new Anthropic({
        apiKey: apiKey,
      });

      // Get selected text or current file content
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showInformationMessage("No editor is active");
        return;
      }

      const selection = editor.selection;
      const text = editor.document.getText(
        selection.isEmpty ? undefined : selection
      );

      // Create webview panel for chat
      const panel = vscode.window.createWebviewPanel(
        "claudeChat",
        "Chat with Claude",
        vscode.ViewColumn.Beside,
        {
          enableScripts: true,
          localResourceRoots: [
            vscode.Uri.joinPath(context.extensionUri, "media"),
          ],
        }
      );

      // Get paths to resource files
      const styleMainPath = vscode.Uri.joinPath(
        context.extensionUri,
        "media",
        "chat.css"
      );
      const scriptPath = vscode.Uri.joinPath(
        context.extensionUri,
        "media",
        "chat.js"
      );

      // And get the special URI to use with the webview
      const styleVSCodeUri = panel.webview.asWebviewUri(styleMainPath);
      const scriptUri = panel.webview.asWebviewUri(scriptPath);

      // Set webview HTML content
      panel.webview.html = getWebviewContent(
        panel.webview,
        styleVSCodeUri,
        scriptUri
      );

      // Handle messages from webview
      panel.webview.onDidReceiveMessage(async (message) => {
        switch (message.command) {
          case "sendMessage":
            try {
              const response = await anthropic.messages.create({
                model: "claude-3-opus-20240229",
                max_tokens: 1000,
                messages: [
                  {
                    role: "user",
                    content: message.text,
                  },
                ],
                system:
                  "You are a helpful AI assistant integrated into VSCodium. Help users with coding tasks, explanations, and general development questions.",
              });

              // Send response back to webview
              panel.webview.postMessage({
                command: "receiveMessage",
                text: response.content[0].text,
              });
            } catch (error) {
              vscode.window.showErrorMessage(
                "Error communicating with Claude: " + error
              );
            }
            break;
        }
      });
    }
  );

  context.subscriptions.push(disposable);
}

function getWebviewContent(
  webview: vscode.Webview,
  styleUri: vscode.Uri,
  scriptUri: vscode.Uri
) {
  const nonce = getNonce();

  return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
        <link href="${styleUri}" rel="stylesheet">
        <title>Chat with Claude</title>
    </head>
    <body>
        <div id="chat-container">
            <div id="messages"></div>
            <div id="input-container">
                <input type="text" id="message-input" placeholder="Ask Claude...">
                <button id="send-button">Send</button>
            </div>
        </div>
        <script nonce="${nonce}" src="${scriptUri}"></script>
    </body>
    </html>`;
}
