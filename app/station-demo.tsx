"use client";
import { useState } from "react";
import { ChevronLeft, ChevronRight, PlugZap, MapPin } from "lucide-react";

const views = [
  { name: "Arrival & parking", position: "center", size: "cover" },
  { name: "Charger view", position: "38% 54%", size: "220%" },
  { name: "Entrance view", position: "65% 28%", size: "180%" },
];

export default function StationDemo() {
  const [index, setIndex] = useState(0);
  const view = views[index];
  return (
    <section className="station-demo" aria-label="Sample station experience">
      <div className="demo-label">DEMO PREVIEW · FICTIONAL STATION</div>
      <h4>Garden Court · home charger</h4>
      <p className="demo-disclosure">
        Explore an example stop. Images are AI-generated concept views of the
        same scene. Details, price and reviews are samples, not information
        about your selected station or Google customer feedback.
      </p>
      <div
        className="demo-image"
        role="img"
        aria-label={`AI-generated charger concept: ${view.name}`}
        style={{
          backgroundImage: "url('/images/neighbourhood-hero.webp')",
          backgroundPosition: view.position,
          backgroundSize: view.size,
        }}
      >
        <span>AI CONCEPT IMAGE · {view.name}</span>
      </div>
      <div className="demo-gallery-controls">
        <button
          className="button outline"
          aria-label="Previous demo image view"
          onClick={() => setIndex((index + views.length - 1) % views.length)}
        >
          <ChevronLeft size={18} />
        </button>
        <p aria-live="polite">
          {index + 1} / {views.length} · {view.name}
        </p>
        <button
          className="button outline"
          aria-label="Next demo image view"
          onClick={() => setIndex((index + 1) % views.length)}
        >
          <ChevronRight size={18} />
        </button>
      </div>
      <div className="demo-specs">
        <div>
          <PlugZap size={20} />
          <b>Type 2 AC · 7.2 kW</b>
          <span>Sample charger specification</span>
        </div>
        <div>
          <b>₹16 / kWh</b>
          <span>Example energy price · no payment taken</span>
        </div>
        <div>
          <MapPin size={20} />
          <b>One parking bay</b>
          <span>Example access: 8 am–8 pm</span>
        </div>
      </div>
      <section className="demo-reviews" aria-label="Fictional sample reviews">
        <div className="demo-label">
          SAMPLE REVIEWS · NOT REAL CUSTOMER REVIEWS
        </div>
        <h4>
          4.5 / 5 ★ <small>· 2 fictional examples</small>
        </h4>
        <article className="google-review">
          <b>Sample driver A</b>
          <span>5 / 5 ★ · Demo review</span>
          <p>
            “The entrance photo made the parking bay easy to find. The host
            explained how to connect before the session.”
          </p>
        </article>
        <article className="google-review">
          <b>Sample driver B</b>
          <span>4 / 5 ★ · Demo review</span>
          <p>
            “Useful for a planned neighbourhood top-up. I would check the gate
            access and charging speed before arriving.”
          </p>
        </article>
      </section>
      <p className="demo-disclosure">
        This sample cannot be booked and has no map pin. Search the live map for
        real stations and road routes. Real Google photos and reviews can be
        connected later.
      </p>
    </section>
  );
}
