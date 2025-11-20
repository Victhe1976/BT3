import { Match, Player, IndividualRanking } from '../types';

const calculateAge = (dob: string): number => {
  if (!dob) return 0;
  try {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  } catch (e) {
    return 0;
  }
};

export const calculateIndividualRankings = (matches: Match[], players: Player[]): IndividualRanking[] => {
    const playerMap = new Map(players.map(p => [p.id, p]));
    const stats: Record<string, Omit<IndividualRanking, 'playerId' | 'name' | 'avatar'>> = {};
    
    players.forEach(p => {
        stats[p.id] = { matchesPlayed: 0, wins: 0, losses: 0, gamesWon: 0, gamesLost: 0, winRate: 0, gamesWonRate: 0, performanceScore: 0 };
    });

    matches.forEach(match => {
        const winner = match.teamA.score > match.teamB.score ? 'A' : 'B';
        
        const processPlayer = (playerId: string, team: 'A' | 'B') => {
            if (!stats[playerId]) return;
            stats[playerId].matchesPlayed++;
            if (team === winner) stats[playerId].wins++; else stats[playerId].losses++;
            stats[playerId].gamesWon += team === 'A' ? match.teamA.score : match.teamB.score;
            stats[playerId].gamesLost += team === 'A' ? match.teamB.score : match.teamA.score;
        };

        match.teamA.players.forEach(pId => processPlayer(pId, 'A'));
        match.teamB.players.forEach(pId => processPlayer(pId, 'B'));
    });
    
    return Object.entries(stats).map(([playerId, pStats]) => {
        const player = playerMap.get(playerId);
        if (!player) {
            return null;
        }
        
        const age = calculateAge(player.dob);
        const winRate = pStats.matchesPlayed > 0 ? (pStats.wins / pStats.matchesPlayed) * 100 : 0;
        const gamesTotal = pStats.gamesWon + pStats.gamesLost;
        const gamesWonRate = gamesTotal > 0 ? (pStats.gamesWon / gamesTotal) * 100 : 0;
        
        const participationBonus = Math.log10(pStats.matchesPlayed + 1) * 15;
        const ageBonus = Math.max(0, age - 25) * 0.2;
        
        const performanceScore = (winRate * 0.7) + (gamesWonRate * 0.15) + participationBonus + ageBonus;

        return {
            ...pStats,
            playerId,
            name: player.name,
            avatar: player.avatar,
            winRate,
            gamesWonRate,
            performanceScore,
        };
    }).filter((p): p is IndividualRanking => p !== null)
      .sort((a, b) => b.performanceScore - a.performanceScore || b.wins - a.wins);
};