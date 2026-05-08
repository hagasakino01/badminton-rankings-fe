export type User = {
  _id?: string;
  id?: string;
  name: string;
  email: string;
  role: "admin" | "player";
};

export type Group = {
  _id: string;
  name: string;
  description?: string;
  ownerId: string;
  playerCount?: number;
  seasonCount?: number;
  createdAt: string;
  updatedAt: string;
};

export type Player = {
  _id: string;
  groupId: string;
  fullName: string;
  nickname?: string;
  contactInfo?: string;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
};

export type Season = {
  _id: string;
  groupId: string;
  name: string;
  startDate?: string;
  endDate?: string;
  status: "draft" | "active" | "completed";
  isLocked: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Match = {
  _id: string;
  groupId: string;
  seasonId: string;
  sessionId: string;
  courtOrder: number;
  teamAIds: string[];
  teamBIds: string[];
  scoreA?: number;
  scoreB?: number;
  winnerTeam?: "A" | "B";
  status: "scheduled" | "completed";
};

export type Session = {
  _id: string;
  groupId: string;
  seasonId: string;
  scheduledFor: string;
  participantIds: string[];
  absentPlayerIds: string[];
  isResultsSaved: boolean;
  createdBy: string;
  matches: Match[];
};

export type RankingRow = {
  playerId: string;
  fullName: string;
  nickname?: string;
  sessionsAttended: number;
  absences: number;
  matchesPlayed: number;
  wins: number;
  losses: number;
  points: number;
  winRate: number;
  scoreDifference: number;
  rank: number;
};

export type SeasonRankings = {
  rankingRules: string[];
  totals: {
    sessions: number;
    matches: number;
  };
  rows: RankingRow[];
};

export type SeasonDetail = {
  season: Season;
  sessions: Session[];
  rankings: SeasonRankings;
};
