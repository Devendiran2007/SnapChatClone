const API_URL = "http://localhost:5204/api";

function showToast(message, isError = true) {
    const toast = document.getElementById("auth-error");
    const errorText = document.getElementById("error-message");
    
    errorText.innerText = message;
    if (!isError) {
        toast.style.borderLeftColor = "var(--accent-green)";
        toast.querySelector("i").className = "fa-circle-check fas";
        toast.querySelector("i").style.color = "var(--accent-green)";
    } else {
        toast.style.borderLeftColor = "var(--snap-yellow)";
        toast.querySelector("i").className = "fa-circle-exclamation fas";
        toast.querySelector("i").style.color = "";
    }
    
    toast.classList.add("show");
    setTimeout(() => {
        toast.classList.remove("show");
    }, 4000);
}

async function login() {
    const usernameInput = document.getElementById("username").value.trim();
    const passwordInput = document.getElementById("password").value;

    if (!usernameInput || !passwordInput) {
        showToast("Please fill in all fields");
        return;
    }

    try {
        const response = await fetch(`${API_URL}/Auth/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                username: usernameInput,
                password: passwordInput
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            showToast(errText || "Invalid username or password");
            return;
        }

        const data = await response.json();
        localStorage.setItem("token", data.token);
        localStorage.setItem("username", usernameInput);

        // Redirect to friends page
        window.location.href = "friends.html";
    } catch (error) {
        console.error("Login error:", error);
        showToast("Server connection failed. Make sure backend is running.");
    }
}

// Check if user is already logged in
document.addEventListener("DOMContentLoaded", () => {
    if (localStorage.getItem("token")) {
        window.location.href = "friends.html";
    }
});