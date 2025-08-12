"use strict";

/**
 * Email notification server for Bright Nails Studio.
 *
 * Routes:
 * - POST /api/notify-new-booking
 *   Body: { name, email, mobile, requested_time, service_type, notes }
 *   Sends notification to admin email.
 *
 * - POST /api/notify-status-change
 *   Body: { id, status, admin_notes, customer_email, name, requested_time, service_type }
 *   Sends status update to the customer email.
 *
 * Environment (set in .env, NOT exposed to frontend):
 * - SMTP_HOST=smtp.gmail.com
 * - SMTP_PORT=465
 * - SMTP_USER=your@gmail.com
 * - SMTP_PASS=your_app_password   (Gmail App Password recommended)
 * - ADMIN_EMAIL=notify_to_admin@example.com
 * - SITE_URL=https://your-site-url
 * - PORT=4000 (optional)
 */

const express = require("express");
const cors = require("cors");
const nodemailer = require("nodemailer");
const bodyParser = require("body-parser");
require("dotenv").config();

const {
  SMTP_HOST = "smtp.gmail.com",
  SMTP_PORT = "465",
  SMTP_USER,
  SMTP_PASS,
  ADMIN_EMAIL,
  SITE_URL = "http://localhost:3000",
} = process.env;

const PORT = process.env.PORT || 4000;

if (!SMTP_USER || !SMTP_PASS) {
  // eslint-disable-next-line no-console
  console.warn(
    "[email-server] Missing SMTP_USER or SMTP_PASS. Email routes will respond with 500 until configured."
  );
}

const app = express();
app.use(cors());
app.use(bodyParser.json());

/**
 * Create transport lazily to avoid creating if not configured.
 */
function getTransport() {
  if (!SMTP_USER || !SMTP_PASS) return null;
  const portNum = Number(SMTP_PORT) || 465;
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: portNum,
    secure: portNum === 465, // true for 465, false for 587 (STARTTLS)
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });
}

/**
 * Utility to format a human friendly local datetime string.
 */
function prettyWhen(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso || "";
  }
}

app.get("/healthz", (req, res) => {
  res.json({ ok: true, service: "email-server", hasSMTP: !!(SMTP_USER && SMTP_PASS) });
});

// PUBLIC_INTERFACE
app.post("/api/notify-new-booking", async (req, res) => {
  /**
   * Sends an email to the admin when a new booking is created.
   * Body: { name, email, mobile, requested_time, service_type, notes }
   * Returns: 200 JSON { ok: true } on success
   */
  try {
    const { name, email, mobile, requested_time, service_type, notes } = req.body || {};
    if (!ADMIN_EMAIL && !SMTP_USER) {
      return res.status(500).json({ ok: false, error: "Admin email not configured" });
    }
    if (!name || !email || !requested_time || !service_type) {
      return res.status(400).json({ ok: false, error: "Missing required fields" });
    }

    const transporter = getTransport();
    if (!transporter) {
      return res.status(500).json({ ok: false, error: "SMTP not configured" });
    }

    const to = ADMIN_EMAIL || SMTP_USER;
    const subject = `[New Booking] ${name} • ${service_type} • ${prettyWhen(requested_time)}`;
    const text = [
      `New booking request received:`,
      `Name: ${name}`,
      `Email: ${email}`,
      `Mobile: ${mobile || "-"}`,
      `Service: ${service_type}`,
      `When: ${prettyWhen(requested_time)} (${requested_time})`,
      `Notes: ${notes || "-"}`,
      `—`,
      `Open Admin Dashboard: ${SITE_URL.replace(/\/$/, "")}/admin`,
    ].join("\n");

    const html = `
      <h2>New booking request received</h2>
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Mobile:</strong> ${mobile || "-"}</p>
      <p><strong>Service:</strong> ${service_type}</p>
      <p><strong>When:</strong> ${prettyWhen(requested_time)} (${requested_time})</p>
      ${notes ? `<p><strong>Notes:</strong> ${String(notes).replace(/\n/g, "<br/>")}</p>` : ""}
      <hr/>
      <p><a href="${SITE_URL.replace(/\/$/, "")}/admin">Open Admin Dashboard</a></p>
    `;

    await transporter.sendMail({
      from: `"Bright Nails Studio" <${SMTP_USER}>`,
      to,
      subject,
      text,
      html,
      replyTo: email, // allows quick reply to the requester
    });

    return res.json({ ok: true });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[notify-new-booking] error:", err);
    return res.status(500).json({ ok: false, error: "Failed to send notification" });
  }
});

// PUBLIC_INTERFACE
app.post("/api/notify-status-change", async (req, res) => {
  /**
   * Sends an email to the customer when a booking status changes.
   * Body: { id, status, admin_notes, customer_email, name, requested_time, service_type }
   * Returns: 200 JSON { ok: true } on success
   */
  try {
    const { id, status, admin_notes, customer_email, name, requested_time, service_type } =
      req.body || {};

    if (!customer_email) {
      return res.status(400).json({ ok: false, error: "Missing customer_email" });
    }
    if (!status || !["pending", "approved", "rejected"].includes(String(status))) {
      return res.status(400).json({ ok: false, error: "Invalid or missing status" });
    }

    const transporter = getTransport();
    if (!transporter) {
      return res.status(500).json({ ok: false, error: "SMTP not configured" });
    }

    const subject = `[Booking ${status}] ${service_type || "Service"} • ${prettyWhen(
      requested_time
    )}`;
    const statusLine =
      status === "approved"
        ? "Great news! Your booking has been approved."
        : status === "rejected"
        ? "We’re sorry — your booking could not be accommodated this time."
        : "Your booking status is now pending.";

    const text = [
      `Hi ${name || "there"},`,
      ``,
      statusLine,
      `Service: ${service_type || "-"}`,
      `When: ${prettyWhen(requested_time)} (${requested_time || "-"})`,
      admin_notes ? `Note from us: ${admin_notes}` : null,
      `—`,
      `Bright Nails Studio`,
    ]
      .filter(Boolean)
      .join("\n");

    const html = `
      <p>Hi ${name || "there"},</p>
      <p>${statusLine}</p>
      <ul>
        <li><strong>Service:</strong> ${service_type || "-"}</li>
        <li><strong>When:</strong> ${prettyWhen(requested_time)} (${requested_time || "-"})</li>
      </ul>
      ${admin_notes ? `<p><strong>Note from us:</strong> ${String(admin_notes).replace(/\n/g, "<br/>")}</p>` : ""}
      <p>—<br/>Bright Nails Studio</p>
    `;

    await transporter.sendMail({
      from: `"Bright Nails Studio" <${SMTP_USER}>`,
      to: customer_email,
      subject,
      text,
      html,
    });

    return res.json({ ok: true });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[notify-status-change] error:", err);
    return res.status(500).json({ ok: false, error: "Failed to send status email" });
  }
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[email-server] Listening on http://localhost:${PORT}`);
});
