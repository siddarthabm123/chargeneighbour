"use client";
import { useEffect, useState } from "react";
export function campaignSource() {
  try {
    return sessionStorage.getItem("cn_source") || "direct";
  } catch {
    return "direct";
  }
}
export default function AnalyticsChoice() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    let choice: string | null = null;
    try {
      choice = localStorage.getItem("cn_analytics");
      const source = new URLSearchParams(location.search).get("utm_source");
      if (choice === "yes" && source && /^[a-z0-9_-]{1,64}$/i.test(source))
        sessionStorage.setItem("cn_source", source.toLowerCase());
    } catch {}
    setOpen(!choice);
    if (choice === "yes") void countVisit();
    const reopen = () => setOpen(true);
    window.addEventListener("cn-analytics-preferences", reopen);
    return () => window.removeEventListener("cn-analytics-preferences", reopen);
  }, []);
  async function countVisit() {
    try {
      if (sessionStorage.getItem("cn_visit")) return;
      const r = await fetch("/api/metrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event: "visit", source: campaignSource() }),
      });
      if (r.ok) sessionStorage.setItem("cn_visit", "1");
    } catch {}
  }
  function choose(value: "yes" | "no") {
    try {
      localStorage.setItem("cn_analytics", value);
      const source = new URLSearchParams(location.search).get("utm_source");
      if (value === "yes" && source && /^[a-z0-9_-]{1,64}$/i.test(source))
        sessionStorage.setItem("cn_source", source.toLowerCase());
      if (value === "no") sessionStorage.removeItem("cn_source");
    } catch {}
    document.cookie = `cn_analytics=${value}; Max-Age=31536000; Path=/; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
    setOpen(false);
    if (value === "yes") void countVisit();
  }
  return open ? (
    <aside className="analytics-choice" aria-label="Optional analytics">
      <div>
        <strong>A small choice about measurement.</strong>
        <p>
          Allow anonymous campaign counts to help us improve the pilot? No GPS
          or email is included. <a href="/privacy">Privacy details</a>
        </p>
      </div>
      <button className="button outline" onClick={() => choose("no")}>
        No thanks
      </button>
      <button className="button dark" onClick={() => choose("yes")}>
        Allow
      </button>
    </aside>
  ) : null;
}
