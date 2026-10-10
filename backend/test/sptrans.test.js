import test from "node:test";
import assert from "node:assert/strict";
import { createSptransService } from "../src/services/sptrans.js";

const options = { token: " test-token ", baseURL: " https://example.invalid/v2.1/ " };

test("rejects false authentication instead of claiming success or requesting positions", async () => {
  let queried = false;
  const service = createSptransService({ ...options, client: {
    post: async () => ({ data: false, status: 200, headers: {} }),
    get: async () => { queried = true; },
  } });
  await assert.rejects(service.getPositions(), { code: "SPTRANS_AUTH_REJECTED", step: "authentication" });
  assert.equal(queried, false);
});

test("sends session cookies without Set-Cookie attributes and preserves actual position data", async () => {
  const payload = { hr: "16:20", l: [{ c: "8000", vs: [{ p: "123" }] }] };
  const service = createSptransService({ ...options, client: {
    post: async (url, body, config) => {
      assert.equal(url, "https://example.invalid/v2.1/Login/Autenticar");
      assert.equal(config.params.token, "test-token");
      return { data: true, status: 200, headers: { "set-cookie": ["apiCredentials=session; Path=/; HttpOnly; Secure", "route=node1; SameSite=Lax"] } };
    },
    get: async (url, config) => {
      assert.equal(url, "https://example.invalid/v2.1/Posicao");
      assert.equal(config.headers.Cookie, "apiCredentials=session; route=node1");
      return { data: payload, status: 200 };
    },
  } });
  assert.equal(await service.getPositions(), payload);
});

test("requires session cookie even when authentication returns true", async () => {
  const service = createSptransService({ ...options, client: {
    post: async () => ({ data: true, status: 200, headers: {} }),
  } });
  await assert.rejects(service.authenticate(), { code: "SPTRANS_SESSION_MISSING" });
});

test("does not expose credentials from upstream request errors", async () => {
  const error = Object.assign(new Error("token=secret-token"), {
    response: { status: 403 }, config: { url: "https://example.invalid?token=secret-token" },
  });
  const service = createSptransService({ ...options, client: { post: async () => { throw error; } } });
  await assert.rejects(service.authenticate(), (result) => {
    assert.equal(result.code, "SPTRANS_UPSTREAM_ERROR");
    assert.equal(result.upstreamStatus, 403);
    assert.equal(JSON.stringify(result).includes("secret-token"), false);
    assert.equal(result.message.includes("secret-token"), false);
    return true;
  });
});

test("supports a valid empty position snapshot", async () => {
  const service = createSptransService({ ...options, client: {
    post: async () => ({ data: true, status: 200, headers: { "set-cookie": "apiCredentials=session; Path=/" } }),
    get: async () => ({ data: { hr: "16:20", l: [] }, status: 200 }),
  } });
  assert.deepEqual(await service.getPositions(), { hr: "16:20", l: [] });
});
