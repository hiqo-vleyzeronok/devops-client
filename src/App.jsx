import { useMemo, useState, useEffect, useRef } from "react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

export default function App() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");

  const canSubmit = useMemo(() => {
    return username.trim().length > 0 && password.trim().length > 0;
  }, [username, password]);

  const usernameRef = useRef(null);
  const passwordRef = useRef(null);

  useEffect(() => {
    // Clear any browser autofill that may run after mount
    const clearFields = () => {
      try {
        if (usernameRef.current) usernameRef.current.value = "";
        if (passwordRef.current) passwordRef.current.value = "";
      } catch (e) {}
      setUsername("");
      setPassword("");
    };

    // Run shortly after mount (browsers sometimes autofill after load)
    const t = setTimeout(clearFields, 150);

    // Also clear on visibility change (tab focus)
    const onVisibility = () => {
      if (!document.hidden) clearFields();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      clearTimeout(t);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus("loading");
    setMessage("");

    try {
      const response = await fetch(`${API_BASE_URL}/api/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: username.trim(),
          password,
        }),
      });

      const data = await response.json();

      if (response.ok && data.ok) {
        setStatus("success");
        setMessage(data.message || `Welcome, ${username.trim()}!`);
        return;
      }

      setStatus("error");
      setMessage(data.message || "Invalid password");
    } catch (error) {
      setStatus("error");
      setMessage("Cannot reach server");
    }
  }

  return (
    <main className="page">
      <section className="card">
        <h1>Simple Login Demo</h1>
        <p className="subtitle">Enter your name and password</p>

        <form onSubmit={handleSubmit} className="form" autoComplete="off">
          {/* Hidden fields to prevent browser password managers from autofilling real inputs */}
          <input
            type="text"
            name="__fake_username"
            autoComplete="username"
            tabIndex={-1}
            style={{ position: "absolute", left: "-9999px", top: "-9999px", opacity: 0 }}
          />
          <input
            type="password"
            name="__fake_password"
            autoComplete="current-password"
            tabIndex={-1}
            style={{ position: "absolute", left: "-9999px", top: "-9999px", opacity: 0 }}
          />
          <label htmlFor="username">Username</label>
          <input
            id="username"
            name="user_name_x"
            type="text"
            ref={usernameRef}
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder=""
            autoComplete="off"
          />

          <label htmlFor="password">Password</label>
          <input
            id="password"
            name="pwd_x"
            type="password"
            ref={passwordRef}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder=""
            autoComplete="new-password"
          />

          <button type="submit" disabled={!canSubmit || status === "loading"}>
            {status === "loading" ? "Checking..." : "Login"}
          </button>
        </form>

        {status === "success" && <p className="message success">{message}</p>}
        {status === "error" && <p className="message error">{message}</p>}
      </section>
    </main>
  );
}
