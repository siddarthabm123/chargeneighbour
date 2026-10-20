import { rpc, serviceRest } from "../../../../db/server";
import { boundedText, failure, HttpError, json } from "../../../lib/http";
import { validWebhook } from "../../../lib/payment-security";
export async function POST(request: Request) {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret) throw new HttpError(503, "Webhook is not configured.");
    const raw = await boundedText(request, 64000),
      signature = request.headers.get("x-razorpay-signature") || "";
    if (!validWebhook(raw, signature, secret))
      throw new HttpError(401, "Invalid webhook signature.");
    const eventId = request.headers.get("x-razorpay-event-id");
    if (!eventId || !/^[A-Za-z0-9_-]{1,120}$/.test(eventId))
      throw new HttpError(400, "Invalid event ID.");
    let event;
    try {
      event = JSON.parse(raw);
    } catch {
      throw new HttpError(400, "Invalid payload.");
    }
    if (!["payment.captured", "refund.processed"].includes(event.event))
      return json({ received: true });
    let order: string, payment: string, amount: number, currency: string;
    if (event.event === "payment.captured") {
      const p = event.payload?.payment?.entity;
      if (!p || p.status !== "captured")
        throw new HttpError(400, "Invalid payment event.");
      order = p.order_id;
      payment = p.id;
      amount = p.amount;
      currency = p.currency;
    } else {
      const r = event.payload?.refund?.entity;
      if (
        !r ||
        r.status !== "processed" ||
        typeof r.payment_id !== "string" ||
        !/^pay_[A-Za-z0-9]+$/.test(r.payment_id)
      )
        throw new HttpError(400, "Invalid refund event.");
      payment = r.payment_id;
      amount = r.amount;
      currency = r.currency;
      const bookings = await (
        await serviceRest(
          `reservations?payment_id=eq.${payment}&select=order_id`,
        )
      ).json();
      order = bookings[0]?.order_id;
    }
    if (
      typeof order !== "string" ||
      !/^order_[A-Za-z0-9]+$/.test(order) ||
      typeof payment !== "string" ||
      !/^pay_[A-Za-z0-9]+$/.test(payment) ||
      !Number.isInteger(amount) ||
      amount < 1 ||
      currency !== "INR"
    )
      throw new HttpError(400, "Invalid payment fields.");
    await rpc("record_payment", {
      p_event: eventId,
      p_order: order,
      p_payment: payment,
      p_amount: amount,
      p_currency: currency,
      p_refund: event.event === "refund.processed",
    });
    return json({ received: true });
  } catch (error) {
    return failure(error, "payment.webhook");
  }
}
