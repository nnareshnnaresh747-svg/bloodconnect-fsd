
// ============================================
// BLOOD CONNECT - COMPLETE APP.JS
// ============================================

// API BASE URL
const API_BASE =
    window.location.pathname.replace(/\/+$/, "") + "/api";

// LOGIN DETAILS
let token = localStorage.getItem("token");
let currentUser = null;

try {
    currentUser = JSON.parse(localStorage.getItem("user") || "null");
} catch (error) {
    localStorage.removeItem("user");
    currentUser = null;
    token = null;
}

// ============================================
// COMMON FUNCTIONS
// ============================================

function getHeaders() {
    const headers = {
        "Content-Type": "application/json"
    };

    if (token) {
        headers.Authorization = "Bearer " + token;
    }

    return headers;
}

async function apiRequest(endpoint, options = {}) {
    const response = await fetch(API_BASE + endpoint, {
        ...options,
        headers: {
            ...getHeaders(),
            ...(options.headers || {})
        }
    });

    const responseText = await response.text();

    let result = {};

    try {
        result = responseText ? JSON.parse(responseText) : {};
    } catch (error) {
        throw new Error("Invalid server response. Check your backend.");
    }

    if (!response.ok) {
        throw new Error(
            result.message || "Something went wrong. Please try again."
        );
    }

    return result;
}

function showMessage(message) {
    alert(message);
}

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

// ============================================
// PAGE NAVIGATION
// ============================================

function updateUI() {

    const loginPage = document.getElementById("login");
    const registerPage = document.getElementById("register");
    const dashboardPage = document.getElementById("dashboard");

    if (!loginPage || !registerPage || !dashboardPage) {
        console.error("Page sections are missing in index.html");
        return;
    }

    // Hide all pages first
    loginPage.style.display = "none";
    registerPage.style.display = "none";
    dashboardPage.style.display = "none";

    const loggedIn = Boolean(token && currentUser);

    if (loggedIn) {

        dashboardPage.style.display = "block";

        const userName = document.getElementById("userName");

        if (userName) {
            userName.textContent = currentUser.name || "User";
        }

        const availabilityArea =
            document.getElementById("availabilityArea");

        if (availabilityArea) {
            availabilityArea.style.display =
                currentUser.role === "donor" ? "block" : "none";
        }

        const incomingArea =
            document.getElementById("incomingArea");

        if (incomingArea) {
            incomingArea.style.display =
                currentUser.role === "donor" ? "block" : "none";
        }

        const outgoingArea =
            document.getElementById("outgoingArea");

        if (outgoingArea) {
            outgoingArea.style.display = "block";
        }

    } else {

        const page = window.location.hash.toLowerCase();

        if (page === "#register") {
            registerPage.style.display = "block";
        } else {
            loginPage.style.display = "block";
        }
    }
}

function showLoginPage() {
    window.location.hash = "login";
    updateUI();
}

function showRegisterPage() {
    if (token && currentUser) return;

    window.location.hash = "register";
    updateUI();
}

// ============================================
// IMPORTANT: SET LOGIN FUNCTION
// THIS FIXES YOUR CURRENT ERROR
// ============================================

function setLogin(data) {

    if (!data || !data.token || !data.user) {
        throw new Error("Login response is missing token or user details.");
    }

    token = data.token;
    currentUser = data.user;

    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(currentUser));

    // Navigate to dashboard
    window.location.hash = "dashboard";

    updateUI();

    // Load dashboard information
    loadDashboard();

    showMessage("Login successful! Welcome " +
        (currentUser.name || "User") + ".");
}

// Make function available globally
window.setLogin = setLogin;

// ============================================
// REGISTRATION
// ============================================

const registerForm = document.getElementById("registerForm");

if (registerForm) {

    registerForm.addEventListener("submit", async function(event) {

        event.preventDefault();

        const data = {
            name: document.getElementById("regName").value.trim(),
            email: document.getElementById("regEmail").value.trim(),
            password: document.getElementById("regPassword").value,
            phone: document.getElementById("regPhone").value.trim(),
            bloodGroup: document.getElementById("regBlood").value,
            city: document.getElementById("regCity").value.trim(),
            role: document.getElementById("regRole").value
        };

        try {

            const result = await apiRequest("/auth/register", {
                method: "POST",
                body: JSON.stringify(data)
            });

            showMessage(
                result.message || "Registration successful! Please login."
            );

            registerForm.reset();

            window.location.hash = "login";
            updateUI();

        } catch (error) {

            showMessage(error.message);
            console.error("Registration error:", error);

        }
    });
}

