# Décisions produit en suspens — round 1 party mode (2026-10-01)

> Points soulevés par John (PM), Mary (BA), Winston (architecte) qui **ne se corrigent pas en code**.
> À trancher par Vincent après observation terrain. Les corrections techniques du round 1 sont dans
> `docs/superpowers/plans/2026-10-01-logique-metier-round1.md` (lots A → F, tous livrés).

## 1. Le journal 3 taps n'est pas validé terrain (John — risque n°1)

Tout le produit (Health Score, courbe S, alertes 18 h, auto-situation du 28, briefing IA) consomme `daily_logs`.
**Question factuelle à répondre avant toute nouvelle feature :** combien de chefs de chantier d'Entreprise Charles
ont saisi un journal réel 5 jours d'affilée ? Si zéro → le risque est l'adoption, pas la technique.

Action proposée : 3 journées d'observation (Abidjan ou chantier hors Abidjan) avec un chef de chantier et un
conducteur, téléphone en main, sur la Fiche chantier Excel actuelle. Noter : qui tient le téléphone à 18 h
(chef sur site ou conducteur en voiture ?), forfait data, moment réel de saisie.

## 2. Sur-modélisation des workflows ? (John)

| Workflow            | États | Qui l'a demandé ? |
| ------------------- | ----- | ----------------- |
| Situation           | 7 (+ contestation) | logique-metier.md — pas un utilisateur identifié |
| Demande de besoin   | 5     | idem |
| Facture fournisseur | 5     | idem |

Dans une PME où DT et direction se voient chaque matin, revue CT → revue DT → contestation est un process de
grand groupe. **Décision du round 1 : on ne retire rien** (le code est là, les gardes atomiques le sécurisent) mais
on n'ajoute **aucun état** (le suivi MOA a été fait en champs datés, pas en états). À réévaluer après le terrain.

## 3. Bruit fonctionnel à geler (John)

Leaderboard « chantier du mois », RAG, vision photo, CR réunion IA, Gantt, carte : démos plus que jobs.
Le job du directeur = « où je perds de l'argent ce matin, qui n'a pas fait son journal ». C'est le briefing
+ alertes WhatsApp. **Protéger ces deux-là, geler le reste** jusqu'à validation terrain.

## 4. Migration Excel → fiabilité perçue (John)

Le comptable a des formules éprouvées. Avant mise en production finance : rapprocher sur 3 marchés réels
les montants app (situations, RG, avance, net à payer) avec le fichier Excel. Tout écart = bug ou règle
non comprise. Outil : `php artisan budget:reconcile --dry-run` + export situation PDF.

## 5. Données d'usage réelles vs seed (John)

Aucune télémétrie d'usage. Avant d'arbitrer les points 1–3, instrumenter a minima : nombre de journaux
par utilisateur réel par semaine (hors seeders), nombre de connexions par rôle. Un simple rapport hebdo
suffit ; pas besoin d'un outil externe.

## 6. Questions terrain (Mary)

1. Sur les 5 derniers marchés, délai **réel** entre dépôt de situation et encaissement ? (calibre `delai_paiement_jours`)
2. Travaux non prévus au DQE : avenant formel ou ligne ajoutée au BPU ? (détermine si le module avenants est utilisé)
3. Qui tient physiquement le téléphone à 18 h ? (change l'UX du module terrain)

## 7. Hypothèses prises dans le code (à confirmer)

- Avancement certifié (situation MOE) prime sur le déclaré (journal) s'il a moins de **60 jours**.
- Délai de paiement MOA par défaut **60 j** ; TVA **18 %** ; RG **5 %** — modifiables dans Paramètres → Entreprise.
- Les sorties de stock valorisées sont **informatives** (non ajoutées à l'engagé) pour éviter le double-comptage avec les factures.
- Rapprochement journal ↔ stock par **nom de matériau** (approximation tant que `materials_received` n'est pas lié à `stock_item_id`).
