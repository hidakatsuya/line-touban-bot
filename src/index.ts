import { ExecutionContext, ScheduledEvent } from "@cloudflare/workers-types";
import {
  MessageEvent as LineMessageEvent,
  TextEventMessage,
} from "@line/bot-sdk";
import { LineClient, LineMember, parseLineWebhookRequest } from "./line";
import { Touban } from "./touban";

function buildTouban({
  members,
  name,
  description,
}: { members: string; name: string; description: string }): Touban {
  const toubanMembers = members.split(",").map((name) => new LineMember(name));
  return new Touban(toubanMembers, { name, description });
}

async function replyTouban(
  client: LineClient,
  message: string,
  touban: Touban,
  replyToken: string,
) {
  switch (message) {
    case "今日の当番は？":
      await client.reply(touban.today, replyToken);
      break;
    case "明日の当番は？":
      await client.reply(touban.tomorrow, replyToken);
      break;
    case "当番？":
      await client.reply(touban.description, replyToken);
      break;
  }
}

async function notifyTouban(
  accessToken: string,
  familyGroupId: string,
  toubanConfig: { name: string; description: string; members: string },
) {
  console.log("notifyTouban: process start");

  if (!familyGroupId) {
    console.log("notifyTouban: familyGroupId is not set");
    return;
  }

  const client = new LineClient(accessToken);
  const touban = buildTouban(toubanConfig);

  await client.push(touban.today, familyGroupId);

  console.log("notifyTouban: processed");
}

export interface Env {
  LINE_CHANNEL_SECRET: string;
  LINE_CHANNEL_ACCESS_TOKEN: string;
  FAMILY_GROUP_ID: string;
  TOUBAN_NAME: string;
  TOUBAN_DESCRIPTION: string;
  TOUBAN_MEMBERS: string;
}

async function handleMessageEvent(
  client: LineClient,
  messageEvents: LineMessageEvent[],
  touban: Touban,
) {
  for (const { replyToken, message } of messageEvents) {
    const messageText = (message as TextEventMessage).text;

    await replyTouban(client, messageText, touban, replyToken);
  }
}

export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext) {
    const messageEvents = await parseLineWebhookRequest(
      request,
      env.LINE_CHANNEL_SECRET,
      env.FAMILY_GROUP_ID,
    );

    if (messageEvents === null) {
      return new Response("Forbidden", { status: 403 });
    }

    const client = new LineClient(env.LINE_CHANNEL_ACCESS_TOKEN);
    const touban = buildTouban({
      name: env.TOUBAN_NAME,
      description: env.TOUBAN_DESCRIPTION,
      members: env.TOUBAN_MEMBERS,
    });

    await handleMessageEvent(client, messageEvents, touban);

    return new Response("OK");
  },

  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    const toubanEnv = {
      name: env.TOUBAN_NAME,
      description: env.TOUBAN_DESCRIPTION,
      members: env.TOUBAN_MEMBERS,
    };

    ctx.waitUntil(
      notifyTouban(
        env.LINE_CHANNEL_ACCESS_TOKEN,
        env.FAMILY_GROUP_ID,
        toubanEnv,
      ),
    );
  },
};
