import { describe, expect, it, mock } from "bun:test";
import { createEasySQLClient } from "../src/client";

const baseUrl = "https://api.example.com";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function mockFetch(body: unknown, status = 200) {
  return mock(() =>
    Promise.resolve(new Response(JSON.stringify(body), { status })),
  );
}

function lastFetchArgs(fetchMock: ReturnType<typeof mockFetch>) {
  const call = fetchMock.mock.calls.at(-1) as [Request];
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

    expect(lastFetchArgs(f).headers.get("Authorization")).toBe(
      "Bearer token-abc",
    );
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

    await client.login({ email: "a@b.com", password: "s3cret" });

    const req = lastFetchArgs(f);
    const body = await req.text();
    expect(JSON.parse(body)).toEqual({
      email: "a@b.com",
      password: "s3cret",
    });
  });

  it("sets Content-Type to application/json", async () => {
    const f = mockFetch({});
    const client = createEasySQLClient({ baseUrl, fetch: f });

    await client.login({ email: "a@b.com", password: "s3cret" });

    expect(lastFetchArgs(f).headers.get("Content-Type")).toBe(
      "application/json",
    );
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

    expect(lastFetchArgs(f).url).toBe(
      "https://api.example.com/v1/queries/q-42",
    );
  });
});

/* ------------------------------------------------------------------ */
/*  Query parameters                                                   */
/* ------------------------------------------------------------------ */

describe("Query parameters", () => {
  it("appends query string to the URL", async () => {
    const f = mockFetch({});
    const client = createEasySQLClient({ baseUrl, fetch: f });

    await client.listQueries({ page: 2, per_page: 10 });

    const url = new URL(lastFetchArgs(f).url);
    expect(url.searchParams.get("page")).toBe("2");
    expect(url.searchParams.get("per_page")).toBe("10");
  });
});

/* ------------------------------------------------------------------ */
/*  Response parsing                                                   */
/* ------------------------------------------------------------------ */

describe("Response parsing", () => {
  it("returns data on success", async () => {
    const f = mockFetch({ access_token: "t", refresh_token: "r" });
    const client = createEasySQLClient({ baseUrl, fetch: f });

    const { data, error } = await client.login({
      email: "a@b.com",
      password: "s3cret",
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
    expect(typeof client.login).toBe("function");
    expect(typeof client.register).toBe("function");
    expect(typeof client.refresh).toBe("function");
    expect(typeof client.me).toBe("function");
    expect(typeof client.updateMe).toBe("function");
    expect(typeof client.deleteMe).toBe("function");
    expect(typeof client.changePassword).toBe("function");
  });

  it("exposes all expected connector methods", () => {
    const client = createEasySQLClient({ baseUrl, fetch: f });
    expect(typeof client.listConnectors).toBe("function");
    expect(typeof client.createConnector).toBe("function");
    expect(typeof client.testConnector).toBe("function");
    expect(typeof client.getConnector).toBe("function");
    expect(typeof client.updateConnector).toBe("function");
    expect(typeof client.deleteConnector).toBe("function");
    expect(typeof client.syncConnector).toBe("function");
  });
});
