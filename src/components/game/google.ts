import { Difficulty, ScoreRecord, ShipType } from "./types";

const GOOGLE_APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbwUhVUYLZ1UK-ACuLzdOVoyf8Fg0fPOt_HW6QzBRb4rv4APmGQBy1Z6jZ-yxFRrQFx3/exec";
const PROXY = "https://api.allorigins.win/raw?url=";

export const sendGameStats = async (
  playerName: string,
  finalScore: number,
  level: Difficulty,
  currentShip: ShipType,
  getRank: (score: number) => { currentRank: { name: string } },
): Promise<void> => {
  if (!playerName.trim()) return;

  const currentRankData = getRank(finalScore);

  try {
    await fetch(GOOGLE_APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({
        table: "leaderboard", // ✅ 寫進 leaderboard 這張表
        data: {
          playerName: playerName.trim(),
          score: finalScore,
          level: level,
          ship: currentShip,
          date: new Date().toISOString(),
          rank: currentRankData.currentRank.name,
        },
      }),
      redirect: "follow",
      mode: "no-cors", // ✅ 避免 CORS 錯誤
    });

    console.log("✅ Game stats sent");
  } catch (error) {
    console.error("Failed to send game stats:", error);
  }
};

export const fetchLeaderboard = async (
  mode: "daily" | "historical",
): Promise<ScoreRecord[]> => {
  try {
    const response = await fetch(`${GOOGLE_APPS_SCRIPT_URL}?mode=${mode}`, {
      method: "GET",
      redirect: "follow",
    });

    if (response.ok) {
      const data = await response.json();
      const uniquePlayers = Array.from(
        new Map(data.map((entry: any) => [entry.playerName, entry])).values(),
      ).slice(0, 10);
      return uniquePlayers as ScoreRecord[];
    }
    return [];
  } catch (error) {
    console.error("Failed to fetch leaderboard:", error);
    return [];
  }
};
