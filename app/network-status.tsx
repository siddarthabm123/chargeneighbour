"use client";
import { useEffect, useState } from "react";
export default function NetworkStatus() {
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    if ("serviceWorker" in navigator && location.protocol === "https:")
      void navigator.serviceWorker.register("/sw.js").catch(() => {});
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  return offline ? (
    <div className="network-banner" role="status">
      You’re offline. Map results and availability may be out of date. Reconnect
      before requesting a route or submitting a booking.
      <button onClick={() => location.reload()}>Retry</button>
    </div>
  ) : null;
}
