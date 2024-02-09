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
import { LineClient, LineMember } from "../src/line";

describe("LineMember", () => {
  test("name", () => {
    const member = new LineMember("John Doe");
    expect(member.name).toBe("John Doe");
  });
});

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

describe("LineClient", () => {
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
