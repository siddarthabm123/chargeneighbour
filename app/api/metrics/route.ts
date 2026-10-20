import { rpc } from "../../../db/server";
import { failure, HttpError, json, readJson, sameOrigin } from "../../lib/http";
import { protect } from "../../lib/rate-limit";
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    if (
      !/(?:^|;\s*)cn_analytics=yes(?:;|$)/.test(
        request.headers.get("cookie") || "",
      )
    )
      return json({ recorded: false });
    await protect(request, "metrics", 10, 600);
    const body = await readJson(request, 200);
    if (
      body.event !== "visit" ||
      !/^[a-z0-9_-]{1,64}$/.test(String(body.source))
    )
      throw new HttpError(400, "Invalid metric.");
    await rpc("count_funnel", { p_event: body.event, p_source: body.source });
    return json({ recorded: true });
  } catch (error) {
    return failure(error, "metrics.record");
  }
}
