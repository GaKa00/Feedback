import { detectBot, shield } from "@arcjet/node";
import arcjet, { slidingWindow } from "arcjet";

const arcjetkey = process.env.ARCJET_KEY;
const arcjetmode = process.env.ARCJET_MODE === "DRY_RUN" ? "DRY_RUN" : "LIVE";

if (!arcjetkey) {
  throw new Error("ARCJET_KEY is not defined in environment variables");
}

export const httpArcjet = arcjetkey
  ? arcjet({
      key: arcjetkey,
      rules: [
        shield({ mode: arcjetmode }),
        detectBot({
          mode: arcjetmode,
          allow: ["CATEGORY:SEARCH_ENGINE", "CATEGORY:PREVIEW"],
        }),
        slidingWindow({ mode: arcjetmode, interval: "10s", max: 50 }),
      ],
    })
  : null;

export const wsArcjet = arcjetkey
  ? arcjet({
      key: arcjetkey,
      rules: [
        shield({ mode: arcjetmode }),
        detectBot({
          mode: arcjetmode,
          allow: ["CATEGORY:SEARCH_ENGINE", "CATEGORY:PREVIEW"],
        }),
        slidingWindow({ mode: arcjetmode, interval: "2s", max: 5 }),
      ],
    })
  : null;

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
