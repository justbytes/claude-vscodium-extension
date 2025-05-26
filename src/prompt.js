const chatContainer = document.getElementById('chat-container');
const textarea = document.getElementById('message-input');
const sendButton = document.getElementById('submit-prompt');
const messagesDiv = document.getElementById('messages');
const attachmentButton = document.getElementById('attachment'); // Fixed: was querySelector('.attachment')

// Create file input properly
const fileInput = document.createElement('input');
fileInput.type = 'file';
fileInput.style.display = 'none';
document.body.appendChild(fileInput);

function formatCodeBlocks(text) {
  const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let formatted = '';
  let match;

  while ((match = codeBlockRegex.exec(text)) !== null) {
    // Add text before code block - replace multiple consecutive newlines with a single <br>
    const textBeforeBlock = text
      .substring(lastIndex, match.index)
      .replace(/\n{3,}/g, '\n\n') // Replace 3+ consecutive newlines with 2
      .replace(/\n\n/g, '<br><br>') // Replace double newlines with double <br>
      .replace(/\n/g, ' '); // Replace single newlines with space (within paragraphs)

    formatted += textBeforeBlock;

    // Extract language and code content
    const language = match[1].trim().toLowerCase();
    let code = match[2];

    // Create a temporary element to escape HTML
    const tempDiv = document.createElement('div');
    tempDiv.textContent = code;
    const escapedCode = tempDiv.innerHTML;

    // Create code block with syntax highlighting
    formatted += `<div class="code-block">
      <div class="code-header">
        ${language ? `<span class="code-language">${language}</span>` : ''}
        <button class="copy-button">Copy</button>
      </div>
      <pre><code class="hljs ${language ? `language-${language}` : ''}">${escapedCode}</code></pre>
    </div>`;

    lastIndex = match.index + match[0].length;
  }

  // Add any remaining text - replace multiple consecutive newlines with a single <br>
  if (lastIndex < text.length) {
    const remainingText = text
      .substring(lastIndex)
      .replace(/\n{3,}/g, '\n\n') // Replace 3+ consecutive newlines with 2
      .replace(/\n\n/g, '<br><br>') // Replace double newlines with double <br>
      .replace(/\n/g, ' '); // Replace single newlines with space (within paragraphs)

    formatted += remainingText;
  }

  return formatted;
}

function formatClaudeMessage(text) {
  // First handle code blocks
  const codeBlockFormatted = formatCodeBlocks(text);

  // Start with the code-formatted text
  let result = codeBlockFormatted;

  // Find and format ordered lists (numbered lists) - do this first
  const orderedListRegex =
    /(?:^|\<br\>)([\s]*\d+\.[\s]+.+(?:\<br\>[\s]*\d+\.[\s]+.+)*)(?=\<br\>|$)/g;
  result = result.replace(orderedListRegex, match => {
    // Split the match into individual list items
    const items = match.split(/(?:\<br\>)[\s]*\d+\.[\s]+/).filter(item => item.trim());

    // Build list items correctly - get the first item which might include the first number
    const firstItem = match.match(/[\s]*\d+\.[\s]+(.+?)(?=\<br\>|$)/);
    const listItems = firstItem ? [`<li>${firstItem[1]}</li>`] : [];

    // Add the rest of the items
    items.forEach(item => {
      if (item.trim()) {
        listItems.push(`<li>${item.trim()}</li>`);
      }
    });

    // Return the complete ordered list
    return `<ol>${listItems.join('')}</ol>`;
  });

  // Find and format unordered lists (bullet point lists)
  const unorderedListRegex =
    /(?:^|\<br\>)([\s]*[-*][\s]+.+(?:\<br\>[\s]*[-*][\s]+.+)*)(?=\<br\>|$)/g;
  result = result.replace(unorderedListRegex, match => {
    // Split the match into individual list items
    const items = match.split(/(?:\<br\>)[\s]*[-*][\s]+/);

    // Build list items, skipping the first empty item
    const listItems = [];
    items.forEach((item, index) => {
      if (index > 0 || item.trim()) {
        listItems.push(`<li>${item.trim()}</li>`);
      }
    });

    // Return the complete unordered list
    return `<ul>${listItems.join('')}</ul>`;
  });

  // Clean up any remaining single bullet or numbered items that weren't caught
  // But ensure we don't double-process already formatted lists
  result = result
    // Remove any placeholders we might have used
    .replace(/___LIST_PLACEHOLDER___/g, '')

    // Remove excessive breaks
    .replace(/<br><br><br>/g, '<br><br>')

    // Add proper spacing around lists
    .replace(/<br><ul>/g, '<ul>')
    .replace(/<\/ul><br>/g, '</ul>')
    .replace(/<br><ol>/g, '<ol>')
    .replace(/<\/ol><br>/g, '</ol>');

  return result;
}

