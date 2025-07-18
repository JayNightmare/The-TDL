/**
 * The TDL - Renderer Application Logic
 *
 * Manages the to-do list interface, task state, and IPC communication
 * with the main process. Handles task completion detection and unlock
 * triggering when all tasks are done.
 */

class TDLApp {
    constructor() {
        this.tasks = [];
        this.initializeElements();
        this.attachEventListeners();
        this.loadTasks();
    }

    initializeElements() {
        this.taskList = document.getElementById("taskList");
        this.newTaskInput = document.getElementById("newTaskInput");
        this.addTaskBtn = document.getElementById("addTaskBtn");
        this.progressFill = document.getElementById("progressFill");
        this.progressText = document.getElementById("progressText");
        this.statusMessage = document.getElementById("statusMessage");
        this.resetBtn = document.getElementById("resetBtn");
        this.unlockModal = document.getElementById("unlockModal");
        this.unlockBtn = document.getElementById("unlockBtn");
    }

    attachEventListeners() {
        // Add task functionality
        this.addTaskBtn.addEventListener("click", () => this.addTask());
        this.newTaskInput.addEventListener("keypress", (e) => {
            if (e.key === "Enter") {
                this.addTask();
            }
        });

        // Reset session
        this.resetBtn.addEventListener("click", () => {
            if (
                confirm(
                    "Reset the current session? This will restore all tasks."
                )
            ) {
                this.resetSession();
            }
        });

        // Unlock button
        this.unlockBtn.addEventListener("click", () => {
            this.triggerUnlock();
        });

        // Listen for task data from main process
        window.electronAPI.onTasksData((event, tasks) => {
            this.tasks = tasks || [];
            this.renderTasks();
            this.updateProgress();
            this.statusMessage.textContent = `${this.tasks.length} tasks loaded`;
        });

        // Enhanced keyboard blocking
        document.addEventListener(
            "keydown",
            (e) => {
                // Block F5 refresh, Ctrl+R, etc.
                // (e.altKey && e.key === 'F4') ||
                if (
                    e.key === "F5" ||
                    (e.ctrlKey && e.key === "r") ||
                    (e.ctrlKey && e.key === "R") ||
                    (e.metaKey && e.key === "r") ||
                    (e.metaKey && e.key === "R") ||
                    e.key === "F11" ||
                    e.key === "F12" ||
                    (e.altKey && e.key === "Tab") ||
                    
                    (e.ctrlKey && e.key === "w") ||
                    (e.ctrlKey && e.key === "W") ||
                    (e.ctrlKey && e.shiftKey && e.key === "I") ||
                    (e.ctrlKey && e.shiftKey && e.key === "J") ||
                    (e.ctrlKey && e.shiftKey && e.key === "C")
                ) {
                    e.stopImmediatePropagation();
                    e.stopPropagation();
                    e.preventDefault();
                    console.log(`Blocked key combination: ${e.key}`);
                    return false;
                }
            },
            true
        ); // Use capture phase

        // Block right-click context menu
        document.addEventListener("contextmenu", (e) => {
            e.preventDefault();
            return false;
        });

        // Prevent drag and drop
        document.addEventListener("dragover", (e) => {
            e.preventDefault();
            return false;
        });

        document.addEventListener("drop", (e) => {
            e.preventDefault();
            return false;
        });

        // Prevent text selection (makes it harder to access browser features)
        document.addEventListener("selectstart", (e) => {
            if (
                e.target.tagName !== "INPUT" &&
                e.target.tagName !== "TEXTAREA"
            ) {
                e.preventDefault();
                return false;
            }
        });

        // Force focus back to window periodically
        setInterval(() => {
            if (document.hasFocus && !document.hasFocus()) {
                window.focus();
            }
        }, 500);
    }

    loadTasks() {
        this.statusMessage.textContent = "Loading tasks...";
        window.electronAPI.getTasks();
    }

    addTask() {
        const taskText = this.newTaskInput.value.trim();
        if (!taskText) return;

        const newTask = {
            id: Date.now().toString(),
            text: taskText,
            completed: false,
            createdAt: new Date().toISOString(),
        };

        this.tasks.push(newTask);
        this.newTaskInput.value = "";
        this.saveTasks();
        this.renderTasks();
        this.updateProgress();
    }

    deleteTask(taskId) {
        this.tasks = this.tasks.filter((task) => task.id !== taskId);
        this.saveTasks();
        this.renderTasks();
        this.updateProgress();
    }

    toggleTask(taskId) {
        const task = this.tasks.find((t) => t.id === taskId);
        if (task) {
            task.completed = !task.completed;
            this.saveTasks();
            this.renderTasks();
            this.updateProgress();
            this.checkForCompletion();
        }
    }

    renderTasks() {
        if (this.tasks.length === 0) {
            this.taskList.innerHTML = `
                <div class="empty-state">
                    <h3>No tasks yet</h3>
                    <p>Add a task above to get started with your focus session</p>
                </div>
            `;
            return;
        }

        this.taskList.innerHTML = this.tasks
            .map(
                (task) => `
            <div class="task-item ${task.completed ? "completed" : ""}">
                <input 
                    type="checkbox" 
                    class="task-checkbox" 
                    ${task.completed ? "checked" : ""}
                    onchange="app.toggleTask('${task.id}')"
                >
                <span class="task-text">${this.escapeHtml(task.text)}</span>
                <button 
                    class="task-delete" 
                    onclick="app.deleteTask('${task.id}')"
                    title="Delete task"
                >
                    Delete
                </button>
            </div>
        `
            )
            .join("");
    }

    updateProgress() {
        const completedTasks = this.tasks.filter(
            (task) => task.completed
        ).length;
        const totalTasks = this.tasks.length;
        const percentage =
            totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

        this.progressFill.style.width = `${percentage}%`;
        this.progressText.textContent = `${completedTasks} / ${totalTasks} completed`;

        if (totalTasks > 0) {
            this.statusMessage.textContent = `${
                totalTasks - completedTasks
            } tasks remaining`;
        } else {
            this.statusMessage.textContent =
                "Add tasks to begin your focus session";
        }
    }

    checkForCompletion() {
        const completedTasks = this.tasks.filter(
            (task) => task.completed
        ).length;
        const totalTasks = this.tasks.length;

        if (totalTasks > 0 && completedTasks === totalTasks) {
            setTimeout(() => {
                this.showUnlockModal();
            }, 500);
        }
    }

    showUnlockModal() {
        this.unlockModal.classList.add("show");
    }

    hideUnlockModal() {
        this.unlockModal.classList.remove("show");
    }

    triggerUnlock() {
        this.hideUnlockModal();
        this.statusMessage.textContent =
            "Closing application... All tasks completed!";
        window.electronAPI.unlock();
    }

    resetSession() {
        // Reset all tasks to incomplete
        this.tasks.forEach((task) => {
            task.completed = false;
        });
        this.saveTasks();
        this.renderTasks();
        this.updateProgress();
        window.electronAPI.resetSession();
    }

    saveTasks() {
        window.electronAPI.saveTasks(this.tasks);
    }

    escapeHtml(text) {
        const div = document.createElement("div");
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize the app when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
    window.app = new TDLApp();
});

// Handle window focus/blur events
window.addEventListener("focus", () => {
    console.log("Window focused");
});

window.addEventListener("blur", () => {
    console.log("Window blurred - attempting to regain focus");
    setTimeout(() => {
        window.focus();
    }, 100);
});
