const vscode = acquireVsCodeApi();
const chatContainer = document.getElementById("chat-container");
const textarea = document.getElementById("message-input");
const sendButton = document.getElementById("submit-prompt");
const attachment = document.querySelector(".attachment");
const messagesDiv = document.getElementById("messages");

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

/**
 * Creates a loading indicatior when the user is waiting for a response from
 * claude
 */
function createLoadingIndicator() {
  const loadingDiv = document.createElement("div");
  loadingDiv.className = "loading";
  loadingDiv.innerHTML = `
        <div class="loading-spinner"></div>
        <span>Claude is thinking...</span>
    `;
  return loadingDiv;
}

/**
 * Adjusts the size of the prompt box
 */
function adjustTextareaHeight() {
  // Reset to get the natural height
  textarea.style.height = "auto";

  // Get the current scrollHeight
  const scrollHeight = textarea.scrollHeight;

  // Define min and max heights in pixels
  const minHeight = 50; // 50px minimum height
  const maxHeight = window.innerHeight * 0.3; // 30vh maximum height

  // Calculate the new height within limits
  const newHeight = Math.min(Math.max(scrollHeight, minHeight), maxHeight);

  // Set the textarea height
  textarea.style.height = newHeight + "px";

  // Add scrollbars if content exceeds max height
  textarea.style.overflowY = scrollHeight > maxHeight ? "auto" : "hidden";

  // Set CSS variable for the textarea height that can be used in calculations elsewhere
  document.documentElement.style.setProperty(
    "--textarea-height",
    newHeight + "px"
  );

  // Dynamically adjust the chat container height based on the textarea height
  const chatContainer = document.getElementById("chat-container");
  if (chatContainer) {
    // Available height minus navbar (estimated at 50px) and textarea height
    const navbarHeight = 50; // Estimate of navbar height
    const availableHeight = window.innerHeight - navbarHeight - newHeight - 20; // 20px for margins
    chatContainer.style.height = availableHeight + "px";
  }

  // Scroll messages to bottom if they were already at the bottom
  const messagesDiv = document.getElementById("messages");
  const wasAtBottom =
    messagesDiv.scrollHeight - messagesDiv.scrollTop <=
    messagesDiv.clientHeight + 10;
  if (wasAtBottom) {
    setTimeout(() => {
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }, 10);
  }
}

/**
 * Sends the prompt to claude
 */
sendButton.addEventListener("click", () => {
  const text = textarea.value;
  if (text) {
    addMessage(text, true);

    const loadingIndicator = createLoadingIndicator();
    messagesDiv.appendChild(loadingIndicator);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;

    vscode.postMessage({
      command: "sendMessage",
      text: text,
    });
    textarea.value = "";
    adjustTextareaHeight(); // Reset height after clearing
  }
});

/**
 * Sends the prompt to claude if the enter button is pressed
 */
textarea.addEventListener("keypress", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault(); // Prevent new line
    sendButton.click();
  }
});

/**
 * The following three event listeners are going to trigger a check
 * to see if the prompt needs to be resized
 */
textarea.addEventListener("input", adjustTextareaHeight);
textarea.addEventListener("keyup", adjustTextareaHeight);
textarea.addEventListener("paste", () => {
  setTimeout(adjustTextareaHeight, 0);
});

// Run the adjustment on page load to set initial heights
window.addEventListener("load", adjustTextareaHeight);

// Also adjust heights when window is resized
window.addEventListener("resize", adjustTextareaHeight);

// Initial height adjustment
adjustTextareaHeight();
