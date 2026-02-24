/**
 * Render Cron Job script — triggers POST /api/jobs/run
 * Render runs this on the schedule defined in render.yaml
 */

const APP_URL = process.env.APP_URL;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;

if (!APP_URL || !ADMIN_TOKEN) {
  console.error("Missing APP_URL or ADMIN_TOKEN env vars");
  process.exit(1);
}

async function main() {
  const url = `${APP_URL.replace(/\/$/, "")}/api/jobs/run`;
  console.log(`Triggering ingestion: POST ${url}`);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ADMIN_TOKEN}`,
      "Content-Type": "application/json",
    },
  });

  const body = await res.text();
  console.log(`Status: ${res.status}`);
  console.log(`Response: ${body}`);

  if (res.status >= 200 && res.status < 300) {
    console.log("Ingestion completed successfully.");
  } else if (res.status === 429) {
    console.log("Rate limited — a run was triggered recently. OK.");
  } else {
    console.error(`Ingestion failed with status ${res.status}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
