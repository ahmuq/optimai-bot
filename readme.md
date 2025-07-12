# OptimAI Auto Bot

For Auto Bot Optim AI

## Requirements

- NodeJS [Download](https://node.optimai.network/register?ref=B91EEB87).
- Optim AI Account[Optim](https://node.optimai.network/register?ref=B91EEB87)
- Proxy (Optional). Best Proxy [Cherry Proxy](https://center.cherryproxy.com/Login/Register?invite=029ad2d3)

## Notes

Using Better Proxy

## Installation

1. Clone the repository:

   ```sh
   git clone https://github.com/ahmuq/optimai-bot.git
   cd optimai-bot
   ```

2. Instal Packages and build packages:

   ```sh
   npm install
   npm run build
   ```

3. Create a `nano proxy.txt` file in the root directory and add your proxies (one per line) (Optional).

   ```
   http://user:pass@host:port
   http://user:pass@host:port
   http://user:pass@host:port
   ```

4. Make file accounts, `cp accounts.json.example accounts.json`, edit and put your account details like this example:

   ```json
   [
     {
       "refreshToken": "your_refresh_token"
     },
     {
       "refreshToken": "your_refresh_token"
     }
   ]
   ```

   **Note**: `registerPayload` and `uptimePayload` will be generated automatically by the bot using the same algorithm as the Python setup. You only need to provide the `refreshToken`.

# How To Get Required Data

**Get RefreshToken (OptimAI Console - [Ctrl + Shift + I])**

```js
const token = localStorage.getItem("opai_refresh_token");
if (token) {
  const textArea = document.createElement("textarea");
  textArea.value = token;
  document.body.appendChild(textArea);
  textArea.select();
  document.execCommand("copy");
  document.body.removeChild(textArea);
  console.log(
    "%cRefresh Token copied to clipboard!",
    "color: green; font-size: 16px;"
  );
} else {
  console.error("Refresh Token not found in localStorage!");
}
```

**Payload Generation**: The bot will automatically generate `registerPayload` and `uptimePayload` using the same algorithm as the Python setup script. No manual extraction needed!

## Usage

1. Run the bot:

```sh
npm run start
```

## Stay Connected

- Channel Telegram : [Telegram](https://t.me/elpuqus)
- Channel WhatsApp : [Whatsapp](https://whatsapp.com/channel/0029VavBRhGBqbrEF9vxal1R)
- Discord : [Discord](https://discord.com/invite/uKM4UCAccY)

## Donation

If you would like to support the development of this project, you can make a donation using the following addresses:

- Solana: `FdHsx8He55QgRCSv6NMEpFfkjXFsXFEeWEpJpo7sUQZe`
- EVM: `0x406de5ec09201002c45fdd408ab23159cd12fa3e`
- BTC: `bc1prze475lgalevngrhwq6r9wyng3rl3zskyru4rn4k6j8kwzmmczmqcd7u7y`

## Disclaimer

This tool is for educational purposes only. Use it at your own risk.