function addMessage(text, isUser) {
  console.log('Adding message:', { text: text.substring(0, 100), isUser });

  if (!messagesDiv) {
    console.error('Messages div not found!');
    return;
  }

  const messageDiv = document.createElement('div');
  messageDiv.className = 'message ' + (isUser ? 'user-message' : 'claude-message');

  if (isUser) {
    messageDiv.textContent = text;
  } else {
    messageDiv.innerHTML = formatClaudeMessage(text);

    // Apply syntax highlighting to all code blocks
    setTimeout(() => {
      messageDiv.querySelectorAll('pre code.hljs').forEach(block => {
        if (typeof hljs !== 'undefined') {
          hljs.highlightElement(block);
        }
      });
    }, 10);

    // Add copy functionality
    messageDiv.querySelectorAll('.copy-button').forEach(button => {
      button.addEventListener('click', () => {
        const codeBlock = button.closest('.code-block').querySelector('code');
        navigator.clipboard.writeText(codeBlock.textContent);

        const originalText = button.textContent;
        button.textContent = 'Copied!';
        setTimeout(() => {
          button.textContent = originalText;
        }, 2000);
      });
    });
  }

  messagesDiv.appendChild(messageDiv);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// Message event listener
window.addEventListener('message', event => {
  const message = event.data;
  console.log('Received message:', message.command);

  switch (message.command) {
    case 'receiveMessage':
      const loadingIndicator = document.querySelector('.loading');
      if (loadingIndicator) {
        loadingIndicator.remove();
      }
      addMessage(message.text, false);
      break;

    case 'chatCreated':
      console.log('Chat created:', message.chat.id);
      const messagesDiv = document.getElementById('messages');
      if (messagesDiv) {
        messagesDiv.innerHTML = '';
      }
      // Update the current chat reference
      window.currentChat = message.chat;
      break;

    case 'chatLoaded':
      console.log('Chat loaded:', message.chat.id);
      // Update active chat and display messages without changing layout
      window.currentChat = message.chat;
      const msgDiv = document.getElementById('messages');
      if (msgDiv) {
        msgDiv.innerHTML = '';

        // Add each message from the loaded chat
        message.chat.messages.forEach(msg => {
          addMessage(msg.content, msg.role === 'user');
        });

        // Scroll to the bottom of the messages
        msgDiv.scrollTop = msgDiv.scrollHeight;
      }
      break;

    case 'fileAttached':
      // Create a message to indicate file was attached
      const attachmentMsg = document.createElement('div');
      attachmentMsg.className = 'message user-message';
      attachmentMsg.innerHTML = formatFileAttachment(message.fileName);
      messagesDiv.appendChild(attachmentMsg);
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
      break;
  }
});

// Attachment button event listener
if (attachmentButton) {
  attachmentButton.addEventListener('click', () => {
    console.log('Attachment button clicked');
    fileInput.click();
  });
} else {
  console.error('Attachment button not found!');
}

// File input event listener
fileInput.addEventListener('change', async event => {
  console.log('File selected:', fileInput.files.length);

  if (fileInput.files.length > 0) {
    const file = fileInput.files[0];

    // Create a notification that file is being processed
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message user-message';
    messageDiv.textContent = `Attaching file: ${file.name}`;
    messagesDiv.appendChild(messageDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;

    // Read file as array buffer
    const reader = new FileReader();
    reader.onload = async e => {
      // Convert to Base64
      const base64Content = btoa(
        new Uint8Array(e.target.result).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );

      // Send to extension
      vscode.postMessage({
        command: 'attachFile',
        fileName: file.name,
        fileContent: base64Content,
        fileType: file.type,
      });

      // Clear the file input for next use
      fileInput.value = '';
    };

    reader.readAsArrayBuffer(file);
  }
});

/**
 * Sends the prompt to claude
 */
if (sendButton) {
  sendButton.addEventListener('click', () => {
    console.log('Send button clicked');
    const text = textarea.value;
    if (text.trim()) {
      console.log('Sending message:', text.substring(0, 50));
      addMessage(text, true);

      const loadingIndicator = createLoadingIndicator();
      messagesDiv.appendChild(loadingIndicator);
      messagesDiv.scrollTop = messagesDiv.scrollHeight;

      vscode.postMessage({
        command: 'sendMessage',
        text: text,
      });
      textarea.value = '';
      adjustTextareaHeight(); // Reset height after clearing
    } else {
      console.log('No text to send');
    }
  });
} else {
  console.error('Send button not found!');
}

/**
 * Sends the prompt to claude if the enter button is pressed
 */
if (textarea) {
  textarea.addEventListener('keypress', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault(); // Prevent new line
      sendButton.click();
    }
  });

  /**
   * The following three event listeners are going to trigger a check
   * to see if the prompt needs to be resized
   */
  textarea.addEventListener('input', adjustTextareaHeight);
  textarea.addEventListener('keyup', adjustTextareaHeight);
  textarea.addEventListener('paste', () => {
    setTimeout(adjustTextareaHeight, 0);
  });
} else {
  console.error('Textarea not found!');
}

