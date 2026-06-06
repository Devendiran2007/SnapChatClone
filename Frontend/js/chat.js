const API_URL = "http://localhost:5204/api";
const HUB_URL = "http://localhost:5204/chatHub";

let connection = null;
let currentUserId = null;
let currentUsername = "";
let recentChats = [];
let activeFriendId = null;
let activeFriendName = "";
let typingTimeout = null;
let isTyping = false;

// Toast helper
function showToast(message, isError = false) {
    // Standard alert or DOM toast if available
    console.log(`[Toast] ${message}`);
}

// Redirect if unauthenticated
function checkAuth() {
    const token = localStorage.getItem("token");
    if (!token) {
        window.location.href = "login.html";
        return false;
    }
    return true;
}

// Fetch my profile
async function fetchProfile() {
    const token = localStorage.getItem("token");
    try {
        const response = await fetch(`${API_URL}/Auth/me`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (!response.ok) {
            logout();
            return;
        }
        const data = await response.json();
        currentUserId = parseInt(data.userId);
        currentUsername = data.username;

        document.getElementById("user-display-name").innerText = currentUsername;
        document.getElementById("user-avatar").innerText = currentUsername.charAt(0).toUpperCase();
    } catch (e) {
        console.error("Error fetching profile:", e);
    }
}

// Setup SignalR connection
async function setupSignalR() {
    const token = localStorage.getItem("token");
    connection = new signalR.HubConnectionBuilder()
        .withUrl(HUB_URL, {
            accessTokenFactory: () => token
        })
        .withAutomaticReconnect()
        .build();

    // Listeners
    connection.on("ReceiveMessage", (senderId, content) => {
        // If we are currently chatting with the sender
        if (activeFriendId === senderId) {
            appendMessage(senderId, content, new Date().toISOString(), true);
            scrollToBottom();
            // Call API to mark as seen
            markAsSeen(senderId);
        } else {
            // Otherwise, refresh recent chats to show new message / update last message
            fetchRecentChats();
        }
    });

    connection.on("UserTyping", (senderId) => {
        if (activeFriendId === senderId) {
            document.getElementById("typing-indicator").classList.remove("hidden");
            scrollToBottom();
        }
    });

    connection.on("UserStopTyping", (senderId) => {
        if (activeFriendId === senderId) {
            document.getElementById("typing-indicator").classList.add("hidden");
        }
    });

    connection.on("MessageSeen", (message) => {
        // If the seen message is in the current conversation
        if (activeFriendId === message.receiverId || activeFriendId === message.senderId) {
            // Find and update the receipt state of that message in UI
            const receipts = document.querySelectorAll(`.msg-[data-id="${message.id}"] .message-meta`);
            receipts.forEach(r => {
                r.innerHTML = `<i class="fa-circle-check fas seen-icon"></i> Seen`;
            });
        }
    });

    try {
        await connection.start();
        console.log("SignalR Connected.");
    } catch (err) {
        console.error("SignalR connection error:", err);
        setTimeout(setupSignalR, 5000);
    }
}

// Mark conversation as seen
async function markAsSeen(friendId) {
    const token = localStorage.getItem("token");
    try {
        await fetch(`${API_URL}/Message/conversation/${friendId}`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
    } catch (e) {
        console.error("Error marking as seen:", e);
    }
}

// Fetch recent chats list
async function fetchRecentChats() {
    const token = localStorage.getItem("token");
    try {
        const response = await fetch(`${API_URL}/Message/recent`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (response.ok) {
            recentChats = await response.json();
            renderRecentChats();
        }
    } catch (e) {
        console.error("Error fetching recent chats:", e);
    }
}

// Render recent chats list in sidebar
function renderRecentChats() {
    const container = document.getElementById("recent-chats-list");
    if (recentChats.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; color: var(--text-gray); padding: 2rem;">
                <p>No recent conversations.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = recentChats.map(chat => {
        const isOnline = chat.isOnline;
        const time = new Date(chat.lastMessageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const isActive = activeFriendId === chat.userId ? 'active' : '';

        return `
            <div class="list-item ${isActive}" onclick="selectChat(${chat.userId}, '${chat.username}')">
                <div class="list-item-avatar">
                    <div class="avatar-circle" style="width: 40px; height: 40px; font-size: 1rem;">
                        ${chat.username.charAt(0).toUpperCase()}
                    </div>
                    <span class="status-badge ${isOnline ? 'online' : ''}"></span>
                </div>
                <div class="list-item-details">
                    <div class="list-item-header">
                        <span class="list-item-title">${chat.username}</span>
                        <span class="list-item-time">${time}</span>
                    </div>
                    <div class="list-item-sub">${chat.lastMessage}</div>
                </div>
            </div>
        `;
    }).join('');
}

// Filter recent chats using search input
function filterRecentChats() {
    const query = document.getElementById("chat-search").value.toLowerCase().trim();
    if (!query) {
        renderRecentChats();
        return;
    }
    const filtered = recentChats.filter(chat => chat.username.toLowerCase().includes(query));
    
    const container = document.getElementById("recent-chats-list");
    if (filtered.length === 0) {
        container.innerHTML = `<div style="text-align: center; color: var(--text-gray); padding: 2rem;"><p>No results found</p></div>`;
        return;
    }

    container.innerHTML = filtered.map(chat => {
        const isOnline = chat.isOnline;
        const time = new Date(chat.lastMessageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const isActive = activeFriendId === chat.userId ? 'active' : '';

        return `
            <div class="list-item ${isActive}" onclick="selectChat(${chat.userId}, '${chat.username}')">
                <div class="list-item-avatar">
                    <div class="avatar-circle" style="width: 40px; height: 40px; font-size: 1rem;">
                        ${chat.username.charAt(0).toUpperCase()}
                    </div>
                    <span class="status-badge ${isOnline ? 'online' : ''}"></span>
                </div>
                <div class="list-item-details">
                    <div class="list-item-header">
                        <span class="list-item-title">${chat.username}</span>
                        <span class="list-item-time">${time}</span>
                    </div>
                    <div class="list-item-sub">${chat.lastMessage}</div>
                </div>
            </div>
        `;
    }).join('');
}

// Select active chat
async function selectChat(friendId, username) {
    activeFriendId = friendId;
    activeFriendName = username;

    // UI Updates
    document.getElementById("empty-chat-state").classList.add("hidden");
    document.getElementById("active-chat-view").classList.remove("hidden");
    
    document.getElementById("active-friend-name").innerText = username;
    document.getElementById("active-friend-avatar").innerText = username.charAt(0).toUpperCase();

    // Set online status in header based on recent chat list
    const friendInfo = recentChats.find(c => c.userId === friendId);
    const statusHeader = document.getElementById("active-friend-status");
    if (friendInfo && friendInfo.isOnline) {
        statusHeader.innerText = "Online";
        statusHeader.style.color = "var(--accent-green)";
    } else {
        statusHeader.innerText = "Offline";
        statusHeader.style.color = "var(--text-gray)";
    }

    // Refresh active status highlighting in list
    const items = document.querySelectorAll(".list-item");
    items.forEach(item => item.classList.remove("active"));
    
    // Fetch conversation messages
    const token = localStorage.getItem("token");
    try {
        const response = await fetch(`${API_URL}/Message/conversation/${friendId}`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        
        if (response.ok) {
            const messages = await response.json();
            renderMessages(messages);
            scrollToBottom();
        }
    } catch (e) {
        console.error("Error loading conversation:", e);
    }

    // Update list to remove unread visual indicators if any
    fetchRecentChats();
}

// Render messages in chat container
function renderMessages(messages) {
    const container = document.getElementById("chat-messages-container");
    container.innerHTML = "";

    messages.forEach(msg => {
        // msg is MessageDto { senderId, content, sentAt }
        const isSent = msg.senderId === currentUserId;
        appendMessage(msg.senderId, msg.content, msg.sentAt, false);
    });
}

// Append single message to chat container
function appendMessage(senderId, content, sentAt, isNew = false) {
    const container = document.getElementById("chat-messages-container");
    const isSent = senderId === currentUserId;
    
    const wrapper = document.createElement("div");
    wrapper.className = `message-wrapper ${isSent ? 'sent' : 'received'}`;
    
    const time = new Date(sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    wrapper.innerHTML = `
        <div class="message-bubble">
            ${escapeHtml(content)}
        </div>
        <div class="message-meta">
            <span>${time}</span>
        </div>
    `;

    container.appendChild(wrapper);
    if (isNew) {
        scrollToBottom();
    }
}

// Send Message
async function handleSendMessage() {
    const input = document.getElementById("message-text-input");
    const content = input.value.trim();
    if (!content || !activeFriendId) return;

    input.value = "";
    
    // Send stop typing event immediately
    sendStopTyping();

    try {
        // Send message via SignalR hub
        if (connection && connection.state === signalR.HubConnectionState.Connected) {
            await connection.invoke("SendMessage", activeFriendId, content);
            
            // Append message locally immediately
            appendMessage(currentUserId, content, new Date().toISOString(), true);
            scrollToBottom();

            // Refresh recent chats list
            setTimeout(fetchRecentChats, 500);
        } else {
            // Fallback to HTTP API if SignalR is down
            const token = localStorage.getItem("token");
            const response = await fetch(`${API_URL}/Message/send`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    receiverId: activeFriendId,
                    content: content
                })
            });

            if (response.ok) {
                appendMessage(currentUserId, content, new Date().toISOString(), true);
                scrollToBottom();
                setTimeout(fetchRecentChats, 500);
            }
        }
    } catch (e) {
        console.error("Send message error:", e);
    }
}

// Handle real-time typing events
function handleTypingEvent() {
    if (!connection || connection.state !== signalR.HubConnectionState.Connected || !activeFriendId) return;

    if (!isTyping) {
        isTyping = true;
        connection.invoke("Typing", activeFriendId).catch(err => console.error(err));
    }

    // Clear previous timeout and set a new one to send StopTyping after 3 seconds of silence
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
        sendStopTyping();
    }, 3000);
}

function sendStopTyping() {
    if (isTyping && activeFriendId && connection && connection.state === signalR.HubConnectionState.Connected) {
        isTyping = false;
        connection.invoke("StopTyping", activeFriendId).catch(err => console.error(err));
    }
}

// Helpers
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}

function scrollToBottom() {
    const container = document.getElementById("chat-messages-container");
    container.scrollTop = container.scrollHeight;
}

function closeChat() {
    activeFriendId = null;
    document.getElementById("active-chat-view").classList.add("hidden");
    document.getElementById("empty-chat-state").classList.remove("hidden");
}

function goToFriends() {
    window.location.href = "friends.html";
}

function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    window.location.href = "login.html";
}

// Initialize chat window
document.addEventListener("DOMContentLoaded", async () => {
    if (checkAuth()) {
        await fetchProfile();
        await fetchRecentChats();
        await setupSignalR();

        // Check if navigated with a friendId query param
        const urlParams = new URLSearchParams(window.location.search);
        const urlFriendId = urlParams.get("friendId");
        if (urlFriendId) {
            // Find username in recent chats or fetch it from friends endpoint if not found
            const idInt = parseInt(urlFriendId);
            const token = localStorage.getItem("token");
            try {
                // Fetch friends to find the user's name
                const res = await fetch(`${API_URL}/FriendRequest/friends`, {
                    headers: { "Authorization": `Bearer ${token}` }
                });
                if (res.ok) {
                    const friends = await res.json();
                    const friend = friends.find(f => f.id === idInt);
                    if (friend) {
                        selectChat(friend.id, friend.username);
                    }
                }
            } catch (e) {
                console.error(e);
            }
        }
    }
});
