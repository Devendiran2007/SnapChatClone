const API_URL = "http://localhost:5204/api";
const HUB_URL = "http://localhost:5204/chatHub";

function parseDate(dateStr) {
    if (!dateStr) return new Date();
    if (dateStr instanceof Date) return dateStr;
    if (typeof dateStr === 'string' && !dateStr.endsWith('Z') && !/[+-]\d{2}:\d{2}$/.test(dateStr)) {
        return new Date(dateStr + 'Z');
    }
    return new Date(dateStr);
}

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
    showChatToast(message, isError);
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
    connection.on("ReceiveMessage", (senderId, content, sentAt) => {
        // If we are currently chatting with the sender
        if (activeFriendId === senderId) {
            appendMessage(senderId, content, sentAt || new Date().toISOString(), true);
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
        const time = parseDate(chat.lastMessageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
        const time = parseDate(chat.lastMessageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
    
    const time = parseDate(sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
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
        await fetchAllUsers();
        await fetchRecentChats();
        await fetchStories();
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

let allUsers = [];
let stories = [];
let storyViewerTimer = null;
let currentStoriesToView = [];
let currentStoryIndex = 0;

async function fetchAllUsers() {
    try {
        const response = await fetch(`${API_URL}/Auth/users`);
        if (response.ok) {
            allUsers = await response.json();
        }
    } catch (e) {
        console.error("Error fetching all users:", e);
    }
}

function getUsername(userId) {
    if (userId === currentUserId) return "My Story";
    const user = allUsers.find(u => u.id === userId);
    return user ? user.username : "Unknown User";
}

async function fetchStories() {
    const token = localStorage.getItem("token");
    try {
        const response = await fetch(`${API_URL}/Story`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (response.ok) {
            stories = await response.json();
            renderStories();
        }
    } catch (e) {
        console.error("Error fetching stories:", e);
    }
}

function renderStories() {
    const carousel = document.getElementById("stories-carousel");
    if (!carousel) return;

    let html = `
        <div class="story-bubble add-story" onclick="openAddStoryModal()">
            <div class="story-avatar-circle add">
                <i class="fa-plus fas"></i>
            </div>
            <span class="story-username">My Story</span>
        </div>
    `;

    const storiesByUser = {};
    stories.forEach(story => {
        if (!storiesByUser[story.userId]) {
            storiesByUser[story.userId] = [];
        }
        storiesByUser[story.userId].push(story);
    });

    Object.keys(storiesByUser).forEach(userId => {
        storiesByUser[userId].sort((a, b) => parseDate(b.createdAt) - parseDate(a.createdAt));
    });

    Object.keys(storiesByUser).forEach(userId => {
        const userIdInt = parseInt(userId);
        const username = getUsername(userIdInt);

        html += `
            <div class="story-bubble" onclick="viewUserStories(${userIdInt})">
                <div class="story-avatar-circle">
                    ${username.charAt(0).toUpperCase()}
                </div>
                <span class="story-username">${username}</span>
            </div>
        `;
    });

    carousel.innerHTML = html;
}

function viewUserStories(userId) {
    currentStoriesToView = stories.filter(s => s.userId === userId)
        .sort((a, b) => parseDate(a.createdAt) - parseDate(b.createdAt));

    if (currentStoriesToView.length === 0) return;

    currentStoryIndex = 0;
    showStory(currentStoryIndex);
}

function showStory(index) {
    if (index >= currentStoriesToView.length) {
        closeStoryViewer();
        return;
    }

    currentStoryIndex = index;
    const story = currentStoriesToView[index];
    const username = getUsername(story.userId);

    const overlay = document.getElementById("story-viewer");
    const img = document.getElementById("story-viewer-img");
    const nameLabel = document.getElementById("story-viewer-name");
    const timeLabel = document.getElementById("story-viewer-time");
    const avatar = document.getElementById("story-viewer-avatar");
    const progressContainer = document.getElementById("story-progress-container");

    overlay.classList.add("show");
    img.src = story.mediaUrl;
    nameLabel.innerText = username;
    avatar.innerText = username.charAt(0).toUpperCase();

    const diffMs = new Date() - parseDate(story.createdAt);
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffHrs > 0) {
        timeLabel.innerText = `${diffHrs}h ago`;
    } else if (diffMins > 0) {
        timeLabel.innerText = `${diffMins}m ago`;
    } else {
        timeLabel.innerText = "Just now";
    }

    progressContainer.innerHTML = currentStoriesToView.map((s, idx) => {
        let fillWidth = "0%";
        if (idx < index) {
            fillWidth = "100%";
        }
        return `
            <div class="story-viewer-progress-bar">
                <div class="story-viewer-progress-fill" id="story-progress-fill-${idx}" style="width: ${fillWidth};"></div>
            </div>
        `;
    }).join('');

    clearTimeout(storyViewerTimer);
    const currentBar = document.getElementById(`story-progress-fill-${index}`);
    
    let start = null;
    const duration = 4000;

    function animateProgress(timestamp) {
        if (!start) start = timestamp;
        const elapsed = timestamp - start;
        const progress = Math.min((elapsed / duration) * 100, 100);
        
        if (currentBar) {
            currentBar.style.width = progress + "%";
        }

        if (elapsed < duration) {
            storyViewerTimer = requestAnimationFrame(animateProgress);
        } else {
            showStory(currentStoryIndex + 1);
        }
    }

    storyViewerTimer = requestAnimationFrame(animateProgress);
}

function closeStoryViewer() {
    cancelAnimationFrame(storyViewerTimer);
    const overlay = document.getElementById("story-viewer");
    if (overlay) overlay.classList.remove("show");
}

function openAddStoryModal() {
    const modal = document.getElementById("add-story-modal");
    if (modal) {
        modal.classList.add("show");
        document.getElementById("story-media-url").value = "";
    }
}

function closeAddStoryModal() {
    const modal = document.getElementById("add-story-modal");
    if (modal) modal.classList.remove("show");
}

function generateDemoStoryUrl() {
    const randomId = Math.floor(Math.random() * 1000);
    // Unsplash premium story mock backgrounds
    const urls = [
        "https://images.unsplash.com/photo-1504608524841-42fe6f032b4b?auto=format&fit=crop&w=400&q=80",
        "https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=400&q=80",
        "https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?auto=format&fit=crop&w=400&q=80",
        "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=400&q=80"
    ];
    document.getElementById("story-media-url").value = urls[randomId % urls.length];
}

async function submitStory() {
    const mediaUrlInput = document.getElementById("story-media-url");
    const mediaUrl = mediaUrlInput.value.trim();
    if (!mediaUrl) {
        showChatToast("Please enter a media URL", true);
        return;
    }

    const token = localStorage.getItem("token");
    try {
        const response = await fetch(`${API_URL}/Story`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ mediaUrl })
        });

        if (response.ok) {
            showChatToast("Story posted successfully!");
            closeAddStoryModal();
            fetchStories();
        } else {
            const errText = await response.text();
            showChatToast(errText || "Failed to post story", true);
        }
    } catch (e) {
        console.error("Error posting story:", e);
        showChatToast("Connection failed", true);
    }
}

function showChatToast(message, isError = false) {
    const toast = document.getElementById("chat-toast");
    const label = document.getElementById("toast-message");
    
    if (label) label.innerText = message;
    if (toast) {
        toast.style.borderLeftColor = isError ? "var(--accent-red)" : "var(--accent-green)";
        toast.classList.add("show");
        setTimeout(() => {
            toast.classList.remove("show");
        }, 3000);
    }
}

