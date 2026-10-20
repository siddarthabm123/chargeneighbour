import { serviceClient, serviceRest } from "../../../../db/server";
import { evidenceBucket } from "../../../lib/host-evidence";
import { failure, HttpError, uuid } from "../../../lib/http";
import { protect } from "../../../lib/rate-limit";
import { siteUrl } from "../../../lib/settings";
import { canPublishHostPhoto } from "../../../lib/stations";

export async function GET(request: Request) {
  try {
    const id = new URL(request.url).searchParams.get("id");
    if (!uuid(id)) throw new HttpError(400, "Invalid photo.");
    await protect(request, "public-host-photo", 60, 600);
    const photoUrl = `${new URL(siteUrl()).origin}/api/hosts/photo?id=${id}`;
    const listings = await (
      await serviceRest(
        `host_chargers?status=eq.approved&photos=cs.${encodeURIComponent(JSON.stringify([photoUrl]))}&select=id,application_id,status&limit=1`,
      )
    ).json();
    if (!listings.length) throw new HttpError(404, "Photo unavailable.");
    const applications = await (
      await serviceRest(
        `marketplace_requests?kind=eq.host&status=neq.cancelled&payload->>evidenceId=eq.${id}&select=id,payload,user_id,status&limit=1`,
      )
    ).json();
    if (
      applications[0]?.payload.publicPhotoConsent !== true ||
      listings[0].application_id !== applications[0]?.id
    )
      throw new HttpError(404, "Photo unavailable.");
    const rows = await (
      await serviceRest(
        `host_evidence?id=eq.${id}&select=id,user_id,object_path&limit=1`,
      )
    ).json();
    if (!rows[0] || !canPublishHostPhoto(listings[0], applications[0], rows[0]))
      throw new HttpError(404, "Photo unavailable.");
    const { data, error } = await serviceClient()
      .storage.from(evidenceBucket)
      .download(rows[0].object_path);
    if (error || !data) throw Error("Photo download unavailable");
    return new Response(data, {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return failure(error, "hosts.photo");
  }
}
