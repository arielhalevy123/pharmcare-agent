const messagesContainer = document.getElementById('messages');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const userIdSelect = document.getElementById('userId');

let currentEventSource = null;
let currentMessageDiv = null;
let currentToolCallDiv = null;

function addMessage(content, type) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${type}`;
  
  const bubble = document.createElement('div');
  bubble.className = 'message-bubble';
  bubble.textContent = content;
  
  messageDiv.appendChild(bubble);
  messagesContainer.appendChild(messageDiv);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
  
  return bubble;
}

function addToolCall(toolName, args) {
  const toolDiv = document.createElement('div');
  toolDiv.className = 'tool-call';
  toolDiv.setAttribute('data-tool-name', toolName);
  
  const header = document.createElement('div');
  header.className = 'tool-call-header';
  header.innerHTML = `
    <span>Tool Call:</span>
    <span class="tool-call-name">${toolName}</span>
    <span class="timestamp">${new Date().toLocaleTimeString()}</span>
  `;
  
  const argsDiv = document.createElement('div');
  argsDiv.className = 'tool-call-args';
  if (typeof args === 'object' && args !== null) {
    argsDiv.textContent = JSON.stringify(args, null, 2);
  } else {
    argsDiv.textContent = String(args);
  }
  
  toolDiv.appendChild(header);
  toolDiv.appendChild(argsDiv);
  
  if (currentMessageDiv) {
    currentMessageDiv.appendChild(toolDiv);
  } else {
    messagesContainer.appendChild(toolDiv);
  }
  
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
  return toolDiv;
}

function addToolResult(toolName, result) {
  const resultDiv = document.createElement('div');
  resultDiv.className = 'tool-result';
  
  const header = document.createElement('div');
  header.className = 'tool-result-header';
  header.innerHTML = `
    <span>Tool Result:</span>
    <span class="tool-call-name">${toolName}</span>
    <span class="timestamp">${new Date().toLocaleTimeString()}</span>
  `;
  
  const contentDiv = document.createElement('div');
  contentDiv.className = 'tool-result-content';
  contentDiv.textContent = JSON.stringify(result, null, 2);
  
  resultDiv.appendChild(header);
  resultDiv.appendChild(contentDiv);
  
  if (currentMessageDiv) {
    currentMessageDiv.appendChild(resultDiv);
  } else {
    messagesContainer.appendChild(resultDiv);
  }
  
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Use POST instead of GET for EventSource
// Since EventSource only supports GET, we'll use fetch with streaming
function sendMessageWithFetch() {
  const message = messageInput.value.trim();
  const userId = parseInt(userIdSelect.value);

  if (!message) return;

  // Add user message
  addMessage(message, 'user');
  messageInput.value = '';
  sendButton.disabled = true;

  // Create assistant message container
  currentMessageDiv = document.createElement('div');
  currentMessageDiv.className = 'message assistant';
  const bubble = document.createElement('div');
  bubble.className = 'message-bubble';
  currentMessageDiv.appendChild(bubble);
  messagesContainer.appendChild(currentMessageDiv);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;

  // Use fetch with streaming
  fetch('/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message, userId }),
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let accumulatedText = '';

      function readChunk() {
        return reader.read().then(({ done, value }) => {
          if (done) {
            sendButton.disabled = false;
            currentMessageDiv = null;
            return;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));

                if (data.type === 'text') {
                  accumulatedText += data.data;
                  bubble.textContent = accumulatedText;
                  messagesContainer.scrollTop = messagesContainer.scrollHeight;
                } else if (data.type === 'tool_call') {
                  // Update existing tool call or create new one
                  const toolName = data.data.name;
                  const existingToolCall = currentMessageDiv?.querySelector(`.tool-call[data-tool-name="${toolName}"]`);
                  
                  if (existingToolCall) {
                    // Update existing tool call
                    const argsDiv = existingToolCall.querySelector('.tool-call-args');
                    if (argsDiv) {
                      let args = {};
                      try {
                        args = JSON.parse(data.data.arguments || '{}');
                        argsDiv.textContent = JSON.stringify(args, null, 2);
                      } catch (e) {
                        // Partial JSON - show raw
                        argsDiv.textContent = data.data.arguments || '{}';
                      }
                    }
                  } else {
                    // Create new tool call
                    let args = {};
                    try {
                      args = JSON.parse(data.data.arguments || '{}');
                    } catch (e) {
                      args = { raw: data.data.arguments || '{}' };
                    }
                    const toolDiv = addToolCall(toolName, args);
                    if (toolDiv) {
                      toolDiv.setAttribute('data-tool-name', toolName);
                    }
                  }
                } else if (data.type === 'tool_result') {
                  addToolResult(data.data.name, data.data.result);
                } else if (data.type === 'done') {
                  sendButton.disabled = false;
                  currentMessageDiv = null;
                  return;
                } else if (data.type === 'error') {
                  bubble.className = 'error';
                  bubble.textContent = `Error: ${data.error}`;
                  sendButton.disabled = false;
                  currentMessageDiv = null;
                  return;
                }
              } catch (e) {
                console.error('Error parsing SSE data:', e, line);
              }
            }
          }

          return readChunk();
        });
      }

      return readChunk();
    })
    .catch((error) => {
      console.error('Fetch error:', error);
      bubble.className = 'error';
      bubble.textContent = 'Connection error. Please try again.';
      sendButton.disabled = false;
      currentMessageDiv = null;
    });
}

sendButton.addEventListener('click', sendMessageWithFetch);
messageInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter' && !sendButton.disabled) {
    sendMessageWithFetch();
  }
});

