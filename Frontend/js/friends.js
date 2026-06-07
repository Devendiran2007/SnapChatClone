const API_URL = "http://localhost:5204/api";
let currentUserId = null;
let currentUsername = "";
let allUsers = [];
let friendsList = [];
let pendingList = [];
let blockedList = [];

// Show dynamic toasts
function showToast(message, isError = false) {
    const toast = document.getElementById("friends-toast");
    const label = document.getElementById("toast-message");
    
    if (label) label.innerText = message;
    if (toast) {
        toast.style.borderLeftColor = isError ? "var(--accent-red)" : "var(--snap-yellow)";
        toast.classList.add("show");
        setTimeout(() => {
            toast.classList.remove("show");
        }, 3000);
    }
}

// Check if user is authenticated
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
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            logout();
            return;
        }

        const data = await response.json();
        currentUserId = data.userId;
        currentUsername = data.username;

        // Display user details
        document.getElementById("user-display-name").innerText = currentUsername;
        document.getElementById("user-avatar").innerText = currentUsername.charAt(0).toUpperCase();
    } catch (e) {
        console.error("Error fetching profile:", e);
    }
}

// Fetch friends list
async function fetchFriends() {
    const token = localStorage.getItem("token");
    try {
        const response = await fetch(`${API_URL}/FriendRequest/friends`, {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        if (response.ok) {
            friendsList = await response.json();
            document.getElementById("friends-count").innerText = friendsList.length;
            renderFriends();
        }
    } catch (e) {
        console.error("Error fetching friends:", e);
    }
}

// Render friends grid
function renderFriends() {
    const container = document.getElementById("friends-list");
    if (friendsList.length === 0) {
        container.innerHTML = `
            <div class="text-center" style="grid-column: 1/-1; color: var(--text-gray); padding: 3rem;">
                <i class="fa-user-group fas" style="font-size: 3rem; color: var(--bg-input); margin-bottom: 1.5rem;"></i>
                <p>You don't have any friends yet.</p>
                <button class="btn-primary" onclick="openAddFriendModal()" style="width: auto; margin: 1rem auto 0;">Add Friends</button>
            </div>
        `;
        return;
    }

    container.innerHTML = friendsList.map(friend => {
        const isOnline = friend.isOnline;
        return `
            <div class="friend-card">
                <div class="friend-card-avatar">
                    <div class="avatar-circle" style="width: 60px; height: 60px; font-size: 1.5rem;">
                        ${friend.username.charAt(0).toUpperCase()}
                    </div>
                </div>
                <div class="friend-card-name">${friend.username}</div>
                <div class="friend-card-status ${isOnline ? 'online' : ''}">
                    ${isOnline ? 'Online' : 'Offline'}
                </div>
                <div class="friend-card-actions">
                    <button class="btn-secondary" onclick="openChatWith(${friend.id})">
                        <i class="fa-comments fas"></i> Chat
                    </button>
                    <button class="btn-secondary" onclick="blockFriend(${friend.id}, '${friend.username}')" style="border-color: var(--accent-red); color: var(--accent-red);">
                        <i class="fa-ban fas"></i> Block
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Fetch pending requests
async function fetchPendingRequests() {
    const token = localStorage.getItem("token");
    try {
        const response = await fetch(`${API_URL}/FriendRequest/pending`, {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        if (response.ok) {
            pendingList = await response.json();
            document.getElementById("pending-count").innerText = pendingList.length;
            renderPending();
        }
    } catch (e) {
        console.error("Error fetching pending requests:", e);
    }
}

// Render pending requests list
function renderPending() {
    const container = document.getElementById("pending-list");
    if (pendingList.length === 0) {
        container.innerHTML = `
            <div class="text-center" style="grid-column: 1/-1; color: var(--text-gray); padding: 3rem;">
                <i class="fa-envelope-open fas" style="font-size: 3rem; color: var(--bg-input); margin-bottom: 1.5rem;"></i>
                <p>No pending friend requests.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = pendingList.map(req => {
        return `
            <div class="friend-card">
                <div class="friend-card-avatar">
                    <div class="avatar-circle" style="width: 60px; height: 60px; font-size: 1.5rem; background: linear-gradient(135deg, var(--accent-blue) 0%, var(--accent-red) 100%);">
                        ${req.senderUsername.charAt(0).toUpperCase()}
                    </div>
                </div>
                <div class="friend-card-name">${req.senderUsername}</div>
                <div class="friend-card-status">Sent you a request</div>
                <div class="friend-card-actions">
                    <button class="btn-primary" onclick="acceptFriend(${req.requestId})" style="font-size: 0.85rem; padding: 0.5rem;">Accept</button>
                    <button class="btn-secondary" onclick="rejectFriend(${req.requestId})" style="font-size: 0.85rem; padding: 0.5rem; border-color: var(--accent-red); color: var(--accent-red);">Ignore</button>
                </div>
            </div>
        `;
    }).join('');
}

// Accept friend request
async function acceptFriend(requestId) {
    const token = localStorage.getItem("token");
    try {
        const response = await fetch(`${API_URL}/FriendRequest/accept`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ requestId })
        });

        if (response.ok) {
            showToast("Friend request accepted!");
            fetchFriends();
            fetchPendingRequests();
        } else {
            showToast("Failed to accept request", true);
        }
    } catch (e) {
        console.error(e);
        showToast("Error connection", true);
    }
}

// Reject friend request
async function rejectFriend(requestId) {
    const token = localStorage.getItem("token");
    try {
        const response = await fetch(`${API_URL}/FriendRequest/reject`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ requestId })
        });

        if (response.ok) {
            showToast("Request ignored.");
            fetchPendingRequests();
        } else {
            showToast("Failed to reject request", true);
        }
    } catch (e) {
        console.error(e);
        showToast("Error connection", true);
    }
}

