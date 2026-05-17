# Logique Métier — BTP / Chantier Platform

> **Document de référence** — Source de vérité partagée entre tous les agents IA et développeurs.
> Toute décision de conception, de modélisation ou de workflow doit être cohérente avec ce document.
>
> Contexte : plateforme de gestion de chantiers BTP adaptée à la **Côte d'Ivoire** (FCFA/XOF, marchés publics ARCOP, réglementation locale).

---

## 1. Contexte Sectoriel — BTP en Côte d'Ivoire

### 1.1 Poids économique

| Indicateur                | Valeur                                |
| ------------------------- | ------------------------------------- |
| Part du PIB national      | ~7,4% (2024)                          |
| Part du PIB secondaire    | ~21%                                  |
| Croissance annuelle       | +20,2% (2023), +5% moy. 2015–2021     |
| Entreprises membres GIBTP | ~4 000                                |
| CA combiné secteur        | ~2 200 milliards FCFA                 |
| Marchés publics BTP/an    | >2 500 milliards FCFA                 |
| Monnaie                   | FCFA — Franc CFA (XOF), code ISO 4217 |

### 1.2 Organismes clés

| Organisme               | Rôle                                                                                   |
| ----------------------- | -------------------------------------------------------------------------------------- |
| **GIBTP**               | Groupement Ivoirien du BTP — organisation professionnelle privée (depuis 1932)         |
| **ARCOP**               | Autorité de Régulation de la Commande Publique (ex-ANRMP) — régule les marchés publics |
| **DGMP**                | Direction Générale des Marchés Publics — attribution et catégorisation                 |
| **Bureaux de contrôle** | Vérification plans, contrôle exécution, validation matériaux, attestation conformité   |

### 1.3 Catégorisation des entreprises (DGMP CI)

Les entreprises sont catégorisées par la DGMP selon leur capacité technique et financière :

- **Catégorie A** : grandes entreprises, marchés sans plafond
- **Catégorie B** : PME intermédiaires
- **Catégorie C** : petites entreprises, marchés plafonnés
- **Catégorie D** : très petites entreprises, marchés locaux

L'agrément détermine le type et le montant des marchés auxquels une entreprise peut soumissionner.

### 1.4 Cadre réglementaire

- **Code des marchés publics 2018** — régit tous les marchés publics en CI
- **CCAG Travaux** — Cahier des Clauses Administratives Générales
- **Normes de construction** : contrôle technique obligatoire par bureaux agréés
- Vérification des plans → contrôle d'exécution → validation matériaux → attestation finale

---

## 2. Acteurs d'un Projet BTP

### 2.1 Parties prenantes

| Acteur                  | Rôle                                                    | Abréviation |
| ----------------------- | ------------------------------------------------------- | ----------- |
| **Maître d'Ouvrage**    | Commanditaire — finance et réceptionne l'ouvrage        | MOA         |
| **Maître d'Œuvre**      | Concepteur — architecte, ingénieur — pilote technique   | MOE         |
| **Entreprise Générale** | Réalise les travaux — signe le marché avec le MOA       | EG          |
| **Sous-traitant**       | Exécute des lots spécifiques pour l'entreprise générale | ST          |
| **Bureau de Contrôle**  | Contrôle indépendant — qualité et conformité            | BET/BC      |
| **Coordonnateur SPS**   | Sécurité et Protection de la Santé sur chantier         | CSPS        |
| **Fournisseur**         | Livre matériaux, équipements, consommables              | —           |
| **Bureau d'Études**     | Études techniques (béton, fluides, électricité…)        | BET         |

### 2.2 Hiérarchie interne d'une entreprise BTP

```
Direction Générale
  └── Directeur Technique (DT)
        ├── Conducteur de Travaux (CDT)
        │     ├── Chef de Chantier
        │     │     ├── Chef d'Équipe
        │     │     └── Ouvriers (qualifiés, spécialisés, manœuvres)
        │     └── Métreur-Économiste
        ├── Service Comptabilité / Finance
        ├── Service Achats / Logistique
        └── Service QSE
```

