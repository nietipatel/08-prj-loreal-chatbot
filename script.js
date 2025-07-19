// ========================================
// DOM ELEMENTS - Getting references to HTML elements
// ========================================
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatWindow = document.getElementById("chatWindow");

// ========================================
// SPLIT SCREEN PARALLAX EFFECT
// This creates a beautiful split-screen background with vertical parallax movement
// ========================================
function initSplitParallax() {
  const splitLeft = document.querySelector(".split-left");
  const splitRight = document.querySelector(".split-right");

  // Function to update parallax positions based on scroll (vertical movement only)
  function updateParallax() {
    const scrollTop = window.pageYOffset;

    // Calculate vertical parallax movement
    const leftMoveY = scrollTop * 0.3; // Left side moves slower upward
    const rightMoveY = scrollTop * 0.5; // Right side moves faster upward

    // Apply vertical transforms for parallax effect
    splitLeft.style.transform = `translateY(${leftMoveY}px)`;
    splitRight.style.transform = `translateY(-${rightMoveY}px)`; // Opposite direction
  }

  // Update parallax on scroll with throttling for performance
  let ticking = false;
  function requestParallaxUpdate() {
    if (!ticking) {
      requestAnimationFrame(updateParallax);
      ticking = true;
      setTimeout(() => {
        ticking = false;
      }, 16); // ~60fps
    }
  }

  // Add scroll listener
  window.addEventListener("scroll", requestParallaxUpdate);

  // Initial setup
  updateParallax();
}

// Initialize split parallax when page loads
document.addEventListener("DOMContentLoaded", initSplitParallax);

// ========================================
// CONVERSATION HISTORY - Array to store all messages
// This allows the AI to remember the conversation context
// ========================================
let conversationHistory = [
  {
    role: "system", // This is a special message that tells the AI how to behave
    content: `You are L'Oréal's AI Beauty Assistant, a knowledgeable and friendly expert on L'Oréal products and beauty advice. Your role is to help users discover and understand L'Oréal's extensive range of products including makeup, skincare, haircare, and fragrances.

Guidelines for your responses:
- Only provide information about L'Oréal products, beauty routines, makeup tips, skincare advice, haircare solutions, and fragrance recommendations
- Be enthusiastic and knowledgeable about L'Oréal's product lines and their benefits
- Offer personalized recommendations when users describe their needs or concerns
- Politely redirect conversations that are not related to beauty, L'Oréal products, or beauty routines
- Keep responses helpful, concise, and friendly
- When you don't have specific product information, suggest users visit a L'Oréal store or website for the most up-to-date details

If someone asks about topics unrelated to L'Oréal, beauty, or personal care, politely say something like: "I'm here to help you with L'Oréal beauty products and routines! What can I assist you with regarding makeup, skincare, haircare, or fragrances?"`,
  },
];

// ========================================
// INITIAL WELCOME MESSAGE
// Using template literals (backticks) to create multi-line HTML
// ========================================
const welcomeMessage = `
  <div class="msg ai">
    👋 Welcome to L'Oréal Beauty Assistant! I'm here to help you discover the perfect beauty products and routines. Whether you're looking for makeup tips, skincare advice, haircare solutions, or fragrance recommendations, I've got you covered! What can I help you with today?
  </div>
`;
chatWindow.innerHTML = welcomeMessage;

// ========================================
// FUNCTION: Add Message to Chat Window
// This function creates a new message element and adds it to the chat
// ========================================
function addMessage(content, sender) {
  // Create a new div element for the message
  const messageDiv = document.createElement("div");

  // Add CSS classes - "msg" for all messages, and "user" or "ai" for styling
  messageDiv.className = `msg ${sender}`;

  // Set the text content of the message
  messageDiv.textContent = content;

  // Add the message to the chat window
  chatWindow.appendChild(messageDiv);

  // Automatically scroll to the bottom to show the newest message
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

// ========================================
// ASYNC FUNCTION: Get AI Response from OpenAI API
// This function sends our messages to OpenAI and gets a response back
// ========================================
async function getAIResponse(userMessage) {
  // Add the user's message to our conversation history array
  conversationHistory.push({
    role: "user", // This tells the AI that this message came from the user
    content: userMessage,
  });

  try {
    // Try to make the API request (this might fail, so we use try/catch)
    let response;

    // Check if we're using Cloudflare Worker or direct API
    if (typeof CLOUDFLARE_WORKER_URL !== "undefined") {
      // OPTION 1: Use Cloudflare Worker endpoint (for production)
      response = await fetch(CLOUDFLARE_WORKER_URL, {
        method: "POST", // We're sending data to the server
        headers: {
          "Content-Type": "application/json", // Tell server we're sending JSON
        },
        body: JSON.stringify({
          messages: conversationHistory, // Send our conversation history
        }),
      });
    } else {
      // OPTION 2: Use direct OpenAI API (for development with secrets.js)
      response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST", // We're sending data to the server
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`, // Our API key for authentication
          "Content-Type": "application/json", // Tell server we're sending JSON
        },
        body: JSON.stringify({
          model: "gpt-4o", // Which AI model to use
          messages: conversationHistory, // Send our conversation history
          max_completion_tokens: 300, // Limit response length
        }),
      });
    }

    // Check if the API request was successful
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    // Convert the response to JSON format
    const data = await response.json();

    // Extract the AI's message from the response
    // OpenAI returns the message in data.choices[0].message.content
    const aiMessage = data.choices[0].message.content;

    // Add the AI's response to our conversation history
    conversationHistory.push({
      role: "assistant", // This tells us the message came from the AI
      content: aiMessage,
    });

    // Return the AI's message so we can display it
    return aiMessage;
  } catch (error) {
    // If something goes wrong, log the error and return a friendly message
    console.error("Error calling AI API:", error);
    return "I apologize, but I'm having trouble connecting right now. Please try again in a moment, or visit a L'Oréal store for immediate assistance with your beauty needs!";
  }
}

// ========================================
// EVENT LISTENER: Handle Form Submission
// This runs when the user clicks the send button or presses Enter
// ========================================
chatForm.addEventListener("submit", async (e) => {
  // Prevent the form from refreshing the page (default browser behavior)
  e.preventDefault();

  // Get the user's message and remove extra spaces
  const userMessage = userInput.value.trim();

  // If the message is empty, don't do anything
  if (!userMessage) return;

  // Add the user's message to the chat window
  addMessage(userMessage, "user");

  // Clear the input field so user can type a new message
  userInput.value = "";

  // Show a loading message while we wait for AI response
  const loadingDiv = document.createElement("div");
  loadingDiv.className = "msg ai";
  loadingDiv.textContent =
    "✨ Thinking about the perfect beauty solution for you...";
  loadingDiv.id = "loading-message"; // Give it an ID so we can remove it later
  chatWindow.appendChild(loadingDiv);
  chatWindow.scrollTop = chatWindow.scrollHeight;

  // Get the AI response (this is an async operation, so we use await)
  const aiResponse = await getAIResponse(userMessage);

  // Remove the loading message now that we have a response
  const loadingMessage = document.getElementById("loading-message");
  if (loadingMessage) {
    loadingMessage.remove();
  }

  // Add the AI's response to the chat window
  addMessage(aiResponse, "ai");
});
