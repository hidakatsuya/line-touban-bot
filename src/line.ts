import crypto from "node:crypto";
import {
	MessageEvent as LineMessageEvent,
	WebhookRequestBody,
} from "@line/bot-sdk";

export class LineMember {
	readonly name: string;

	constructor(name: string) {
		this.name = name;
	}
}

export class LineClient {
	private accessToken: string;

	constructor(accessToken: string) {
		this.accessToken = accessToken;
	}

	async reply(message: string, replyToken: string) {
		const response = await fetch("https://api.line.me/v2/bot/message/reply", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${this.accessToken}`,
			},
			body: JSON.stringify({
				replyToken,
				messages: [
					{
						type: "text",
						text: message,
					},
				],
			}),
		});

		if (!response.ok) {
			throw new Error(
				`Failed to reply: ${response.status} ${response.statusText}`,
			);
		}
	}

	async push(message: string, to: string) {
		const response = await fetch("https://api.line.me/v2/bot/message/push", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${this.accessToken}`,
			},
			body: JSON.stringify({
				to,
				messages: [
					{
						type: "text",
						text: message,
					},
				],
			}),
		});

		if (!response.ok) {
			console.log(`Failed to push: ${response.status} ${response.statusText}`);
			throw new Error(
				`Failed to push: ${response.status} ${response.statusText}`,
			);
		}
	}
}

function verifySignature(
	channelSecret: string,
	signature: string | null,
	body: string,
): boolean {
	if (signature === null) {
		return false;
	}

	const hash = crypto
		.createHmac("SHA256", channelSecret)
		.update(body)
		.digest("base64")
		.toString();

	return signature === hash;
}

export async function parseLineWebhookRequest(
	request: Request,
	channelSecret: string,
	allowedGroupId: string,
): Promise<LineMessageEvent[] | null> {
	if (request.method !== "POST") {
		console.log("Invalid request method", request.method);
		return null;
	}

	const signature = request.headers.get("x-line-signature");
	const requestBody = await request.text();

	if (!verifySignature(channelSecret, signature, requestBody)) {
		console.log("Invalid signature", requestBody);
		return null;
	}

	const body = JSON.parse(requestBody) as WebhookRequestBody;
	const events = body.events.filter((event): event is LineMessageEvent => {
		return (
			event.mode === "active" &&
			event.type === "message" &&
			event.source.type === "group" &&
			event.source.groupId === allowedGroupId
		);
	});

	return events;
}