### 2.3 Statuts du personnel terrain

| Statut                 | Description                             | Gestion                    |
| ---------------------- | --------------------------------------- | -------------------------- |
| **Ouvrier permanent**  | CDI, convention collective BTP          | Paie mensuelle, pointage   |
| **Ouvrier temporaire** | CDD chantier, durée limitée             | Pointage, fin automatique  |
| **Intérimaire**        | Via agence d'intérim, ~10% heures BTP   | Bon de commande intérim    |
| **Sous-traitant**      | Contrat de sous-traitance par lot       | Situation ST, BDC          |
| **ETAM**               | Employés Techniciens Agents de Maîtrise | Statut cadre intermédiaire |
| **Cadre**              | Encadrement supérieur                   | Contrat cadre              |

---

## 3. Cycle de Vie d'un Projet BTP

### 3.1 Phases principales

```
[APPEL D'OFFRES] → [ATTRIBUTION] → [PRÉPARATION] → [EXÉCUTION] → [RÉCEPTION] → [CLÔTURE]
```

| Phase                    | Durée typique            | Livrables clés                                             |
| ------------------------ | ------------------------ | ---------------------------------------------------------- |
| **Appel d'Offres (AO)**  | 2–8 semaines             | DCE (CCTP, DPGF, plans), offre technique + financière      |
| **Attribution**          | 2–4 semaines             | Notification de marché, ordre de service de démarrage      |
| **Études / Préparation** | 2–6 semaines             | Planning, installations chantier, commandes initiales      |
| **Exécution**            | Variable (mois → années) | Journal de chantier, pointages, situations, PV réunion     |
| **Réception**            | 1–4 semaines             | PV réception, levée réserves, DOE                          |
| **Clôture**              | 4–8 semaines             | Décompte général définitif (DGD), retenue garantie libérée |

### 3.2 Ordre de Service (OS)

Document contractuel émis par le MOA/MOE :

- **OS de démarrage** : déclenche officiellement le chantier
- **OS de travaux supplémentaires** : commande des travaux hors marché initial
- **OS d'arrêt / reprise** : suspend ou reprend le chantier

### 3.3 État d'avancement — calcul

```
Avancement réel (%) = Travaux exécutés / Travaux prévus × 100

Avancement théorique (%) = Durée écoulée / Durée totale × 100

Écart = Avancement réel - Avancement théorique
  → Positif : chantier en avance
  → Négatif : chantier en retard
```

---

## 4. Documents Contractuels et Techniques

### 4.1 Hiérarchie documentaire

```
Marché (contrat)
  ├── CCAP — Cahier des Clauses Administratives Particulières
  ├── CCTP — Cahier des Clauses Techniques Particulières
  ├── BPU  — Bordereau de Prix Unitaires
  ├── DQE  — Détail Quantitatif Estimatif
  └── DPGF — Décomposition du Prix Global et Forfaitaire
```

### 4.2 Définitions précises

**CCTP** (Cahier des Clauses Techniques Particulières)

- Décrit techniquement les travaux à réaliser : matériaux, normes, méthodes d'exécution
- Base des prescriptions techniques — ne contient pas de prix

**BPU** (Bordereau de Prix Unitaires)

- Liste de prix unitaires pour chaque type de prestation
- Utilisé pour la valorisation des travaux supplémentaires (TS/avenants)
- Prix = référence contractuelle inamovible sauf avenant

**DQE** (Détail Quantitatif Estimatif)

- Quantités estimées × prix unitaires (du BPU) = montant estimé par poste
- Outil de chiffrage de l'offre — **ne constitue pas un engagement contractuel sur les quantités**
- Base de calcul des situations de travaux

**DPGF** (Décomposition du Prix Global et Forfaitaire)

- Utilisé pour les marchés à prix forfaitaire (non-mesurés)
- Le prix est fixe — les quantités sont indicatives
- Structure identique au CCTP mais avec affectation de prix

**Situation de Travaux** (ou "Situation")

