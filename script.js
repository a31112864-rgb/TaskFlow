// Automatically matches '127.0.0.1' or 'localhost' depending on your browser address bar
const API_URL = "http://127.0.0.1:8000";

// Initialize the app when the page loads
document.addEventListener("DOMContentLoaded", async () => {
    if (hasUserIdCookie()) {
        await fetchTasks();
    } else {
        showRegistrationForm();
    }
});

// Helper function to check if the user_id cookie or localStorage item exists
function hasUserIdCookie() {
    const hasCookie = document.cookie.split(';').some(item => item.trim().startsWith('user_id='));
    const hasStorage = localStorage.getItem('user_id') !== null;
    return hasCookie || hasStorage;
}

// Helper function to get the user ID safely from either source
function getUserId() {
    // 1. Try reading from cookie context
    const match = document.cookie.match(/(?:^|; )user_id=([^;]*)/);
    if (match) return parseInt(match, 10);
    
    // 2. Fallback to localStorage if browser blocks local HTTP cookies
    const storageId = localStorage.getItem('user_id');
    return storageId ? parseInt(storageId, 10) : null;
}

// Dynamically creates and injects the overlay form into your page
function showRegistrationForm() {
    const overlay = document.createElement("div");
    overlay.id = "auth-overlay";

    const formBox = document.createElement("div");
    
    const title = document.createElement("h3");
    title.textContent = "Welcome to TaskFlow";

    const subtitle = document.createElement("p");
    subtitle.textContent = "Enter your phone number to manage your tasks.";

    const input = document.createElement("input");
    input.type = "tel";
    input.placeholder = "Phone Number (e.g., 9876543210)";
    input.required = true;

    const submitBtn = document.createElement("button");
    submitBtn.textContent = "Get Started";

    formBox.appendChild(title);
    formBox.appendChild(subtitle);
    formBox.appendChild(input);
    formBox.appendChild(submitBtn);
    overlay.appendChild(formBox);
    document.body.appendChild(overlay);

    submitBtn.addEventListener("click", async () => {
        const phone = input.value.trim();
        if (!phone) {
            alert("Please enter a valid phone number.");
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = "Connecting...";

        try {
            const response = await fetch(`${API_URL}/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ phone_no: phone }),
                credentials: "include"
            });

            if (!response.ok) throw new Error("Registration failed.");

            const result = await response.json();
            
            // Safety backup so local testing never loses your login state
            if (result.id) {
                localStorage.setItem('user_id', result.id);
            }

            overlay.remove();
            await fetchTasks();

        } catch (error) {
            console.error("Auth error:", error);
            alert("Could not connect to the server. Please try again.");
            submitBtn.disabled = false;
            submitBtn.textContent = "Get Started";
        }
    });
}

// Fetch all tasks for the logged-in user from the database
async function fetchTasks() {
    try {
        const currentUserId = getUserId();
        // Fallback: If running locally without cookies, pass user_id as a query parameter
        const url = currentUserId ? `${API_URL}/tasks?user_id=${currentUserId}` : `${API_URL}/tasks`;
        
        const response = await fetch(url, { credentials: "include" });
        if (!response.ok) throw new Error("Failed to fetch tasks from server.");
        
        const tasks = await response.json();
        const taskList = document.getElementById("tasks");
        taskList.innerHTML = "";

        tasks.forEach(task => {
            renderTaskElement(task.id, task.data, task.completed || false);
        });
        
        updateTaskCount();
    } catch (error) {
        console.error("Error loading tasks:", error);
    }
}

// Add a new task both to the backend database and your HTML list
async function addTask() {
    const taskbar = document.getElementById("taskbar");
    const text = taskbar.value.trim();

    if (text === "") return;

    const currentUserId = getUserId();

    if (!currentUserId) {
        alert("Session expired. Please enter your phone number again.");
        showRegistrationForm();
        return;
    }

    try {
        const response = await fetch(`${API_URL}/task`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                user_id: currentUserId, 
                data: text 
            }), 
            credentials: "include"
        });

        if (!response.ok) {
            alert("Unable to add task. Please check your connection.");
            return;
        }

                // Parse the database confirmation reply payload
        const result = await response.json().catch(() => ({}));
        
        // FIX: Pull the precise task_id or fallback integer from the FastAPI dictionary response
        let taskId = Date.now(); // Fallback timestamp index
        if (result && typeof result === 'object') {
            taskId = result.task_id || result.id || taskId;
        } else if (typeof result === 'number' || typeof result === 'string') {
            taskId = result;
        }
        
        // Render item on the UI using the verified database task ID context
        renderTaskElement(taskId, text, false);

        taskbar.value = "";
        updateTaskCount();

        renderTaskElement(taskId, text, false);

        taskbar.value = "";
        updateTaskCount();

    } catch (error) {
        console.error("Error saving task:", error);
    }
}

// Helper function to build and render task elements dynamically matching your UI
function renderTaskElement(id, text, isCompleted) {
    const li = document.createElement("li");
    li.dataset.id = id; 

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = isCompleted;

    const taskText = document.createElement("span");
    taskText.textContent = text;
    if (isCompleted) {
        taskText.style.textDecoration = "line-through";
    }

    const deleteButton = document.createElement("button");
    const icon = document.createElement("i");
    icon.classList.add("fa-solid", "fa-trash");
    deleteButton.appendChild(icon);

    checkbox.addEventListener("change", async function () {
        if (checkbox.checked) {
            taskText.style.textDecoration = "line-through";
        } else {
            taskText.style.textDecoration = "none";
        }

        try {
            await fetch(`${API_URL}/task/${id}?completed=${checkbox.checked}`, {
                method: "PUT",
                credentials: "include"
            });
        } catch (error) {
            console.error("Error syncing status change:", error);
        }

        updateTaskCount();

        const activeButton = document.querySelector("#icons .icons.active");
        if (activeButton) setActive(activeButton);
    });

    deleteButton.addEventListener("click", async function () {
        try {
            const response = await fetch(`${API_URL}/${id}`, {
                method: "DELETE",
                credentials: "include"
            });
            
            if (response.ok) {
                li.remove();
                updateTaskCount();
            }
        } catch (error) {
            console.error("Error removing task:", error);
        }
    });

    li.appendChild(checkbox);
    li.appendChild(taskText);
    li.appendChild(deleteButton);
    document.getElementById("tasks").appendChild(li);
}

function updateTaskCount() {
    const tasks = document.querySelectorAll("#tasks li");
    const totalTasks = tasks.length;
    const completedTasks = document.querySelectorAll("#tasks input[type='checkbox']:checked").length;
    const pendingTasks = totalTasks - completedTasks;

    document.getElementById("num").textContent = totalTasks;
    document.getElementById("num2").textContent = completedTasks;
    document.getElementById("num3").textContent = pendingTasks;
}

function setActive1(button) {
    document.querySelectorAll(".icon").forEach(btn => {
        btn.classList.remove("active");
    });
    button.classList.add("active");
}

function setActive(button) {
    document.querySelectorAll("#icons .icons").forEach(btn => {
        btn.classList.remove("active");
    });
    button.classList.add("active");

    const tasks = document.querySelectorAll("#tasks li");
    tasks.forEach(task => {
        const checkbox = task.querySelector("input[type='checkbox']");

        if (button.id === "all") {
            task.style.display = "";
        } else if (button.id === "active") {
            task.style.display = checkbox.checked ? "" : "none";
        } else if (button.id === "pending") {
            task.style.display = checkbox.checked ? "none" : "";
        }
    });
}

