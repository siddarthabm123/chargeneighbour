export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}
export const uuid = (value: unknown): value is string =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
export const json = (body: unknown, status = 200) =>
  Response.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
export function sameOrigin(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin)
    throw new HttpError(403, "This request must come from ChargeNeighbour.");
}
export async function boundedBytes(
  request: Pick<Request, "headers" | "body">,
  max: number,
) {
  if (Number(request.headers.get("content-length")) > max)
    throw new HttpError(413, "Request is too large.");
  const reader = request.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > max) {
        await reader.cancel();
        throw new HttpError(413, "Request is too large.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}
export async function boundedText(
  request: Pick<Request, "headers" | "body">,
  max: number,
) {
  const bytes = await boundedBytes(request, max);
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new HttpError(400, "Use valid UTF-8.");
  }
}
export async function readJson(
  request: Request,
  max = 6000,
): Promise<Record<string, unknown>> {
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    throw new HttpError(415, "Use a JSON request.");
  const raw = await boundedText(request, max);
  try {
    const value = JSON.parse(raw);
    if (!value || typeof value !== "object" || Array.isArray(value))
      throw Error();
    return value;
  } catch {
    throw new HttpError(400, "Invalid request.");
  }
}
export function textField(value: unknown, min: number, max: number) {
  if (
    typeof value !== "string" ||
    value.trim().length < min ||
    value.trim().length > max ||
    /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)
  )
    throw new HttpError(400, `Enter between ${min} and ${max} characters.`);
  return value.trim();
}
export function failure(error: unknown, operation: string) {
  if (error instanceof HttpError)
    return json({ error: error.message, message: error.message }, error.status);
  const reference = crypto.randomUUID();
  // Never log payloads, coordinates, cookies, credentials, emails or upstream error bodies.
  console.error(
    JSON.stringify({
      level: "error",
      operation,
      reference,
      at: new Date().toISOString(),
    }),
  );
  return json(
    {
      error: `Temporarily unavailable. Please retry. Reference: ${reference}`,
      message: `Temporarily unavailable. Reference: ${reference}`,
    },
    503,
  );
}