- Document mensuel produit par l'entreprise
- Récapitule les travaux exécutés cumulés à date
- = Quantités réalisées × prix unitaires
- Soumise au MOE pour visa puis au MOA pour règlement

**Décompte** (ou "Décompte Mensuel")

- Situation de travaux validée par le MOE
- Après déduction de l'acompte précédent = montant à payer ce mois

**Décompte Général Définitif (DGD)**

- Document final en fin de chantier
- Solde tous les comptes : travaux, TS, pénalités, retenue de garantie
- Signature = clôture financière définitive du marché

**Retenue de Garantie**

- Prélèvement de 5% sur chaque situation de travaux
- Libérée 1 an après la réception (garantie parfait achèvement)
- Peut être remplacée par une caution bancaire

### 4.3 Lots de travaux (découpage type CI)

En Côte d'Ivoire, un projet bâtiment se décompose typiquement en :

| N°  | Lot                                      | Abréviation |
| --- | ---------------------------------------- | ----------- |
| 01  | Terrassements / VRD                      | TERR        |
| 02  | Gros Œuvre (fondations, structure béton) | GO          |
| 03  | Maçonnerie / Cloisons                    | MAÇ         |
| 04  | Charpente / Couverture                   | CHARP       |
| 05  | Menuiseries Aluminium                    | MEALUM      |
| 06  | Menuiseries Bois                         | MEBOIS      |
| 07  | Plomberie / Sanitaires                   | PLO         |
| 08  | Électricité Courant Fort                 | ELEC        |
| 09  | Climatisation / Ventilation              | CVC         |
| 10  | Carrelage / Faïence                      | CARR        |
| 11  | Peinture                                 | PEINTURE    |
| 12  | Faux-plafonds                            | FP          |
| 13  | Aménagements extérieurs                  | EXT         |
| 14  | Travaux divers / Réservations            | DIVERS      |

---

## 5. Gestion Financière d'un Chantier

### 5.1 Types de budget

| Type             | Description                                                         | Moment      |
| ---------------- | ------------------------------------------------------------------- | ----------- |
| **Prévisionnel** | Budget initialement alloué (marché signé)                           | Attribution |
| **Engagement**   | Montant contractuellement engagé (BDC fournisseurs, sous-traitants) | Exécution   |
| **Réalisé**      | Dépenses réellement effectuées et validées                          | En continu  |
| **RAC**          | Reste À Compléter = Prév − Réalisé − Engagement non soldé           | En continu  |
| **Écart**        | Prévisionnel − (Réalisé + Engagement + RAC)                         | Analyse     |

### 5.2 Flux financiers entrants (recettes)

```
Marché initial
  + Avenants (travaux supplémentaires validés)
  − Pénalités de retard
  = Montant Total Dû

Situations de travaux (mensuelles)
  − Retenue de garantie (5%)
  − Acomptes versés
  = Facture du mois

DGD (fin de chantier)
  + Libération retenue de garantie
  = Solde final
```

### 5.3 Flux financiers sortants (dépenses)

| Catégorie              | Sous-catégories                                     |
| ---------------------- | --------------------------------------------------- |
| Main d'œuvre           | Salaires, charges, intérim                          |
| Matériaux              | Ciment, fer, sable, gravier, matériaux spéciaux     |
| Sous-traitance         | Lots confiés à des entreprises tierces              |
| Matériel / Équipements | Location, achat, amortissement engins               |
| Transport / Logistique | Livraisons, déplacements chantier                   |
| Frais de chantier      | Installation, clôture, gardiennage, eau/électricité |
| Frais généraux         | Part des charges de structure allouée au projet     |

### 5.4 Indicateurs de rentabilité

```
Marge brute = Recettes − Coûts directs chantier
Marge nette  = Marge brute − Quote-part frais généraux

Taux d'avancement financier = Dépenses cumulées / Budget total
Indice de performance coût (CPI) = Valeur gagnée / Coût réel
  → CPI < 1 : dérive budgétaire
  → CPI > 1 : sous-consommation (à analyser)
```

### 5.5 Particularités Côte d'Ivoire