/**
 * Creates a loading indicator when the user is waiting for a response from
 * claude
 */
function createLoadingIndicator() {
  const loadingDiv = document.createElement('div');
  loadingDiv.className = 'loading';
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
  if (!textarea) return;

  // Reset to get the natural height
  textarea.style.height = 'auto';

  // Get the current scrollHeight
  const scrollHeight = textarea.scrollHeight;

  // Define min and max heights in pixels
  const minHeight = 50; // 50px minimum height
  const maxHeight = window.innerHeight * 0.3; // 30vh maximum height

  // Calculate the new height within limits
  const newHeight = Math.min(Math.max(scrollHeight, minHeight), maxHeight);

  // Set the textarea height
  textarea.style.height = newHeight + 'px';

  // Add scrollbars if content exceeds max height
  textarea.style.overflowY = scrollHeight > maxHeight ? 'auto' : 'hidden';

  // Set CSS variable for the textarea height that can be used in calculations elsewhere
  document.documentElement.style.setProperty('--textarea-height', newHeight + 'px');

  // Dynamically adjust the chat container height based on the textarea height
  const chatContainer = document.getElementById('chat-container');
  if (chatContainer) {
    // Available height minus navbar (estimated at 50px) and textarea height
    const navbarHeight = 50; // Estimate of navbar height
    const availableHeight = window.innerHeight - navbarHeight - newHeight - 20; // 20px for margins
    chatContainer.style.height = availableHeight + 'px';
  }

  // Scroll messages to bottom if they were already at the bottom
  const messagesDiv = document.getElementById('messages');
  if (messagesDiv) {
    const wasAtBottom =
      messagesDiv.scrollHeight - messagesDiv.scrollTop <= messagesDiv.clientHeight + 10;
    if (wasAtBottom) {
      setTimeout(() => {
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
      }, 10);
    }
  }
}

/**
 * Ensure the highlight.js library is properly initialized
 */
function initializeHighlightJS() {
  if (typeof hljs !== 'undefined') {
    console.log('Initializing highlight.js');
    hljs.configure({
      languages: [
        'javascript',
        'typescript',
        'python',
        'java',
        'csharp',
        'html',
        'css',
        'bash',
        'json',
      ],
      ignoreUnescapedHTML: true,
    });

    // Apply highlighting to any existing code blocks
    document.querySelectorAll('pre code.hljs').forEach(block => {
      console.log('Initial highlighting for:', block.className);
      hljs.highlightElement(block);
    });
  } else {
    console.error('highlight.js not loaded!');
  }
}

function formatFileAttachment(fileName) {
  return `<div class="file-attachment">
    <div class="file-icon">📎</div>
    <div class="file-name">${fileName}</div>
  </div>`;
}

// Run the adjustment on page load to set initial heights
window.addEventListener('load', () => {
  console.log('Window loaded, initializing...');
  adjustTextareaHeight();
  initializeHighlightJS();
});

// Also adjust heights when window is resized
window.addEventListener('resize', adjustTextareaHeight);

// Initialize highlighting
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM content loaded');
  initializeHighlightJS();
  adjustTextareaHeight();
});

console.log('prompt.js loaded');
