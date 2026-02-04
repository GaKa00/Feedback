import { Router } from "express";

const MatchRouter = Router();
export default MatchRouter;

MatchRouter.get("/", (_req, res) => {
  res.status(200).json({ message: "List of matches will be here." });
});

MatchRouter.get("/matches/:id", (req, res) => {
    const matchId = req.params.id;
    res.json({ message: `Details for match with ID: ${matchId} will be here.` });
});
