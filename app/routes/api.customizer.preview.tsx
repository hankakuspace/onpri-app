// app/routes/api.customizer.preview.tsx
import { randomUUID } from "crypto";
import { getFirebaseStorageBucket } from "../lib/firebase.server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "no-store",
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

function parsePreviewDataUrl(previewDataUrl: unknown) {
  if (typeof previewDataUrl !== "string") {
    return null;
  }

  const match = previewDataUrl.match(/^data:image\/png;base64,([A-Za-z0-9+/=]+)$/);

  if (!match) {
    return null;
  }

  return Buffer.from(match[1], "base64");
}

export async function action({ request }: { request: Request }) {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const bucket = getFirebaseStorageBucket();

  if (!bucket) {
    return jsonResponse({ error: "Firebase Storage is not configured" }, 500);
  }

  let body: {
    previewDataUrl?: unknown;
    productId?: unknown;
    settingId?: unknown;
  };

  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const imageBuffer = parsePreviewDataUrl(body.previewDataUrl);

  if (!imageBuffer) {
    return jsonResponse({ error: "Invalid previewDataUrl" }, 400);
  }

  if (imageBuffer.length > 8 * 1024 * 1024) {
    return jsonResponse({ error: "Preview image is too large" }, 413);
  }

  const productId = typeof body.productId === "string" && body.productId ? body.productId : "unknown-product";
  const settingId = typeof body.settingId === "string" && body.settingId ? body.settingId : "unknown-setting";
  const token = randomUUID();
  const filePath = [
    "customizer-previews",
    productId.replace(/[^a-zA-Z0-9_-]/g, "-"),
    `${Date.now()}-${settingId.replace(/[^a-zA-Z0-9_-]/g, "-")}-${randomUUID()}.png`,
  ].join("/");

  const file = bucket.file(filePath);

  await file.save(imageBuffer, {
    resumable: false,
    metadata: {
      contentType: "image/png",
      cacheControl: "public, max-age=31536000",
      metadata: {
        firebaseStorageDownloadTokens: token,
      },
    },
  });

  const previewImageUrl =
    `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(bucket.name)}` +
    `/o/${encodeURIComponent(filePath)}?alt=media&token=${encodeURIComponent(token)}`;

  return jsonResponse({
    previewImageUrl,
    filePath,
  });
}

export async function loader() {
  return jsonResponse({ error: "Method not allowed" }, 405);
}
