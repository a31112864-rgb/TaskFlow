function setActive1(button) {
    document.querySelectorAll(".icon").forEach(btn => {
        btn.classList.remove("active");
    });

    button.classList.add("active");
}

function addTask() {
    const taskbar = document.getElementById("taskbar");
    const text = taskbar.value.trim();

    // Don't add empty tasks
    if (text === "") {
        return;
    }

    // Create list item
    const li = document.createElement("li");

    // Create checkbox
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";

    // Create task text
    const taskText = document.createElement("span");
    taskText.textContent = text;

    // Create delete button
    const deleteButton = document.createElement("button");

    // Create Font Awesome trash icon
    const icon = document.createElement("i");
    icon.classList.add("fa-solid", "fa-trash");

    deleteButton.appendChild(icon);

    // Checkbox clicked
    checkbox.addEventListener("change", function () {

        // Strike through completed task
        if (checkbox.checked) {
            taskText.style.textDecoration = "line-through";
        } else {
            taskText.style.textDecoration = "none";
        }

        // Update counters
        updateTaskCount();

        // Re-apply current filter
        const activeButton = document.querySelector(
            "#icons .icons.active"
        );

        if (activeButton) {
            setActive(activeButton);
        }
    });

    // Delete button clicked
    deleteButton.addEventListener("click", function () {
        li.remove();
        updateTaskCount();
    });

    // Add elements to task
    li.appendChild(checkbox);
    li.appendChild(taskText);
    li.appendChild(deleteButton);

    // Add task to list
    document.getElementById("tasks").appendChild(li);

    // Clear input
    taskbar.value = "";

    // Update counters
    updateTaskCount();
}


function updateTaskCount() {

    // Get all tasks
    const tasks = document.querySelectorAll("#tasks li");

    // Total tasks
    const totalTasks = tasks.length;

    // Completed / Done tasks
    const completedTasks = document.querySelectorAll(
        "#tasks input[type='checkbox']:checked"
    ).length;

    // Pending tasks
    const pendingTasks = totalTasks - completedTasks;

    // Update counters
    document.getElementById("num").textContent = totalTasks;
    document.getElementById("num2").textContent = completedTasks;
    document.getElementById("num3").textContent = pendingTasks;
}


function setActive(button) {

    // Remove active class from all filter buttons
    document.querySelectorAll("#icons .icons").forEach(btn => {
        btn.classList.remove("active");
    });

    // Add active class to clicked button
    button.classList.add("active");

    // Get all tasks
    const tasks = document.querySelectorAll("#tasks li");

    tasks.forEach(task => {

        const checkbox = task.querySelector(
            "input[type='checkbox']"
        );

        if (button.id === "all") {

            // All tasks
            task.style.display = "";

        } else if (button.id === "active") {

            // Done = checked
            task.style.display = checkbox.checked
                ? ""
                : "none";

        } else if (button.id === "pending") {

            // Pending = unchecked
            task.style.display = checkbox.checked
                ? "none"
                : "";
        }
    });
}