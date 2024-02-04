import { ExecutionContext, ScheduledEvent } from "@cloudflare/workers-types";
import {
  MessageEvent as LineMessageEvent,
  TextEventMessage,
} from "@line/bot-sdk";
import { LineClient, LineMember, parseLineWebhookRequest } from "./line";
import { Touban } from "./touban";

function buildToubanMembers(familyMembers: string): LineMember[] {
  return familyMembers.split(",").map((name) => new LineMember(name));
}

async function replyTouban(
  client: LineClient,
  members: LineMember[],
  message: string,
  replyToken: string,
) {
  const touban = new Touban(members);

  switch (message) {
    case "今日の当番は？":
      await client.reply(
        `今日の当番は ${touban.today.name} です。`,
        replyToken,
      );
      break;
    case "明日の当番は？":
      await client.reply(
        `明日の当番は ${touban.tomorrow.name} です。`,
        replyToken,
      );
      break;
  }
}

async function notifyTouban(
  accessToken: string,
  familyMembers: string,
  familyGroupId: string,
) {
  console.log("notifyTouban: process start");

  if (!familyGroupId) {
    console.log("notifyTouban: familyGroupId is not set");
    return;
  }

  const client = new LineClient(accessToken);
  const touban = new Touban(buildToubanMembers(familyMembers));

  await client.push(`今日の当番は ${touban.today.name} です。`, familyGroupId);

  console.log("notifyTouban: processed");
}

export interface Env {
  LINE_CHANNEL_SECRET: string;
  LINE_CHANNEL_ACCESS_TOKEN: string;
  FAMILY_GROUP_ID: string;
  FAMILY_MEMBERS: string;
}

async function handleMessageEvent(
  client: LineClient,
  members: LineMember[],
  messageEvents: LineMessageEvent[],
) {
  for (const { replyToken, message } of messageEvents) {
    await replyTouban(
      client,
      members,
      (<TextEventMessage>message).text,
      replyToken,
    );
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
    const members = buildToubanMembers(env.FAMILY_MEMBERS);

    await handleMessageEvent(client, members, messageEvents);

    return new Response("OK");
  },

  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(
      notifyTouban(
        env.LINE_CHANNEL_ACCESS_TOKEN,
        env.FAMILY_MEMBERS,
        env.FAMILY_GROUP_ID,
      ),
    );
  },
};