- **Monnaie** : FCFA (XOF) — parité fixe avec EUR (1 EUR = 655,957 FCFA)
- **TVA** : 18% (taux standard CI) — certains marchés publics exonérés
- **Acomptes fournisseurs** : courants en CI (30–50% à la commande)
- **Délais de paiement** : marchés publics souvent 60–90 jours après validation
- **Caution de bonne exécution** : 5–10% du marché, exigée par le MOA
- **Avance de démarrage** : 10–15% du marché, remboursée progressivement sur situations
- **Retenue de garantie** : 5% sur situations, libérée après 1 an de garantie parfait achèvement

---

## 6. Gestion Opérationnelle du Chantier

### 6.1 Journal de chantier (rapport journalier)

Document quotidien tenu par le chef de chantier. Obligatoire contractuellement.

| Champ            | Type             | Valeur                                       |
| ---------------- | ---------------- | -------------------------------------------- |
| Date             | Date             | Auto (aujourd'hui)                           |
| Météo            | Enum             | Soleil / Nuageux / Pluie / Orage / Vent fort |
| Effectif présent | Entier           | Nombre d'ouvriers sur site                   |
| Avancement (%)   | Décimal          | 0–100                                        |
| État équipement  | Enum             | Bon / Moyen / Mauvais / Hors service         |
| Matériaux reçus  | Liste structurée | Matériau + quantité + unité                  |
| Incident         | Booléen + détail | Type / gravité / description                 |
| Observations     | Texte libre      | (limité)                                     |

**Règles métier journal :**

- Un seul journal par chantier par jour (contrainte unique DB)
- Chef de chantier : saisie en temps réel sur mobile (PWA)
- Conducteur de travaux : lecture et supervision
- Journal non saisi = signal d'alerte (chantier à l'arrêt ?)

### 6.2 Pointage du personnel

Le pointage est la base de la paie et du suivi de rentabilité.

| Type pointage | Méthode                            | Granularité |
| ------------- | ---------------------------------- | ----------- |
| **Présence**  | Présent / Absent / Congé / Maladie | Journalier  |
| **Heures**    | Heures normales + supplémentaires  | Journalier  |
| **Tâche**     | Affectation à un lot/poste DQE     | Optionnel   |

**Règles métier pointage CI :**

- Heures normales : 8h/jour, 5 jours/semaine (sauf TP = 6j)
- Heures supplémentaires : majorées 25% (H sup 1–8h) ou 50% (au-delà) selon convention
- Dimanche travaillé : majoré 100%
- Jours fériés CI : 10–14 jours/an (incluant fêtes nationales et religieuses)
- Salaire minimum (SMIG CI) : ~60 000 FCFA/mois (à vérifier réglementation en vigueur)

### 6.3 Gestion des présences terrain (chef de chantier)

**Workflow journalier :**

```
Matin → Chef saisit présences ouvriers
       → Marquage : Présent / Absent / Demi-journée
Soir  → Validation (ou auto-validation à 20h)
       → Agrégation hebdomadaire → Paie
```

### 6.4 Incidents et QSE

**Niveaux de gravité :**
| Niveau | Définition | Action requise |
|---|---|---|
| **RAS** | Rien à signaler | Aucune |
| **Mineur** | Incident sans blessure, retard < 2h | Rapport dans 24h |
| **Majeur** | Blessure légère, retard > 2h, dommage matériel | Rapport immédiat + MOE |
| **Critique** | Accident grave, arrêt chantier, décès | Arrêt immédiat + autorités + MOA |

**Types d'incidents :**

- Accident du travail (blessure, EPI manquant)
- Quasi-accident (situation dangereuse sans blessure)
- Dommage matériel (casse engin, effondrement partiel)
- Retard externe (intempéries, livraison manquée)
- Litige (sous-traitant, riverain, administration)
- Rupture de stock critique
- Panne d'équipement bloquante

**Score de sécurité mensuel :**

```
Safety Score = max(0, 25 − incidents_critiques×15 − incidents_majeurs×5 − incidents_mineurs×1)
```

### 6.5 Photos chantier

