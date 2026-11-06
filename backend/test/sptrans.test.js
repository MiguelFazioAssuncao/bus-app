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

test("accepts a textual true response from SPTrans", async () => {
  const payload = { hr: "16:20", l: [] };
  const service = createSptransService({ ...options, client: {
    post: async () => ({ data: " true\n", status: 200, headers: { "set-cookie": "apiCredentials=session; Path=/" } }),
    get: async () => ({ data: payload, status: 200 }),
  } });
  assert.equal(await service.getPositions(), payload);
});

test("rejects textual false authentication without requesting positions", async () => {
  let queried = false;
  const service = createSptransService({ ...options, client: {
    post: async () => ({ data: "false", status: 200, headers: {} }),
    get: async () => { queried = true; },
  } });
  await assert.rejects(service.getPositions(), (error) => {
    assert.equal(error.code, "SPTRANS_AUTH_REJECTED");
    assert.equal(error.authResponseType, "string");
    assert.equal(error.authResponseResult, false);
    return true;
  });
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

test("reuses session cookie and caches positions snapshot when configured", async () => {
  let authCalls = 0;
  let getCalls = 0;
  const payload = { hr: "16:25", l: [{ c: "2013-10", cl: 33667, vs: [] }] };
  const service = createSptransService({
    ...options,
    cacheTtlMs: 5000,
    sessionTtlMs: 5000,
    client: {
      post: async () => {
        authCalls += 1;
        return { data: true, status: 200, headers: { "set-cookie": "apiCredentials=s1; Path=/" } };
      },
      get: async () => {
        getCalls += 1;
        return { data: payload, status: 200 };
      },
    },
  });

  const first = await service.getPositions();
  const second = await service.getPositions();
  assert.equal(first, payload);
  assert.equal(second, payload);
  assert.equal(authCalls, 1);
  assert.equal(getCalls, 1);
});

test("re-authenticates when cached session cookie receives 401", async () => {
  let authCalls = 0;
  let getCalls = 0;
  const payload = { hr: "16:30", l: [] };
  const service = createSptransService({
    ...options,
    sessionTtlMs: 60000,
    client: {
      post: async () => {
        authCalls += 1;
        return {
          data: true,
          status: 200,
          headers: { "set-cookie": `apiCredentials=s${authCalls}; Path=/` },
        };
      },
      get: async (_url, config) => {
        getCalls += 1;
        if (getCalls === 1) {
          throw Object.assign(new Error("Unauthorized"), { response: { status: 401 } });
        }
        assert.equal(config.headers.Cookie, "apiCredentials=s2");
        return { data: payload, status: 200 };
      },
    },
  });

  const result = await service.getPositions();
  assert.deepEqual(result, payload);
  assert.equal(authCalls, 2);
  assert.equal(getCalls, 2);
});

test("fetches line predictions and stops", async () => {
  const service = createSptransService({
    ...options,
    client: {
      post: async () => ({
        data: true,
        status: 200,
        headers: { "set-cookie": "apiCredentials=session; Path=/" },
      }),
      get: async (url) => {
        if (url.endsWith("/Previsao/Linha")) {
          return {
            data: {
              hr: "16:35",
              ps: [{ cp: 100, np: "PARADA CENTRAL", py: -23.55, px: -46.63, vs: [{ p: "11001", t: "16:38", a: true }] }],
            },
            status: 200,
          };
        }
        return {
          data: [{ cp: 100, np: "PARADA CENTRAL", ed: "AV PAULISTA", py: -23.55, px: -46.63 }],
          status: 200,
        };
      },
    },
  });

  const predictions = await service.getLinePredictions(33667);
  assert.equal(predictions.cl, 33667);
  assert.equal(predictions.ps.length, 1);
  assert.equal(predictions.stops.length, 1);
});
