const vscode = acquireVsCodeApi();
const messagesDiv = document.getElementById("messages");
//const messageInput = document.getElementsById("textarea");
const sendButton = document.getElementById("send-button");

const textarea = document.getElementById("message-input");

function autoResize() {
  // Reset height temporarily to get the correct scrollHeight
  textarea.style.height = "0px";

  // Set to scrollHeight + some padding for better visual appearance
  const newHeight = textarea.scrollHeight + 2;
  textarea.style.height = newHeight + "px";

  // Ensure minimum height
  if (newHeight < 50) {
    textarea.style.height = "50px";
  }
}

// Add event listeners
textarea.addEventListener("input", autoResize);
textarea.addEventListener("change", autoResize);

// Initial resize
autoResize();

// Also resize on paste events
textarea.addEventListener("paste", () => {
  // Use setTimeout to allow the paste to complete
  setTimeout(autoResize, 0);
});

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

document.getElementById("new-chat-btn").addEventListener("click", () => {
  vscode.postMessage({ command: "createNewChat" });
});

document.getElementById("old-chat-btn").addEventListener("click", () => {
  <div class="chat-list">
    $
    {chats
      .map(
        (chat) => `
                        <div class="chat-item ${
                          chat.id === currentChat.id ? "active" : ""
                        }" 
                             data-chat-id="${chat.id}">
                            ${chat.title}
                        </div>
                    `
      )
      .join("")}
  </div>;
});

document.querySelectorAll(".chat-item").forEach((item) => {
  item.addEventListener("click", () => {
    const chatId = item.dataset.chatId;
    vscode.postMessage({
      command: "loadChat",
      chatId: chatId,
    });
  });
});

window.addEventListener("message", (event) => {
  const message = event.data;
  switch (message.command) {
    case "chatCreated":
      // Add new chat to sidebar and switch to it
      const chatList = document.querySelector(".chat-list");
      const newChatItem = document.createElement("div");
      newChatItem.className = "chat-item active";
      newChatItem.dataset.chatId = message.chat.id;
      newChatItem.textContent = message.chat.title;
      chatList.prepend(newChatItem);

      // Clear messages
      document.getElementById("messages").innerHTML = "";
      break;

    case "chatLoaded":
      // Update active chat and display messages
      window.currentChat = message.chat;
      const messagesDiv = document.getElementById("messages");
      messagesDiv.innerHTML = "";

      message.chat.messages.forEach((msg) => {
        addMessage(msg.content, msg.role === "user");
      });

      // Update active chat in sidebar
      document.querySelectorAll(".chat-item").forEach((item) => {
        item.classList.toggle(
          "active",
          item.dataset.chatId === message.chat.id
        );
      });
      break;
  }
});