// ============================================
// LOGIN
// ============================================

const loginForm = document.getElementById("loginForm");

if (loginForm) {

    loginForm.addEventListener("submit", async function(event) {

        event.preventDefault();

        const email =
            document.getElementById("loginEmail").value.trim();

        const password =
            document.getElementById("loginPassword").value;

        try {

            const result = await apiRequest("/auth/login", {
                method: "POST",
                body: JSON.stringify({
                    email: email,
                    password: password
                })
            });

            // Call the defined login function
            window.setLogin(result);

            loginForm.reset();

        } catch (error) {

            showMessage(error.message);
            console.error("Login error:", error);

        }
    });
}

// ============================================
// SEARCH DONORS
// ============================================

async function searchDonors() {

    if (!token) {
        showMessage("Please login first.");
        return;
    }

    const bloodGroup =
        document.getElementById("searchBlood").value;

    const city =
        document.getElementById("searchCity").value.trim();

    if (!bloodGroup || !city) {
        showMessage("Please select a blood group and enter a city.");
        return;
    }

    try {

        const result = await apiRequest(
            "/donors/search?bloodGroup=" +
            encodeURIComponent(bloodGroup) +
            "&city=" +
            encodeURIComponent(city)
        );

        const container = document.getElementById("donorResults");

        if (!container) return;

        const donors = Array.isArray(result)
            ? result
            : (result.donors || []);

        if (donors.length === 0) {
            container.textContent = "No available donors found.";
            return;
        }

        container.innerHTML = donors.map(donor => `
            <div class="donor-card">

                <h3>${escapeHTML(donor.name)}</h3>

                <p>Blood Group: ${escapeHTML(donor.bloodGroup)}</p>

                <p>City: ${escapeHTML(donor.city)}</p>

                <button
                    class="btn request-donor-btn"
                    data-id="${escapeHTML(donor._id)}"
                    data-blood="${escapeHTML(donor.bloodGroup)}">
                    Request Blood
                </button>

            </div>
        `).join("");

        container.querySelectorAll(".request-donor-btn")
            .forEach(button => {

                button.addEventListener("click", function() {
                    sendRequest(
                        this.dataset.id,
                        this.dataset.blood
                    );
                });

            });

    } catch (error) {

        showMessage(error.message);
        console.error("Donor search error:", error);

    }
}

window.searchDonors = searchDonors;

// ============================================
// SEND BLOOD REQUEST
// ============================================

async function sendRequest(donorId, bloodGroup) {

    const hospital = prompt("Enter hospital name:");

    if (!hospital || !hospital.trim()) return;

    const units = Number(prompt("Enter required blood units:"));

    if (!Number.isInteger(units) || units < 1) {
        showMessage("Please enter a valid number of units.");
        return;
    }

    const city = prompt("Enter hospital city:");

    if (!city || !city.trim()) return;

    const urgency = prompt(
        "Enter urgency: Normal, Urgent or Critical",
        "Urgent"
    );

    if (!["Normal", "Urgent", "Critical"].includes(urgency)) {
        showMessage("Please enter a valid urgency.");
        return;
    }

    const notes = prompt("Additional details (optional):") || "";

    try {

        const result = await apiRequest("/requests/create", {
            method: "POST",
            body: JSON.stringify({
                donorId,
                bloodGroup,
                units,
                hospital: hospital.trim(),
                city: city.trim(),
                urgency,
                notes
            })
        });

        showMessage(result.message || "Blood request sent successfully.");

        loadDashboard();

    } catch (error) {

        showMessage(error.message);
        console.error("Request error:", error);

    }
}

window.sendRequest = sendRequest;

// ============================================
// DONOR AVAILABILITY
// ============================================

async function updateAvailability() {

    const availabilityElement =
        document.getElementById("availability");

    if (!availabilityElement) return;

    const isAvailable = availabilityElement.value === "true";

    try {

        const result = await apiRequest("/donors/availability", {
            method: "PUT",
            body: JSON.stringify({
                isAvailable: isAvailable
            })
        });

        showMessage(result.message || "Availability updated successfully.");

    } catch (error) {

        showMessage(error.message);
        console.error("Availability error:", error);

    }
}

window.updateAvailability = updateAvailability;

