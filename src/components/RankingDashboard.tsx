import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Match, Player, DayOfWeek, DoublesRanking } from '../../types.ts';
import { GoldMedalIcon, SilverMedalIcon, BronzeMedalIcon, DownloadIcon, WhatsAppIcon } from './Icons';
import { calculateIndividualRankings } from '../services/rankingService';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

interface RankingDashboardProps {
  matches: Match[];
  players: Player[];
}

declare const window: any;

const RankingDashboard: React.FC<RankingDashboardProps> = ({ matches, players }) => {
  const [activeTab, setActiveTab] = useState<'individual' | 'doubles' | 'stats'>('individual');
  const [dayFilter, setDayFilter] = useState<string>('all');
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('');

  const playerMap = useMemo(() => new Map(players.map(p => [p.id, p])), [players]);

  useEffect(() => {
    const sortedPlayers = [...players].sort((a, b) => a.name.localeCompare(b.name));
    if (!selectedPlayerId && sortedPlayers.length > 0) {
      setSelectedPlayerId(sortedPlayers[0].id);
    }
    const isSelectedPlayerValid = players.some(p => p.id === selectedPlayerId);
    if (!isSelectedPlayerValid && sortedPlayers.length > 0) {
      setSelectedPlayerId(sortedPlayers[0].id);
    } else if (players.length === 0) {
      setSelectedPlayerId('');
    }
  }, [players, selectedPlayerId]);

  const filteredMatches = useMemo(() => {
    return matches.filter(match => {
      if (dayFilter === 'all') return true;
      const matchDay = new Date(match.date).getUTCDay();
      return matchDay === parseInt(dayFilter, 10);
    });
  }, [matches, dayFilter]);
  
  const individualRankings = useMemo(() => {
      return calculateIndividualRankings(filteredMatches, players);
  }, [filteredMatches, players]);

  const doublesRankings: DoublesRanking[] = useMemo(() => {
    const stats: Record<string, Omit<DoublesRanking, 'pairId' | 'player1Name' | 'player2Name'>> = {};

    const getPairId = (p1: string, p2: string) => [p1, p2].sort().join('-');

    filteredMatches.forEach(match => {
        const winner = match.teamA.score > match.teamB.score ? 'A' : 'B';

        const processPair = (pairPlayers: [string, string], team: 'A' | 'B') => {
            const pairId = getPairId(pairPlayers[0], pairPlayers[1]);
            if (!stats[pairId]) {
                stats[pairId] = { matchesPlayed: 0, wins: 0, losses: 0, gamesWon: 0, gamesLost: 0, winRate: 0, gamesWonRate: 0 };
            }
            stats[pairId].matchesPlayed++;
            if (team === winner) stats[pairId].wins++; else stats[pairId].losses++;
            stats[pairId].gamesWon += team === 'A' ? match.teamA.score : match.teamB.score;
            stats[pairId].gamesLost += team === 'A' ? match.teamB.score : match.teamA.score;
        }

        processPair(match.teamA.players, 'A');
        processPair(match.teamB.players, 'B');
    });

    return Object.entries(stats).map(([pairId, pStats]) => {
        const [p1Id, p2Id] = pairId.split('-');
        const winRate = pStats.matchesPlayed > 0 ? (pStats.wins / pStats.matchesPlayed) * 100 : 0;
        const gamesTotal = pStats.gamesWon + pStats.gamesLost;
        const gamesWonRate = gamesTotal > 0 ? (pStats.gamesWon / gamesTotal) * 100 : 0;
        return {
            ...pStats,
            pairId,
            player1Name: playerMap.get(p1Id)?.name || 'N/A',
            player2Name: playerMap.get(p2Id)?.name || 'N/A',
            winRate,
            gamesWonRate,
        };
    }).filter(d => d.matchesPlayed > 0)
      .sort((a, b) => b.matchesPlayed - a.matchesPlayed || b.winRate - a.winRate);
  }, [filteredMatches, playerMap]);
  
  const selectedPlayerData = useMemo(() => {
    if (!selectedPlayerId) return null;
    const playerMatches = filteredMatches.filter(m => 
      m.teamA.players.includes(selectedPlayerId) || m.teamB.players.includes(selectedPlayerId)
    ).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    let cumulativeWins = 0;
    const performanceOverTime = playerMatches.map((m, index) => {
        const isOnTeamA = m.teamA.players.includes(selectedPlayerId);
        const won = (isOnTeamA && m.teamA.score > m.teamB.score) || (!isOnTeamA && m.teamB.score > m.teamA.score);
        if (won) cumulativeWins++;
        return {
            date: new Date(m.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' }),
            match: index + 1,
            winRate: ((cumulativeWins / (index + 1)) * 100).toFixed(2),
        };
    });

    return {
        stats: individualRankings.find(p => p.playerId === selectedPlayerId),
        performanceOverTime
    };
  }, [selectedPlayerId, filteredMatches, individualRankings]);

  const shareIndividualRanking = useCallback(() => {
    const top5 = individualRankings.slice(0, 5);
    if (top5.length === 0) return;

    let message = `🏆 *Ranking Individual - BT dos Parça* 🏆\n\n`;
    const medals = ['🥇', '🥈', '🥉'];
    
    top5.forEach((player, index) => {
        const prefix = medals[index] ? `${medals[index]} ` : `${index + 1}. `;
        message += `${prefix}${player.name} (Pontos: ${player.performanceScore.toFixed(1)})\n`;
    });

    message += `\nConfira o ranking completo no app!`;

    const encodedText = encodeURIComponent(message);
    const url = `https://wa.me/?text=${encodedText}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }, [individualRankings]);

  const sharePlayerStats = useCallback(() => {
      if (!selectedPlayerData?.stats) return;
      const player = selectedPlayerData.stats;

      let message = `📊 *Minhas Estatísticas - BT dos Parça* 📊\n\n`;
      message += `*Jogador:* ${player.name}\n\n`;
      message += `*Partidas:* ${player.matchesPlayed}\n`;
      message += `*Vitórias:* ${player.wins} (${player.winRate.toFixed(1)}%)\n`;
      message += `*Derrotas:* ${player.losses}\n`;
      message += `*Pontuação:* ${player.performanceScore.toFixed(1)}\n\n`;
      message += `Veja todos os detalhes no app!`;

      const encodedText = encodeURIComponent(message);
      const url = `https://wa.me/?text=${encodedText}`;
      window.open(url, '_blank', 'noopener,noreferrer');
  }, [selectedPlayerData]);

  const exportRankingsToPDF = () => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    doc.text("Ranking Individual", 14, 16);
    doc.autoTable({
      startY: 20,
      head: [['Rank', 'Jogador', 'P', 'W', 'L', 'Pontuação', 'Win %', 'GV %']],
      body: individualRankings.map((p, i) => [
        i + 1, p.name, p.matchesPlayed, p.wins, p.losses, p.performanceScore.toFixed(1), `${p.winRate.toFixed(1)}%`, `${p.gamesWonRate.toFixed(1)}%`
      ]),
    });
    
    doc.addPage();

    doc.text("Ranking de Duplas", 14, 16);
    doc.autoTable({
      startY: 20,
      head: [['Rank', 'Dupla', 'P', 'W', 'L', 'Win %']],
      body: doublesRankings.map((p, i) => [
        i + 1, `${p.player1Name} & ${p.player2Name}`, p.matchesPlayed, p.wins, p.losses, `${p.winRate.toFixed(1)}%`
      ]),
    });

    doc.save(`rankings_${dayFilter}_${new Date().toISOString().split('T')[0]}.pdf`);
  };
  
  const exportPlayerStatsToPDF = () => {
    const chartElement = document.getElementById('player-chart-container');
    if (!selectedPlayerData?.stats || !chartElement) {
        alert("Não foi possível exportar: dados do jogador ou gráfico não encontrados.");
        return;
    };

    const { jsPDF } = window.jspdf;
    const player = selectedPlayerData.stats;

    window.html2canvas(chartElement, { backgroundColor: '#1e293b' }).then((canvas: any) => {
        const imgData = canvas.toDataURL('image/png');
        const doc = new jsPDF();

        doc.text(`Estatísticas de ${player.name}`, 14, 16);
        doc.autoTable({
            startY: 20,
            body: [
                ['Partidas Jogadas', player.matchesPlayed],
                ['Vitórias', player.wins],
                ['Derrotas', player.losses],
                ['% de Vitórias', `${player.winRate.toFixed(1)}%`],
                ['Games Vencidos', player.gamesWon],
                ['Games Perdidos', player.gamesLost],
                ['% de Games Vencidos', `${player.gamesWonRate.toFixed(1)}%`],
                ['Pontuação Balanceada', player.performanceScore.toFixed(1)],
            ],
        });

        const imgProps = doc.getImageProperties(imgData);
        const pdfWidth = doc.internal.pageSize.getWidth();
        
        doc.addPage();
        doc.text("Desempenho ao Longo do Tempo", 14, 16);
        const imgWidth = pdfWidth - 30;
        const imgHeight = (imgProps.height * imgWidth) / imgProps.width;
        doc.addImage(imgData, 'PNG', 15, 20, imgWidth, imgHeight);

        doc.save(`player_stats_${player.name}_${new Date().toISOString().split('T')[0]}.pdf`);
    });
  }

  const Medal = ({ rank }: { rank: number }) => {
    if (rank === 0) return <GoldMedalIcon className="h-10 w-10" />;
    if (rank === 1) return <SilverMedalIcon className="h-10 w-10" />;
    if (rank === 2) return <BronzeMedalIcon className="h-10 w-10" />;
    return <span className="text-slate-400 w-10 text-center font-semibold text-lg">{rank + 1}</span>;
  };
  
  const renderIndividualRanking = () => (
     <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-700">
          <thead className="bg-slate-800">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Rank</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Jogador</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Jogou</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Vitórias</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Derrotas</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Games Venc.</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Games Perd.</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Pontuação</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Win %</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">GV %</th>
            </tr>
          </thead>
          <tbody className="bg-slate-900/50 divide-y divide-slate-800">
            {individualRankings.map((p, index) => (
              <tr 
                key={p.playerId} 
                className={`transition-all duration-200 hover:bg-slate-700/50 
                  ${index === 0 ? 'bg-yellow-500/10' : ''}
                  ${index === 1 ? 'bg-slate-400/10' : ''}
                  ${index === 2 ? 'bg-orange-400/10' : ''}
                `}
              >
                <td className="px-4 py-4 whitespace-nowrap"><div className="w-10 flex justify-center"><Medal rank={index} /></div></td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <img className="h-10 w-10 rounded-full object-cover" src={p.avatar} alt={p.name} />
                    <div className="ml-4 font-medium">{p.name}</div>
                  </div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-center">{p.matchesPlayed}</td>
                <td className="px-4 py-4 whitespace-nowrap text-center text-green-400">{p.wins}</td>
                <td className="px-4 py-4 whitespace-nowrap text-center text-red-400">{p.losses}</td>
                <td className="px-4 py-4 whitespace-nowrap text-center">{p.gamesWon}</td>
                <td className="px-4 py-4 whitespace-nowrap text-center">{p.gamesLost}</td>
                <td className="px-4 py-4 whitespace-nowrap text-center font-bold text-cyan-400">{p.performanceScore.toFixed(1)}</td>
                <td className="px-4 py-4 whitespace-nowrap text-center font-bold">{p.winRate.toFixed(1)}%</td>
                <td className="px-4 py-4 whitespace-nowrap text-center font-semibold">{p.gamesWonRate.toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
    </div>
  );
  
  const renderDoublesRanking = () => (
     <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-700">
          <thead className="bg-slate-800">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Rank</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Dupla</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Jogou</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Vitórias</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Win %</th>
            </tr>
          </thead>
          <tbody className="bg-slate-900/50 divide-y divide-slate-800">
            {doublesRankings.map((p, index) => (
              <tr key={p.pairId} className="hover:bg-slate-700/50">
                <td className="px-4 py-4 whitespace-nowrap"><div className="w-10 flex justify-center"><Medal rank={index} /></div></td>
                <td className="px-4 py-4 whitespace-nowrap font-medium">{p.player1Name} & {p.player2Name}</td>
                <td className="px-4 py-4 whitespace-nowrap text-center">{p.matchesPlayed}</td>
                <td className="px-4 py-4 whitespace-nowrap text-center text-green-400">{p.wins}</td>
                <td className="px-4 py-4 whitespace-nowrap text-center font-bold">{p.winRate.toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
    </div>
  );

  const renderPlayerStats = () => {
    if (!selectedPlayerData || !selectedPlayerData.stats) {
      return <p className="text-center text-slate-400 py-8">Selecione um jogador para ver suas estatísticas.</p>;
    }
    const { stats, performanceOverTime } = selectedPlayerData;
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 bg-slate-900/50 p-6 rounded-lg">
                <div className="flex flex-col items-center">
                    <img src={stats.avatar} alt={stats.name} className="w-32 h-32 rounded-full border-4 border-cyan-400 object-cover" />
                    <h3 className="mt-4 text-2xl font-bold">{stats.name}</h3>
                </div>
                <div className="mt-6 space-y-3">
                    {Object.entries({
                        "Partidas Jogadas": stats.matchesPlayed,
                        "Vitórias": stats.wins,
                        "Derrotas": stats.losses,
                        "% de Vitórias": `${stats.winRate.toFixed(1)}%`,
                        "Games Vencidos": stats.gamesWon,
                        "Games Perdidos": stats.gamesLost,
                        "% de Games Vencidos": `${stats.gamesWonRate.toFixed(1)}%`,
                        "Pontuação Balanceada": stats.performanceScore.toFixed(1),
                    }).map(([key, value]) => (
                        <div key={key} className="flex justify-between text-lg">
                            <span className="text-slate-400">{key}</span>
                            <span className={`font-semibold ${key === 'Pontuação Balanceada' ? 'text-cyan-400' : ''}`}>{value}</span>
                        </div>
                    ))}
                </div>
                <div className="mt-6 text-sm p-3 bg-slate-800/70 rounded-md border border-slate-700">
                  <p className="font-bold text-cyan-400">O que é 'Pontuação Balanceada'?</p>
                  <p className="text-slate-400 mt-1">
                      Esta pontuação oferece uma visão equilibrada do desempenho. Ela pondera a % de vitórias, eficiência nos games, um bônus por participação e um bônus pela idade do jogador. Isso reconhece a experiência e evita penalizar quem joga com mais frequência.
                  </p>
                </div>
                 <div className="mt-6 flex flex-col sm:flex-row gap-4">
                    <button onClick={sharePlayerStats} className="flex-1 flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg transition-transform transform hover:scale-105">
                        <WhatsAppIcon className="h-5 w-5" /> Compartilhar Stats
                    </button>
                    <button onClick={exportPlayerStatsToPDF} className="flex-1 flex items-center justify-center gap-2 bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-2 px-4 rounded-lg transition-transform transform hover:scale-105">
                        <DownloadIcon className="h-5 w-5" /> Exportar (PDF)
                    </button>
                </div>
            </div>
            <div className="lg:col-span-2 bg-slate-900/50 p-6 rounded-lg" id="player-chart-container">
                <h4 className="text-xl font-bold mb-4 text-cyan-400">Desempenho ao Longo do Tempo (% de Vitórias)</h4>
                 <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={performanceOverTime} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
                        <YAxis stroke="#94a3b8" unit="%" />
                        <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }} />
                        <Legend />
                        <Line type="monotone" dataKey="winRate" name="Taxa de Vitória" stroke="#22d3ee" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 8 }} />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
  };


  return (
    <div className="space-y-8">
      <div className="bg-slate-800 p-6 rounded-xl shadow-lg">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-3xl font-bold text-cyan-400">Rankings & Estatísticas</h2>
            <p className="text-slate-400 mt-1">Analise o desempenho de jogadores e duplas.</p>
          </div>
          <div className="flex items-center gap-4">
             <select
                id="day-filter"
                value={dayFilter}
                onChange={e => setDayFilter(e.target.value)}
                className="bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-cyan-500 focus:border-cyan-500"
            >
                <option value="all">Todos os Dias</option>
                {Object.keys(DayOfWeek).filter(k => !isNaN(Number(k))).map(key => (
                <option key={key} value={key}>{DayOfWeek[Number(key)]}</option>
                ))}
            </select>
            {activeTab === 'individual' && (
              <button onClick={shareIndividualRanking} className="flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg transition-transform transform hover:scale-105">
                  <WhatsAppIcon className="h-5 w-5" /> Compartilhar
              </button>
            )}
            {activeTab !== 'stats' && <button onClick={exportRankingsToPDF} className="flex items-center justify-center gap-2 bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-2 px-4 rounded-lg transition-transform transform hover:scale-105">
                <DownloadIcon className="h-5 w-5" /> Exportar (PDF)
            </button>}
          </div>
        </div>
        
        <div className="mt-6 border-b border-slate-700">
            <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                <button onClick={() => setActiveTab('individual')} className={`${activeTab === 'individual' ? 'border-cyan-400 text-cyan-400' : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>Individual</button>
                <button onClick={() => setActiveTab('doubles')} className={`${activeTab === 'doubles' ? 'border-cyan-400 text-cyan-400' : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>Duplas</button>
                <button onClick={() => setActiveTab('stats')} className={`${activeTab === 'stats' ? 'border-cyan-400 text-cyan-400' : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>Estatísticas do Jogador</button>
            </nav>
        </div>
        
        {activeTab === 'stats' && (
             <div className="mt-4">
                <label htmlFor="player-select" className="text-sm font-medium mr-2">Selecione o Jogador:</label>
                <select id="player-select" value={selectedPlayerId} onChange={e => setSelectedPlayerId(e.target.value)} className="bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-cyan-500 focus:border-cyan-500">
                    <option value="" disabled>Selecione...</option>
                    {[...players].sort((a,b) => a.name.localeCompare(b.name)).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
            </div>
        )}
      </div>
      
      <div className="mt-8">
        {activeTab === 'individual' && renderIndividualRanking()}
        {activeTab === 'doubles' && renderDoublesRanking()}
        {activeTab === 'stats' && renderPlayerStats()}
      </div>
    </div>
  );
};

export default RankingDashboard;