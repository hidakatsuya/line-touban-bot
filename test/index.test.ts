import crypto from "node:crypto";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import index, { Env } from "../src/index";

const server = setupServer();
const env: Env = {
  LINE_CHANNEL_SECRET: "channelSecret",
  LINE_CHANNEL_ACCESS_TOKEN: "accessToken",
  FAMILY_GROUP_ID: "groupId",
  TOUBAN_NAME: "Touban",
  TOUBAN_DESCRIPTION: "Touban description",
  TOUBAN_MEMBERS: "John Doe,Jane Smith,Alice Johnson",
};
const ctx: ExecutionContext = {
  waitUntil: vi.fn(),
  passThroughOnException: vi.fn(),
};

beforeEach(() => {
  server.listen();
});

afterEach(() => {
  server.resetHandlers();
  server.close();
});

describe("fetch", () => {
  test("returns 403 when the request is not valid", async () => {
    const request = new Request("https://example.com", {
      method: "GET",
    });
    const response = await index.fetch(request, env, ctx);
    expect(response.status).toBe(403);
  });

  test("returns 200 when the request is valid", async () => {
    const body = {
      events: [
        {
          mode: "active",
          type: "message",
          source: {
            type: "group",
            groupId: "allowedGroupId",
          },
        },
      ],
    };
    const signature = crypto
      .createHmac("SHA256", env.LINE_CHANNEL_SECRET)
      .update(JSON.stringify(body))
      .digest("base64")
      .toString();

    const request = new Request("https://example.com", {
      method: "POST",
      headers: {
        "x-line-signature": signature,
      },
      body: JSON.stringify(body),
    });

    const replyHandler = http.post(
      "https://api.line.me/v2/bot/message/reply",
      () => {
        return HttpResponse.json({}, { status: 200 });
      },
    );
    server.use(replyHandler);
    server.events.on("request:unhandled", ({ request }) => {
      throw new Error(`Unhandled request: ${request.url}`);
    });

    const response = await index.fetch(request, env, ctx);
    expect(response.status).toBe(200);
  });
});
