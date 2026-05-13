export type ManualMatchDraft = {
  id: string;
  teamAIds: [string, string];
  teamBIds: [string, string];
};

export type ManualSchedulePairWarning = {
  type: "teammate" | "opponent";
  playerIds: [string, string];
  count: number;
};

export type ManualScheduleValidation = {
  requiredMatchCount: number;
  currentMatchCount: number;
  playerCounts: Record<string, number>;
  matchIssues: string[];
  missingPlayers: Array<{ playerId: string; count: number }>;
  extraPlayers: Array<{ playerId: string; count: number }>;
  warnings: ManualSchedulePairWarning[];
  isValid: boolean;
};

function pairKey(firstId: string, secondId: string) {
  return [firstId, secondId].sort().join(":");
}

export function createEmptyManualMatch(): ManualMatchDraft {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `manual-match-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  return {
    id,
    teamAIds: ["", ""],
    teamBIds: ["", ""],
  };
}

export function validateManualSchedule(
  participantIds: string[],
  matches: ManualMatchDraft[],
): ManualScheduleValidation {
  const participantSet = new Set(participantIds);
  const playerCounts = Object.fromEntries(
    participantIds.map((participantId) => [participantId, 0]),
  );
  const matchIssues: string[] = [];
  const teammateCounts = new Map<string, number>();
  const opponentCounts = new Map<string, number>();

  for (const [index, match] of matches.entries()) {
    const players = [...match.teamAIds, ...match.teamBIds];
    const filledPlayers = players.filter(Boolean);

    for (const playerId of filledPlayers) {
      if (participantSet.has(playerId)) {
        playerCounts[playerId] = (playerCounts[playerId] ?? 0) + 1;
      }
    }

    if (filledPlayers.length !== players.length) {
      matchIssues.push(`Trận ${index + 1} chưa chọn đủ 4 người.`);
      continue;
    }

    if (new Set(players).size !== players.length) {
      matchIssues.push(`Trận ${index + 1} đang bị trùng người chơi.`);
      continue;
    }

    if (players.some((playerId) => !participantSet.has(playerId))) {
      matchIssues.push(`Trận ${index + 1} có người không thuộc danh sách tham gia.`);
      continue;
    }

    teammateCounts.set(
      pairKey(match.teamAIds[0], match.teamAIds[1]),
      (teammateCounts.get(pairKey(match.teamAIds[0], match.teamAIds[1])) ?? 0) + 1,
    );
    teammateCounts.set(
      pairKey(match.teamBIds[0], match.teamBIds[1]),
      (teammateCounts.get(pairKey(match.teamBIds[0], match.teamBIds[1])) ?? 0) + 1,
    );

    const opponentKeys = [
      pairKey(match.teamAIds[0], match.teamBIds[0]),
      pairKey(match.teamAIds[0], match.teamBIds[1]),
      pairKey(match.teamAIds[1], match.teamBIds[0]),
      pairKey(match.teamAIds[1], match.teamBIds[1]),
    ];

    for (const opponentKey of opponentKeys) {
      opponentCounts.set(opponentKey, (opponentCounts.get(opponentKey) ?? 0) + 1);
    }
  }

  const missingPlayers = participantIds
    .map((playerId) => ({ playerId, count: playerCounts[playerId] ?? 0 }))
    .filter((item) => item.count < 4);
  const extraPlayers = participantIds
    .map((playerId) => ({ playerId, count: playerCounts[playerId] ?? 0 }))
    .filter((item) => item.count > 4);

  const warnings: ManualSchedulePairWarning[] = [];

  for (const [key, count] of teammateCounts.entries()) {
    if (count >= 3) {
      warnings.push({
        type: "teammate",
        playerIds: key.split(":") as [string, string],
        count,
      });
    }
  }

  for (const [key, count] of opponentCounts.entries()) {
    if (count >= 3) {
      warnings.push({
        type: "opponent",
        playerIds: key.split(":") as [string, string],
        count,
      });
    }
  }

  const isValid =
    participantIds.length >= 5 &&
    participantIds.length <= 12 &&
    matches.length === participantIds.length &&
    matchIssues.length === 0 &&
    missingPlayers.length === 0 &&
    extraPlayers.length === 0;

  return {
    requiredMatchCount: participantIds.length,
    currentMatchCount: matches.length,
    playerCounts,
    matchIssues,
    missingPlayers,
    extraPlayers,
    warnings,
    isValid,
  };
}
