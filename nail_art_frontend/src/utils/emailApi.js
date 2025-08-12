/**
 * Lightweight wrapper for email notification endpoints.
 * These calls go to a local Node server (server/index.js) via CRA proxy during development.
 * In production, deploy the server separately and set the correct base URL if needed.
 */

const BASE = ""; // with CRA proxy, empty base maps to http://localhost:4000

// PUBLIC_INTERFACE
export async function notifyNewBooking(booking) {
  /** Sends an admin notification about a new booking. Returns { ok: boolean } */
  try {
    const res = await fetch(`${BASE}/api/notify-new-booking`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(booking),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      // eslint-disable-next-line no-console
      console.warn("[emailApi] notify-new-booking failed:", data);
      return { ok: false, error: data?.error || "Request failed" };
    }
    return res.json();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("[emailApi] notify-new-booking error:", err?.message || err);
    return { ok: false, error: err?.message || "Network error" };
  }
}

// PUBLIC_INTERFACE
export async function notifyStatusChange(payload) {
  /** Sends a status change email to the customer. Returns { ok: boolean } */
  try {
    const res = await fetch(`${BASE}/api/notify-status-change`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      // eslint-disable-next-line no-console
      console.warn("[emailApi] notify-status-change failed:", data);
      return { ok: false, error: data?.error || "Request failed" };
    }
    return res.json();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("[emailApi] notify-status-change error:", err?.message || err);
    return { ok: false, error: err?.message || "Network error" };
  }
}