// Add Friend Modal
function openAddFriendModal() {
    document.getElementById("add-friend-modal").classList.add("show");
    document.getElementById("user-search-input").value = "";
    document.getElementById("search-results").innerHTML = `<p style="text-align: center; color: var(--text-gray); padding: 1.5rem 0;">Type a username to start searching</p>`;
    fetchAllUsers();
}

function closeAddFriendModal() {
    document.getElementById("add-friend-modal").classList.remove("show");
}

// Fetch all users for search
async function fetchAllUsers() {
    try {
        const response = await fetch(`${API_URL}/Auth/users`);
        if (response.ok) {
            allUsers = await response.json();
        }
    } catch (e) {
        console.error(e);
    }
}

// Search users in modal
function searchUsers() {
    const searchVal = document.getElementById("user-search-input").value.toLowerCase().trim();
    const resultsContainer = document.getElementById("search-results");
    
    if (!searchVal) {
        resultsContainer.innerHTML = `<p style="text-align: center; color: var(--text-gray); padding: 1.5rem 0;">Type a username to start searching</p>`;
        return;
    }

    // Filter out current user, existing friends, and pending senders
    const filtered = allUsers.filter(user => {
        if (user.username.toLowerCase() === currentUsername.toLowerCase()) return false;
        
        // Check if already friends
        const isFriend = friendsList.some(f => f.username.toLowerCase() === user.username.toLowerCase());
        if (isFriend) return false;

        return user.username.toLowerCase().includes(searchVal);
    });

    if (filtered.length === 0) {
        resultsContainer.innerHTML = `<p style="text-align: center; color: var(--text-gray); padding: 1.5rem 0;">No users found</p>`;
        return;
    }

    resultsContainer.innerHTML = filtered.map(user => `
        <div class="user-result-item">
            <div class="user-result-info">
                <div class="avatar-circle" style="width: 36px; height: 36px; font-size: 0.95rem;">
                    ${user.username.charAt(0).toUpperCase()}
                </div>
                <span>${user.username}</span>
            </div>
            <button class="action-btn-sm add" onclick="sendFriendRequest(${user.id}, '${user.username}')">
                <i class="fa-user-plus fas"></i> Add
            </button>
        </div>
    `).join('');
}

// Send Friend Request
async function sendFriendRequest(receiverId, username) {
    const token = localStorage.getItem("token");
    try {
        const response = await fetch(`${API_URL}/FriendRequest/send-request`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ receiverId })
        });

        if (response.ok) {
            showToast(`Friend request sent to ${username}!`);
            closeAddFriendModal();
        } else {
            const errText = await response.text();
            showToast(errText || "Request failed", true);
        }
    } catch (e) {
        console.error(e);
        showToast("Connection failed", true);
    }
}

