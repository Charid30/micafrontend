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
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { DatePipe } from '@angular/common';

/**
 * Message flottant des pages à chevrons (Stocks, RDC, Centrale SONABEL) quand un jour passé est affiché.
 * À placer juste après l'en-tête de la page : il apparaît en haut à droite, sous les chevrons (sans
 * jamais les recouvrir), puis reste accroché en haut de l'écran pendant le défilement.
 * « Revenir à aujourd'hui » : la page ramène au jour courant et le message disparaît.
 *
 *   <app-jour-passe [date]="jourVu" [lectureSeule]="true" (revenir)="revenirAujourdhui()"></app-jour-passe>
 */
@Component({
  selector: 'app-jour-passe',
  standalone: true,
  imports: [DatePipe],
  host: { class: 'sticky top-3 z-30 !mt-0 flex h-0 justify-end', role: 'status' },
  template: `
    <div class="mt-3 w-full max-w-sm">
      <div class="flex flex-col gap-3 rounded-2xl border border-primary-200 bg-white px-4 py-3 shadow-xl animate-fade-in-down">
        <div class="flex items-center gap-3">
          <span class="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary-600">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
            </svg>
          </span>
          <p class="text-sm text-primary-700">
            Consultation du <strong>{{ date | date:'EEEE d MMMM yyyy':'':'fr' }}</strong>
            <span class="block text-xs text-gray-500">{{ lectureSeule ? 'Données renseignées ce jour-là, en lecture seule' : 'Données de ce jour-là : une correction reste possible' }}</span>
          </p>
        </div>
        <button type="button" class="btn-primary self-end" (click)="revenir.emit()">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"/>
          </svg>
          Revenir à aujourd'hui
        </button>
      </div>
    </div>
  `,
})
export class JourPasseComponent {
  /** Jour affiché (AAAA-MM-JJ) */
  @Input({ required: true }) date!: string;
  /** Jour passé non modifiable (Stocks) ; RDC et Centrale : correction possible */
  @Input() lectureSeule = false;
  @Output() revenir = new EventEmitter<void>();
}
