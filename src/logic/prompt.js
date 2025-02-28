const chatContainer = document.getElementById("chat-container");
const textarea = document.getElementById("message-input");
const sendButton = document.getElementById("submit-prompt");
const attachment = document.querySelector(".attachment");
const messagesDiv = document.getElementById("messages");

function formatCodeBlocks(text) {
  const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let formatted = "";
  let match;

  while ((match = codeBlockRegex.exec(text)) !== null) {
    // Add text before code block
    formatted += text.substring(lastIndex, match.index).replace(/\n/g, "<br>");

    // Extract language and code content
    const language = match[1].trim().toLowerCase();
    let code = match[2];

    // Create a temporary element to escape HTML
    const tempDiv = document.createElement("div");
    tempDiv.textContent = code;
    const escapedCode = tempDiv.innerHTML;

    // Create code block with syntax highlighting
    formatted += `<div class="code-block">
      <div class="code-header">
        ${language ? `<span class="code-language">${language}</span>` : ""}
        <button class="copy-button">Copy</button>
      </div>
      <pre><code class="hljs ${
        language ? `language-${language}` : ""
      }">${escapedCode}</code></pre>
    </div>`;

    lastIndex = match.index + match[0].length;
  }

  // Add any remaining text
  if (lastIndex < text.length) {
    formatted += text.substring(lastIndex).replace(/\n/g, "<br>");
  }

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

    // Wait for a small delay to ensure DOM is updated
    setTimeout(() => {
      // Apply syntax highlighting to all code blocks
      messageDiv.querySelectorAll("pre code.hljs").forEach((block) => {
        console.log("Applying highlighting to block:", block.className);
        hljs.highlightElement(block);
      });
    }, 10);

    // Add copy functionality
    messageDiv.querySelectorAll(".copy-button").forEach((button) => {
      button.addEventListener("click", () => {
        const codeBlock = button.closest(".code-block").querySelector("code");
        navigator.clipboard.writeText(codeBlock.textContent);

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
    case "chatCreated":
      const messagesDiv = document.getElementById("messages");
      if (messagesDiv) {
        messagesDiv.innerHTML = "";
      }

      // Update the current chat reference
      window.currentChat = message.chat;
      break;

    case "chatLoaded":
      console.log("Chat loaded:", message.chat.id);
      // Update active chat and display messages without changing layout
      window.currentChat = message.chat;
      const msgDiv = document.getElementById("messages");
      if (msgDiv) {
        msgDiv.innerHTML = "";

        // Add each message from the loaded chat
        message.chat.messages.forEach((msg) => {
          addMessage(msg.content, msg.role === "user");
        });

        // Scroll to the bottom of the messages
        msgDiv.scrollTop = msgDiv.scrollHeight;
      }
      break;
  }
});

/**
 * Creates a loading indicator when the user is waiting for a response from
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
 * Ensure the highlight.js library is properly initialized
 */
function initializeHighlightJS() {
  if (typeof hljs !== "undefined") {
    console.log("Initializing highlight.js");
    hljs.configure({
      languages: [
        "javascript",
        "typescript",
        "python",
        "java",
        "csharp",
        "html",
        "css",
        "bash",
        "json",
      ],
      ignoreUnescapedHTML: true,
    });

    // Apply highlighting to any existing code blocks
    document.querySelectorAll("pre code.hljs").forEach((block) => {
      console.log("Initial highlighting for:", block.className);
      hljs.highlightElement(block);
    });
  } else {
    console.error("highlight.js not loaded!");
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
window.addEventListener("load", () => {
  adjustTextareaHeight();
  initializeHighlightJS();
});

// Also adjust heights when window is resized
window.addEventListener("resize", adjustTextareaHeight);

// Initialize highlighting
initializeHighlightJS();

// Initial height adjustment
adjustTextareaHeight();
