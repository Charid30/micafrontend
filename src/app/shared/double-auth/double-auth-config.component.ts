/* ==================================================================
 *  Auteur : BATIONO Ulrich Rachid Kévin
 *           Expert en Sécurité Informatique
 *           Développeur FullStack
 *           Tel: +226 51 57 82 89 // 66 72 02 32
 *           Whatsapp: +226 51 57 82 89
 *           Mail: bkevin@sonabhy.bf // bationor10@gmail.com
 *  Projet : MICA – SONABHY
 *  Merci
 * ================================================================== */
import { Component, ChangeDetectorRef, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/services/auth.service';

// Configuration de la double authentification (application d'authentification sur telephone)
//  mode 'profil'      : etat, activation, nouveaux codes de secours, desactivation (si non obligatoire)
//  mode 'obligatoire' : activation seule (administrateur a la connexion)
@Component({
  selector: 'app-double-auth-config',
  templateUrl: './double-auth-config.component.html',
  standalone: false,
})
export class DoubleAuthConfigComponent implements OnInit {
  @Input() mode: 'profil' | 'obligatoire' = 'profil';
  @Output() activee = new EventEmitter<void>();

  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly api = `${environment.apiUrl}/profil/2fa`;

  etat: { active: boolean; active_le: string | null; obligatoire: boolean; echeance: string | null; requise: boolean; codes_secours_restants: number } | null = null;
  etape: 'etat' | 'mot-de-passe' | 'scanner' | 'codes' | 'gerer' = 'etat';
  motDePasse = '';
  code = '';
  qr = '';
  secret = '';
  codesSecours: string[] = [];
  codesConserves = false;
  action: 'regenerer' | 'desactiver' | null = null;
  enCours = false;
  erreur = '';
  copie = false;

  ngOnInit(): void { this.charger(); }

  charger(): void {
    this.http.get<any>(this.api).subscribe({
      next: (e) => {
        this.etat = e;
        this.etape = !e.active && this.mode === 'obligatoire' ? 'mot-de-passe' : 'etat';
        this.cdr.detectChanges();
      },
      error: (err) => { this.erreur = err.error?.message || 'Erreur de chargement.'; this.cdr.detectChanges(); },
    });
  }

  private appel(url: string, body: any, suite: (r: any) => void): void {
    this.enCours = true;
    this.erreur = '';
    this.http.post<any>(`${this.api}/${url}`, body).subscribe({
      next: (r) => { this.enCours = false; suite(r); this.cdr.detectChanges(); },
      error: (err) => { this.enCours = false; this.erreur = err.error?.message || 'Erreur.'; this.cdr.detectChanges(); },
    });
  }

  // Etape 1 : mot de passe -> QR code
  commencer(): void { this.etape = 'mot-de-passe'; this.erreur = ''; this.motDePasse = ''; }
  initier(): void {
    this.appel('initier', { mot_de_passe: this.motDePasse }, (r) => {
      this.qr = r.qr; this.secret = r.secret; this.motDePasse = ''; this.code = ''; this.etape = 'scanner';
    });
  }
  // Etape 2 : code affiche par l'application -> activation, codes de secours
  activer(): void {
    this.appel('activer', { code: this.code }, (r) => {
      this.codesSecours = r.codes_secours; this.codesConserves = false; this.code = ''; this.etape = 'codes';
    });
  }
  terminer(): void {
    this.codesSecours = [];
    // Plus de bandeau d'echeance ni de configuration exigee pour ce compte
    this.auth.mettreAJour({ double_auth_active: true, double_auth_echeance: null, double_auth_requise: false });
    this.activee.emit();
    if (this.mode === 'profil') this.charger();
  }

  // Gestion (profil) : nouveaux codes de secours ou desactivation, avec mot de passe + code
  gerer(action: 'regenerer' | 'desactiver'): void {
    this.action = action; this.etape = 'gerer'; this.motDePasse = ''; this.code = ''; this.erreur = '';
  }
  confirmerGestion(): void {
    if (this.action === 'regenerer') {
      this.appel('codes-secours', { mot_de_passe: this.motDePasse, code: this.code }, (r) => {
        this.codesSecours = r.codes_secours; this.codesConserves = false; this.etape = 'codes';
      });
    } else {
      this.appel('desactiver', { mot_de_passe: this.motDePasse, code: this.code }, () => { this.charger(); });
    }
  }
  annuler(): void { this.etape = 'etat'; this.erreur = ''; this.motDePasse = ''; this.code = ''; }

  // Codes de secours : copie ou fichier texte a conserver hors de l'ordinateur
  copier(): void {
    navigator.clipboard?.writeText(this.codesSecours.join('\n')).then(() => {
      this.copie = true; this.cdr.detectChanges();
      setTimeout(() => { this.copie = false; this.cdr.detectChanges(); }, 2000);
    });
  }
  telecharger(): void {
    const texte = `MICA - SONABHY : codes de secours de double authentification\nGénérés le ${new Date().toLocaleString('fr-FR')}\n`
      + 'Chaque code ne sert qu\'une fois. Conservez-les en lieu sûr.\n\n' + this.codesSecours.join('\n') + '\n';
    const url = URL.createObjectURL(new Blob([texte], { type: 'text/plain;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url; a.download = 'MICA_codes_secours.txt'; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
