import chalk from "chalk";
import fs from "fs";
import { optimAi } from "./main/optimAi";
import { ProxyManager } from "./main/proxy";
import { logMessage } from "./utils/logger";

const proxyManager = new ProxyManager();

async function main(): Promise<void> {
  console.log(
    chalk.cyan(`
░█▀█░█▀█░▀█▀░▀█▀░█▄█░█▀█░▀█▀
░█░█░█▀▀░░█░░░█░░█░█░█▀█░░█░
░▀▀▀░▀░░░░▀░░▀▀▀░▀░▀░▀░▀░▀▀▀
        By : El Puqus Airdrop
        github.com/ahlulmukh
      Use it at your own risk
  `)
  );

  try {
    const accounts = JSON.parse(fs.readFileSync("accounts.json", "utf8"));
    const proxiesLoaded = proxyManager.loadProxies();
    if (!proxiesLoaded) {
      logMessage(null, null, "Failed to load proxies, using default IP", "warning");
    }

    console.log(chalk.green(`Total accounts: ${accounts.length}`));
    console.log(chalk.white("-".repeat(85)));
    const accountPromises = accounts.map(async (account: any, index: number) => {
      try {
        if (!account.refreshToken) {
          logMessage(index + 1, accounts.length, "Missing required refreshToken", "error");
          return;
        }
        const currentProxy = await proxyManager.getRandomProxy(index + 1, accounts.length);
        const bot = new optimAi(account, currentProxy, index + 1, accounts.length);
        await bot.processAccount();
      } catch (error: any) {
        logMessage(index + 1, accounts.length, `Failed to process account: ${error.message}`, "error");
      }
    });
    await Promise.all(accountPromises);
  } catch (error: any) {
    logMessage(null, null, `Error: ${(error as any).message}`, "error");
  }
}

main().catch((err) => {
  console.error(chalk.red("Error occurred:"), err);
  process.exit(1);
});