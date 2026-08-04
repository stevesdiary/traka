import crypto from "node:crypto";

const secret = process.env.TRAKA_WEBHOOK_SECRET; // whsec_...

function verifySignature(req) {
  const signature = req.headers["x-traka-signature"];
  const timestamp = req.headers["x-traka-timestamp"];
  if (!signature || !timestamp) return false;

  // Optional: reject replays older than 5 minutes
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;

  const body = JSON.stringify(req.body); // MUST match the raw received body
  const expected = `sha256=${crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex")}`;

  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}
