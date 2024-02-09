import crypto from "node:crypto";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  test,
} from "vitest";
import { LineClient, LineMember, parseLineWebhookRequest } from "../src/line";

describe("LineMember", () => {
  test("name", () => {
    const member = new LineMember("John Doe");
    expect(member.name).toBe("John Doe");
  });
});

describe("LineClient", () => {
  const server = setupServer();

  beforeEach(() => {
    server.listen();
  });

  afterEach(() => {
    server.resetHandlers();
    server.events.removeAllListeners();
  });

  afterAll(() => {
    server.close();
  });

  test("reply", async () => {
    const handler = http.post(
      "https://api.line.me/v2/bot/message/reply",
      () => {
        return HttpResponse.json({}, { status: 200 });
      },
    );

    server.use(handler);
    server.events
      .on("request:match", async ({ request }) => {
        expect(JSON.parse(await request.text())).toEqual(
          expect.objectContaining({
            replyToken: "REPLY_TOKEN",
            messages: [
              {
                type: "text",
                text: "Hello",
              },
            ],
          }),
        );
      })
      .on("request:unhandled", ({ request }) => {
        throw new Error(`Unhandled request: ${request.url}`);
      });

    const client = new LineClient("YOUR_ACCESS_TOKEN");
    await client.reply("Hello", "REPLY_TOKEN");
  });

  test("reply with invalid response", async () => {
    const handler = http.post(
      "https://api.line.me/v2/bot/message/reply",
      () => {
        return HttpResponse.text("Forbidden", { status: 403 });
      },
    );

    server.use(handler);

    const client = new LineClient("YOUR_ACCESS_TOKEN");

    expect(async () => {
      await client.reply("Hello", "REPLY_TOKEN");
    }).rejects.toThrowError(/Failed to reply:/);
  });

  test("push", async () => {
    const handler = http.post(
      "https://api.line.me/v2/bot/message/push",
      async () => {
        return HttpResponse.json({}, { status: 200 });
      },
    );

    server.use(handler);
    server.events
      .on("request:match", async ({ request }) => {
        expect(request.headers.get("Authorization")).toBe(
          "Bearer YOUR_ACCESS_TOKEN",
        );
        expect(JSON.parse(await request.text())).toEqual(
          expect.objectContaining({
            to: "USER_ID",
            messages: [
              {
                type: "text",
                text: "Hello",
              },
            ],
          }),
        );
      })
      .on("request:unhandled", ({ request }) => {
        throw new Error(`Unhandled request: ${request.url}`);
      });

    const client = new LineClient("YOUR_ACCESS_TOKEN");
    await client.push("Hello", "USER_ID");
  });

  test("push with invalid response", async () => {
    const handler = http.post("https://api.line.me/v2/bot/message/push", () => {
      return HttpResponse.text("Forbidden", { status: 403 });
    });

    server.use(handler);

    const client = new LineClient("YOUR_ACCESS_TOKEN");

    expect(async () => {
      await client.push("Hello", "USER_ID");
    }).rejects.toThrowError(/Failed to push:/);
  });
});

describe("parseLineWebhookRequest", () => {
  test("returns null when the request method is not POST", async () => {
    const request = new Request("https://example.com", {
      method: "GET",
    });
    const result = await parseLineWebhookRequest(
      request,
      "channelSecret",
      "allowedGroupId",
    );
    expect(result).toBe(null);
  });

  test("returns null when the signature is invalid", async () => {
    const request = new Request("https://example.com", {
      method: "POST",
      headers: {
        "x-line-signature": "invalidSignature",
      },
      body: JSON.stringify({ events: [] }),
    });
    const result = await parseLineWebhookRequest(
      request,
      "channelSecret",
      "allowedGroupId",
    );
    expect(result).toBe(null);
  });

  test("returns valid events when the signature is valid and the events are valid", async () => {
    const channelSecret = "channelSecret";
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
      .createHmac("SHA256", channelSecret)
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

    const result = await parseLineWebhookRequest(
      request,
      "channelSecret",
      "allowedGroupId",
    );

    expect(result).toEqual(body.events);
  });
});