// ============================================
// LOAD DASHBOARD
// ============================================

async function loadDashboard() {

    if (!token || !currentUser) return;

    // Incoming requests for donors
    if (currentUser.role === "donor") {

        try {

            const result = await apiRequest("/requests/incoming");

            const requests = Array.isArray(result)
                ? result
                : (result.requests || []);

            const container =
                document.getElementById("incomingRequests");

            if (container) {

                container.innerHTML = requests.map(request => `

                    <div class="request-card">

                        <h3>${escapeHTML(request.urgency)} Request</h3>

                        <p>
                            Blood Group:
                            ${escapeHTML(request.bloodGroup)}
                        </p>

                        <p>
                            Units:
                            ${escapeHTML(request.units)}
                        </p>

                        <p>
                            Hospital:
                            ${escapeHTML(request.hospital)}
                        </p>

                        <p>
                            City:
                            ${escapeHTML(request.city)}
                        </p>

                        <p>
                            Status:
                            ${escapeHTML(request.status)}
                        </p>

                        ${request.status === "Pending" ? `

                            <button
                                class="btn accept-btn"
                                data-id="${escapeHTML(request._id)}">
                                Accept
                            </button>

                            <button
                                class="btn reject-btn"
                                data-id="${escapeHTML(request._id)}">
                                Reject
                            </button>

                        ` : ""}

                    </div>

                `).join("") || "No incoming requests.";

                container.querySelectorAll(".accept-btn")
                    .forEach(button => {
                        button.addEventListener("click", () => {
                            changeStatus(button.dataset.id, "Accepted");
                        });
                    });

                container.querySelectorAll(".reject-btn")
                    .forEach(button => {
                        button.addEventListener("click", () => {
                            changeStatus(button.dataset.id, "Rejected");
                        });
                    });
            }

        } catch (error) {

            console.error("Incoming request error:", error);

        }
    }

    // Outgoing requests
    try {

        const result = await apiRequest("/requests/outgoing");

        const requests = Array.isArray(result)
            ? result
            : (result.requests || []);

        const container =
            document.getElementById("outgoingRequests");

        if (container) {

            container.innerHTML = requests.map(request => `

                <div class="request-card">

                    <h3>Blood Request</h3>

                    <p>
                        Blood Group:
                        ${escapeHTML(request.bloodGroup)}
                    </p>

                    <p>
                        Hospital:
                        ${escapeHTML(request.hospital)}
                    </p>

                    <p>
                        City:
                        ${escapeHTML(request.city)}
                    </p>

                    <p>
                        Status:
                        ${escapeHTML(request.status)}
                    </p>

                </div>

            `).join("") || "No outgoing requests.";
        }

    } catch (error) {

        console.error("Outgoing request error:", error);

    }
}

// ============================================
// ACCEPT OR REJECT REQUEST
// ============================================

async function changeStatus(id, status) {

    try {

        const result = await apiRequest(
            "/requests/" + encodeURIComponent(id) + "/status",
            {
                method: "PUT",
                body: JSON.stringify({ status })
            }
        );

        showMessage(result.message || "Request status updated.");

        loadDashboard();

    } catch (error) {

        showMessage(error.message);
        console.error("Status update error:", error);

    }
}

window.changeStatus = changeStatus;

// ============================================
// LOGOUT
// ============================================

function logout() {

    localStorage.removeItem("token");
    localStorage.removeItem("user");

    token = null;
    currentUser = null;

    // Clear dashboard information
    const ids = [
        "incomingRequests",
        "outgoingRequests",
        "donorResults"
    ];

    ids.forEach(id => {
        const element = document.getElementById(id);
        if (element) element.innerHTML = "";
    });

    // Navigate to login page
    window.location.hash = "login";

    updateUI();

    showMessage("You have logged out successfully.");
}

window.logout = logout;

// ============================================
// INITIALIZE WEBSITE
// ============================================

function initializeWebsite() {

    // Page navigation
    window.addEventListener("hashchange", updateUI);

    // Display login or dashboard
    updateUI();

    // Load dashboard for existing logged-in user
    if (token && currentUser) {
        loadDashboard();
    }
}

// Wait until HTML loads
if (document.readyState === "loading") {

    document.addEventListener(
        "DOMContentLoaded",
        initializeWebsite
    );

} else {

    initializeWebsite();

}

// ============================================
// END OF BLOOD CONNECT APP.JS
// ============================================