- Photos tagguées par lot / phase / localisation
- Comparateur avant/après (slider)
- Géolocalisées (latitude/longitude)
- Obligatoires pour réception et DOE (Dossier des Ouvrages Exécutés)
- Stockage : `Storage::disk('public')` dev, MinIO S3 prod

---

## 7. Approvisionnement et Stocks

### 7.1 Processus achat standard

```
[BESOIN TERRAIN] → [DEMANDE D'ACHAT] → [VALIDATION] → [BON DE COMMANDE] → [LIVRAISON] → [RÉCEPTION BL] → [FACTURE FOURNISSEUR]
```

| Étape           | Acteur                               | Document                     |
| --------------- | ------------------------------------ | ---------------------------- |
| Demande d'achat | Chef de chantier / CDT               | Demande besoin               |
| Validation      | Conducteur / Direction selon montant | Bon de commande (BDC)        |
| Commande        | Service Achats                       | BDC signé envoyé fournisseur |
| Livraison       | Fournisseur                          | Bon de livraison (BL)        |
| Réception       | Chef de chantier                     | BL signé + photos            |
| Facturation     | Fournisseur                          | Facture fournisseur          |
| Paiement        | Comptabilité                         | Virement bancaire            |

### 7.2 Seuils de validation (exemple type CI)

| Montant FCFA           | Valideur              |
| ---------------------- | --------------------- |
| < 500 000              | Chef de chantier      |
| 500 000 – 5 000 000    | Conducteur de Travaux |
| 5 000 000 – 50 000 000 | Directeur Technique   |
| > 50 000 000           | Direction Générale    |

### 7.3 Gestion des stocks

**Mouvements de stock :**

- **Entrée** : réception livraison fournisseur
- **Sortie** : consommation chantier
- **Ajustement** : inventaire, casse, vol

**Alerte stock minimum :** si `quantite < min_quantite` → alerte générée automatiquement

**Matériaux courants CI :**
Ciment, Fer à béton (6–32mm), Sable (fin/grossier), Gravier (4/8, 8/16), Parpaings, Briques, Bois (coffrage, charpente), Carrelage, Peinture, PVC, Câbles électriques, Tuyaux PVC/PER

---

## 8. Documents de Gestion (GED)

### 8.1 Types de documents par projet

| Type        | Description               | Exemples                           |
| ----------- | ------------------------- | ---------------------------------- |
| **AO**      | Documents Appel d'Offres  | DCE, CCTP, Plans AO, DPGF          |
| **OS**      | Ordres de Service         | OS démarrage, OS TS                |
| **Marché**  | Contrat et pièces         | Acte d'engagement, CCAP, CCTP, BPU |
| **Plans**   | Documents techniques      | Plans architecte, BET structure    |
| **PV**      | Procès-verbaux            | PV réunion, PV réception           |
| **Rapport** | Rapports hebdo/mensuels   | Rapport avancement, rapport QSE    |
| **Facture** | Factures fournisseurs     | Factures, relevés                  |
| **Photo**   | Photos chantier           | Photos progression, incidents      |
| **DOE**     | Dossier Ouvrages Exécutés | Plans conformes à l'exécution      |
| **Autre**   | Divers                    | Correspondances, attestations      |

### 8.2 Règles de nommage (bonne pratique)

```
[CODE_PROJET]_[TYPE]_[LOT]_[DESCRIPTION]_[DATE].[EXT]
Exemple : PRJ001_PLAN_GO_FONDATIONS_20260115.pdf
```

---

## 9. Planification et Délais

### 9.1 Types de planning

| Type                  | Outil             | Usage                                |
| --------------------- | ----------------- | ------------------------------------ |
| **Planning général**  | Gantt (barres)    | Vision macro, jalons contractuels    |
| **Planning détaillé** | Gantt par lot     | CDT → chef de chantier               |
| **Planning hebdo**    | Tableau simple    | Semaine suivante, terrain            |
| **Courbe S**          | Graphe avancement | Réel vs théorique, rapport direction |

### 9.2 Phases BTP standard pour Gantt

