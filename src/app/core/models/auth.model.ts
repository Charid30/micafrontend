/* ==================================================================
 *  Auteur : BATIONO Ulrich Rachid Kévin
 *           Expert en Sécurité Informatique
 *           Développeur FullStack
 *           Tel: +226 51 57 82 89 // 66 72 02 32
 *           Whatsapp: +226 51 57 82 89
 *           Mail: bkevin@sonabhy.bf // bationor10@gmail.com
 *  Projet : MICA – SONABHY
 * ================================================================== */
export interface LoginRequest {
  username: string;
  password: string;
}

export interface Permission {
  id: number;
  module: string;
  action: string;
  depot_id?: number | null;
  depot?: { id: number; code: string; libelle: string; type: 'INTERIEUR' | 'EXTERIEUR' } | null;
}

export interface Agent {
  id: number;
  matricule: string;
  nom: string;
  prenoms: string;
  direction?: Direction;
}

export interface Direction {
  id: number;
  acronyme: string;
  description: string;
  entreprise?: Entreprise;
}

export interface Entreprise {
  id: number;
  nom: string;
  acronyme: string;
}

export interface Utilisateur {
  id: number;
  username: string;
  email: string;
  is_admin: boolean;
  must_change_password?: boolean;
  agent: Agent;
  permissions: Permission[];
}

export interface AuthResponse {
  utilisateur: Utilisateur;
}
