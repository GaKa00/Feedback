import { Router } from "express";
import { createMatchSchema } from "../validation/matches";
import { db } from "../db/db";
import { matches } from "../db/schema";
import { getMatchStatus } from "../utils/match-status";
import { desc } from "drizzle-orm";

const MatchRouter = Router();
export default MatchRouter;

MatchRouter.get("/", async (req, res) => {

  const rawLimit = Number(req.query.limit);
  const limit =
    Number.isInteger(rawLimit) && rawLimit > 0
      ? Math.min(rawLimit, 100) 
      : 50; 

  try {
    const data = await db
      .select()
      .from(matches)
      .limit(limit)
      .orderBy(desc(matches.createdAt)); 

    res.status(200).json({ matches: data });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

MatchRouter.post("/", async (req, res) => {
  const parsed = createMatchSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ errors: parsed.error });
  }

  try {
    const [insertedMatch] = await db
      .insert(matches)
      .values({
        sport: parsed.data.sport,
        homeTeam: parsed.data.homeTeam,
        awayTeam: parsed.data.awayTeam,
        status: getMatchStatus(
          new Date(parsed.data.startTime),
          new Date(parsed.data.endTime),
        ),
        startTime: new Date(parsed.data.startTime),
        endTime: new Date(parsed.data.endTime),
        homeScore: parsed.data.homeScore ?? 0,
        awayScore: parsed.data.awayScore ?? 0,
      })
      .returning();

    res.status(201).json({ match: insertedMatch });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