Estimation de la durée par phase (base 100% = durée totale chantier) :

| Phase                                          | Part estimée |
| ---------------------------------------------- | ------------ |
| Installation chantier                          | 5%           |
| Terrassements / VRD                            | 15%          |
| Gros Œuvre                                     | 30%          |
| Second Œuvre (cloisons, enduits)               | 20%          |
| Corps d'état techniques (élec, plomberie, CVC) | 15%          |
| Finitions (carrelage, peinture, menuiseries)   | 15%          |

### 9.3 Jalons contractuels

- **Date de démarrage** : OS de démarrage signé
- **Jalons intermédiaires** : définis au CCAP (ex : achèvement GO, levée cloisons)
- **Date de fin contractuelle** : délai d'exécution du marché
- **Pénalités de retard** : X FCFA/jour calendaire de retard (défini au CCAP)

---

## 10. Health Score — Indicateur Synthétique de Santé Chantier

Indicateur 0–100 calculé en temps réel par chantier actif :

```
Health Score = planning_score + regularity_score + budget_score + safety_score

planning_score   = avancement_réel >= avancement_cible ? 25 : max(0, 25 − (cible − réel) × 1.25)
regularity_score = min(nb_journaux / max(1, jours_depuis_démarrage), 1) × 25
budget_score     = 25 (placeholder — sera basé sur CPI quand module budget actif)
safety_score     = max(0, 25 − nb_incidents × 5)
```

| Score | Couleur   | Signification                                   |
| ----- | --------- | ----------------------------------------------- |
| ≥ 75  | 🟢 Vert   | Chantier sain                                   |
| 50–74 | 🟠 Orange | Vigilance — actions correctives nécessaires     |
| < 50  | 🔴 Rouge  | Chantier en difficulté — intervention direction |

---

## 11. Rôles et Accès (RBAC)

### 11.1 Groupes de rôles

| Groupe       | Rôles inclus            | Périmètre d'accès                     |
| ------------ | ----------------------- | ------------------------------------- |
| `direction`  | Direction Générale, DG  | Tout — lecture/écriture               |
| `dt`         | Directeur Technique     | Opérationnel complet, pas compta      |
| `conducteur` | Conducteur de Travaux   | Ses chantiers + tout le contenu       |
| `terrain`    | Chef de Chantier        | Journal, présences, photos, incidents |
| `metreur`    | Métreur-Économiste      | DQE, chiffrage, achats                |
| `comptable`  | Comptable, DAF          | Comptabilité, factures, budgets       |
| `logistique` | Logisticien, Magasinier | Stocks, BDC, réceptions               |
| `lecture`    | Lecture seule           | Consultation uniquement               |

### 11.2 Matrice d'accès par module

| Module               | direction | dt  | conducteur | terrain | metreur | comptable | logistique | lecture |
| -------------------- | :-------: | :-: | :--------: | :-----: | :-----: | :-------: | :--------: | :-----: |
| Dashboard            |    ✅     | ✅  |     ✅     |   ✅    |   ✅    |    ✅     |     ✅     |   ✅    |
| Journal              |    ✅     | ✅  |     ✅     |  ✅ rw  |   👁    |    👁     |     👁     |   👁    |
| Personnel / Pointage |    ✅     | ✅  |     ✅     |  ✅ rw  |   👁    |    👁     |     👁     |   👁    |
| Photos               |    ✅     | ✅  |     ✅     |  ✅ rw  |   👁    |    👁     |     👁     |   👁    |
| Incidents QSE        |    ✅     | ✅  |     ✅     |  ✅ rw  |   👁    |    👁     |     👁     |   👁    |
| DQE                  |    ✅     | ✅  |     👁     |   ❌    |  ✅ rw  |    👁     |     👁     |   👁    |
| Achats / BDC         |    ✅     | ✅  |     ✅     |   👁    |   ✅    |    👁     |   ✅ rw    |   👁    |
| Stocks               |    ✅     | ✅  |     👁     |   👁    |   👁    |    👁     |   ✅ rw    |   👁    |
| Comptabilité         |    ✅     | 👁  |     ❌     |   ❌    |   ❌    |   ✅ rw   |     ❌     |   👁    |
| Utilisateurs         |   ✅ rw   | ❌  |     ❌     |   ❌    |   ❌    |    ❌     |     ❌     |   ❌    |

