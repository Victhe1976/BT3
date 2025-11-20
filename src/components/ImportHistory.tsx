import React, { useState } from 'react';
import { Player, Match } from '../../types';
import { TABS } from '../constants';
import { UploadIcon } from './Icons';

interface ImportHistoryProps {
  players: Player[];
  matches: Match[];
  setPlayers: React.Dispatch<React.SetStateAction<Player[]>>;
  addMatches: (matches: Match[]) => void;
  setPendingPlayers: React.Dispatch<React.SetStateAction<string[]>>;
  setActiveTab: (tab: string) => void;
}

declare const window: any;

const ImportHistory: React.FC<ImportHistoryProps> = ({ players, matches, addMatches, setPendingPlayers, setActiveTab }) => {
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [showNewPlayerPrompt, setShowNewPlayerPrompt] = useState(false);

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportError(null);
    setImportSuccess(null);
    setShowNewPlayerPrompt(false);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = window.XLSX.read(data, { type: 'array', cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json: any[] = window.XLSX.utils.sheet_to_json(worksheet, { raw: false });
        
        // --- VALIDATION SETUP ---
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        const existingMatchDates = new Set(matches.map(m => new Date(m.date).toISOString().split('T')[0]));
        const conflictingDates = new Set<string>();
        const futureDateRows: number[] = [];
        const invalidScoreRows: number[] = [];
        const unknownPlayerNames = new Set<string>();
        const playerMap: Map<string, Player> = new Map(players.map(p => [p.name.toLowerCase(), p]));

        for (let i = 0; i < json.length; i++) {
          const row = json[i];
          const scoreA = parseInt(row['Dupla A'], 10);
          const scoreB = parseInt(row['Dupla B'], 10);
          const playerNames = [row['Jogador 1'], row['Jogador 2'], row['Jogador 3'], row['Jogador 4']];

          // Score validation: must be 0-4 and one team must win 4
          if (isNaN(scoreA) || isNaN(scoreB) || scoreA < 0 || scoreA > 4 || scoreB < 0 || scoreB > 4 || (scoreA !== 4 && scoreB !== 4) || (scoreA === 4 && scoreB === 4)) {
            invalidScoreRows.push(i + 2);
          }

          // Date validation
          const date = new Date(row['Data']);
          if (!isNaN(date.getTime())) {
            if (date > today) {
              futureDateRows.push(i + 2);
            }
            const dateString = date.toISOString().split('T')[0];
            if (existingMatchDates.has(dateString)) {
              conflictingDates.add(date.toLocaleDateString('pt-BR', { timeZone: 'UTC' }));
            }
          } else {
            invalidScoreRows.push(i + 2); // Assuming invalid date is also data error
          }
          
          // Player name validation
          playerNames.forEach(name => {
              if (name && !playerMap.has(name.toString().trim().toLowerCase())) {
                  unknownPlayerNames.add(name.toString().trim());
              }
          });
        }

        // --- ERROR CHECKING ---
        if (conflictingDates.size > 0) {
          setImportError(`Import failed: Games already exist on the following date(s): ${Array.from(conflictingDates).join(', ')}. Please remove them from the spreadsheet.`);
          return;
        }

        if (futureDateRows.length > 0) {
          setImportError(`Import failed: Future dates found on row(s): ${[...new Set(futureDateRows)].join(', ')}. Dates cannot be in the future.`);
          return;
        }

        if (invalidScoreRows.length > 0) {
          setImportError(`Import failed: Invalid data or scores found on row(s): ${[...new Set(invalidScoreRows)].join(', ')}. Scores must be between 0 and 4, and one team must have exactly 4.`);
          return;
        }

        if (unknownPlayerNames.size > 0) {
          setPendingPlayers(Array.from(unknownPlayerNames));
          setShowNewPlayerPrompt(true);
          setImportError(`Import paused: ${unknownPlayerNames.size} new player(s) found in the spreadsheet.`);
          return;
        }
        
        // --- PROCESSING ---
        const importedMatches: Match[] = [];
        json.forEach((row, i) => {
            const date = new Date(row['Data']);
            const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));

            // Normalize and get player IDs safely
            const player1Id = playerMap.get(row['Jogador 1'].trim().toLowerCase())?.id;
            const player2Id = playerMap.get(row['Jogador 2'].trim().toLowerCase())?.id;
            const player3Id = playerMap.get(row['Jogador 3'].trim().toLowerCase())?.id;
            const player4Id = playerMap.get(row['Jogador 4'].trim().toLowerCase())?.id;

            if (player1Id && player2Id && player3Id && player4Id) {
                importedMatches.push({
                    id: `imported-${utcDate.getTime()}-${i}`,
                    dayId: 0, // Will be recalculated by App component
                    date: utcDate.toISOString(),
                    teamA: { players: [player1Id, player2Id], score: parseInt(row['Dupla A'], 10) },
                    teamB: { players: [player3Id, player4Id], score: parseInt(row['Dupla B'], 10) },
                });
            }
        });
        
        addMatches(importedMatches);
        setImportSuccess(`Successfully imported ${importedMatches.length} matches.`);

      } catch (error) {
        console.error("Error parsing Excel file:", error);
        setImportError("Failed to parse the Excel file. Please ensure it's in the correct format and all required columns are present.");
      } finally {
        if (event.target) event.target.value = '';
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="bg-slate-800 p-8 rounded-xl shadow-lg">
      <h2 className="text-3xl font-bold text-cyan-400 mb-2">Importar Histórico de Jogos</h2>
      <p className="text-slate-400 mb-6">Faça o upload de um arquivo Excel com jogos passados. O sistema validará os dados antes da importação.</p>

      <div className="w-full sm:w-auto">
        <label className="flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-lg transition-transform transform hover:scale-105 cursor-pointer">
          <UploadIcon className="h-6 w-6" />
          Importar do Excel (.xlsx, .xls)
          <input type="file" className="hidden" accept=".xlsx, .xls" onChange={handleFileImport} />
        </label>
        {importError && <p className="mt-4 p-3 bg-red-900/50 border border-red-500 text-red-300 rounded-md">{importError}</p>}
        {importSuccess && <p className="mt-4 p-3 bg-green-900/50 border border-green-500 text-green-300 rounded-md">{importSuccess}</p>}
        {showNewPlayerPrompt && (
          <div className="mt-4 p-4 bg-yellow-900/50 border border-yellow-500 text-yellow-300 rounded-md">
            <p className="font-semibold">Ação Necessária: Jogadores não registrados foram encontrados.</p>
            <p className="text-sm mb-3">Para continuar, por favor, complete o cadastro deles na aba 'Jogadores' e importe o arquivo novamente.</p>
            <button
              onClick={() => setActiveTab(TABS.PLAYERS)}
              className="bg-yellow-600 hover:bg-yellow-500 text-white font-bold py-2 px-4 rounded-lg"
            >
              Ver Novos Registros
            </button>
          </div>
        )}
      </div>

      <div className="mt-6 text-slate-300 p-4 bg-slate-900/50 rounded-lg">
        <h4 className="font-semibold text-lg mb-2">Formato da Planilha:</h4>
        <p className="text-sm mb-2">O formato de importação é o mesmo da planilha exportada da aba 'Histórico'. A coluna 'Nº do Jogo' será ignorada.</p>
        <ul className="list-disc list-inside space-y-1 text-sm">
          <li>Coluna 'Data': Data do Jogo (ex: 25/12/2024). Não pode ser uma data futura.</li>
          <li>Coluna 'Jogador 1': Nome do Jogador 1 (Dupla A)</li>
          <li>Coluna 'Jogador 2': Nome do Jogador 2 (Dupla A)</li>
          <li>Coluna 'Dupla A': Games da Dupla A (0-4)</li>
          <li>Coluna 'Dupla B': Games da Dupla B (0-4)</li>
          <li>Coluna 'Jogador 3': Nome do Jogador 1 (Dupla B)</li>
          <li>Coluna 'Jogador 4': Nome do Jogador 2 (Dupla B)</li>
        </ul>
      </div>
    </div>
  );
};

export default ImportHistory;