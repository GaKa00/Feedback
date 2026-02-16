import "dotenv/config";
import { detectBot, shield } from "@arcjet/node";
import arcjet, { slidingWindow } from "arcjet";

const arcjetkey = process.env.ARCJET_KEY;
const arcjetmode = process.env.ARCJET_MODE === "DRY_RUN" ? "DRY_RUN" : "LIVE";

// Create a simple logger adapter
const logger = {
  error: (message: string) => console.error(`[arcjet] ${message}`),
  warn: (message: string) => console.warn(`[arcjet] ${message}`),
  info: (message: string) => console.info(`[arcjet] ${message}`),
  debug: (message: string) => console.debug(`[arcjet] ${message}`),
};

let httpArcjetInstance: any = null;
let wsArcjetInstance: any = null;

if (arcjetkey) {
  try {
    httpArcjetInstance = arcjet({
      key: arcjetkey,
      log: logger as any,
      rules: [
        shield({ mode: arcjetmode }),
        detectBot({
          mode: arcjetmode,
          allow: ["CATEGORY:SEARCH_ENGINE", "CATEGORY:PREVIEW"],
        }),
        slidingWindow({ mode: arcjetmode, interval: "10s", max: 50 }),
      ],
    });

    wsArcjetInstance = arcjet({
      key: arcjetkey,
      log: logger as any,
      rules: [
        shield({ mode: arcjetmode }),
        detectBot({
          mode: arcjetmode,
          allow: ["CATEGORY:SEARCH_ENGINE", "CATEGORY:PREVIEW"],
        }),
        slidingWindow({ mode: arcjetmode, interval: "2s", max: 5 }),
      ],
    });
  } catch (error) {
    console.error("Failed to initialize Arcjet:", error);
  }
} else {
  console.warn(
    "ARCJET_KEY not found in environment variables. Arcjet protection is disabled.",
  );
}

export const httpArcjet = httpArcjetInstance;
export const wsArcjet = wsArcjetInstance;

export async function securityMiddleware(req: any, res: any, next: any) {
  if (!httpArcjet) return next();

  try {
    const decision = await httpArcjet.protect(req, res);

    if (decision.isDenied()) {
      if (decision.reason.isRateLimit()) {
        return res.status(429).json({ error: "Too Many Requests" });
      }
      return res.status(403).json({ error: "Forbidden" });
    }
  } catch (error) {
    console.error("Arcjet error:", error);
    return res.status(503).json({ error: "IServer Unavailable" });
  }
  next();
}