> ✅ = accès complet · 👁 = lecture seule · rw = lecture + écriture · ❌ = accès refusé

---

## 12. ERPs et Plateformes de Référence

### 12.1 Solutions françaises spécialisées BTP

| Solution            | Positionnement            | Forces                                              |
| ------------------- | ------------------------- | --------------------------------------------------- |
| **Graneet**         | PME BTP cloud             | Chiffrage, DQE, situations de travaux, achats       |
| **Vertuoza**        | TPE/PME BTP 100% en ligne | All-in-one, ergonomie, cloud natif                  |
| **Onaya**           | PME/ETI                   | Étude de prix, facturation, suivi chantier, finance |
| **myB2O BTP**       | Modulaire                 | 20+ modules, facturation, RH                        |
| **Divalto**         | PME/ETI                   | ERP généraliste + module BTP                        |
| **Axelor**          | Open source               | ERP complet, gestion chantier                       |
| **Kalitics BTP**    | RH spécialisé             | Pointage, paie BTP, intérim                         |
| **Traxxeo**         | Pointage terrain          | Application mobile, badgeuse digitale               |
| **BRZ / Optim'BTP** | Suivi main-d'œuvre        | Pointage chantier PME                               |

### 12.2 Plateformes internationales

| Solution                        | Marché                     | Spécificité                                   |
| ------------------------------- | -------------------------- | --------------------------------------------- |
| **Procore**                     | Grands projets (USA/monde) | Collaboration terrain-bureau, RFI, submittals |
| **Autodesk Construction Cloud** | Projets BIM                | Intégration Revit/BIM 360, documents          |
| **SAP S/4HANA**                 | Grandes entreprises        | WBS/CBS, EC&O, facturation projet             |
| **Sage Construction**           | PME/ETI                    | ERP construction, paie, projets               |
| **COINS**                       | ETI                        | ERP construction complet                      |

### 12.3 Gaps de ces solutions — notre différenciation

| Gap observé                                        | Notre réponse                                    |
| -------------------------------------------------- | ------------------------------------------------ |
| Pas adaptées au marché ivoirien (FCFA, marchés CI) | Natif XOF, réglementation CI                     |
| Interface complexe, formation longue               | UX mobile-first, 3 taps max                      |
| Pas de mode offline / terrain                      | PWA + SW offline                                 |
| Pas d'IA générative intégrée                       | Groq (situation travaux), Anthropic (CR réunion) |
| Pas de WhatsApp alerts                             | Twilio + E.164 CI (0XXXXXXXXX → +225)            |
| Cloisonnées (pas de vue 360°)                      | Dashboard unifié par rôle                        |
| Pas d'alertes intelligentes                        | Health Score + AlertsPanel contextuel            |

---

## 13. Terminologie BTP — Lexique

