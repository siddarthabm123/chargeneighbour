import "server-only";
export const siteUrl = () =>
  process.env.APP_URL || "https://chargeneighbour-theta.vercel.app";
export function operatorDetails() {
  return {
    name: process.env.BUSINESS_NAME || "",
    email: process.env.SUPPORT_EMAIL || "",
    pilot: process.env.PILOT_AREA || "",
  };
}
export function commercialReady() {
  const business = operatorDetails();
  return (
    process.env.COMMERCIAL_LAUNCH_APPROVED === "true" &&
    !!business.name &&
    !!business.email &&
    !!process.env.RAZORPAY_KEY_ID?.startsWith("rzp_live_") &&
    !!process.env.RAZORPAY_KEY_SECRET &&
    !!process.env.RAZORPAY_WEBHOOK_SECRET
  );
}
