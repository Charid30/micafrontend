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
import { Component, Input } from '@angular/core';

// Rappel de la frequence de saisie d'un menu (Parametres > Frequences de saisie)
@Component({
  selector: 'app-frequence-saisie',
  standalone: false,
  template: `
    <p *ngIf="frequence" class="mt-1 inline-flex flex-wrap items-center gap-1.5 text-xs font-medium text-primary-600">
      <span class="rounded-full border border-primary-200 bg-primary-50 px-2 py-0.5">{{ libelle }}</span>
      <span>{{ detail }}</span>
    </p>`,
})
export class FrequenceSaisieComponent {
  @Input() frequence: string | null | undefined = null;
  @Input() date: string | null | undefined = null;

  get libelle(): string {
    return ({ QUOTIDIEN: 'Saisie quotidienne', HEBDOMADAIRE: 'Saisie hebdomadaire', PERMANENT: 'Valeurs permanentes' } as Record<string, string>)[this.frequence || ''] || '';
  }

  get detail(): string {
    if (this.frequence === 'QUOTIDIEN' && this.date) {
      const d = new Date(this.date + 'T00:00:00');
      return 'Saisie du ' + d.toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
    }
    if (this.frequence === 'HEBDOMADAIRE') return 'Une seule saisie pour la semaine, mise à jour à chaque enregistrement';
    if (this.frequence === 'PERMANENT') return 'Valeurs reprises d\'une semaine à l\'autre tant qu\'elles ne sont pas modifiées';
    return '';
  }
}
