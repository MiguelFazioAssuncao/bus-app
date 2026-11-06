import assert from "node:assert/strict";
import test from "node:test";

process.env.NODE_ENV = "test";

const { isAllowedOrigin } = await import("../src/server.js");
const { parsePreferenceLocation } = await import(
  "../src/controllers/directionsController.js"
);

test("isAllowedOrigin allows configured origins, vercel previews, and localhost", () => {
  const configured = "https://bus-app-neon.vercel.app/";
  assert.equal(
    isAllowedOrigin("https://bus-app-neon.vercel.app", configured),
    true,
  );
  assert.equal(
    isAllowedOrigin("https://bus-app-preview-123.vercel.app", configured),
    true,
  );
  assert.equal(isAllowedOrigin("http://localhost:5173", configured), true);
  assert.equal(
    isAllowedOrigin("https://malicious-example.com", configured),
    false,
  );
});

test("parsePreferenceLocation parses stored preference strings with coordinates and address", () => {
  const parsed = parsePreferenceLocation(
    "Trabalho - 4500m, 15min | -23.5505,-46.6333 | Praça da Sé",
    "work",
  );
  assert.equal(parsed.name, "Trabalho");
  assert.equal(parsed.lat, -23.5505);
  assert.equal(parsed.lng, -46.6333);
  assert.equal(parsed.address, "Praça da Sé");
  assert.equal(parsed.distance, "4.50 km");
  assert.equal(parsed.time, "15 min");
});
