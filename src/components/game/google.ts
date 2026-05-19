import { Difficulty, ScoreRecord, ShipType } from "./types";

const GOOGLE_APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbyOOJIH2FG7ty3aUgTj3B009_eRU2ifat7bqvkCfAW-Fr_keXjlXswYofYRLuMBFpy7/exec";
const PROXY = "https://api.allorigins.win/raw?url=";

export const sendGameStats = async (
  playerName: string,
  finalScore: number,
  level: Difficulty,
  currentShip: ShipType,
  getRank: (score: number) => { currentRank: { name: string } },
): Promise<void> => {
  if (!playerName.trim()) {
    console.warn("⚠️ Player name is empty, skipping API call");
    return;
  }

  const currentRankData = getRank(finalScore);

  const payload = {
    table: "leaderboard",
    data: {
      playerName: playerName.trim(),
      score: finalScore,
      level: level,
      ship: currentShip,
      date: new Date().toISOString(),
      rank: currentRankData.currentRank.name,
    },
  };

  console.log("📤 Sending game stats:", payload);

  try {
    const response = await fetch(GOOGLE_APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify(payload),
      redirect: "follow",
      mode: "no-cors",
    });

    console.log("✅ Game stats API response status:", response.status);
  } catch (error) {
    console.error("❌ Failed to send game stats:", error);
  }
};

const fetchFromScript = async (mode: string) => {
  const response = await fetch(`${GOOGLE_APPS_SCRIPT_URL}?mode=${mode}`, {
    method: "GET",
    redirect: "follow",
  });
  if (!response.ok) throw new Error("fetch failed");
  return response.json();
};

export const fetchPlayerCount = async (): Promise<number> => {
  try {
    const json = await fetchFromScript("historical");
    console.log("playerCount raw response:", json);
    return json.totalPlayers ?? 0;
  } catch (error) {
    console.error("Failed to fetch player count:", error);
    return 0;
  }
};

export const fetchLeaderboard = async (
  mode: "daily" | "historical",
): Promise<ScoreRecord[]> => {
  try {
    const json = await fetchFromScript(mode);
    const rows: any[] = json.rows ?? json;
    const uniquePlayers = Array.from(
      new Map(rows.map((entry: any) => [entry.playerName, entry])).values(),
    ).slice(0, 10);
    return uniquePlayers as ScoreRecord[];
  } catch (error) {
    console.error("Failed to fetch leaderboard:", error);
    return [];
  }
};
