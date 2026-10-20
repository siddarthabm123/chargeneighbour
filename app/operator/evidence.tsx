"use client";
import { useState } from "react";
export default function EvidenceReview({ id }: { id: string }) {
  const [data, setData] = useState<{
      photo: string;
      latitude: number;
      longitude: number;
      accuracy: number;
      capturedAt: string;
    } | null>(null),
    [message, setMessage] = useState("");
  async function load() {
    setMessage("Loading private photo…");
    try {
      const response = await fetch(
        `/api/host-evidence?id=${encodeURIComponent(id)}`,
        { cache: "no-store" },
      );
      const result = await response.json();
      if (!response.ok) throw Error(result.message);
      setData(result);
      setMessage("");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Evidence unavailable.",
      );
    }
  }
  return (
    <section>
      <button
        className="button outline"
        onClick={() => void load()}
        type="button"
      >
        Review private charger photo & GPS
      </button>
      {message && <p role="status">{message}</p>}
      {data && (
        <>
          <img
            className="host-photo-preview"
            src={data.photo}
            alt="Applicant's private charger photo for manual verification"
          />
          <p>
            GPS: {data.latitude}, {data.longitude} · accuracy{" "}
            {Math.round(data.accuracy)} m · captured{" "}
            {new Date(data.capturedAt).toLocaleString("en-IN")}
          </p>
          <p>
            This self-reported GPS/photo capture is not proof of ownership,
            equipment operation or electrical safety. Compare the site and
            complete the actual review.
          </p>
        </>
      )}
    </section>
  );
}
