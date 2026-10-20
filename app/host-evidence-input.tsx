"use client";
import { useEffect, useRef, useState } from "react";
async function preparePhoto(file: File) {
  const image = await createImageBitmap(file),
    scale = Math.min(1, 1920 / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(image.width * scale);
  canvas.height = Math.round(image.height * scale);
  const context = canvas.getContext("2d");
  if (!context) {
    image.close();
    throw Error("Photo processing is unavailable.");
  }
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  image.close();
  const photo = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (blob) =>
        blob
          ? resolve(blob)
          : reject(
              Error("Could not process this photo. Choose JPEG, PNG or WebP."),
            ),
      "image/jpeg",
      0.84,
    ),
  );
  if (photo.size > 3000000) throw Error("Choose a smaller photo.");
  return new File([photo], "charger.jpg", { type: "image/jpeg" });
}
export default function HostEvidenceInput({
  onReady,
}: {
  onReady: (id: string) => void;
}) {
  const [file, setFile] = useState<File | null>(null),
    [preview, setPreview] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [saved, setSaved] = useState(false);
  const consent = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!file) {
      setPreview("");
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  async function upload() {
    if (!file || !consent.current?.checked) {
      setMessage("Choose a photo and agree to private photo/GPS review.");
      return;
    }
    setBusy(true);
    setMessage("");
    onReady("");
    setSaved(false);
    try {
      const photo = await preparePhoto(file);
      if (!navigator.geolocation)
        throw Error(
          "GPS is unavailable. Please use a device with location access while at the charger.",
        );
      const position = await new Promise<GeolocationPosition>(
        (resolve, reject) =>
          navigator.geolocation.getCurrentPosition(
            resolve,
            () =>
              reject(
                Error(
                  "Location is required. Allow GPS while standing at the charger, then try again.",
                ),
              ),
            { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
          ),
      );
      if (position.coords.accuracy > 100)
        throw Error(
          "GPS accuracy is too low. Move near the entrance or outdoors and try again.",
        );
      const form = new FormData();
      form.set("photo", photo);
      form.set("latitude", String(position.coords.latitude));
      form.set("longitude", String(position.coords.longitude));
      form.set("accuracy", String(position.coords.accuracy));
      form.set("capturedAt", new Date(position.timestamp).toISOString());
      form.set("consent", "yes");
      const response = await fetch("/api/host-evidence", {
        method: "POST",
        body: form,
      });
      const data = await response.json();
      if (!response.ok) throw Error(data.message || "Photo upload failed.");
      onReady(data.id);
      setSaved(true);
      setMessage(
        `Photo and GPS saved privately · accuracy about ${Math.round(data.accuracy)} m. Pending operator review. Submit this application within 30 minutes.`,
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not upload the charger photo.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="host-evidence-input notice-card">
      <h3>Show the charger at this location</h3>
      <p>
        Add at least one clear photo showing the installed charger and parking
        or entrance. Stand beside the charger with GPS enabled. Photo and GPS
        are evidence for a manual review; they do not automatically verify the
        charger.
      </p>
      <label>
        Charger photo (required)
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          disabled={busy}
          onChange={(e) => {
            const next = e.target.files?.[0] || null;
            onReady("");
            setSaved(false);
            setMessage("");
            if (next && next.size > 12000000) {
              setFile(null);
              setMessage(
                "Choose a photo under 12 MB. It will be resized before private upload.",
              );
              e.target.value = "";
            } else setFile(next);
          }}
        />
      </label>
      {preview && (
        <img
          className="host-photo-preview"
          src={preview}
          alt="Your charger photo for private review"
        />
      )}
      <label className="checkbox-label">
        <input type="checkbox" ref={consent} disabled={busy || saved} />I agree
        to store this charger photo and precise on-site GPS location privately
        with ChargeNeighbour and Supabase for review. I have permission to share
        the image and have avoided faces, number plates and private documents.
      </label>
      <button
        type="button"
        className="button outline"
        disabled={!file || busy}
        onClick={() => void upload()}
      >
        {busy
          ? "Capturing GPS & uploading…"
          : saved
            ? "Refresh GPS & upload again"
            : "Capture GPS & upload photo"}
      </button>
      {message && <p role="status">{message}</p>}
    </div>
  );
}
