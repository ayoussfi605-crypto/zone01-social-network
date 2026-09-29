"use client";
import { useState } from "react";
import { api } from "../../services/api";
import type { User } from "../../types/user";

// Toggle button to switch profile privacy between public and private.
export default function PrivacyToggle({ user, onChange }: { user: User; onChange: (u: User) => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function toggle() {
    setLoading(true);
    setError("");
    try {
      const updated = await api("/api/users/privacy", {
        method: "PUT",
        body: JSON.stringify({ is_private: !user.is_private }),
      });
      onChange(updated);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button onClick={toggle} disabled={loading} className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-100 disabled:opacity-50">
        {loading ? "Saving..." : `Switch to ${user.is_private ? "Public 🌍" : "Private 🔒"}`}
      </button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
