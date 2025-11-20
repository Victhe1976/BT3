import React, { useState, useMemo } from 'react';
// DayOfWeek REMOVIDO para resolver TS6133
import { Match, Player } from '../../types';
import { DownloadIcon } from './Icons';

interface MatchHistoryProps {
  matches: Match[];
  players: Player[];
}

declare const window: any;

type MatchupType = Match;

const MatchHistory: React.FC<MatchHistoryProps> = ({ matches, players }) => {
  const [dayFilter, setDayFilter] = useState<string>('all');
  const [columnFilters, setColumnFilters] = useState({
    date: '',
    player1: '',
    player2: '',
    scoreA: '',
    scoreB: '',
  });

  const playerMap = useMemo(() => new Map(players.map(p => [p.id, p])), [players]);
  
  const uniquePlayersInHistory = useMemo(() => {
    const playerIds = new Set<string>();
    matches.forEach(match => {
        match.teamA.players.forEach(pId => playerIds.add(pId));
        match.teamB.players.forEach(pId => playerIds.add(pId));
    });
    return [...players].filter(p => playerIds.has(p.id)).sort((a, b) => a.name.localeCompare(b.name));
  }, [matches, players]);


  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setColumnFilters(prev => ({ ...prev, [name]: value }));
  };
  
  const formatDateForDisplay = (isoString: string) => {
    return new Date(isoString).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
  };

  const filteredMatches = useMemo(() => {
    return [...matches]
      .sort((a: MatchupType, b: MatchupType) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.dayId - a.dayId)
      .filter((match: MatchupType) => {
        if (dayFilter !== 'all') {
          const matchDay = new Date(match.date).getUTCDay();
          if (matchDay !== parseInt(dayFilter, 10)) return false;
        }
        
        if (columnFilters.date) {
            const matchDateStr = new Date(match.date).toISOString().split('T')[0];
            if (matchDateStr !== columnFilters.date) return false;
        }

        const allPlayerNamesInMatch = [
            ...match.teamA.players.map(pId => playerMap.get(pId)?.name || ''),
            ...match.teamB.players.map(pId => playerMap.get(pId)?.name || '')
        ].map(name => name.toLowerCase());

        const player1Filter = columnFilters.player1.toLowerCase();
        const player2Filter = columnFilters.player2.toLowerCase();
        
        if (player1Filter && !allPlayerNamesInMatch.includes(player1Filter)) return false;
        if (player2Filter && !allPlayerNamesInMatch.includes(player2Filter)) return false;

        const scoreA = match.teamA.score.toString();
        const scoreB = match.teamB.score.toString();
        if (columnFilters.scoreA && scoreA !== columnFilters.scoreA) return false;
        if (columnFilters.scoreB && scoreB !== columnFilters.scoreB) return false;

        return true;
      });
  }, [matches, dayFilter, columnFilters, playerMap]);
  
  const exportToExcel = () => {
    const dataToExport = filteredMatches.map(match => ({
        'Data': formatDateForDisplay(match.date),
        'Nº do Jogo': match.dayId,
        'Jogador 1 (Time A)': playerMap.get(match.teamA.players[0])?.name || 'N/A',
        'Jogador 2 (Time A)': playerMap.get(match.teamA.players[1])?.name || 'N/A',
        'Placar A': match.teamA.score,
        'Placar B': match.teamB.score,
        'Jogador 1 (Time B)': playerMap.get(match.teamB.players[0])?.name || 'N/A',
        'Jogador 2 (Time B)': playerMap.get(match.teamB.players[1])?.name || 'N/A',
    }));

    if (window.XLSX) {
        const ws = window.XLSX.utils.json_to_sheet(dataToExport);
        const wb = window.XLSX.utils.book_new();
        window.XLSX.utils.book_append_sheet(wb, ws, "Histórico de Jogos");
        window.XLSX.writeFile(wb, `historico_bt_dos_parca_${new Date().toISOString().split('T')[0]}.xlsx`);
    } else {
        alert("A biblioteca XLSX (SheetJS) não está carregada.");
    }
  };

  const getPlayer = (id: string) => playerMap.get(id);

  interface FilterSelectProps {
      name: keyof typeof columnFilters;
      label: string;
  }
  
  const PlayerFilterSelect: React.FC<FilterSelectProps> = ({name, label}) => (
    <div className="space-y-1">
      <label className="text-xs text-slate-400 block">{label}</label>
      <select
        name={name}
        value={columnFilters[name]}
        onChange={handleFilterChange}
        className="w-full bg-slate-700 border border-slate-600 rounded-md py-1 px-2 text-white text-xs focus:outline-none focus:ring-cyan-500 focus:border-cyan-500"
      >
        <option value="">Todos</option>
        {uniquePlayersInHistory.map(p => <option key={p.id} value={p.name.toLowerCase()}>{p.name}</option>)}
      </select>
    </div>
  );
  
  interface ScoreSelectProps {
      name: keyof typeof columnFilters;
  }
  
  const ScoreFilterSelect: React.FC<ScoreSelectProps> = ({name}) => (
    <select
        name={name}
        value={columnFilters[name]}
        onChange={handleFilterChange}
        className="w-full bg-slate-700 border border-slate-600 rounded-md py-1 px-2 text-white text-xs focus:outline-none focus:ring-cyan-500 focus:border-cyan-500"
    >
      <option value="">Todos</option>
      {[0, 1, 2, 3, 4].map(s => <option key={s} value={s}>{s}</option>)}
    </select>
  ); 

  return (
    <div className="bg-slate-800 p-6 sm:p-8 rounded-xl shadow-lg">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <h2 className="text-3xl font-bold text-cyan-400">Histórico</h2>
        <div className="flex items-center gap-4">
          <label htmlFor="day-filter" className="text-sm font-medium text-slate-300">Dia da semana:</label>
          <select
            id="day-filter"
            value={dayFilter}
            onChange={e => setDayFilter(e.target.value)}
            className="bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-cyan-500 focus:border-cyan-500"
          >
            <option value="all">Todos os Dias</option>
            {/* Array fixo usado para filtrar dias */}
             {[0, 1, 2, 3, 4, 5, 6].map(dayNum => (
                <option key={dayNum} value={dayNum}>
                  {[ "Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"][dayNum]}
                </option>
             ))}
          </select> 
            <button 
                onClick={exportToExcel} 
                className="flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg transition-transform transform hover:scale-105"
                title="Exportar dados filtrados para arquivo Excel"
            >
                <DownloadIcon className="h-5 w-5" /> Exportar (Excel)
            </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-700 border-separate border-spacing-0 text-slate-200">
          <thead className="bg-slate-900/50">
            <tr>
              {['Data', 'Nº do Jogo', 'Dupla A', 'Placar', 'Dupla B'].map(header => (
                <th key={header} className="px-3 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider sticky top-0 bg-slate-900/50 backdrop-blur-sm">{header}</th>
              ))}
            </tr>
            <tr>
              <td className="p-2 align-top">
                <input
                    type="date"
                    name="date"
                    value={columnFilters.date}
                    onChange={handleFilterChange}
                    className="w-full bg-slate-700 border border-slate-600 rounded-md py-1 px-2 text-white text-xs focus:outline-none focus:ring-cyan-500 focus:border-cyan-500"
                />
              </td>
              <td className="p-2"></td>
              <td className="p-2 align-top">
                <PlayerFilterSelect name="player1" label="Jogador 1/2" />
              </td>
              <td className="p-2 align-top">
                <div className="space-y-1">
                    <label className="text-xs text-slate-400 block">Placar</label>
                    <div className="flex items-center gap-1">
                      <ScoreFilterSelect name="scoreA" />
                      <span className="text-slate-400">x</span>
                      <ScoreFilterSelect name="scoreB" />
                    </div>
                </div>
              </td>
              <td className="p-2 align-top">
                <PlayerFilterSelect name="player2" label="Jogador 3/4" />
              </td>
            </tr>
          </thead>
          <tbody className="bg-slate-800 divide-y divide-slate-700">
            {filteredMatches.length > 0 ? filteredMatches.map((match) => (
              <tr key={match.id} className="hover:bg-slate-700/50 transition-colors">
                <td className="px-3 py-4 whitespace-nowrap text-sm">{formatDateForDisplay(match.date)}</td>
                <td className="px-3 py-4 whitespace-nowrap text-sm text-center font-semibold">{match.dayId}</td>
                <td className="px-3 py-4 whitespace-nowrap text-sm">
                    <div>
                        <div className="flex items-center gap-2">
                            <img src={getPlayer(match.teamA.players[0])?.avatar} alt={getPlayer(match.teamA.players[0])?.name} className="w-8 h-8 rounded-full object-cover" onError={(e) => { e.currentTarget.src = 'https://placehold.co/32x32/1e293b/FFFFFF?text=P1'; }} />
                            {getPlayer(match.teamA.players[0])?.name || '??'}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                            <img src={getPlayer(match.teamA.players[1])?.avatar} alt={getPlayer(match.teamA.players[1])?.name} className="w-8 h-8 rounded-full object-cover" onError={(e) => { e.currentTarget.src = 'https://placehold.co/32x32/1e293b/FFFFFF?text=P2'; }} />
                            {getPlayer(match.teamA.players[1])?.name || '??'}
                        </div>
                    </div>
                </td>
                <td className="px-3 py-4 whitespace-nowrap text-center">
                    <span className={`text-lg font-bold ${match.teamA.score > match.teamB.score ? 'text-green-400' : 'text-slate-400'}`}>{match.teamA.score}</span>
                    <span className="mx-2 text-slate-400">x</span>
                    <span className={`text-lg font-bold ${match.teamB.score > match.teamA.score ? 'text-green-400' : 'text-slate-400'}`}>{match.teamB.score}</span>
                </td>
                <td className="px-3 py-4 whitespace-nowrap text-sm">
                    <div>
                        <div className="flex items-center gap-2">
                            <img src={getPlayer(match.teamB.players[0])?.avatar} alt={getPlayer(match.teamB.players[0])?.name} className="w-8 h-8 rounded-full object-cover" onError={(e) => { e.currentTarget.src = 'https://placehold.co/32x32/1e293b/FFFFFF?text=P3'; }} />
                            {getPlayer(match.teamB.players[0])?.name || '??'}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                            <img src={getPlayer(match.teamB.players[1])?.avatar} alt={getPlayer(match.teamB.players[1])?.name} className="w-8 h-8 rounded-full object-cover" onError={(e) => { e.currentTarget.src = 'https://placehold.co/32x32/1e293b/FFFFFF?text=P4'; }} />
                            {getPlayer(match.teamB.players[1])?.name || '??'}
                        </div>
                    </div>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={5} className="text-center text-slate-400 py-8">Nenhuma partida encontrada para os filtros selecionados.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MatchHistory;