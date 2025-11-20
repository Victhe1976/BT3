import React, { useState, useMemo } from 'react';
// DayOfWeek removido para resolver TS6133
import { Match, Player, IndividualRanking, TeamSuggestion } from '../../types';
import { WhatsAppIcon, SparklesIcon } from './Icons';
import { getBalancedTeamSuggestion } from '../services/geminiService';
import { calculateIndividualRankings } from '../services/rankingService';

interface MatchRegistryProps {
  players: Player[];
  matches: Match[];
  addMatches: (matches: Match[]) => void;
}

type DailyMatch = Omit<Match, 'id' | 'dayId' | 'date'>;

const MatchRegistry: React.FC<MatchRegistryProps> = ({ players, matches, addMatches }) => {
  const [matchDate, setMatchDate] = useState(new Date().toISOString().split('T')[0]);
  const [teamA, setTeamA] = useState<string[]>([]);
  const [teamB, setTeamB] = useState<string[]>([]);
  const [scoreA, setScoreA] = useState(0);
  const [scoreB, setScoreB] = useState(0);
  
  const [dailyMatches, setDailyMatches] = useState<DailyMatch[]>([]);
  const [isConfirming, setIsConfirming] = useState(false);
  const [dayConfirmations, setDayConfirmations] = useState<Record<string, boolean>>({});

  const [attendedPlayerIds, setAttendedPlayerIds] = useState<Set<string>>(new Set());
  const [attendanceConfirmed, setAttendanceConfirmed] = useState(false);
  
  const [lastFinalizedMatches, setLastFinalizedMatches] = useState<Match[] | null>(null);

  const [isSuggestionModalOpen, setIsSuggestionModalOpen] = useState(false);
  const [isSuggestingTeams, setIsSuggestingTeams] = useState(false);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);
  const [teamSuggestion, setTeamSuggestion] = useState<TeamSuggestion | null>(null);

  const selectedPlayerIds = useMemo(() => new Set([...teamA, ...teamB]), [teamA, teamB]);
  const today = new Date().toISOString().split('T')[0];

  const attendedPlayers = useMemo(() => {
    if (!attendanceConfirmed) return [];
    return players.filter(p => attendedPlayerIds.has(p.id)).sort((a,b) => a.name.localeCompare(b.name));
  }, [players, attendedPlayerIds, attendanceConfirmed]);
  
  const playerMap = useMemo(() => new Map(players.map(p => [p.id, p])), [players]);
  const playerNameMap = useMemo(() => new Map(players.map(p => [p.name.toLowerCase(), p])), [players]);

  const handleAttendanceToggle = (playerId: string) => {
    setAttendedPlayerIds(prev => {
        const newSet = new Set(prev);
        if (newSet.has(playerId)) {
            newSet.delete(playerId);
        } else {
            newSet.add(playerId);
        }
        return newSet;
    });
  };

  const handleConfirmAttendance = () => {
    if (attendedPlayerIds.size < 4) {
        alert("Pelo menos 4 jogadores devem ser selecionados para iniciar os jogos.");
        return;
    }
    setAttendanceConfirmed(true);
  };

  const handlePlayerSelect = (playerId: string) => {
    if (selectedPlayerIds.has(playerId)) {
      setTeamA(prev => prev.filter(id => id !== playerId));
      setTeamB(prev => prev.filter(id => id !== playerId));
    } else {
      if (teamA.length < 2) {
        setTeamA(prev => [...prev, playerId]);
      } else if (teamB.length < 2) {
        setTeamB(prev => [...prev, playerId]);
      }
    }
  };
  
  const resetMatchForm = () => {
    setTeamA([]);
    setTeamB([]);
    setScoreA(0);
    setScoreB(0);
  }

  const handleAddMatchToDay = () => {
    if (teamA.length !== 2 || teamB.length !== 2) {
      alert("Ambas as duplas devem ter 2 jogadores.");
      return;
    }
    if (scoreA !== 4 && scoreB !== 4) {
      alert("Uma dupla deve atingir 4 games para vencer.");
      return;
    }
    
    const newMatch: DailyMatch = {
      teamA: { players: [teamA[0], teamA[1]], score: scoreA },
      teamB: { players: [teamB[0], teamB[1]], score: scoreB },
    };
    setDailyMatches(prev => [...prev, newMatch]);
    resetMatchForm();
  };

  const handleFinalizeDay = () => {
    const allParticipants = dailyParticipants.every(p => dayConfirmations[p.id]);
    if (!allParticipants) {
        alert("Todos os jogadores que participaram hoje devem confirmar os resultados.");
        return;
    }

    const lastMatchDayId = matches.reduce((maxId, match) => Math.max(maxId, match.dayId), 0);
    
    const dateParts = matchDate.split('-').map(Number);
    const utcDate = new Date(Date.UTC(dateParts[0], dateParts[1] - 1, dateParts[2]));

    const matchesToAdd: Match[] = dailyMatches.map((dm, index) => ({
      ...dm,
      id: `${utcDate.getTime()}-${lastMatchDayId + index + 1}`,
      date: utcDate.toISOString(),
      dayId: lastMatchDayId + index + 1,
    }));

    addMatches(matchesToAdd);
    setLastFinalizedMatches(matchesToAdd);
    
    setIsConfirming(false);
    setDayConfirmations({});
  };
  
  const handleStartNewDay = () => {
    setLastFinalizedMatches(null);
    setDailyMatches([]);
    resetMatchForm();
    setAttendanceConfirmed(false);
    setAttendedPlayerIds(new Set());
  };

  const shareDayResults = () => {
    if (!lastFinalizedMatches || lastFinalizedMatches.length === 0) return;

    const date = new Date(lastFinalizedMatches[0].date).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
    let message = `*Resumo dos Jogos - BT dos Parça (${date})* 🎾\n\n`;

    lastFinalizedMatches.forEach((match, index) => {
        const teamAPlayers = match.teamA.players.map(pId => playerMap.get(pId)?.name).filter(name => name).join(' & ');
        const teamBPlayers = match.teamB.players.map(pId => playerMap.get(pId)?.name).filter(name => name).join(' & ');
        
        message += `*Jogo ${index + 1}:*\n`;
        message += `(A) ${teamAPlayers} vs (B) ${teamBPlayers}\n`;
        message += `Placar: *${match.teamA.score}* x ${match.teamB.score}\n\n`;
    });

    const encodedText = encodeURIComponent(message);
    const url = `https://wa.me/?text=${encodedText}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };
  
  const handleSuggestTeams = async () => {
    setIsSuggestionModalOpen(true);
    setIsSuggestingTeams(true);
    setSuggestionError(null);
    setTeamSuggestion(null);

    try {
        const allPlayerRankings = calculateIndividualRankings(matches, players);
        // Filtra para manter o tipo IndividualRanking para o serviço Gemini
        const attendedPlayerRankings: IndividualRanking[] = allPlayerRankings.filter(p => attendedPlayerIds.has(p.playerId)); 
        
        if (attendedPlayerRankings.length < 4) {
            throw new Error("Não há dados suficientes de 4 ou mais jogadores para sugerir duplas.");
        }
        
        const suggestion = await getBalancedTeamSuggestion(attendedPlayerRankings);
        setTeamSuggestion(suggestion);
    } catch (error) {
        console.error(error);
        setSuggestionError((error as Error).message || "Erro desconhecido ao montar sugestão.");
    } finally {
        setIsSuggestingTeams(false);
    }
  };

  const handleUseSuggestion = (matchupIndex: number) => {
    if (!teamSuggestion || !teamSuggestion.matchups[matchupIndex]) return;
    const matchup = teamSuggestion.matchups[matchupIndex];

    const player1A = playerNameMap.get(matchup.teamA.player1.toLowerCase());
    const player2A = playerNameMap.get(matchup.teamA.player2.toLowerCase());
    const player1B = playerNameMap.get(matchup.teamB.player1.toLowerCase());
    const player2B = playerNameMap.get(matchup.teamB.player2.toLowerCase());

    if (player1A && player2A && player1B && player2B) {
        setTeamA([player1A.id, player2A.id]);
        setTeamB([player1B.id, player2B.id]);
    } else {
        alert("Não foi possível encontrar todos os jogadores sugeridos no seu cadastro. Por favor, selecione manualmente ou verifique os nomes.");
    }
    setIsSuggestionModalOpen(false);
  };


  const scoreOptions = [0, 1, 2, 3, 4];

  const handleScoreChange = (team: 'A' | 'B', value: number) => {
    if (team === 'A') {
        setScoreA(value);
        if (value === 4 && scoreB === 4) setScoreB(3);
    } else {
        setScoreB(value);
        if (value === 4 && scoreA === 4) setScoreA(3);
    }
  }
  
  const dailyParticipants = useMemo(() => {
    const participantIds = new Set<string>();
    dailyMatches.forEach(m => {
        m.teamA.players.forEach(pId => participantIds.add(pId));
        m.teamB.players.forEach(pId => participantIds.add(pId));
    });
    return players.filter(p => participantIds.has(p.id));
  }, [dailyMatches, players]);

  return (
    <div className="space-y-8 text-slate-200">
      <div className="bg-slate-800 p-8 rounded-xl shadow-lg">
        <h2 className="text-3xl font-bold text-cyan-400 mb-6">
          {lastFinalizedMatches ? 'Resultados do Dia Registrados!' : 'Registrar Partidas do Dia'}
        </h2>
        
      {lastFinalizedMatches ? (
        <div className="text-center">
            <p className="text-lg text-green-400 mb-4">
                {lastFinalizedMatches.length} partidas registradas com sucesso para {new Date(lastFinalizedMatches[0].date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}!
            </p>
            <p className="text-slate-300 mb-8">
                Compartilhe o resultado com os parças ou inicie um novo dia de jogos.
            </p>
            <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
                <button 
                    onClick={shareDayResults} 
                    className="flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-lg transition-transform transform hover:scale-105 w-full sm:w-auto"
                >
                    <WhatsAppIcon className="h-6 w-6" />
                    Compartilhar no WhatsApp
                </button>
                <button 
                    onClick={handleStartNewDay} 
                    className="bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-3 px-6 rounded-lg transition-transform transform hover:scale-105 w-full sm:w-auto"
                >
                    Registrar Novo Dia
                </button>
            </div>
        </div>
      ) : (
        <>
            <div className="mb-6">
                <label htmlFor="match-date" className="block text-lg font-medium text-slate-300 mb-2">Data das Partidas</label>
                <input
                    id="match-date"
                    type="date"
                    value={matchDate}
                    onChange={e => setMatchDate(e.target.value)}
                    max={today}
                    className="w-full sm:w-auto bg-slate-700 border border-slate-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-cyan-500 focus:border-cyan-500"
                    disabled={dailyMatches.length > 0 || attendanceConfirmed}
                />
                {(dailyMatches.length > 0 || attendanceConfirmed) && <p className="text-xs text-slate-400 mt-1">Finalize o dia atual para mudar a data.</p>}
                </div>

                {!attendanceConfirmed ? (
                    <div>
                        <h3 className="text-xl font-semibold mb-4 text-slate-300">1. Selecionar Jogadores Presentes</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 max-h-96 overflow-y-auto p-4 bg-slate-900/50 rounded-lg mb-6">
                            {[...players].sort((a,b) => a.name.localeCompare(b.name)).map(player => (
                                <label key={player.id} className={`p-2 rounded-lg text-center cursor-pointer transition-all duration-200 flex flex-col items-center gap-2 ${attendedPlayerIds.has(player.id) ? 'bg-cyan-500/80 ring-2 ring-cyan-400' : 'bg-slate-700 hover:bg-slate-600'}`}>
                                    <input type="checkbox" className="hidden" onChange={() => handleAttendanceToggle(player.id)} checked={attendedPlayerIds.has(player.id)} />
                                    <img src={player.avatar} alt={player.name} className="w-16 h-16 rounded-full mx-auto object-cover" />
                                    <p className="text-sm font-medium truncate">{player.name}</p>
                                </label>
                            ))}
                        </div>
                        <div className="flex justify-end">
                            <button 
                                onClick={handleConfirmAttendance} 
                                className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-6 rounded-lg transition-transform transform hover:scale-105 disabled:bg-slate-600 disabled:cursor-not-allowed disabled:scale-100"
                                disabled={attendedPlayerIds.size < 4}
                            >
                                Confirmar Presença ({attendedPlayerIds.size}) e Iniciar Jogos
                            </button>
                        </div>
                    </div>
                ) : (
                    <div>
                        <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
                            <h3 className="text-xl font-semibold text-slate-300">2. Registrar Partidas</h3>
                            <div className="flex gap-2">
                                <button onClick={handleSuggestTeams} className="flex items-center gap-2 text-sm text-white font-semibold py-2 px-3 bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-600 hover:to-cyan-600 rounded-md transition-all transform hover:scale-105">
                                    <SparklesIcon className="h-5 w-5" />
                                    Sugerir Duplas com IA
                                </button>
                                <button onClick={() => setAttendanceConfirmed(false)} className="text-sm text-cyan-400 hover:text-cyan-300 font-semibold py-2 px-3 bg-slate-700/50 hover:bg-slate-700 rounded-md">
                                    Editar Presentes
                                </button>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Match Entry */}
                        <div>
                            <h3 className="text-xl font-semibold mb-4">Adicionar Partida</h3>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-h-96 overflow-y-auto p-2 bg-slate-900/50 rounded-lg mb-4">
                            {attendedPlayers.map(player => (
                                <div
                                key={player.id}
                                onClick={() => handlePlayerSelect(player.id)}
                                className={`p-2 rounded-lg text-center cursor-pointer transition-all duration-200 ${
                                    selectedPlayerIds.has(player.id)
                                    ? teamA.includes(player.id) ? 'bg-green-500/80 ring-2 ring-green-400' : 'bg-blue-500/80 ring-2 ring-blue-400'
                                    : 'bg-slate-700 hover:bg-slate-600'
                                }`}
                                >
                                <img src={player.avatar} alt={player.name} className="w-16 h-16 rounded-full mx-auto object-cover" />
                                <p className="mt-2 text-sm font-medium truncate">{player.name}</p>
                                </div>
                            ))}
                            </div>
                            {/* Teams & Score */}
                            <div className="space-y-4">
                            <div className="bg-slate-700/50 p-4 rounded-lg">
                                <h4 className="font-bold text-green-400">Dupla A</h4>
                                <div className="flex items-center gap-4 mt-2">
                                <div className="flex-1 flex gap-2">
                                    {teamA.map(id => playerMap.get(id)).map(p => p && (
                                    <div key={p.id} className="flex flex-col items-center">
                                        <img src={p.avatar} alt={p.name} className="w-12 h-12 rounded-full object-cover" />
                                        <span className="text-xs mt-1">{p.name}</span>
                                    </div>
                                    ))}
                                    {Array(2 - teamA.length).fill(0).map((_, i) => <div key={i} className="w-12 h-12 rounded-full bg-slate-600" />)}
                                </div>
                                <select value={scoreA} onChange={e => handleScoreChange('A', parseInt(e.target.value))} className="bg-slate-600 text-white font-bold text-2xl rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-cyan-500">
                                    {scoreOptions.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                                </div>
                            </div>
                            <div className="bg-slate-700/50 p-4 rounded-lg">
                                <h4 className="font-bold text-blue-400">Dupla B</h4>
                                <div className="flex items-center gap-4 mt-2">
                                <div className="flex-1 flex gap-2">
                                    {teamB.map(id => playerMap.get(id)).map(p => p && (
                                    <div key={p.id} className="flex flex-col items-center">
                                        <img src={p.avatar} alt={p.name} className="w-12 h-12 rounded-full object-cover" />
                                        <span className="text-xs mt-1">{p.name}</span>
                                    </div>
                                    ))}
                                    {Array(2 - teamB.length).fill(0).map((_, i) => <div key={i} className="w-12 h-12 rounded-full bg-slate-600" />)}
                                </div>
                                <select value={scoreB} onChange={e => handleScoreChange('B', parseInt(e.target.value))} className="bg-slate-600 text-white font-bold text-2xl rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-cyan-500">
                                    {scoreOptions.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                                </div>
                            </div>
                            </div>
                            <div className="mt-4 flex justify-end">
                            <button onClick={handleAddMatchToDay} className="bg-cyan-500 text-white font-bold py-2 px-4 rounded-lg transition-all duration-300 hover:bg-cyan-600">
                                Adicionar Partida ao Dia
                            </button>
                            </div>
                        </div>

                        {/* Daily Matches List */}
                        <div>
                            <h3 className="text-xl font-semibold mb-4">Partidas de Hoje ({dailyMatches.length})</h3>
                            <div className="space-y-3 max-h-96 overflow-y-auto p-2 bg-slate-900/50 rounded-lg">
                            {dailyMatches.length > 0 ? dailyMatches.map((match, index) => (
                                <div key={index} className="bg-slate-700 p-3 rounded-md">
                                <p className="font-bold text-slate-300 mb-2">Jogo {index + 1}</p>
                                <div className="flex justify-between items-center text-sm">
                                    <div className="flex items-center gap-2">
                                    <span className="font-semibold text-green-400">Dupla A:</span>
                                    <span>{match.teamA.players.map(pId => playerMap.get(pId)?.name).filter(name => name).join(' & ')}</span>
                                    </div>
                                    <span className="font-black text-lg">{match.teamA.score}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <div className="flex items-center gap-2">
                                    <span className="font-semibold text-blue-400">Dupla B:</span>
                                    <span>{match.teamB.players.map(pId => playerMap.get(pId)?.name).filter(name => name).join(' & ')}</span>
                                    </div>
                                    <span className="font-black text-lg">{match.teamB.score}</span>
                                </div>
                                </div>
                            )) : <p className="text-center text-slate-400 p-4">Nenhuma partida adicionada para esta data ainda.</p>}
                            </div>
                            {dailyMatches.length > 0 && (
                                <div className="mt-4 flex justify-end">
                                    <button onClick={() => setIsConfirming(true)} className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg">
                                        Encerrar Jogos do Dia
                                    </button>
                                </div>
                            )}
                        </div>
                        </div>
                    </div>
                )}
            </>
        )}
      </div>
      
      {isConfirming && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-lg shadow-xl p-8 w-full max-w-lg text-slate-200">
              <h2 className="text-2xl font-bold mb-4 text-cyan-400">Confirmação dos Resultados</h2>
              <p className="text-slate-300 mb-2">Confira os jogos de hoje:</p>
               <div className="space-y-2 max-h-40 overflow-y-auto p-2 bg-slate-900/50 rounded-lg mb-4 border border-slate-700">
                    {dailyMatches.map((match, index) => (
                        <div key={index} className="bg-slate-700/50 p-2 rounded-md text-sm">
                            <p className="font-bold text-slate-300 mb-1">Jogo {index + 1}</p>
                            <div className="flex justify-between items-center">
                                <span>{playerMap.get(match.teamA.players[0])?.name} & {playerMap.get(match.teamA.players[1])?.name}</span>
                                <span className="font-bold text-green-400">{match.teamA.score}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span>{playerMap.get(match.teamB.players[0])?.name} & {playerMap.get(match.teamB.players[1])?.name}</span>
                                <span className="font-bold text-blue-400">{match.teamB.score}</span>
                            </div>
                        </div>
                    ))}
                </div>
              <p className="text-slate-300 mb-6">Todos os jogadores que participaram hoje devem confirmar os placares antes de registrar permanentemente.</p>
               <div className="space-y-3 max-h-60 overflow-y-auto p-2 bg-slate-900/50 rounded-lg">
                    {dailyParticipants.map(p => (
                      <label key={p.id} className="flex items-center gap-3 cursor-pointer p-2 bg-slate-700 rounded-md">
                        <input type="checkbox" checked={!!dayConfirmations[p.id]} onChange={(e) => setDayConfirmations(prev => ({...prev, [p.id]: e.target.checked}))}
                        className="form-checkbox h-5 w-5 text-cyan-600 bg-slate-800 border-slate-600 rounded focus:ring-cyan-500"/>
                        <img src={p.avatar} alt={p.name} className="w-8 h-8 rounded-full object-cover" />
                        <span>{p.name}</span>
                      </label>
                    ))}
                </div>
              <div className="flex justify-end gap-4 pt-6">
                <button type="button" onClick={() => setIsConfirming(false)} className="py-2 px-4 bg-slate-600 hover:bg-slate-500 text-white font-semibold rounded-lg">Cancelar</button>
                <button 
                    onClick={handleFinalizeDay} 
                    disabled={!dailyParticipants.every(p => dayConfirmations[p.id])}
                    className="py-2 px-4 bg-cyan-500 hover:bg-cyan-600 text-white font-semibold rounded-lg disabled:bg-slate-600 disabled:cursor-not-allowed"
                >
                    Confirmar e Salvar Resultados
                </button>
              </div>
          </div>
        </div>
      )}

      {isSuggestionModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-lg shadow-xl p-8 w-full max-w-2xl text-slate-200">
              <div className="flex items-center gap-3 mb-4">
                <SparklesIcon className="h-7 w-7 text-cyan-400"/>
                <h2 className="text-2xl font-bold text-cyan-400">Sugestões de Duplas da IA</h2>
              </div>
              {isSuggestingTeams && <div className="text-center p-8"><div className="animate-spin rounded-full h-16 w-16 border-b-2 border-cyan-400 mx-auto"></div><p className="mt-4">Analisando estatísticas e montando as melhores duplas...</p></div>}
              {suggestionError && <div className="p-4 bg-red-900/50 border border-red-500 text-red-300 rounded-md"><strong>Erro:</strong> {suggestionError}</div>}
              {teamSuggestion && (
                  <div>
                    <div className="space-y-4 mb-6">
                        {teamSuggestion.matchups.map((matchup, index) => (
                            <div key={index} className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
                                <h3 className="font-bold text-lg text-slate-300 mb-3">Sugestão de Jogo {index + 1}</h3>
                                <div className="flex flex-col sm:flex-row items-center justify-around text-center">
                                    <div className="flex items-center gap-2 p-2">
                                        <div className="flex flex-col items-center w-20">
                                            <img 
                                                src={playerNameMap.get(matchup.teamA.player1.toLowerCase())?.avatar || 'https://placehold.co/48x48/1e293b/FFFFFF?text=P'} 
                                                className="w-12 h-12 rounded-full object-cover" 
                                                alt={matchup.teamA.player1} 
                                            />
                                            <span>{matchup.teamA.player1}</span>
                                        </div>
                                        <span className="text-xl">+</span>
                                        <div className="flex flex-col items-center w-20">
                                            <img 
                                                src={playerNameMap.get(matchup.teamA.player2.toLowerCase())?.avatar || 'https://placehold.co/48x48/1e293b/FFFFFF?text=P'} 
                                                className="w-12 h-12 rounded-full object-cover" 
                                                alt={matchup.teamA.player2} 
                                            />
                                            <span>{matchup.teamA.player2}</span>
                                        </div>
                                    </div>
                                    <span className="font-bold text-cyan-400 text-2xl my-2 sm:my-0">VS</span>
                                    <div className="flex items-center gap-2 p-2">
                                        <div className="flex flex-col items-center w-20">
                                            <img 
                                                src={playerNameMap.get(matchup.teamB.player1.toLowerCase())?.avatar || 'https://placehold.co/48x48/1e293b/FFFFFF?text=P'} 
                                                className="w-12 h-12 rounded-full object-cover" 
                                                alt={matchup.teamB.player1} 
                                            />
                                            <span>{matchup.teamB.player1}</span>
                                        </div>
                                        <span className="text-xl">+</span>
                                        <div className="flex flex-col items-center w-20">
                                            <img 
                                                src={playerNameMap.get(matchup.teamB.player2.toLowerCase())?.avatar || 'https://placehold.co/48x48/1e293b/FFFFFF?text=P'} 
                                                className="w-12 h-12 rounded-full object-cover" 
                                                alt={matchup.teamB.player2} 
                                            />
                                            <span>{matchup.teamB.player2}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-center mt-3">
                                  <button onClick={() => handleUseSuggestion(index)} className="bg-cyan-600 hover:bg-cyan-700 text-white font-semibold py-1 px-3 rounded-md text-sm">
                                    Usar para este jogo
                                  </button>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="p-4 bg-slate-700/50 rounded-lg">
                        <h4 className="font-semibold text-slate-300">Análise da IA</h4>
                        <p className="text-slate-400 text-sm mt-1">{teamSuggestion.rationale}</p>
                    </div>
                  </div>
              )}
               <div className="flex justify-end gap-4 pt-6">
                <button type="button" onClick={() => setIsSuggestionModalOpen(false)} className="py-2 px-4 bg-slate-600 hover:bg-slate-500 text-white font-semibold rounded-lg">Fechar</button>
               </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MatchRegistry;