import { describe, expect, it, type Mock, mock } from "bun:test";
import { createEasySQLClient } from "../src/client";

const baseUrl = "https://api.example.com";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

type FetchMock = Mock<() => Promise<Response>> & typeof fetch;

function mockFetch(body: unknown, status = 200): FetchMock {
  return mock(() =>
    Promise.resolve(new Response(JSON.stringify(body), { status })),
  ) as unknown as FetchMock;
}

function lastFetchArgs(fetchMock: FetchMock): Request {
  const call = fetchMock.mock.calls.at(-1) as unknown as [Request];
  return call[0];
}

/* ------------------------------------------------------------------ */
/*  Authorization                                                      */
/* ------------------------------------------------------------------ */

describe("Authorization header", () => {
  it("is added when accessToken is provided", async () => {
    const f = mockFetch({});
    const client = createEasySQLClient({
      baseUrl,
      accessToken: "token-abc",
      fetch: f,
    });
    await client.me();

    expect(lastFetchArgs(f).headers.get("Authorization")).toBe("Bearer token-abc");
  });

  it("is omitted when accessToken is not provided", async () => {
    const f = mockFetch({});
    const client = createEasySQLClient({ baseUrl, fetch: f });
    await client.me();

    expect(lastFetchArgs(f).headers.get("Authorization")).toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/*  Request body                                                       */
/* ------------------------------------------------------------------ */

describe("Request body", () => {
  it("serializes body as JSON", async () => {
    const f = mockFetch({});
    const client = createEasySQLClient({ baseUrl, fetch: f });

    await client.refresh({ refresh_token: "old-token" });

    const req = lastFetchArgs(f);
    const body = await req.text();
    expect(JSON.parse(body)).toEqual({
      refresh_token: "old-token",
    });
  });

  it("sets Content-Type to application/json", async () => {
    const f = mockFetch({});
    const client = createEasySQLClient({ baseUrl, fetch: f });

    await client.refresh({ refresh_token: "old-token" });

    expect(lastFetchArgs(f).headers.get("Content-Type")).toBe("application/json");
  });
});

/* ------------------------------------------------------------------ */
/*  Path parameters                                                    */
/* ------------------------------------------------------------------ */

describe("Path parameters", () => {
  it("interpolates path parameters into the URL", async () => {
    const f = mockFetch({});
    const client = createEasySQLClient({ baseUrl, fetch: f });

    await client.getQuery({ query_id: "q-42" });

    expect(lastFetchArgs(f).url).toBe("https://api.example.com/v1/queries/q-42");
  });
});

/* ------------------------------------------------------------------ */
/*  Query parameters                                                   */
/* ------------------------------------------------------------------ */

describe("Query parameters", () => {
  it("appends query string to the URL", async () => {
    const f = mockFetch({});
    const client = createEasySQLClient({ baseUrl, fetch: f });

    await client.listQueries({ limit: 10, cursor: "abc" });

    const url = new URL(lastFetchArgs(f).url);
    expect(url.searchParams.get("limit")).toBe("10");
    expect(url.searchParams.get("cursor")).toBe("abc");
  });
});

/* ------------------------------------------------------------------ */
/*  Response parsing                                                   */
/* ------------------------------------------------------------------ */

describe("Response parsing", () => {
  it("returns data on success", async () => {
    const f = mockFetch({ access_token: "t", refresh_token: "r" });
    const client = createEasySQLClient({ baseUrl, fetch: f });

    const { data, error } = await client.refresh({
      refresh_token: "old-token",
    });

    expect(error).toBeUndefined();
    expect(data).toEqual({ access_token: "t", refresh_token: "r" });
  });

  it("returns error on non-2xx response", async () => {
    const f = mockFetch({ detail: "Unauthorized" }, 401);
    const client = createEasySQLClient({ baseUrl, fetch: f });

    const { data, error } = await client.me();

    expect(data).toBeUndefined();
    expect(error).toBeDefined();
  });
});

/* ------------------------------------------------------------------ */
/*  Named methods exist                                                */
/* ------------------------------------------------------------------ */

describe("Named methods", () => {
  const f = mockFetch({});

  it("exposes all expected auth methods", () => {
    const client = createEasySQLClient({ baseUrl, fetch: f });
    expect(typeof client.refresh).toBe("function");
    expect(typeof client.me).toBe("function");
    expect(typeof client.updateMe).toBe("function");
    expect(typeof client.deleteMe).toBe("function");
    expect(typeof client.logout).toBe("function");
    expect(typeof client.oidcStart).toBe("function");
    expect(typeof client.oidcComplete).toBe("function");
  });

  it("exposes all expected connection methods", () => {
    const client = createEasySQLClient({ baseUrl, fetch: f });
    expect(typeof client.listConnections).toBe("function");
    expect(typeof client.createConnection).toBe("function");
    expect(typeof client.getConnection).toBe("function");
    expect(typeof client.updateConnection).toBe("function");
    expect(typeof client.deleteConnection).toBe("function");
    expect(typeof client.syncConnection).toBe("function");
  });
});
