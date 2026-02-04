import { MatchStatus } from "../db/schema";
import { MATCH_STATUS } from "../validation/matches";

export function getMatchStatus(startTime : Date, endTime: Date , currentTime: Date = new Date()) : MatchStatus{
    const start = new Date(startTime).getTime();
    const end = new Date(endTime).getTime();
    const current = new Date(currentTime).getTime();

    if (Number.isNaN(start) || Number.isNaN(end) || Number.isNaN(current)) {
        throw new Error("Invalid date provided");
    }

    if (current < start) {
        return "scheduled";
    } else if (current >= start && current <= end) {
        return "live";
    }
    return "finished";
}

