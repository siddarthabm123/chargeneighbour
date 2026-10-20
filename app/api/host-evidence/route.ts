import { prepareChargerPhoto } from "../../lib/host-photo.mjs";
import { getCurrentUser } from "../../auth/server";
import { serviceClient, serviceRest } from "../../../db/server";
import {
  boundedBytes,
  failure,
  HttpError,
  json,
  sameOrigin,
  uuid,
} from "../../lib/http";
import { protect } from "../../lib/rate-limit";
import { evidenceBucket, validEvidencePosition } from "../../lib/host-evidence";
export async function POST(request: Request) {
  let path: string | undefined;
  try {
    const user = await getCurrentUser();
    if (!user)
      throw new HttpError(401, "Sign in before uploading charger evidence.");
    sameOrigin(request);
    await protect(request, `host-photo:${user.id}`, 4, 3600);
    const contentType = request.headers.get("content-type") || "";
    if (!contentType.startsWith("multipart/form-data;"))
      throw new HttpError(415, "Upload a photo with the form.");
    const bytes = await boundedBytes(request, 3300000);
    const form = await new Response(bytes, {
      headers: { "Content-Type": contentType },
    }).formData();
    const file = form.get("photo"),
      point = {
        latitude: Number(form.get("latitude")),
        longitude: Number(form.get("longitude")),
      },
      accuracy = Number(form.get("accuracy")),
      capturedAt = form.get("capturedAt");
    if (
      !["latitude", "longitude", "accuracy"].every(
        (k) =>
          typeof form.get(k) === "string" && String(form.get(k)).trim() !== "",
      )
    )
      throw new HttpError(
        400,
        "Capture your on-site GPS location before uploading.",
      );
    if (
      form.get("consent") !== "yes" ||
      !validEvidencePosition(point, accuracy, capturedAt)
    )
      throw new HttpError(
        400,
        "Capture a fresh on-site GPS location with accuracy within 100 m and agree to the private evidence review.",
      );
    if (!(file instanceof File) || !file.size || file.size > 3000000)
      throw new HttpError(400, "Add one JPEG, PNG or WebP photo under 3 MB.");
    const input = Buffer.from(await file.arrayBuffer());
    let photo: Buffer;
    try {
      photo = await prepareChargerPhoto(input);
    } catch {
      throw new HttpError(
        400,
        "This is not a supported still photo. Choose a JPEG, PNG or WebP image.",
      );
    }
    const id = crypto.randomUUID();
    path = `${user.id}/${id}.jpg`;
    const uploaded = await serviceClient()
      .storage.from(evidenceBucket)
      .upload(path, photo, {
        contentType: "image/jpeg",
        upsert: false,
        cacheControl: "300",
      });
    if (uploaded.error) throw Error("Private upload failed");
    await serviceRest("host_evidence", {
      method: "POST",
      body: JSON.stringify({
        id,
        user_id: user.id,
        object_path: path,
        ...point,
        accuracy_m: accuracy,
        captured_at: capturedAt,
        consent: true,
        byte_count: photo.length,
      }),
    });
    path = undefined;
    return json(
      {
        id,
        accuracy,
        reviewStatus: "pending",
        message:
          "Photo and GPS saved privately for manual review. This is not charger verification.",
      },
      201,
    );
  } catch (error) {
    if (path) {
      try {
        await serviceClient().storage.from(evidenceBucket).remove([path]);
      } catch {}
    }
    return failure(error, "host.evidence.upload");
  }
}
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new HttpError(401, "Sign in.");
    const id = new URL(request.url).searchParams.get("id");
    if (!uuid(id)) throw new HttpError(400, "Invalid evidence.");
    const rows = await (
      await serviceRest(
        `host_evidence?id=eq.${id}${user.isOperator ? "" : `&user_id=eq.${user.id}`}&limit=1`,
      )
    ).json();
    const evidence = rows[0];
    if (!evidence) throw new HttpError(404, "Evidence not found.");
    const result = await serviceClient()
      .storage.from(evidenceBucket)
      .createSignedUrl(evidence.object_path, 300);
    if (result.error) throw Error("Private photo unavailable");
    return json({
      photo: result.data.signedUrl,
      latitude: evidence.latitude,
      longitude: evidence.longitude,
      accuracy: evidence.accuracy_m,
      capturedAt: evidence.captured_at,
      reviewStatus: "pending",
    });
  } catch (error) {
    return failure(error, "host.evidence.read");
  }
}
