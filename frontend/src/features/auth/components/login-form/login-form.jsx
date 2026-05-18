"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { loginUser } from "@/lib/api/auth";
import { saveSession } from "@/lib/session";

import styles from "./login-form.module.css";

const initialState = {
  email: "",
  password: "",
  remember: true,
};

export function LoginForm() {
  const router = useRouter();
  const [form, setForm] = useState(initialState);
  const [status, setStatus] = useState({ loading: false, error: "" });

  function updateField(event) {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({ ...current, [name]: type === "checkbox" ? checked : value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus({ loading: true, error: "" });

    try {
      const payload = await loginUser(form);
      saveSession(payload);
      router.replace("/dashboard");
    } catch (error) {
      setStatus({ loading: false, error: error.message || "Unable to sign in." });
    }
  }

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <p className={styles.brand}>Workspace</p>
        <h2>Welcome back</h2>
        <p>Sign in to continue your workspace.</p>
      </div>

      <form className={styles.form} onSubmit={handleSubmit}>
        <label className={styles.field}>
          <span>Username</span>
          <input
            name="email"
            type="text"
            value={form.email}
            onChange={updateField}
            placeholder="Enter your username"
            autoComplete="username"
            required
          />
        </label>

        <label className={styles.field}>
          <span>Password</span>
          <input
            name="password"
            type="password"
            value={form.password}
            onChange={updateField}
            placeholder="Enter your password"
            autoComplete="current-password"
            required
          />
        </label>

        <label className={styles.check}>
          <input name="remember" type="checkbox" checked={form.remember} onChange={updateField} />
          <span>Stay signed in</span>
        </label>

        {status.error ? <p className={styles.error}>{status.error}</p> : null}

        <button className={styles.submit} type="submit" disabled={status.loading}>
          {status.loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </div>
  );
}
