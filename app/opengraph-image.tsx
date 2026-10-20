import { ImageResponse } from "next/og";
export const runtime = "nodejs";
export const alt = "ChargeNeighbour — Find a charge. Share your charger.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export default function Image() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "#173b2b",
        color: "#fafbf7",
        display: "flex",
        flexDirection: "column",
        padding: 75,
        justifyContent: "space-between",
      }}
    >
      <div style={{ fontSize: 34, display: "flex" }}>chargeneighbour.</div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          fontSize: 82,
          lineHeight: 1.08,
          fontWeight: 700,
        }}
      >
        <span>Find a charge.</span>
        <span style={{ color: "#d5ee81" }}>Share your charger.</span>
      </div>
      <div style={{ fontSize: 25, display: "flex" }}>
        REAL STATION DISCOVERY · HOST APPLICATIONS OPEN
      </div>
    </div>,
    size,
  );
}
