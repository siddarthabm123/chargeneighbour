import { getCurrentUser } from "../../../auth/server";
import { serviceRest } from "../../../../db/server";
import {
  failure,
  HttpError,
  json,
  readJson,
  sameOrigin,
  uuid,
} from "../../../lib/http";
import { protect } from "../../../lib/rate-limit";
import { commercialReady } from "../../../lib/settings";
import type { Reservation } from "../../../lib/reservations";
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new HttpError(401, "Please sign in.");
    sameOrigin(request);
    if (!commercialReady())
      throw new HttpError(409, "Commercial payments are not active.");
    await protect(request, `payment:${user.id}`, 10, 3600);
    const b = await readJson(request, 200);
    if (!uuid(b.id)) throw new HttpError(400, "Invalid session.");
    const rows = (await (
      await serviceRest(
        `reservations?id=eq.${b.id}&driver_id=eq.${encodeURIComponent(user.userId)}&status=eq.completed`,
      )
    ).json()) as Reservation[];
    const booking = rows[0];
    if (!booking) throw new HttpError(404, "Completed session not found.");
    if (
      booking.payment_status === "paid" ||
      booking.payment_status === "refunded" ||
      booking.payment_status === "refund_requested"
    )
      throw new HttpError(409, "This session does not need a new payment.");
    if (!booking.amount_paise || booking.amount_paise < 100)
      throw new HttpError(409, "Ask support to review this session amount.");
    let orderId = booking.order_id;
    if (!orderId) {
      const attempt = crypto.randomUUID();
      const claimed = await (
        await serviceRest(
          `reservations?id=eq.${booking.id}&payment_status=eq.unpaid&order_id=is.null`,
          {
            method: "PATCH",
            headers: { Prefer: "return=representation" },
            body: JSON.stringify({
              payment_status: "creating",
              payment_attempt: attempt,
            }),
          },
        )
      ).json();
      if (!claimed.length)
        throw new HttpError(
          409,
          "Payment preparation is already in progress. Refresh shortly or contact support.",
        );
      const upstream = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString("base64")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: booking.amount_paise,
          currency: "INR",
          receipt: booking.id,
          notes: { booking_id: booking.id },
        }),
        signal: AbortSignal.timeout(15000),
        cache: "no-store",
      });
      // An ambiguous provider failure is deliberately not retried automatically: reconcile first.
      if (!upstream.ok)
        throw new HttpError(
          502,
          "Payment preparation needs review. Contact support with your session ID; do not retry a new charge.",
        );
      const order = (await upstream.json()) as {
        id?: string;
        amount?: number;
        currency?: string;
      };
      if (
        !order.id?.startsWith("order_") ||
        order.amount !== booking.amount_paise ||
        order.currency !== "INR"
      )
        throw Error("Invalid provider order");
      await serviceRest(
        `reservations?id=eq.${booking.id}&payment_attempt=eq.${attempt}&payment_status=eq.creating`,
        {
          method: "PATCH",
          body: JSON.stringify({
            order_id: order.id,
            payment_status: "pending",
          }),
        },
      );
      orderId = order.id;
    }
    return json({
      orderId,
      keyId: process.env.RAZORPAY_KEY_ID,
      amount: booking.amount_paise,
      currency: "INR",
    });
  } catch (error) {
    return failure(error, "payment.order");
  }
}
