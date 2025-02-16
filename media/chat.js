const vscode = acquireVsCodeApi();
const messagesDiv = document.getElementById("messages");
const messageInput = document.getElementById("message-input");
const sendButton = document.getElementById("send-button");

function createLoadingIndicator() {
  const loadingDiv = document.createElement("div");
  loadingDiv.className = "loading";
  loadingDiv.innerHTML = `
        <div class="loading-spinner"></div>
        <span>Claude is thinking...</span>
    `;
  return loadingDiv;
}

function formatCodeBlocks(text) {
  const parts = text.split(/```(\w*)\n?/);
  let formatted = "";
  let isInCodeBlock = false;

  parts.forEach((part, index) => {
    if (index % 2 === 1) {
      return;
    }

    if (isInCodeBlock) {
      formatted += `<div class="code-block">
                            <button class="copy-button">Copy</button>
                            <pre><code>${part}</code></pre>
                        </div>`;
    } else {
      formatted += part.replace(/\n/g, "<br>");
    }

    isInCodeBlock = !isInCodeBlock;
  });

  return formatted;
}

function addMessage(text, isUser) {
  const messageDiv = document.createElement("div");
  messageDiv.className =
    "message " + (isUser ? "user-message" : "claude-message");

  if (isUser) {
    messageDiv.textContent = text;
  } else {
    messageDiv.innerHTML = formatCodeBlocks(text);

    messageDiv.querySelectorAll(".copy-button").forEach((button) => {
      button.addEventListener("click", () => {
        const codeBlock = button.nextElementSibling.textContent;
        navigator.clipboard.writeText(codeBlock);

        const originalText = button.textContent;
        button.textContent = "Copied!";
        setTimeout(() => {
          button.textContent = originalText;
        }, 2000);
      });
    });
  }

  messagesDiv.appendChild(messageDiv);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

sendButton.addEventListener("click", () => {
  const text = messageInput.value;
  if (text) {
    addMessage(text, true);

    const loadingIndicator = createLoadingIndicator();
    messagesDiv.appendChild(loadingIndicator);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;

    vscode.postMessage({
      command: "sendMessage",
      text: text,
    });
    messageInput.value = "";
  }
});

messageInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    sendButton.click();
  }
});

window.addEventListener("message", (event) => {
  const message = event.data;
  switch (message.command) {
    case "receiveMessage":
      const loadingIndicator = document.querySelector(".loading");
      if (loadingIndicator) {
        loadingIndicator.remove();
      }
      addMessage(message.text, false);
      break;
  }
});
