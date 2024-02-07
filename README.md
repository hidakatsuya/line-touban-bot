# LINE Touban Bot

This is a LINE bot for managing and notifying about a duty (Touban in Japanese) in a group.

## Features

- Notify the group about today's and tomorrow's duties
- Respond to inquiries about duties

## Getting Started

### Prerequisites

- LINE Bot
- Cloudflare Workers

### Installing

Install NPM packages
```sh
npm install
```

Create a wrangler.toml to copy wrangler.sample.toml and set [vars] and [triggers]
```sh
cp wrangler.sample.toml wrangler.toml
```

Add your LINE bot's access token and secret, and your LINE group's ID
```sh
npx wrangler secret put LINE_CHANNEL_SECRET
npx wrangler secret put LINE_CHANNEL_ACCESS_TOKEN
npx wrangler secret put FAMILY_GROUP_ID
```

Deploy to your Cloudflare Worker
```sh
npx wrangler deploy
```

## License

This project is licensed under the [MIT License](https://opensource.org/license/mit/) - see the LICENSE file for details.
