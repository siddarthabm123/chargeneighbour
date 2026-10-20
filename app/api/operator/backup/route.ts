import { getCurrentUser } from "../../../auth/server";
import { rpc } from "../../../../db/server";
import {
  encryptSnapshot,
  type PilotSnapshot,
} from "../../../lib/backup-security";
import {
  failure,
  HttpError,
  readJson,
  sameOrigin,
  textField,
} from "../../../lib/http";
import { protect } from "../../../lib/rate-limit";
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new HttpError(401, "Sign in.");
    if (!user.isOperator)
      throw new HttpError(403, "Operator access is required.");
    sameOrigin(request);
    await protect(request, `backup:${user.id}`, 3, 3600);
    const b = await readJson(request, 600),
      passphrase = textField(b.passphrase, 20, 200);
    const snapshot = await rpc<PilotSnapshot>("export_pilot_snapshot", {});
    const encrypted = encryptSnapshot(snapshot, passphrase);
    return new Response(JSON.stringify(encrypted), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="chargeneighbour-backup-${new Date().toISOString().slice(0, 10)}.json"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return failure(error, "backup.export");
  }
}
