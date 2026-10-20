export type Reservation = {
  id: string;
  charger_id: string;
  driver_id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  hold_until: string;
  rate_paise_kwh: number;
  start_meter?: number;
  end_meter?: number;
  energy_kwh?: number;
  amount_paise?: number;
  commission_paise?: number;
  payment_status: string;
  order_id?: string;
  payment_id?: string;
  payment_attempt?: string;
};
export type HostCharger = {
  id: string;
  name: string;
  area: string;
  latitude: number;
  longitude: number;
  power_kw: number;
  price_paise_kwh: number;
  access_notes: string;
  photos: string[];
  status: string;
  verified_at?: string;
  owner_id?: string;
  review_checks?: string[];
};
export const rupees = (paise: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(paise / 100);
export const localTime = (value: string) =>
  new Date(value).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "short",
  });
export function istToIso(value: unknown) {
  if (typeof value !== "string" || !/^\d{4}-\d\d-\d\dT\d\d:\d\d$/.test(value))
    throw Error("Enter a valid date and time.");
  const time = new Date(`${value}:00+05:30`);
  if (!Number.isFinite(time.getTime())) throw Error("Invalid time.");
  return time.toISOString();
}
