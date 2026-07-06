import "../styles/global.css";
import { useState } from "react";
import { login } from "../lib/auth";

export default function LoginForm() {
  const [email, setEmail] = useState("");

  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setLoading(true);

    const { error } = await login(email, password);

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    window.location.href = "/admin";
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-2xl shadow-xl p-10 w-[420px] border-2"
    >
      <h1 className="text-3xl text-center font-bold mb-8">CloudTweak CMS</h1>

      <input
        className="border w-full p-3 rounded-xl mb-3"
        placeholder="Email"
        type="email"
        autoComplete="email"
        onChange={(e) => setEmail(e.target.value)}
      />

      <input
        className="border w-full p-3 rounded-xl mb-6"
        placeholder="Password"
        type="password"
        autoComplete="current-password"
        onChange={(e) => setPassword(e.target.value)}
      />
      {error && (
        <div className="mb-4 rounded-xl bg-red-100 p-3 text-red-600">
          {error}
        </div>
      )}

      <button
        disabled={loading}
        className="bg-blue-600 text-white w-full rounded-xl py-3"
      >
        {loading ? "Signing In..." : "Login"}
      </button>
    </form>
  );
}