| Terme                    | Définition                                                    |
| ------------------------ | ------------------------------------------------------------- |
| **AO**                   | Appel d'Offres — procédure de mise en concurrence             |
| **Avenant**              | Modification contractuelle signée entre MOA et entreprise     |
| **BDC**                  | Bon de Commande — document d'achat fournisseur                |
| **BL**                   | Bon de Livraison — document de réception de marchandise       |
| **BPU**                  | Bordereau de Prix Unitaires — liste des prix contractuels     |
| **CCAP**                 | Cahier des Clauses Administratives Particulières              |
| **CCTP**                 | Cahier des Clauses Techniques Particulières                   |
| **CPI**                  | Cost Performance Index — indice de performance budgétaire     |
| **DCE**                  | Dossier de Consultation des Entreprises — documents AO        |
| **Décompte**             | Situation de travaux validée, base de facturation             |
| **DGD**                  | Décompte Général Définitif — clôture financière chantier      |
| **DOE**                  | Dossier des Ouvrages Exécutés — plans "as-built"              |
| **DPGF**                 | Décomposition du Prix Global et Forfaitaire                   |
| **DQE**                  | Détail Quantitatif Estimatif                                  |
| **ETAM**                 | Employés, Techniciens et Agents de Maîtrise                   |
| **FCFA / XOF**           | Franc CFA d'Afrique de l'Ouest — monnaie CI                   |
| **GO**                   | Gros Œuvre — structure béton, fondations, maçonnerie          |
| **MOA**                  | Maître d'Ouvrage — commanditaire du projet                    |
| **MOE**                  | Maître d'Œuvre — concepteur / directeur des travaux           |
| **OS**                   | Ordre de Service — document contractuel de mission            |
| **PV**                   | Procès-Verbal — compte-rendu officiel                         |
| **QSE**                  | Qualité, Sécurité, Environnement                              |
| **RAC**                  | Reste À Compléter — budget non encore dépensé                 |
| **Retenue de garantie**  | 5% prélevé sur situations, libéré après 1 an                  |
| **Situation de travaux** | État mensuel des travaux exécutés, base de paiement           |
| **SMIG**                 | Salaire Minimum Interprofessionnel Garanti                    |
| **SO**                   | Second Œuvre — cloisons, enduits, menuiseries, finitions      |
| **TS**                   | Travaux Supplémentaires — hors marché initial                 |
| **TVA**                  | Taxe sur la Valeur Ajoutée — 18% en Côte d'Ivoire             |
| **VRD**                  | Voiries et Réseaux Divers — terrassements, réseaux extérieurs |

---

## 14. Règles Métier Critiques (Business Rules)

### 14.1 Règles inviolables

1. **Un journal par chantier par jour** — contrainte unique DB (`project_id` + `log_date`)
2. **Health Score temps réel** — recalculé à chaque entrée journal/incident
3. **Situation de travaux ≤ montant marché + avenants** — pas de surfacturation
4. **Retenue de garantie 5%** — prélevée automatiquement sur chaque situation
5. **RBAC strict** — chaque requête API filtrée par `company_id` + vérification rôle
6. **Montant DQE = somme(quantite × prix_unitaire)** — calculé, jamais saisi manuellement
7. **Avancement réel 0–100%** — contrainte DB CHECK
8. **BDC validé = ne peut plus être modifié** — workflow irréversible (sauf annulation)
9. **Incident critique → alerte immédiate** — notification push + WhatsApp chef de projet
10. **Stock < min_quantite → alerte auto** — déclenchée à chaque mouvement de sortie

### 14.2 Règles de workflow

- Situation de travaux : **BROUILLON → SOUMISE → VALIDÉE MOE → PAYÉE** (irréversible)
- Facture fournisseur : **SOUMISE → VALIDÉE → PAYÉE** (comptable uniquement pour validation)
- BDC : **EN ATTENTE → APPROUVÉ → REÇU** (réception avec BL + photos obligatoires)
- Incident : **OUVERT → EN COURS → RÉSOLU** (résolution requiert action corrective)
- DQE version : **BROUILLON → VALIDÉE → ARCHIVÉE** (validée = figée, nouvelle version pour modifs)

### 14.3 Alertes automatiques

| Événement                | Déclencheur                            | Destinataire          |
| ------------------------ | -------------------------------------- | --------------------- |
| Journal non saisi        | 18h sans journal le jour J             | CDT + chef chantier   |
| Incident critique        | Saisie incident gravité=critique       | Direction + CDT + MOE |
| Stock sous seuil         | Quantité < min_quantite                | Logistique + CDT      |
| Avancement retard > 10%  | ΔAvancement > 10 points négatif        | CDT + Direction       |
| Facture en attente > 30j | Facture soumise non validée > 30 jours | Comptable + Direction |
| Budget dépassé > 5%      | Réalisé > Prévisionnel × 1.05          | CDT + Direction       |

---

_Document vivant — mis à jour à chaque évolution significative du produit._
_Version 1.0 — Mai 2026 — Chantier Platform / Équipe Produit_
