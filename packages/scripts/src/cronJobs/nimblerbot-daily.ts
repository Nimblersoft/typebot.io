import { enterGrace } from "./nimblerbot/enterGrace";
import { enterQuarantine } from "./nimblerbot/enterQuarantine";
import { generateDueInvoices } from "./nimblerbot/generateDueInvoices";

const main = async () => {
  console.log(
    "[nimblerbot-cron] Starting daily run:",
    new Date().toISOString(),
  );

  await generateDueInvoices();
  await enterGrace();
  await enterQuarantine();

  console.log(
    "[nimblerbot-cron] Daily run complete:",
    new Date().toISOString(),
  );
};

main().then();
