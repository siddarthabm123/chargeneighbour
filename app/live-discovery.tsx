"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  MapPin,
  Search,
  ArrowUpRight,
  PlugZap,
  LoaderCircle,
  LocateFixed,
  Navigation,
  Camera,
  X,
  Map,
  List,
  Phone,
  Clock3,
  ShieldCheck,
  ExternalLink,
  Copy,
  Check,
} from "lucide-react";
import {
  availableConnectors,
  connectorName,
  directionsUrl,
  distanceKm,
  distanceLabel,
  freshAvailability,
  googleSearchUrl,
  matchesStation,
  type Point,
  type Station,
} from "./lib/stations";

type Position = Point & { accuracy: number; capturedAt: string };
import StationMap from "./station-map";
type MapMode = "nearby" | "you" | "station" | "route";
export default function LiveDiscovery() {
  const [query, setQuery] = useState(""),
    [area, setArea] = useState("India"),
    [stations, setStations] = useState<Station[]>([]);
  const [busy, setBusy] = useState(false),
    [locating, setLocating] = useState(false),
    [message, setMessage] = useState(""),
    [locationError, setLocationError] = useState("");
  const [position, setPosition] = useState<Position | null>(null),
    [selected, setSelected] = useState<Station | null>(null),
    [mode, setMode] = useState<MapMode>("nearby"),
    [view, setView] = useState("map");
  const [connector, setConnector] = useState(""),
    [power, setPower] = useState(0),
    [onlyAvailable, setOnlyAvailable] = useState(false),
    [now, setNow] = useState(Date.now());
  const requestNumber = useRef(0),
    controller = useRef<AbortController | null>(null),
    detailRequest = useRef(0);
  const [synchronized, setSynchronized] = useState(false),
    [detailBusy, setDetailBusy] = useState(false);
  const [address, setAddress] = useState(""),
    [addressBusy, setAddressBusy] = useState(false),
    [addressError, setAddressError] = useState(""),
    [copied, setCopied] = useState(false),
    [copyError, setCopyError] = useState(false);
  const addressRequest = useRef(0),
    addressController = useRef<AbortController | null>(null);
  useEffect(() => {
    if (selected && window.matchMedia("(max-width: 760px)").matches)
      document
        .getElementById("station-map")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [selected]);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => {
      clearInterval(timer);
      requestNumber.current++;
      controller.current?.abort();
      detailRequest.current++;
      addressRequest.current++;
      addressController.current?.abort();
    };
  }, []);
  const pointText = position
    ? `${position.latitude},${position.longitude}`
    : "";
  const mapQuery =
    mode === "you" && position
      ? pointText
      : mode === "station" && selected
        ? selected.location
          ? `${selected.location.latitude},${selected.location.longitude}`
          : `${selected.name}, ${selected.address}`
        : `EV charging stations near ${area === "Your location" && position ? pointText : area}`;
  const mapUrl =
    mode === "route" && selected && position
      ? `https://maps.google.com/maps?hl=en&saddr=${encodeURIComponent(pointText)}&daddr=${encodeURIComponent(selected.location ? `${selected.location.latitude},${selected.location.longitude}` : selected.address)}&output=embed`
      : `https://maps.google.com/maps?hl=en&q=${encodeURIComponent(mapQuery)}&z=${mode === "you" || mode === "station" ? 16 : area === "India" ? 5 : 13}&output=embed`;
  const mapsLink = googleSearchUrl(
    area === "Your location" && position ? pointText : area,
  );
  const openMapResults = stations.some((s) => s.source === "openstreetmap");
  const filtered = stations
    .filter(
      (s) =>
        matchesStation(s, connector, power) &&
        (!onlyAvailable || availableConnectors(s, connector, power, now) > 0),
    )
    .sort((a, b) =>
      position
        ? (a.location ? distanceKm(position, a.location) : Infinity) -
          (b.location ? distanceKm(position, b.location) : Infinity)
        : 0,
    );
  const nearest = position
    ? filtered.find(
        (s) => s.location && availableConnectors(s, connector, power, now) > 0,
      )
    : undefined;

  async function loadStations(searchArea: string, origin?: Position) {
    const number = ++requestNumber.current;
    controller.current?.abort();
    controller.current = new AbortController();
    detailRequest.current++;
    setBusy(true);
    setMessage("");
    setStations([]);
    setSelected(null);
    setMode("nearby");
    setArea(searchArea);
    try {
      const res = await fetch(
        origin
          ? "/api/chargers"
          : `/api/chargers?q=${encodeURIComponent(searchArea)}`,
        origin
          ? {
              signal: controller.current.signal,
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                latitude: origin.latitude,
                longitude: origin.longitude,
              }),
            }
          : { cache: "no-store", signal: controller.current.signal },
      );
      const data = (await res.json()) as {
        stations?: Station[];
        message?: string;
      };
      if (number !== requestNumber.current) return;
      if (!res.ok) {
        setMessage(
          data.message ||
            "Station details are unavailable. Explore the Google map below.",
        );
        return;
      }
      setStations(data.stations || []);
      setMessage(data.message || "");
      setNow(Date.now());
      if (!data.stations?.length)
        setMessage(
          "No station details were returned for this search. Try another area or explore Google Maps.",
        );
    } catch {
      if (number === requestNumber.current)
        setMessage(
          "Station details could not be loaded. You can still explore the Google map below.",
        );
    } finally {
      if (number === requestNumber.current) setBusy(false);
    }
  }
  function search(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLocating(false);
    setLocationError("");
    void loadStations(query.trim());
  }
  async function lookupAddress(point: Position) {
    const number = ++addressRequest.current;
    addressController.current?.abort();
    addressController.current = new AbortController();
    setAddress("");
    setAddressError("");
    setCopied(false);
    setCopyError(false);
    setAddressBusy(true);
    try {
      const response = await fetch("/api/location", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latitude: point.latitude,
          longitude: point.longitude,
        }),
        signal: addressController.current.signal,
      });
      const data = await response.json();
      if (number !== addressRequest.current) return;
      if (!response.ok || !data.address)
        throw Error(
          data.message ||
            "An address could not be found. Your location is still available on the map.",
        );
      setAddress(data.address);
    } catch (error) {
      if (number === addressRequest.current)
        setAddressError(
          error instanceof Error
            ? error.message
            : "Address lookup is unavailable. Please try refreshing your location.",
        );
    } finally {
      if (number === addressRequest.current) setAddressBusy(false);
    }
  }
  async function copyAddress() {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(`Near ${address}`);
      setCopied(true);
      setCopyError(false);
    } catch {
      setCopyError(true);
      setCopied(false);
    }
  }
  function showNearby() {
    setView("list");
    setMode("nearby");
    if (!position) {
      if (!locating) locate();
    } else if (area !== "Your location")
      void loadStations("Your location", position);
    document
      .getElementById("station-workspace")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function locate() {
    if (!navigator.geolocation) {
      setLocationError(
        "Your browser does not support location. Enter a city or PIN code instead.",
      );
      return;
    }
    const number = ++requestNumber.current;
    setLocating(true);
    controller.current?.abort();
    setBusy(false);
    setLocationError("");
    navigator.geolocation.getCurrentPosition(
      (result) => {
        if (number !== requestNumber.current) return;
        const p = {
          latitude: Number(result.coords.latitude.toFixed(5)),
          longitude: Number(result.coords.longitude.toFixed(5)),
          accuracy: result.coords.accuracy,
          capturedAt: new Date(result.timestamp).toISOString(),
        };
        setPosition(p);
        setLocating(false);
        setQuery("");
        void lookupAddress(p);
        void loadStations("Your location", p);
      },
      (error) => {
        if (number !== requestNumber.current) return;
        setLocating(false);
        setLocationError(
          error.code === 1
            ? "Location permission was declined. You can search any city or PIN code."
            : error.code === 3
              ? "Location took too long. Try again outdoors or search by city."
              : "Your location could not be determined. Search by city or PIN code instead.",
        );
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  }
  function clearLocation() {
    requestNumber.current++;
    controller.current?.abort();
    detailRequest.current++;
    addressRequest.current++;
    addressController.current?.abort();
    setAddress("");
    setAddressBusy(false);
    setAddressError("");
    setCopied(false);
    setCopyError(false);
    setPosition(null);
    setLocating(false);
    setBusy(false);
    setStations([]);
    setSelected(null);
    setMessage("");
    setArea("India");
    setMode("nearby");
  }
  async function focusStation(s: Station) {
    setSelected(s);
    setMode("station");
    const number = ++detailRequest.current;
    if (s.source === "openstreetmap") {
      setDetailBusy(false);
      return;
    }
    setDetailBusy(true);
    try {
      const response = await fetch(
        `/api/chargers/details?id=${encodeURIComponent(s.id)}`,
        { cache: "no-store" },
      );
      const data = await response.json();
      if (number !== detailRequest.current) return;
      if (!response.ok) {
        setMessage(data.message || "Open Google Maps for full place details.");
        return;
      }
      setSelected(data.station);
      setStations((previous) =>
        previous.map((item) => (item.id === s.id ? data.station : item)),
      );
    } catch {
      if (number === detailRequest.current)
        setMessage("Full place details are unavailable. Open Google Maps.");
    } finally {
      if (number === detailRequest.current) setDetailBusy(false);
    }
  }
  const distance = (s: Station) =>
    position && s.location ? distanceLabel(position, s.location) : null;
  return (
    <section className="live-discovery wrap section" id="explore">
      <div className="section-heading">
        <div>
          <div className="eyebrow">A CLEARER PICTURE, BEFORE YOU GO.</div>
          <h2>Your next charge. In view.</h2>
          <p>
            See the real map, explore the place and check the charger before
            setting off.
          </p>
        </div>
        <span className="coverage-tag">
          <MapPin size={16} />
          Across India
        </span>
      </div>
      <form className="live-search" onSubmit={search}>
        <label htmlFor="station-location">
          <MapPin size={22} />
          <span>
            Where do you need a charge?
            <input
              id="station-location"
              name="location"
              type="search"
              required
              minLength={2}
              maxLength={120}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="City, neighbourhood, or PIN code"
              autoComplete="address-level2"
            />
          </span>
        </label>
        <button
          className="button dark"
          disabled={busy || locating}
          type="submit"
        >
          {busy ? (
            <LoaderCircle size={18} className="spin" />
          ) : (
            <Search size={18} />
          )}
          Find stations
        </button>
      </form>
      <div className="location-controls">
        <button
          className="button outline"
          disabled={busy || locating}
          onClick={locate}
        >
          {locating ? (
            <LoaderCircle className="spin" size={18} />
          ) : (
            <LocateFixed size={18} />
          )}{" "}
          {locating
            ? "Finding your position…"
            : position
              ? "Refresh my location"
              : "Use my location"}
        </button>
        <p>
          Your choice: your browser asks permission. This site, Google Maps and
          Photon (OpenStreetMap) use your location for nearby stations, maps and
          a readable address. We do not save your GPS location in our database.
        </p>
      </div>
      {locationError && (
        <p className="location-error" role="alert">
          {locationError}
        </p>
      )}
      {position && (
        <div className="your-position">
          <span className="position-dot" />
          <div>
            <b>You are here · approximate address</b>
            <p aria-live="polite">
              {addressBusy
                ? "Finding your street and neighbourhood…"
                : address
                  ? `Near ${address}`
                  : addressError ||
                    "Location captured. Address not available yet."}
            </p>
            <small>
              Accuracy about {Math.max(1, Math.round(position.accuracy))} m ·{" "}
              Captured{" "}
              {new Date(position.capturedAt).toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit",
              })}{" "}
              · Refresh as you move. This is a location snapshot.
            </small>
            {address && (
              <small className="address-attribution">
                Address:{" "}
                <a
                  href="https://www.openstreetmap.org/copyright"
                  target="_blank"
                  rel="noreferrer"
                >
                  © OpenStreetMap contributors
                </a>{" "}
                via Photon. Confirm the entrance before travelling.
              </small>
            )}
            {copyError && (
              <label className="manual-address-copy">
                Clipboard access was blocked. Select this address and copy it:
                <input
                  readOnly
                  value={`Near ${address}`}
                  onFocus={(e) => e.currentTarget.select()}
                  aria-label="Address to copy"
                />
              </label>
            )}
          </div>
          {address && (
            <button
              className="button outline copy-address"
              onClick={() => void copyAddress()}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              <span role="status">
                {copied ? "Address copied" : "Copy address"}
              </span>
            </button>
          )}
          <button
            className="inline-link"
            onClick={() => {
              setMode("you");
              setView("map");
            }}
          >
            Show my position
          </button>
          <button
            className="clear-position"
            onClick={clearLocation}
            aria-label="Clear my location"
          >
            <X size={18} />
          </button>
        </div>
      )}
      <div className="explore-toolbar">
        <div className="view-switch" aria-label="Station view">
          <button
            className={view === "map" ? "active" : ""}
            onClick={() => setView("map")}
            aria-pressed={view === "map"}
          >
            <Map size={17} />
            Map & explore
          </button>
          <button
            className={view === "list" ? "active" : ""}
            onClick={showNearby}
            aria-pressed={view === "list"}
          >
            <List size={17} />
            Nearby station list
          </button>
        </div>
        <a href={mapsLink} target="_blank" rel="noreferrer">
          Open Google Maps <ExternalLink size={15} />
        </a>
      </div>
      <div className="station-filters">
        <label>
          Connector
          <select
            value={connector}
            onChange={(e) => setConnector(e.target.value)}
          >
            <option value="">All connectors</option>
            <option value="EV_CONNECTOR_TYPE_TYPE_2">Type 2 AC</option>
            <option value="EV_CONNECTOR_TYPE_CCS_COMBO_2">CCS2</option>
            <option value="EV_CONNECTOR_TYPE_CHADEMO">CHAdeMO</option>
            <option value="EV_CONNECTOR_TYPE_UNSPECIFIED_GB_T">GB/T</option>
          </select>
        </label>
        <label>
          Minimum power
          <select
            value={power}
            onChange={(e) => setPower(Number(e.target.value))}
          >
            <option value={0}>Any power</option>
            <option value={7}>7 kW+</option>
            <option value={22}>22 kW+</option>
            <option value={50}>50 kW+</option>
          </select>
        </label>
        <label className="availability-filter">
          <input
            type="checkbox"
            checked={onlyAvailable}
            onChange={(e) => setOnlyAvailable(e.target.checked)}
          />
          Recently reported available
        </label>
        <p>
          {synchronized
            ? "Map markers and station cards show the same filtered results."
            : "Filters apply to station cards. The fallback Google map has its own results."}
        </p>
      </div>
      {message && (
        <div className="station-notice" role="status">
          <ShieldCheck size={20} />
          <p>{message}</p>
        </div>
      )}
      {nearest && (
        <div className="next-stop">
          <Navigation size={23} />
          <div>
            <span>NEAREST MATCH IN THESE RESULTS</span>
            <h3>{nearest.name}</h3>
            <p>
              {distance(nearest)} ·{" "}
              {availableConnectors(nearest, connector, power, now)} connectors
              reported available. Confirm before travel.
            </p>
          </div>
          <button className="button dark" onClick={() => focusStation(nearest)}>
            Explore next stop <ArrowUpRight size={17} />
          </button>
        </div>
      )}
      <div
        className={`station-workspace ${view === "list" ? "compact-list" : ""}`}
        id="station-workspace"
      >
        <aside
          className="station-list-panel"
          aria-label="Nearby charging stations"
        >
          <div className="station-list-heading">
            <span className="google-maps-attribution" translate="no">
              {openMapResults
                ? "OpenStreetMap · via Photon"
                : stations.length
                  ? "Google Maps"
                  : "Charging stations"}
            </span>
            <h3>
              {busy
                ? "Finding stations…"
                : stations.length
                  ? `${filtered.length} matching stations`
                  : "Station guide"}
            </h3>
            {position ? (
              <span>
                {area === "Your location"
                  ? "Within 25 km · nearest first"
                  : "Nearest first from your GPS location"}
              </span>
            ) : (
              <span>Use my location to see distances from you.</span>
            )}
          </div>
          {busy ? (
            <div className="station-empty" role="status">
              <LoaderCircle className="spin" />
              <h3>Looking around your next stop.</h3>
            </div>
          ) : filtered.length ? (
            filtered.map((s) => (
              <article
                className={`station-preview ${selected?.id === s.id ? "selected" : ""}`}
                key={s.id}
              >
                <div className="station-preview-top">
                  <PlugZap size={22} />
                  <span>
                    {availableConnectors(s, connector, power, now) > 0
                      ? `${availableConnectors(s, connector, power, now)} reported available`
                      : s.status && s.status !== "OPERATIONAL"
                        ? s.status.replaceAll("_", " ").toLowerCase()
                        : "Availability unconfirmed"}
                  </span>
                </div>
                <button
                  className="station-name"
                  onClick={() => focusStation(s)}
                >
                  {s.name}
                  <ArrowUpRight size={19} />
                </button>
                <p>{s.address}</p>
                {distance(s) && (
                  <div className="distance-label">
                    <Navigation size={14} />
                    {distance(s)} <small>from you</small>
                  </div>
                )}
                <div className="connector-tags">
                  {s.connectors.length ? (
                    s.connectors.slice(0, 3).map((c, i) => (
                      <span key={i}>
                        {connectorName(c.type)}
                        {c.maxChargeRateKw ? ` · ${c.maxChargeRateKw} kW` : ""}
                      </span>
                    ))
                  ) : (
                    <span>Connector details not supplied</span>
                  )}
                </div>
                <div className="station-card-footer">
                  <span>
                    {s.openNow === true
                      ? "Reported open now"
                      : s.openNow === false
                        ? "Reported closed now"
                        : "Hours unconfirmed"}
                  </span>
                  <button onClick={() => focusStation(s)}>Explore place</button>
                </div>
                {s.attributions.map((a) => (
                  <a
                    className="station-attribution"
                    key={a.uri}
                    href={a.uri}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {a.provider}
                  </a>
                ))}
              </article>
            ))
          ) : (
            <div className="station-empty">
              <PlugZap size={30} />
              <h3>
                {stations.length
                  ? "No cards match these filters."
                  : "A real place. A better-informed stop."}
              </h3>
              <p>
                {stations.length
                  ? "Try another connector, power or availability filter."
                  : "Search a city or use your location to load nearby station names and distances."}
              </p>
              <a href={mapsLink} target="_blank" rel="noreferrer">
                Stations, photos & reviews on Google <ArrowUpRight size={16} />
              </a>
            </div>
          )}
          <p className="station-list-footnote">
            Up to 20 mapped results. Distances from your GPS snapshot are
            straight-line estimates, not driving distances. “Open” describes
            hours, not a free connector. Availability information may not be
            supplied for every station.
          </p>
        </aside>
        <div className="map-detail-panel">
          <div className="real-map-card" id="station-map">
            <div className="map-title">
              <div>
                <span className="position-dot" />
                <b>
                  {mode === "you"
                    ? "Your captured position"
                    : mode === "route"
                      ? "Your position → selected station"
                      : mode === "station"
                        ? selected?.name
                        : "Explore real charging stations"}
                </b>
              </div>
              <span className="google-maps-attribution" translate="no">
                Google Maps
              </span>
            </div>
            <div className="map-mode-controls">
              <button aria-pressed={mode === "nearby"} onClick={showNearby}>
                Nearby stations
              </button>
              {position && (
                <button
                  aria-pressed={mode === "you"}
                  onClick={() => setMode("you")}
                >
                  Your position
                </button>
              )}
              {selected && (
                <button
                  aria-pressed={mode === "station"}
                  onClick={() => setMode("station")}
                >
                  Selected station
                </button>
              )}
              {selected && position && (
                <button
                  aria-pressed={mode === "route"}
                  onClick={() => setMode("route")}
                >
                  Route preview
                </button>
              )}
            </div>
            <StationMap
              stations={filtered}
              position={position}
              selected={selected}
              fallback={mapUrl}
              title={
                mode === "you"
                  ? "Google map of your captured location"
                  : "Interactive Google map of charging stations"
              }
              onSelect={(s) => void focusStation(s)}
              focusYou={mode === "you"}
              route={mode === "route"}
              onMode={setSynchronized}
            />
            <div className="map-help">
              <MapPin size={17} />
              <p>
                Pan and zoom the map. Tap a station marker to explore. Open
                Google Maps for its full photos, reviews and navigation.
              </p>
            </div>
          </div>
          {selected ? (
            <section
              className="station-detail"
              id="station-detail"
              aria-label="Selected station details"
            >
              <div className="detail-eyebrow">EXPLORE BEFORE YOU ARRIVE</div>
              <h3>{selected.name}</h3>
              {detailBusy && (
                <p role="status">
                  Loading place photos, hours and contact details…
                </p>
              )}
              {selected.status && selected.status !== "OPERATIONAL" && (
                <p className="location-error">
                  Station reported{" "}
                  {selected.status.replaceAll("_", " ").toLowerCase()}. Confirm
                  operation before travelling.
                </p>
              )}
              <p className="detail-address">
                <MapPin size={17} />
                {selected.address}
              </p>
              {distance(selected) && (
                <p className="distance-label">
                  <Navigation size={16} />
                  {distance(selected)}
                </p>
              )}
              <div className="detail-actions">
                <a
                  className="button dark"
                  href={directionsUrl(selected, position)}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Navigation size={17} />
                  Get driving directions
                </a>
                <a
                  className="button outline"
                  href={selected.photosUrl || selected.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Camera size={17} />
                  {selected.source === "openstreetmap"
                    ? "Find photos on Google Maps"
                    : "Photos on Google"}
                </a>
              </div>
              <div className="detail-specs">
                <div>
                  <span>Opening status</span>
                  <b>
                    {selected.openNow === true
                      ? "Reported open now"
                      : selected.openNow === false
                        ? "Reported closed now"
                        : "Check with operator"}
                  </b>
                </div>
                <div>
                  <span>Google rating</span>
                  <b>
                    {selected.rating
                      ? `${selected.rating} / 5 · ${selected.ratingCount || 0} reviews`
                      : "Not supplied"}
                  </b>
                </div>
                <div>
                  <span>Charging price</span>
                  <b>Confirm with operator</b>
                </div>
                <div>
                  <span>Total connectors</span>
                  <b>{selected.connectorCount ?? "Not supplied"}</b>
                </div>
              </div>
              <h4>Connector & power specifications</h4>
              {selected.connectors.length ? (
                <div className="connector-specs">
                  {selected.connectors.map((c, i) => (
                    <div key={i}>
                      <div>
                        <b>{connectorName(c.type)}</b>
                        <span>
                          {c.maxChargeRateKw
                            ? `Up to ${c.maxChargeRateKw} kW`
                            : "Power not supplied"}{" "}
                          · {c.count ?? "Unknown"} connectors
                        </span>
                      </div>
                      <div>
                        <b>
                          {freshAvailability(c, now)
                            ? `${c.availableCount} reported available`
                            : "Live availability unconfirmed"}
                        </b>
                        <span>
                          {c.availabilityLastUpdateTime
                            ? `Updated ${new Date(c.availabilityLastUpdateTime).toLocaleString("en-IN")}`
                            : "No update timestamp supplied"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p>
                  The map provider has not supplied connector or power
                  specifications for this station. Confirm compatibility with
                  the operator.
                </p>
              )}
              <p className="detail-note">
                Reported availability expires here after 15 minutes. It can
                change before arrival. Maximum power depends on your vehicle,
                equipment and operating conditions.
              </p>
              <h4>See the place before you travel</h4>
              {selected.photos.length ? (
                <div className="station-photo-grid">
                  {selected.photos.map((photo, i) => (
                    <figure key={photo.name}>
                      <Photo
                        url={photo.url}
                        alt={`${selected.name} — Google place photo ${i + 1}`}
                      />
                      <figcaption>
                        {photo.authors.length
                          ? photo.authors.map((author, j) =>
                              author.url ? (
                                <a
                                  key={j}
                                  href={author.url}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  {author.name}
                                </a>
                              ) : (
                                <span key={j}>{author.name}</span>
                              ),
                            )
                          : "Google Maps place photo"}
                      </figcaption>
                    </figure>
                  ))}
                </div>
              ) : (
                <p>
                  No photo preview was supplied. Explore the station’s Google
                  Maps page for any available photos.
                </p>
              )}
              <div className="place-contact">
                {selected.phone && (
                  <a href={`tel:${selected.phone.replace(/[^\d+]/g, "")}`}>
                    <Phone size={17} />
                    {selected.phone}
                  </a>
                )}
                {selected.website && (
                  <a href={selected.website} target="_blank" rel="noreferrer">
                    <ExternalLink size={17} />
                    Operator website
                  </a>
                )}
                <a
                  href={selected.reviewsUrl || selected.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  {selected.source === "openstreetmap"
                    ? "Explore on Google Maps"
                    : "Read reviews on Google"}{" "}
                  <ArrowUpRight size={16} />
                </a>
              </div>
              {!!selected.hours?.length && (
                <details className="station-hours">
                  <summary>
                    <Clock3 size={17} />
                    Opening hours
                  </summary>
                  <ul>
                    {selected.hours.map((h) => (
                      <li key={h}>{h}</li>
                    ))}
                  </ul>
                </details>
              )}
              {selected.attributions.map((a) => (
                <a
                  className="station-attribution"
                  key={a.uri}
                  href={a.uri}
                  target="_blank"
                  rel="noreferrer"
                >
                  {a.provider}
                </a>
              ))}
              <p className="detail-note">
                Station details from{" "}
                {selected.source === "openstreetmap"
                  ? "OpenStreetMap via Photon"
                  : "Google Maps"}
                . Public listings are not confirmed ChargeNeighbour partners or
                reservations.
              </p>
            </section>
          ) : (
            <div className="before-you-go">
              <Camera size={28} />
              <div>
                <h3>Get a feel for your next stop.</h3>
                <p>
                  Choose a station card to compare its connectors, power and
                  reported availability. Explore Google’s photos, entrance
                  details and reviews before travelling.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
      <p className="google-policy">
        Google map content and Google Places details are provided under the{" "}
        <a
          href="https://www.google.com/intl/en_us/help/terms_maps/"
          target="_blank"
          rel="noreferrer"
        >
          Google Maps terms
        </a>{" "}
        and{" "}
        <a
          href="https://policies.google.com/privacy"
          target="_blank"
          rel="noreferrer"
        >
          Google Privacy Policy
        </a>
        . Station information is not a guarantee of access, compatibility, price
        or charger availability. Fallback station names and readable addresses
        use{" "}
        <a
          href="https://www.openstreetmap.org/copyright"
          target="_blank"
          rel="noreferrer"
        >
          © OpenStreetMap contributors
        </a>{" "}
        via Photon, with incomplete community coverage.
      </p>
    </section>
  );
}
function Photo({ url, alt }: { url?: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  return failed || !url ? (
    <div className="photo-unavailable">
      <Camera size={25} />
      <span>Photo unavailable · view on Google Maps</span>
    </div>
  ) : (
    <img src={url} alt={alt} loading="lazy" onError={() => setFailed(true)} />
  );
}
