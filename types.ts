export interface Player {
  id: string;
  name: string;
  dob: string; // Date of Birth in ISO format 'YYYY-MM-DD'
  avatar: string;
}

export interface Match {
  id: string;
  dayId: number;
  date: string; // ISO string format
  teamA: {
    players: [string, string];
    score: number;
  };
  teamB: {
    players: [string, string];
    score: number;
  };
}

export interface IndividualRanking {
  playerId: string;
  name: string;
  avatar: string;
  matchesPlayed: number;
  wins: number;
  losses: number;
  gamesWon: number;
  gamesLost: number;
  winRate: number;
  gamesWonRate: number;
  performanceScore: number;
}

export interface DoublesRanking {
  pairId: string;
  player1Name: string;
  player2Name: string;
  matchesPlayed: number;
  wins: number;
  losses: number;
  gamesWon: number;
  gamesLost: number;
  winRate: number;
  gamesWonRate: number;
}

export enum DayOfWeek {
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"
}

export interface SuggestedMatchup {
  teamA: { player1: string; player2: string; };
  teamB: { player1: string; player2: string; };
}

export interface TeamSuggestion {
  matchups: SuggestedMatchup[];
  rationale: string;
}