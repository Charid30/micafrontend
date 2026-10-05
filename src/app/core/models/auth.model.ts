export interface LoginRequest {
  username: string;
  password: string;
}

export interface Permission {
  id: number;
  module: string;
  action: string;
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
  token: string;
  utilisateur: Utilisateur;
}