// Switch tabs
function switchTab(tab) {
    const tabFriends = document.getElementById("tab-my-friends");
    const tabPending = document.getElementById("tab-pending");
    const tabBlocked = document.getElementById("tab-blocked");
    const listFriends = document.getElementById("friends-list");
    const listPending = document.getElementById("pending-list");
    const listBlocked = document.getElementById("blocked-list");

    tabFriends.classList.remove("active");
    tabPending.classList.remove("active");
    tabBlocked.classList.remove("active");
    listFriends.classList.add("hidden");
    listPending.classList.add("hidden");
    listBlocked.classList.add("hidden");

    if (tab === 'friends') {
        tabFriends.classList.add("active");
        listFriends.classList.remove("hidden");
    } else if (tab === 'pending') {
        tabPending.classList.add("active");
        listPending.classList.remove("hidden");
    } else if (tab === 'blocked') {
        tabBlocked.classList.add("active");
        listBlocked.classList.remove("hidden");
    }
}
// Block friend
async function blockFriend(receiverId, username) {
    if (!confirm(`Are you sure you want to block ${username}?`)) {
        return;
    }
    const token = localStorage.getItem("token");
    try {
        const response = await fetch(`${API_URL}/FriendRequest/block`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ receiverId })
        });

        if (response.ok) {
            showToast(`${username} has been blocked.`);
            fetchFriends();
            fetchBlockedUsers();
        } else {
            const errText = await response.text();
            showToast(errText || "Failed to block user", true);
        }
    } catch (e) {
        console.error(e);
        showToast("Error connection", true);
    }
}

// Navigation helper
function openChatWith(friendId) {
    window.location.href = `chat.html?friendId=${friendId}`;
}

function goToChat() {
    window.location.href = "chat.html";
}

function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    window.location.href = "login.html";
}

// Initialize page
document.addEventListener("DOMContentLoaded", () => {
    if (checkAuth()) {
        fetchProfile();
        fetchFriends();
        fetchPendingRequests();
        fetchBlockedUsers();
    }
});

// Fetch blocked users
async function fetchBlockedUsers() {
    const token = localStorage.getItem("token");
    try {
        const response = await fetch(`${API_URL}/FriendRequest/blocked`, {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        if (response.ok) {
            blockedList = await response.json();
            document.getElementById("blocked-count").innerText = blockedList.length;
            renderBlocked();
        }
    } catch (e) {
        console.error("Error fetching blocked users:", e);
    }
}

// Render blocked list
function renderBlocked() {
    const container = document.getElementById("blocked-list");
    if (!container) return;

    if (blockedList.length === 0) {
        container.innerHTML = `
            <div class="text-center" style="grid-column: 1/-1; color: var(--text-gray); padding: 3rem;">
                <i class="fa-user-slash fas" style="font-size: 3rem; color: var(--bg-input); margin-bottom: 1.5rem;"></i>
                <p>No blocked users.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = blockedList.map(user => {
        return `
            <div class="friend-card">
                <div class="friend-card-avatar">
                    <div class="avatar-circle" style="width: 60px; height: 60px; font-size: 1.5rem; background: linear-gradient(135deg, var(--bg-input) 0%, var(--accent-red) 100%);">
                        ${user.username.charAt(0).toUpperCase()}
                    </div>
                </div>
                <div class="friend-card-name">${user.username}</div>
                <div class="friend-card-status" style="color: var(--accent-red);">Blocked</div>
                <div class="friend-card-actions">
                    <button class="btn-secondary" onclick="unblockUser(${user.id}, '${user.username}')" style="border-color: var(--accent-green); color: var(--accent-green);">
                        <i class="fa-unlock fas"></i> Unblock
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Unblock user API call
async function unblockUser(receiverId, username) {
    if (!confirm(`Are you sure you want to unblock ${username}?`)) {
        return;
    }
    const token = localStorage.getItem("token");
    try {
        const response = await fetch(`${API_URL}/FriendRequest/unblock`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ receiverId })
        });

        if (response.ok) {
            showToast(`${username} has been unblocked.`);
            fetchBlockedUsers();
            fetchFriends();
        } else {
            const errText = await response.text();
            showToast(errText || "Failed to unblock user", true);
        }
    } catch (e) {
        console.error(e);
        showToast("Error connection", true);
    }
}

