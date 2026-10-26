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
import { Component, ElementRef, HostListener, ViewChild, AfterViewChecked } from '@angular/core';
import { DialogService, DialogOuvert } from '../../core/services/dialog.service';

// Boite de dialogue unique, affichee par le layout (voir DialogService).
// L'application fonctionne sans zone.js : l'affichage passe par le pipe async (qui declenche la
// detection des changements), « courant » ne sert qu'a la touche Echap et au focus.
@Component({
  selector: 'app-dialog',
  templateUrl: './dialog.component.html',
  standalone: false,
})
export class DialogComponent implements AfterViewChecked {
  @ViewChild('boutonPrincipal') boutonPrincipal?: ElementRef<HTMLButtonElement>;
  private dejaFocalise: DialogOuvert | null = null;
  courant: DialogOuvert | null = null;

  constructor(public dialogService: DialogService) {
    this.dialogService.dialog$.subscribe(d => { this.courant = d; });
  }

  // Le bouton principal recoit le focus a l'ouverture (Entree valide, Echap annule)
  ngAfterViewChecked(): void {
    if (this.courant && this.dejaFocalise !== this.courant && this.boutonPrincipal) {
      this.dejaFocalise = this.courant;
      setTimeout(() => this.boutonPrincipal?.nativeElement.focus());
    }
    if (!this.courant) this.dejaFocalise = null;
  }

  @HostListener('document:keydown.escape')
  echap(): void {
    if (this.courant) this.courant.resoudre(false);
  }
}
