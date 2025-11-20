import React, { useState, useRef } from 'react';
import { Player } from '../../types';
import { EditIcon, TrashIcon, UserPlusIcon, CameraIcon } from './Icons';
import { storage } from '../firebaseConfig';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
// Linha 9 removida (useFirestoreData)

interface PlayerManagerProps {
  players: Player[];
  pendingPlayers: string[];
  addPlayer: (player: Omit<Player, 'id'>) => void;
  updatePlayer: (player: Player) => void;
  deletePlayer: (playerId: string) => void;
}

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

const PlayerManager: React.FC<PlayerManagerProps> = ({ players, pendingPlayers, addPlayer, updatePlayer, deletePlayer }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [playerToDelete, setPlayerToDelete] = useState<Player | null>(null);
  const [uploading, setUploading] = useState(false);

  const openModal = (player: Player | null = null, pendingName: string | null = null) => {
    setEditingPlayer(player);
    setName(player?.name || pendingName || '');
    setDob(player?.dob || '');
    setAvatarPreview(player?.avatar || null);
    setAvatarFile(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingPlayer(null);
    setName('');
    setDob('');
    setAvatarPreview(null);
    setAvatarFile(null);
  };

  const openDeleteModal = (player: Player) => {
    setPlayerToDelete(player);
    setIsDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setPlayerToDelete(null);
    setIsDeleteModalOpen(false);
  };

  const handleDeleteConfirm = () => {
    if (playerToDelete) {
      deletePlayer(playerToDelete.id);
      closeDeleteModal();
    }
  };

  const uploadAvatarAndGetURL = async (file: File, playerName: string): Promise<string> => {
    if (!file) return '';

    const fileExtension = file.name.split('.').pop();
    const fileName = `${playerName.replace(/\s/g, '_')}_${Date.now()}.${fileExtension}`;
    const imageRef = ref(storage, `avatares/${fileName}`);

    await uploadBytes(imageRef, file);

    return getDownloadURL(imageRef);
  };


  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !dob) return;
    
    setUploading(true);

    try {
      let finalAvatarURL = avatarPreview;
      
      if (avatarFile) {
        finalAvatarURL = await uploadAvatarAndGetURL(avatarFile, name);
      } else if (!editingPlayer && !avatarPreview) {
        finalAvatarURL = `https://avatar.iran.liara.run/public/boy?username=${encodeURIComponent(name)}${Date.now()}`;
      }
      
      const playerData: Omit<Player, 'id'> = { name, dob, avatar: finalAvatarURL || '' };

      if (editingPlayer) {
        updatePlayer({ ...editingPlayer, ...playerData, id: editingPlayer.id });
      } else {
        addPlayer(playerData);
      }

      closeModal();
    } catch (error) {
      console.error("Erro ao salvar jogador e/ou avatar:", error);
    } finally {
      setUploading(false);
    }
  };
  
  const defaultAvatar = `https://avatar.iran.liara.run/public/boy?username=BT_Player`;

  return (
    <div className="space-y-8 text-slate-200 p-8 bg-slate-900 rounded-xl shadow-2xl">
      <div>
        <h2 className="text-3xl font-bold text-cyan-400 mb-4">Gerenciar Jogadores</h2>
        <div className="flex gap-4">
            <button onClick={() => openModal()} className="flex items-center justify-center gap-2 bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-2 px-4 rounded-lg transition-transform transform hover:scale-105">
                <UserPlusIcon className="h-5 w-5" />
                Adicionar Novo Jogador
            </button>
        </div>
      </div>

      {pendingPlayers.length > 0 && (
        <div className="bg-yellow-900/50 border border-yellow-500 text-yellow-300 p-4 rounded-lg">
          <h3 className="font-bold text-lg">Registros Pendentes</h3>
          <p className="text-sm mb-3">Os seguintes jogadores foram encontrados na planilha importada. Por favor, complete o cadastro deles.</p>
          <div className="flex flex-wrap gap-3">
            {pendingPlayers.map(pName => (
              <button 
                key={pName}
                onClick={() => openModal(null, pName)}
                className="bg-yellow-600 hover:bg-yellow-500 text-white font-semibold py-1 px-3 rounded-md text-sm"
              >
                {pName}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {[...players].sort((a, b) => a.name.localeCompare(b.name)).map(player => (
          <div key={player.id} className="bg-slate-800 rounded-xl shadow-lg p-6 flex flex-col items-center text-center transform transition-all duration-300 hover:scale-105 hover:bg-slate-700">
            <img src={player.avatar || defaultAvatar} alt={player.name} className="w-24 h-24 rounded-full border-4 border-cyan-400 object-cover" />
            <h3 className="mt-4 text-xl font-semibold text-white">{player.name}</h3>
            <p className="text-slate-400">Idade: {calculateAge(player.dob)}</p>
            <div className="flex gap-4 mt-4">
              <button onClick={() => openModal(player)} className="p-2 text-slate-400 hover:text-cyan-400 transition-colors">
                <EditIcon className="h-5 w-5" />
              </button>
              <button onClick={() => openDeleteModal(player)} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
                <TrashIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-lg shadow-xl p-8 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-6 text-cyan-400">{editingPlayer ? 'Editar Jogador' : 'Adicionar Novo Jogador'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
               <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <img 
                    src={avatarPreview || defaultAvatar} 
                    alt="Avatar preview" 
                    className="w-32 h-32 rounded-full object-cover border-4 border-slate-600" 
                  />
                  <button 
                    type="button" 
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-0 right-0 bg-cyan-500 rounded-full p-2 text-white hover:bg-cyan-600 transition-colors"
                    aria-label="Change avatar"
                  >
                    <CameraIcon className="w-5 h-5" />
                  </button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </div>

              <div>
                <label htmlFor="name" className="block text-sm font-medium text-slate-300">Nome / Apelido</label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="mt-1 block w-full bg-slate-700 border border-slate-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-cyan-500 focus:border-cyan-500"
                  required
                />
              </div>
              <div>
                <label htmlFor="dob" className="block text-sm font-medium text-slate-300">Data de Nascimento</label>
                <input
                  id="dob"
                  type="date"
                  value={dob}
                  onChange={e => setDob(e.target.value)}
                  className="mt-1 block w-full bg-slate-700 border border-slate-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-cyan-500 focus:border-cyan-500"
                  required
                />
              </div>
              <div className="flex justify-end gap-4 pt-4">
                <button type="button" onClick={closeModal} className="py-2 px-4 bg-slate-600 hover:bg-slate-500 text-white font-semibold rounded-lg">Cancelar</button>
                <button 
                    type="submit" 
                    disabled={uploading}
                    className="py-2 px-4 bg-cyan-500 hover:bg-cyan-600 text-white font-semibold rounded-lg disabled:bg-cyan-800 disabled:cursor-not-allowed"
                  >
                    {uploading ? 'Salvando...' : editingPlayer ? 'Salvar' : 'Adicionar Jogador'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isDeleteModalOpen && playerToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-lg shadow-xl p-8 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4 text-red-500">Confirmar Exclusão</h2>
            <p className="text-slate-300 mb-6">
              Você tem certeza que deseja excluir o jogador <strong className="font-bold text-white">{playerToDelete.name}</strong>?
            </p>
            <p className="text-slate-400 text-sm bg-slate-900/50 p-3 rounded-md border border-slate-700">
              Esta ação é irreversível e irá remover permanentemente todas as partidas em que este jogador participou.
            </p>
            <div className="flex justify-end gap-4 pt-6">
              <button type="button" onClick={closeDeleteModal} className="py-2 px-4 bg-slate-600 hover:bg-slate-500 text-white font-semibold rounded-lg">
                Cancelar
              </button>
              <button 
                  onClick={handleDeleteConfirm} 
                  className="py-2 px-4 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg"
              >
                Sim, Excluir Jogador
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlayerManager;