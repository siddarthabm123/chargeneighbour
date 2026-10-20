import "server-only";
import { serviceClient, serviceRest } from "./server";
import { evidenceBucket } from "../app/lib/host-evidence";
export async function cleanupEvidence() {
  const before = new Date(Date.now() - 2 * 86400000).toISOString();
  const rows = await (
    await serviceRest(
      `host_evidence?created_at=lt.${before}&order=created_at.asc&limit=100`,
    )
  ).json();
  for (const row of rows) {
    const applications = await (
      await serviceRest(
        `marketplace_requests?kind=eq.host&payload->>evidenceId=eq.${row.id}&select=id&limit=1`,
      )
    ).json();
    if (applications.length) continue;
    const removed = await serviceClient()
      .storage.from(evidenceBucket)
      .remove([row.object_path]);
    if (removed.error) throw Error("Private evidence cleanup failed");
    await serviceRest(`host_evidence?id=eq.${row.id}`, { method: "DELETE" });
  }
}
