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
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

export type EtatNotifications = 'non-supporte' | 'refuse' | 'inactif' | 'actif';

// Notifications push web : abonnement du navigateur (service worker public/push-sw.js).
// L'abonnement suit l'utilisateur connecte : il est rattache a chaque ouverture de session et
// detache a la deconnexion (poste partage : le suivant ne recoit pas les notifications du precedent).
@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private readonly http = inject(HttpClient);
  private readonly api = `${environment.apiUrl}/notifications`;

  get supporte(): boolean {
    return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window && window.isSecureContext;
  }

  async etat(): Promise<EtatNotifications> {
    if (!this.supporte) return 'non-supporte';
    if (Notification.permission === 'denied') return 'refuse';
    const reg = await navigator.serviceWorker.getRegistration(this.portee());
    const abo = await reg?.pushManager.getSubscription();
    return abo && Notification.permission === 'granted' ? 'actif' : 'inactif';
  }

  /** Demande l'autorisation au navigateur puis enregistre l'abonnement */
  async activer(): Promise<EtatNotifications> {
    if (!this.supporte) return 'non-supporte';
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return permission === 'denied' ? 'refuse' : 'inactif';
    const reg = await this.enregistrerServiceWorker();
    let abo = await reg.pushManager.getSubscription();
    if (!abo) {
      const { cle } = await firstValueFrom(this.http.get<{ cle: string }>(`${this.api}/cle-publique`));
      abo = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: this.versOctets(cle) });
    }
    await firstValueFrom(this.http.post(`${this.api}/abonnement`, { abonnement: abo.toJSON() }));
    return 'actif';
  }

  async desactiver(): Promise<EtatNotifications> {
    const abo = await this.abonnementLocal();
    if (abo) {
      await firstValueFrom(this.http.delete(`${this.api}/abonnement`, { body: { endpoint: abo.endpoint } })).catch(() => {});
      await abo.unsubscribe();
    }
    return this.etat();
  }

  tester(): Promise<{ message: string }> {
    return firstValueFrom(this.http.post<{ message: string }>(`${this.api}/test`, {}));
  }

  /** Ouverture de session : rattache l'abonnement existant de ce navigateur a l'utilisateur connecte */
  async synchroniser(): Promise<void> {
    try {
      if (!this.supporte || Notification.permission !== 'granted') return;
      await this.enregistrerServiceWorker();
      const abo = await this.abonnementLocal();
      if (abo) await firstValueFrom(this.http.post(`${this.api}/abonnement`, { abonnement: abo.toJSON() }));
    } catch { /* information secondaire : l'application fonctionne sans notifications */ }
  }

  /** Deconnexion : l'abonnement n'est plus rattache a l'utilisateur (il reste dans le navigateur) */
  async detacher(): Promise<void> {
    try {
      const abo = await this.abonnementLocal();
      if (abo) await firstValueFrom(this.http.delete(`${this.api}/abonnement`, { body: { endpoint: abo.endpoint } }));
    } catch { /* session deja fermee */ }
  }

  private portee(): string {
    return new URL('./', document.baseURI).pathname;
  }

  private enregistrerServiceWorker(): Promise<ServiceWorkerRegistration> {
    return navigator.serviceWorker.register(new URL('push-sw.js', document.baseURI).pathname, { scope: this.portee() });
  }

  private async abonnementLocal(): Promise<PushSubscription | null> {
    if (!this.supporte) return null;
    const reg = await navigator.serviceWorker.getRegistration(this.portee());
    return (await reg?.pushManager.getSubscription()) ?? null;
  }

  // Cle publique VAPID (base64url) -> octets attendus par pushManager.subscribe
  private versOctets(base64url: string): Uint8Array<ArrayBuffer> {
    const b64 = (base64url + '='.repeat((4 - (base64url.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
    const brut = atob(b64);
    const octets = new Uint8Array(new ArrayBuffer(brut.length));
    for (let i = 0; i < brut.length; i++) octets[i] = brut.charCodeAt(i);
    return octets;
  }
}
