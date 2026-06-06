const API_URL = "http://localhost:5204/api";

function showToast(message, isError = true) {
    const toast = isError ? document.getElementById("auth-error") : document.getElementById("auth-success");
    const label = isError ? document.getElementById("error-message") : document.getElementById("success-message");
    
    if (label) label.innerText = message;
    if (toast) {
        toast.classList.add("show");
        setTimeout(() => {
            toast.classList.remove("show");
        }, 4000);
    }
}

async function register() {
    const username = document.getElementById("username").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    if (!username || !email || !password) {
        showToast("Please fill in all fields", true);
        return;
    }

    try {
        const response = await fetch(`${API_URL}/Auth/register`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                username: username,
                email: email,
                password: password
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            showToast(errText || "Registration failed", true);
            return;
        }

        showToast("Registration successful! Redirecting to login...", false);
        
        setTimeout(() => {
            window.location.href = "login.html";
        }, 2000);

    } catch (error) {
        console.error("Registration error:", error);
        showToast("Server connection failed. Make sure backend is running.", true);
    }
}
