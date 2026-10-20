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
  distanceKm,
  freshAvailability,
  googleSearchUrl,
  matchesStation,
  type Point,
  type Station,
} from "./lib/stations";

type Position = Point & { accuracy: number; capturedAt: string };
import StationMap from "./station-map";
import { roadLabel, type RoadMetric, type RoadRoute } from "./lib/road-route";
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
  const [mapProvider, setMapProvider] = useState<"google" | "openstreetmap">(
      "openstreetmap",
    ),
    [metrics, setMetrics] = useState<Record<string, RoadMetric>>({}),
    [metricBusy, setMetricBusy] = useState(false),
    [roadRoute, setRoadRoute] = useState<RoadRoute | null>(null),
    [routeBusy, setRouteBusy] = useState(false),
    [routeError, setRouteError] = useState(""),
    [photosOpen, setPhotosOpen] = useState(false);
  const photoDialog = useRef<HTMLDialogElement>(null),
    roadRequest = useRef(0),
    roadController = useRef<AbortController | null>(null);
  useEffect(() => {
    if (!photosOpen) return;
    photoDialog.current?.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      photoDialog.current?.close();
      document.body.style.overflow = previous;
    };
  }, [photosOpen]);
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
      roadRequest.current++;
      roadController.current?.abort();
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
        ? (metrics[a.id]?.distanceMeters ?? Infinity) -
            (metrics[b.id]?.distanceMeters ?? Infinity) ||
          (a.location ? distanceKm(position, a.location) : Infinity) -
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
    setMetrics({});
    setMetricBusy(false);
    setRouteBusy(false);
    setRoadRoute(null);
    setRouteError("");
    roadRequest.current++;
    roadController.current?.abort();
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
      if (origin || position)
        void loadRoadMetrics(data.stations || [], origin || position!);
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
      if (!stations.length && !locating) locate();
    } else if (area !== "Your location")
      void loadStations("Your location", position);
    document
      .getElementById("station-workspace")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function locate(routeTarget?: Station) {
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
        if (routeTarget) {
          setSelected(routeTarget);
          void loadRoadRoute(routeTarget, p);
        } else void loadStations("Your location", p);
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
    setMetrics({});
    setRoadRoute(null);
    setRouteError("");
    roadRequest.current++;
    roadController.current?.abort();
    setMetricBusy(false);
    setRouteBusy(false);
  }
  async function focusStation(s: Station) {
    setSelected(s);
    setMode("station");
    setRoadRoute(null);
    setRouteError("");
    roadRequest.current++;
    roadController.current?.abort();
    setRouteBusy(false);
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
  async function loadRoadMetrics(items: Station[], origin: Position) {
    const epoch = requestNumber.current;
    setMetricBusy(true);
    setMetrics({});
    const destinations = items
      .filter((s) => s.location)
      .map((s) => ({ id: s.id, location: s.location }));
    if (!destinations.length) {
      setMetricBusy(false);
      return;
    }
    try {
      const response = await fetch("/api/routes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origin: { latitude: origin.latitude, longitude: origin.longitude },
          destinations,
          source: items[0]?.source || "google",
        }),
      });
      const data = await response.json();
      if (epoch !== requestNumber.current) return;
      if (!response.ok)
        throw Error(data.message || "Driving distances are unavailable.");
      setMetrics(data.metrics || {});
    } catch (error) {
      if (epoch === requestNumber.current)
        setRouteError(
          error instanceof Error
            ? error.message
            : "Driving distances are unavailable.",
        );
    } finally {
      if (epoch === requestNumber.current) setMetricBusy(false);
    }
  }
  async function loadRoadRoute(station: Station, origin: Position) {
    if (!station.location) return;
    const number = ++roadRequest.current;
    roadController.current?.abort();
    roadController.current = new AbortController();
    setRouteBusy(true);
    setRouteError("");
    setRoadRoute(null);
    setMode("route");
    setSelected(station);
    document
      .getElementById("station-map")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
    try {
      const response = await fetch("/api/routes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origin: { latitude: origin.latitude, longitude: origin.longitude },
          destinations: [{ id: station.id, location: station.location }],
          source: station.source || "google",
          detailed: true,
        }),
        signal: roadController.current.signal,
      });
      const data = await response.json();
      if (number !== roadRequest.current) return;
      if (!response.ok)
        throw Error(data.message || "The route could not be loaded.");
      setRoadRoute(data.route);
      setMetrics((previous) => ({ ...previous, [station.id]: data.route }));
    } catch (error) {
      if (number === roadRequest.current)
        setRouteError(
          error instanceof Error
            ? error.message
            : "The route could not be loaded.",
        );
    } finally {
      if (number === roadRequest.current) setRouteBusy(false);
    }
  }
  function startRoute(station: Station) {
    if (position) void loadRoadRoute(station, position);
    else locate(station);
  }
  const distance = (s: Station) =>
    position
      ? metrics[s.id]
        ? roadLabel(metrics[s.id])
        : metricBusy
          ? "Calculating driving distance…"
          : "Driving distance unavailable"
      : null;
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
          onClick={() => locate()}
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
          Driving-route requests also go to OSRM/FOSSGIS or Google Routes; map
          tiles use OpenStreetMap when Google is inactive.
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
        <span>Explore stations and driving routes here</span>
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
      {routeError && (
        <p className="location-error" role="status">
          {routeError} No straight-line estimate is shown as a driving distance.
        </p>
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
                  ? "Nearby results · sorted by available driving distance"
                  : "Driving distances from your GPS location"}
              </span>
            ) : (
              <button
                className="inline-link"
                onClick={() => locate()}
                disabled={busy || locating}
              >
                Add distances from my location
              </button>
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
            Up to 20 mapped results. Driving distance and time use the same
            road-route provider as the in-site route. Estimates exclude live
            traffic and start from your captured GPS position. “Open” describes
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
                {mapProvider === "google" ? "Google Maps" : "OpenStreetMap"}
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
                  onClick={() => startRoute(selected)}
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
              onProvider={setMapProvider}
              roadRoute={mode === "route" ? roadRoute : null}
            />
            {routeBusy && (
              <p className="route-summary" role="status">
                Calculating the driving route shown on this map…
              </p>
            )}
            {mode === "route" && roadRoute && (
              <section
                className="route-summary"
                aria-label="Driving route summary"
              >
                <h3>{roadLabel(roadRoute)}</h3>
                <p>
                  Route:{" "}
                  {roadRoute.provider === "google"
                    ? "Google Routes"
                    : "OSRM · OpenStreetMap"}
                  . Estimated without live traffic, from your captured GPS
                  location. Follow posted signs and confirm the entrance.
                </p>
                <details>
                  <summary>Road directions</summary>
                  <ol>
                    {roadRoute.steps.map((step, i) => (
                      <li key={i}>
                        {step.text}{" "}
                        <small>
                          ·{" "}
                          {step.distanceMeters < 1000
                            ? `${Math.round(step.distanceMeters)} m`
                            : `${(step.distanceMeters / 1000).toFixed(1)} km`}
                        </small>
                      </li>
                    ))}
                  </ol>
                </details>
                <p>
                  <small>
                    Calculated{" "}
                    {new Date(roadRoute.calculatedAt).toLocaleTimeString(
                      "en-IN",
                      { hour: "2-digit", minute: "2-digit" },
                    )}
                    . Refresh your location and route after moving.
                  </small>
                </p>
              </section>
            )}
            <div className="map-help">
              <MapPin size={17} />
              <p>
                Pan and zoom the map. Select a station to explore its photos or
                show its driving route here. The blue dot marks your captured
                location.
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
                <button
                  className="button dark"
                  disabled={routeBusy || locating || !selected.location}
                  onClick={() => startRoute(selected)}
                >
                  <Navigation size={17} />
                  {routeBusy
                    ? "Loading road route…"
                    : "Show driving route here"}
                </button>
                <button
                  className="button outline"
                  onClick={() => setPhotosOpen(true)}
                >
                  <Camera size={17} />
                  Explore station photos
                </button>
              </div>
              {detailBusy && (
                <p role="status">Loading Google photos, ratings and reviews…</p>
              )}
              {selected.rating !== undefined && (
                <section
                  className="google-reviews"
                  aria-label="Google rating and reviews"
                >
                  <span className="google-maps-attribution" translate="no">
                    Google Maps
                  </span>
                  <h4>
                    {selected.rating} / 5 ★ · {selected.ratingCount ?? 0}{" "}
                    ratings
                  </h4>
                  {!!selected.reviews?.length && (
                    <>
                      <p>
                        Selected reviews supplied by Google, ordered by
                        relevance.
                      </p>
                      {selected.reviews.map((review, i) => (
                        <article className="google-review" key={i}>
                          <b>
                            {review.authorUrl ? (
                              <a
                                href={review.authorUrl}
                                target="_blank"
                                rel="noreferrer"
                              >
                                {review.author}
                              </a>
                            ) : (
                              review.author
                            )}
                          </b>
                          <span>
                            {review.rating !== undefined
                              ? `${review.rating} / 5 ★`
                              : ""}{" "}
                            {review.time}
                          </span>
                          <p>
                            {review.text ||
                              "This reviewer did not leave written feedback."}
                          </p>
                          {review.url && (
                            <a
                              href={review.url}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Original Google review
                            </a>
                          )}
                        </article>
                      ))}
                    </>
                  )}
                </section>
              )}
              {!!selected.connectors.length && (
                <details className="station-hours">
                  <summary>Connector and power information</summary>
                  <ul>
                    {selected.connectors.map((c, i) => (
                      <li key={i}>
                        {connectorName(c.type)}
                        {c.maxChargeRateKw
                          ? ` · up to ${c.maxChargeRateKw} kW`
                          : ""}{" "}
                        ·{" "}
                        {freshAvailability(c, now)
                          ? `${c.availableCount} recently reported available`
                          : "Live availability unconfirmed"}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
              {selected.phone && (
                <p>
                  <a href={`tel:${selected.phone.replace(/[^\d+]/g, "")}`}>
                    <Phone size={16} /> Call the station
                  </a>
                </p>
              )}
              {selected.website && (
                <p>
                  <a href={selected.website} target="_blank" rel="noreferrer">
                    <ExternalLink size={16} /> Operator website
                  </a>
                </p>
              )}
              {!!selected.hours?.length && (
                <details className="station-hours">
                  <summary>
                    <Clock3 size={16} /> Opening hours
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
                Source:{" "}
                {selected.source === "openstreetmap"
                  ? "OpenStreetMap via Photon"
                  : "Google Maps"}
                . Confirm vehicle compatibility and entry. Public listings are
                not ChargeNeighbour partner bookings.
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
      <dialog
        ref={photoDialog}
        className="station-photo-dialog"
        aria-labelledby="station-photos-title"
        onCancel={() => setPhotosOpen(false)}
      >
        <button
          className="clear-position photo-dialog-close"
          aria-label="Close station photos"
          onClick={() => setPhotosOpen(false)}
        >
          <X size={20} />
        </button>
        <span className="google-maps-attribution" translate="no">
          Google Maps
        </span>
        <h3 id="station-photos-title">{selected?.name} · station photos</h3>
        {selected?.photos.length ? (
          <div className="station-photo-grid">
            {selected.photos.map((photo, i) => (
              <figure key={photo.name}>
                <Photo
                  url={photo.url}
                  alt={`${selected.name} · station photo ${i + 1}`}
                />
                <figcaption>
                  {photo.authors.length
                    ? photo.authors.map((author, j) =>
                        author.url ? (
                          <a
                            href={author.url}
                            target="_blank"
                            rel="noreferrer"
                            key={j}
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
            {selected?.source === "openstreetmap"
              ? "Google photos, ratings and reviews are not connected for this community listing. They will appear here only after the Google integration is activated and an exact Google station is selected. No unrelated photos are substituted."
              : "Google has not supplied station photos for this place."}
          </p>
        )}
      </dialog>
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
        via Photon, with incomplete community coverage. Road routes use{" "}
        <a
          href="https://routing.openstreetmap.de/about.html"
          target="_blank"
          rel="noreferrer"
        >
          OSRM/FOSSGIS
        </a>{" "}
        when Google routing is inactive.{" "}
        <a
          href="https://www.openstreetmap.org/fixthemap"
          target="_blank"
          rel="noreferrer"
        >
          Report a map issue
        </a>
        .
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
