import { useMemo, useState, useEffect } from "react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

export default function App() {
  const [view, setView] = useState("login");
  const [authToken, setAuthToken] = useState(() => localStorage.getItem("authToken") || "");
  const [currentUser, setCurrentUser] = useState(() => localStorage.getItem("currentUser") || "");
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");

  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [registerUsername, setRegisterUsername] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState("");

  const [tasks, setTasks] = useState([]);
  const [taskTitle, setTaskTitle] = useState("");
  const [tasksLoading, setTasksLoading] = useState(false);

  const canLogin = useMemo(() => {
    return loginUsername.trim().length > 0 && loginPassword.trim().length > 0;
  }, [loginUsername, loginPassword]);

  const canRegister = useMemo(() => {
    return (
      registerUsername.trim().length > 0 &&
      registerPassword.length > 0 &&
      registerConfirmPassword.length > 0
    );
  }, [registerUsername, registerPassword, registerConfirmPassword]);

  const canAddTask = useMemo(() => taskTitle.trim().length > 0, [taskTitle]);

  useEffect(() => {
    if (authToken) {
      setView("tasks");
      loadTasks();
    }
  }, []);

  async function apiRequest(path, options = {}) {
    const headers = {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    };

    if (authToken) {
      headers.Authorization = `Bearer ${authToken}`;
    }

    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
    });

    let data = {};
    try {
      data = await response.json();
    } catch (error) {
      data = {};
    }

    if (!response.ok || data.ok === false) {
      throw new Error(data.message || "Request failed");
    }

    return data;
  }

  async function handleLogin(event) {
    event.preventDefault();
    setStatus("loading");
    setMessage("");

    try {
      const data = await apiRequest("/api/login", {
        method: "POST",
        body: JSON.stringify({
          username: loginUsername.trim(),
          password: loginPassword,
        }),
      });

      localStorage.setItem("authToken", data.token);
      localStorage.setItem("currentUser", data.username || loginUsername.trim());
      setAuthToken(data.token);
      setCurrentUser(data.username || loginUsername.trim());
      setStatus("success");
      setMessage(data.message || "Login successful");
      setView("tasks");
      setLoginPassword("");
      await loadTasks(data.token);
    } catch (error) {
      setStatus("error");
      setMessage(error.message || "Cannot reach server");
    }
  }

  async function handleRegister(event) {
    event.preventDefault();
    setStatus("loading");
    setMessage("");

    if (registerPassword !== registerConfirmPassword) {
      setStatus("error");
      setMessage("Passwords do not match");
      return;
    }

    try {
      const data = await apiRequest("/api/register", {
        method: "POST",
        body: JSON.stringify({
          username: registerUsername.trim(),
          email: registerEmail.trim() || null,
          password: registerPassword,
          confirmPassword: registerConfirmPassword,
        }),
      });

      setStatus("success");
      setMessage(data.message || "Registration successful");
      setView("login");
      setRegisterPassword("");
      setRegisterConfirmPassword("");
    } catch (error) {
      setStatus("error");
      setMessage(error.message || "Registration failed");
    }
  }

  async function loadTasks(tokenOverride) {
    const tokenToUse = tokenOverride || authToken;
    if (!tokenToUse) {
      return;
    }

    setTasksLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/tasks`, {
        headers: {
          Authorization: `Bearer ${tokenToUse}`,
        },
      });

      const data = await response.json();
      if (!response.ok || data.ok === false) {
        throw new Error(data.message || "Failed to load tasks");
      }

      setTasks(Array.isArray(data.tasks) ? data.tasks : []);
      setStatus("idle");
    } catch (error) {
      setStatus("error");
      setMessage(error.message || "Failed to load tasks");
    } finally {
      setTasksLoading(false);
    }
  }

  async function handleCreateTask(event) {
    event.preventDefault();
    if (!canAddTask) {
      return;
    }

    try {
      const data = await apiRequest("/api/tasks", {
        method: "POST",
        body: JSON.stringify({ title: taskTitle.trim() }),
      });

      setTasks((prev) => [data.task, ...prev]);
      setTaskTitle("");
      setStatus("success");
      setMessage("Task created");
    } catch (error) {
      setStatus("error");
      setMessage(error.message || "Failed to create task");
    }
  }

  async function handleToggleTask(task) {
    try {
      const data = await apiRequest(`/api/tasks/${task.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ isCompleted: !task.isCompleted }),
      });

      setTasks((prev) => prev.map((item) => (item.id === task.id ? data.task : item)));
      setStatus("success");
      setMessage("Task updated");
    } catch (error) {
      setStatus("error");
      setMessage(error.message || "Failed to update task");
    }
  }

  async function handleDeleteTask(taskId) {
    try {
      await apiRequest(`/api/tasks/${taskId}`, {
        method: "DELETE",
      });

      setTasks((prev) => prev.filter((item) => item.id !== taskId));
      setStatus("success");
      setMessage("Task deleted");
    } catch (error) {
      setStatus("error");
      setMessage(error.message || "Failed to delete task");
    }
  }

  function handleLogout() {
    localStorage.removeItem("authToken");
    localStorage.removeItem("currentUser");
    setAuthToken("");
    setCurrentUser("");
    setTasks([]);
    setTaskTitle("");
    setView("login");
    setStatus("idle");
    setMessage("");
  }

  return (
    <main className="page">
      <section className="card">
        {view === "login" && (
          <>
            <h1>Login</h1>
            <p className="subtitle">Enter your credentials</p>

            <form onSubmit={handleLogin} className="form" autoComplete="off">
              <label htmlFor="login-username">Username</label>
              <input
                id="login-username"
                type="text"
                value={loginUsername}
                onChange={(event) => setLoginUsername(event.target.value)}
                autoComplete="off"
              />

              <label htmlFor="login-password">Password</label>
              <input
                id="login-password"
                type="password"
                value={loginPassword}
                onChange={(event) => setLoginPassword(event.target.value)}
                autoComplete="new-password"
              />

              <button type="submit" disabled={!canLogin || status === "loading"}>
                {status === "loading" ? "Logging in..." : "Login"}
              </button>
            </form>

            <p className="hint">
              No account?{" "}
              <button type="button" className="link-button" onClick={() => setView("register")}>
                Register here
              </button>
            </p>
          </>
        )}

        {view === "register" && (
          <>
            <h1>Register</h1>
            <p className="subtitle">Create a new account</p>

            <form onSubmit={handleRegister} className="form" autoComplete="off">
              <label htmlFor="register-username">Username</label>
              <input
                id="register-username"
                type="text"
                value={registerUsername}
                onChange={(event) => setRegisterUsername(event.target.value)}
                autoComplete="off"
              />

              <label htmlFor="register-email">Email (optional)</label>
              <input
                id="register-email"
                type="email"
                value={registerEmail}
                onChange={(event) => setRegisterEmail(event.target.value)}
                autoComplete="off"
              />

              <label htmlFor="register-password">Password</label>
              <input
                id="register-password"
                type="password"
                value={registerPassword}
                onChange={(event) => setRegisterPassword(event.target.value)}
                autoComplete="new-password"
              />

              <label htmlFor="register-confirm">Confirm password</label>
              <input
                id="register-confirm"
                type="password"
                value={registerConfirmPassword}
                onChange={(event) => setRegisterConfirmPassword(event.target.value)}
                autoComplete="new-password"
              />

              <button type="submit" disabled={!canRegister || status === "loading"}>
                {status === "loading" ? "Registering..." : "Register"}
              </button>
            </form>

            <p className="hint">
              Already have an account?{" "}
              <button type="button" className="link-button" onClick={() => setView("login")}>
                Back to login
              </button>
            </p>
          </>
        )}

        {view === "tasks" && (
          <>
            <div className="header-row">
              <div>
                <h1>My tasks</h1>
                <p className="subtitle">Logged in as {currentUser || "user"}</p>
              </div>
              <button type="button" className="secondary-button" onClick={handleLogout}>
                Logout
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="task-create-row">
              <input
                type="text"
                value={taskTitle}
                onChange={(event) => setTaskTitle(event.target.value)}
                placeholder="New task title"
                autoComplete="off"
              />
              <button type="submit" disabled={!canAddTask}>
                Add
              </button>
            </form>

            {tasksLoading ? (
              <p className="subtitle">Loading tasks...</p>
            ) : tasks.length === 0 ? (
              <p className="subtitle">No tasks yet</p>
            ) : (
              <ul className="task-list">
                {tasks.map((task) => (
                  <li key={task.id} className="task-item">
                    <label className="task-check-row">
                      <input
                        type="checkbox"
                        checked={Boolean(task.isCompleted)}
                        onChange={() => handleToggleTask(task)}
                      />
                      <span className={task.isCompleted ? "task-title done" : "task-title"}>
                        {task.title}
                      </span>
                    </label>
                    <button
                      type="button"
                      className="danger-button"
                      onClick={() => handleDeleteTask(task.id)}
                    >
                      Delete
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        {status === "success" && <p className="message success">{message}</p>}
        {status === "error" && <p className="message error">{message}</p>}
      </section>
    </main>
  );
}
