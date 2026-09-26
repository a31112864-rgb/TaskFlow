const CURRENT_HOST = window.location.hostname;
const API_URL = `http://${CURRENT_HOST}:8000`; 

// Initialize the app when the page loads
document.addEventListener("DOMContentLoaded", async () => {
    if (hasUserIdCookie()) {
        await fetchTasks();
    } else {
        showRegistrationForm();
    }
});

// Helper function to check if the user_id cookie exists
function hasUserIdCookie() {
    return document.cookie.split(';').some(item => item.trim().startsWith('user_id='));
}

// Dynamically creates and injects a clean overlay form into your page
function showRegistrationForm() {
    // 1. Create overlay container
    const overlay = document.createElement("div");
    overlay.id = "auth-overlay";
    overlay.style.position = "fixed";
    overlay.style.top = "0";
    overlay.style.left = "0";
    overlay.style.width = "100%";
    overlay.style.height = "100%";
    overlay.style.backgroundColor = "rgba(0, 0, 0, 0.75)";
    overlay.style.display = "flex";
    overlay.style.justifyContent = "center";
    overlay.style.alignItems = "center";
    overlay.style.zIndex = "10000";

    // 2. Create the form wrapper matching your style
    const formBox = document.createElement("div");
    formBox.style.backgroundColor = "#fff";
    formBox.style.padding = "30px";
    formBox.style.borderRadius = "8px";
    formBox.style.boxShadow = "0px 4px 15px rgba(0,0,0,0.2)";
    formBox.style.textAlign = "center";
    formBox.style.width = "90%";
    formBox.style.maxWidth = "400px";

    const title = document.createElement("h3");
    title.textContent = "Welcome to TaskFlow";
    title.style.marginBottom = "15px";
    title.style.color = "#333";

    const subtitle = document.createElement("p");
    subtitle.textContent = "Enter your phone number to manage your tasks.";
    subtitle.style.marginBottom = "20px";
    subtitle.style.fontSize = "14px";
    subtitle.style.color = "#666";

    const input = document.createElement("input");
    input.type = "tel";
    input.placeholder = "Phone Number (e.g., 9876543210)";
    input.required = true;
    input.style.width = "100%";
    input.style.padding = "10px";
    input.style.marginBottom = "15px";
    input.style.border = "1px solid #ccc";
    input.style.borderRadius = "4px";
    input.style.boxSizing = "border-box";

    const submitBtn = document.createElement("button");
    submitBtn.textContent = "Get Started";
    submitBtn.style.width = "100%";
    submitBtn.style.padding = "10px";
    submitBtn.style.backgroundColor = "#28a745";
    submitBtn.style.color = "#fff";
    submitBtn.style.border = "none";
    submitBtn.style.borderRadius = "4px";
    submitBtn.style.cursor = "pointer";
    submitBtn.style.fontWeight = "bold";

    // Assemble form structure
    formBox.appendChild(title);
    formBox.appendChild(subtitle);
    formBox.appendChild(input);
    formBox.appendChild(submitBtn);
    overlay.appendChild(formBox);
    document.body.appendChild(overlay);

    // 3. Form submission click wrapper handler
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
                credentials: "include" // Important to fetch/save cross-origin cookies
            });

            if (!response.ok) throw new Error("Registration failed.");

            // Success: Remove the form from sight and start up the tasks workflow loop
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
        const response = await fetch(`${API_URL}/tasks`, { credentials: "include" });
        if (!response.ok) throw new Error("Failed to fetch tasks from server.");
        
        const tasks = await response.json();
        const taskList = document.getElementById("tasks");
        taskList.innerHTML = ""; // Clear placeholders

        // Render every task retrieved from your FastAPI backend
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

    try {
        // Send task text to the FastAPI server
        const response = await fetch(`${API_URL}/task`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ data: text }), 
            credentials: "include"
        });

        if (!response.ok) {
            alert("Unable to add task. Please re-authenticate your session.");
            return;
        }

        const result = await response.json();
        const taskId = result.task_id || result.id; 
        
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
