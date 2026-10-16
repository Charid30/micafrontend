/* ==================================================================
 *  Auteur : BATIONO Ulrich Rachid Kévin
 *           Expert en Sécurité Informatique
 *           Développeur FullStack
 *           Tel: +226 51 57 82 89 // 66 72 02 32
 *           Whatsapp: +226 51 57 82 89
 *           Mail: bkevin@sonabhy.bf // bationor10@gmail.com
 *  Projet : MICA – SONABHY
 * ================================================================== */
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

// Boites de dialogue de l'application (remplacent confirm() / alert() du navigateur).
// Usage :  if (!(await this.dialog.confirmer({ titre: 'Supprimer ?', message: '...', danger: true }))) return;
export interface DialogOptions {
  titre: string;
  message?: string;
  confirmer?: string;              // libelle du bouton de validation
  annuler?: string | null;         // null : pas de bouton Annuler (simple information)
  danger?: boolean;                // action destructive : icone et bouton rouges
}

export interface DialogOuvert extends Required<Omit<DialogOptions, 'annuler'>> {
  annuler: string | null;
  resoudre: (ok: boolean) => void;
}

@Injectable({ providedIn: 'root' })
export class DialogService {
  private _dialog = new BehaviorSubject<DialogOuvert | null>(null);
  dialog$ = this._dialog.asObservable();

  confirmer(options: DialogOptions): Promise<boolean> {
    // Une seule boite a la fois : une demande en cours est consideree comme annulee
    this._dialog.value?.resoudre(false);
    return new Promise<boolean>(resolve => {
      this._dialog.next({
        titre: options.titre,
        message: options.message ?? '',
        confirmer: options.confirmer ?? 'Confirmer',
        annuler: options.annuler === undefined ? 'Annuler' : options.annuler,
        danger: options.danger ?? false,
        resoudre: (ok: boolean) => { this._dialog.next(null); resolve(ok); },
      });
    });
  }

  // Confirmation avant tout enregistrement (meme texte et meme bouton partout)
  //   objet   : ce qui est enregistre, ex. « les ventes de la semaine »
  //   message : precision facultative (date d'effet, perimetre...)
  confirmerEnregistrement(objet: string, message = 'Les données saisies seront enregistrées.'): Promise<boolean> {
    return this.confirmer({ titre: `Enregistrer ${objet} ?`, message, confirmer: 'Enregistrer' });
  }

  informer(titre: string, message = ''): Promise<void> {
    return this.confirmer({ titre, message, confirmer: 'Compris', annuler: null }).then(() => undefined);
  }
}
