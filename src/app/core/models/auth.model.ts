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
  mot_de_passe_expire?: boolean;                 // changement exige parce que le mot de passe a expire
  mot_de_passe?: { expire_le: string | null; jours_restants: number | null; rappel: boolean };
  double_auth_requise?: boolean;                 // administrateur : configuration obligatoire
  double_auth_active?: boolean;
  double_auth_echeance?: string | null;         // obligation annoncee : date limite de configuration
  codes_secours_restants?: number;               // connexion avec un code de secours
  agent: Agent;
  permissions: Permission[];
}

export interface AuthResponse {
  utilisateur?: Utilisateur;
  double_auth?: boolean;          // mot de passe correct : code de double authentification demande
}
