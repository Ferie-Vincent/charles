# Application Web Multi-Chantiers Avec DQE Automatique

## Objectif

Transformer la logique de la fiche Excel de suivi de chantier en une application web robuste, multi-chantiers, orientée pilotage, étude et reporting direction, avec génération automatique d'un DQE à partir des données techniques du chantier.

L'application doit utiliser une interface très proche du design `Simple` de Coderthemes pour la structure admin, la navigation, les tableaux, les cartes KPI et les vues détaillées.

## Contexte

Le classeur Excel actuel couvre déjà plusieurs besoins utiles :

- identification chantier
- acteurs
- journal
- matériaux
- finances
- équipements
- incidents
- qualité
- sécurité
- tableau de bord

Ses limites sont structurelles :

- modèle mono-fichier
- faible traçabilité applicative
- pas de multi-chantiers natif
- pas de gestion robuste des rôles
- pas de moteur DQE
- reporting direction limité
- réutilisation difficile des bibliothèques de postes, prix et règles

Le produit cible n'est donc pas un "Excel en ligne", mais une plateforme métier BTP.

## Périmètre V1

La V1 est une version `métier équilibrée`, desktop-first, sans traitement mobile terrain avancé dans un premier temps.

Elle couvre :

1. portefeuille multi-chantiers
2. fiche chantier complète
3. base technique chantier
4. moteur DQE v1
5. suivi d'exécution
6. pilotage coûts
7. QSE
8. reporting direction

Le client externe est hors périmètre V1.

## Utilisateurs

Les rôles validés pour la V1 sont :

- Direction
- Directeur technique
- Conducteur de travaux
- Chef de chantier
- Métreur / économiste
- Comptable
- Lecture seule

## Positionnement Produit

L'application doit permettre à une entreprise BTP de :

- centraliser la donnée chantier
- standardiser la préparation économique
- générer un DQE cohérent
- suivre l'exécution réelle
- rapprocher technique, coûts et avancement
- produire un reporting lisible pour la direction

## Principes Structurants

### 1. Multi-chantiers natif

Le système doit être conçu dès le départ pour gérer plusieurs chantiers, avec vue portefeuille et vues détaillées par chantier.

### 2. DQE généré, pas seulement saisi

Le DQE n'est pas un document rempli manuellement ligne par ligne par défaut. Il est produit à partir :

- des données techniques du chantier
- d'une bibliothèque d'articles
- de règles de quantification
- d'une bibliothèque de prix unitaires

### 3. Héritage entreprise

Les prix unitaires, articles, unités, codes coûts et règles de calcul doivent être gérés au niveau entreprise puis hérités par les chantiers.

### 4. Desktop-first

La V1 priorise l'usage bureau, étude, direction, conduite de travaux et comptabilité. L'architecture doit rester compatible avec une future extension mobile.

### 5. Interface admin basée sur `Simple`

Le produit doit réutiliser fidèlement la logique du template `Simple` :

- sidebar persistante
- topbar avec recherche et notifications
- cartes KPI
- tableaux de données
- onglets et pages détail
- formulaires structurés
- graphiques et widgets

## Modules V1

### Dashboard Portefeuille

Fonctions :

- vue globale de tous les chantiers
- KPI consolidés
- alertes budgétaires
- suivi des écarts
- incidents ouverts
- avancement comparé aux objectifs
- accès rapide aux chantiers critiques

KPI types :

- nombre de chantiers actifs
- budget total engagé
- budget total consommé
- avancement moyen
- chantiers en dérive
- incidents ouverts
- non-conformités ouvertes

### Chantiers

Fonctions :

- création chantier
- modification fiche chantier
- gestion des statuts
- acteurs et contacts
- dates clés
- budget initial
- documents de base

Données principales :

- code chantier
- nom chantier
- type
- localisation
- maître d'ouvrage
- dates
- budget
- responsables affectés

### Base Technique

Fonctions :

- saisie des paramètres techniques
- structuration du bâtiment
- préparation des données de quantification

Exemples de données :

- nombre de niveaux
- zones et pièces
- surfaces
- longueurs
- hauteurs
- fondations
- murs
- dalles
- charpente
- toiture
- revêtements
- équipements techniques

Cette base technique est la source principale du moteur DQE.

### DQE

Fonctions :

- génération automatique
- édition contrôlée
- versioning
- regroupement par lot
- calcul des totaux
- comparaison entre versions
- export Excel/PDF

Contenu d'une ligne DQE :

- lot
- code article
- désignation
- unité
- quantité calculée
- prix unitaire
- montant
- origine du calcul
- statut d'ajustement manuel

### Exécution

Fonctions :

- journal de chantier
- effectifs
- activités du jour
- avancement
- météo
- blocages
- livraisons
- matériels utilisés
- photos

Le journal doit être structuré et exploitable en reporting, pas seulement libre.

### Coûts

Fonctions :

- budget initial
- engagements
- dépenses
- paiements
- écarts
- reste à engager
- prévision à terminaison

La logique financière doit permettre un vrai pilotage, pas seulement l'enregistrement de sorties d'argent.

### QSE

Fonctions :

- incidents
- non-conformités
- sécurité
- actions correctives
- statuts
- historiques

### Reporting

Fonctions :

- rapport hebdomadaire
- rapport mensuel
- reporting portefeuille
- exports Excel/PDF
- vues direction filtrées

## Architecture Fonctionnelle

Le système est organisé en trois couches métier.

### Référentiel Entreprise

Contient :

- utilisateurs
- rôles
- bibliothèque articles
- unités
- lots
- prix unitaires
- codes coûts
- règles de quantification
- paramètres globaux

### Niveau Chantier

Contient :

- fiche chantier
- base technique
- DQE
- journal
- livraisons
- équipements
- coûts
- QSE
- documents

### Niveau Pilotage

Contient :

- dashboards
- alertes
- reporting
- exports
- historiques

## Navigation

### Sidebar Principale

- Dashboard
- Chantiers
- DQE
- Exécution
- Coûts
- QSE
- Reporting
- Paramètres

### Navigation Intra-Chantier

Chaque chantier possède une page détail avec les onglets :

- Vue générale
- Base technique
- DQE
- Journal
- Livraisons & matériaux
- Équipements
- Finances
- Qualité
- Sécurité
- Incidents
- Documents

## Parcours Utilisateur

### Direction

- entre par le dashboard portefeuille
- consulte alertes et synthèses
- ouvre les rapports consolidés

### Directeur Technique

- supervise techniquement plusieurs chantiers
- contrôle la cohérence technique
- valide les points sensibles

### Conducteur de Travaux

- gère le suivi quotidien chantier
- suit coûts, avancement, incidents et blocages

### Chef de Chantier

- saisit les données d'exécution encadrées
- met à jour journal, matériel, incidents, livraisons

### Métreur / Économiste

- construit et maintient la base articles
- règle les règles de quantification
- génère et ajuste le DQE

### Comptable

- suit engagements, paiements, dépenses et exports financiers

## Modèle De Données Métier

Entités principales :

- `companies`
- `users`
- `roles`
- `projects`
- `project_members`
- `project_phases`
- `project_locations`
- `project_levels`
- `project_spaces`
- `work_lots`
- `cost_codes`
- `dq_items`
- `price_libraries`
- `price_library_items`
- `quantity_rules`
- `project_technical_inputs`
- `dqe_versions`
- `dqe_lines`
- `daily_logs`
- `daily_log_labor_entries`
- `daily_log_equipment_entries`
- `material_deliveries`
- `equipment_registers`
- `budget_lines`
- `commitments`
- `expenses`
- `payments`
- `incidents`
- `quality_issues`
- `safety_events`
- `documents`
- `photos`
- `audit_logs`

## Logique Du DQE Automatique

### Entrées

Le moteur lit :

- les données techniques chantier
- le découpage par lots
- la bibliothèque d'articles
- les règles de quantification
- les prix unitaires hérités entreprise

### Calcul

Le système :

1. identifie les ouvrages concernés
2. sélectionne les articles applicables
3. calcule les quantités
4. applique les unités
5. applique les prix unitaires
6. génère les lignes DQE
7. totalise par lot puis globalement

### Exemples de règles

- surface dalle -> volume béton, coffrage, treillis
- longueur mur x hauteur -> blocs, mortier, enduit, peinture
- nombre de pièces humides -> articles plomberie
- type de toiture -> articles de couverture associés
- nombre de niveaux -> ajustement d'ouvrages verticaux et sécurité

### Ajustements

Les utilisateurs autorisés peuvent :

- modifier une quantité
- modifier un prix local chantier
- ajouter une ligne exceptionnelle
- figer une version

Tout ajustement doit être historisé.

## Gestion Des Coûts

La V1 doit séparer clairement :

- budget initial
- engagements
- dépenses réelles
- paiements
- écarts
- prévision à terminaison

Le rapprochement entre DQE, budget et exécution doit être visible.

## Permissions

Le contrôle d'accès est basé sur :

- le rôle
- le périmètre chantier
- le type d'action

Exemples :

- le Chef de chantier peut saisir le journal mais ne modifie pas la bibliothèque de prix
- le Métreur peut générer et ajuster le DQE
- le Comptable gère les paiements
- la Direction voit l'ensemble du portefeuille

## Architecture Technique

### Backend

`Laravel 12`

Responsabilités :

- API métier
- authentification
- autorisation
- moteur DQE
- export
- audit
- jobs asynchrones

### Frontend

`React`

Responsabilités :

- interface admin
- dashboards
- formulaires
- tableaux filtrables
- vues chantier
- édition DQE

### Base De Données

`PostgreSQL`

Choisi pour :

- intégrité relationnelle
- requêtes analytiques métier
- extensibilité

### Fichiers

Stockage des :

- documents
- plans
- photos
- exports

### Jobs

Traitements asynchrones :

- génération DQE
- recalculs
- exports PDF/Excel
- notifications

## UI Et Design System

L'application doit suivre l'organisation visuelle de `Simple` :

- sidebar admin
- topbar avec recherche
- grilles de cards
- widgets KPI
- tableaux avancés
- formulaires en sections
- onglets de détail
- modals et drawers

Pages principales :

- dashboard portefeuille
- listing chantiers
- création chantier
- fiche chantier
- page DQE
- page journal
- page coûts
- page QSE
- page reporting
- page paramètres

## Imports / Exports

### Imports

- import Excel de bordereaux/prix
- import de données chantier si nécessaire

### Exports

- export DQE Excel
- export DQE PDF
- export reporting chantier
- export reporting portefeuille

## Hors Périmètre V1

- application mobile terrain avancée
- espace client dédié
- workflows complexes de validation multi-niveaux
- forecasting très avancé
- takeoff 2D/3D natif sur plans
- collaboration temps réel de type chat

## Risques Principaux

### 1. DQE trop rigide

Si les règles de quantification sont codées en dur, le produit devient difficile à faire évoluer.

Réponse :

- règles paramétrables
- articles standardisés
- héritage entreprise

### 2. Sur-complexité fonctionnelle

Vouloir couvrir tous les cas BTP dès la V1 mettrait le produit en risque.

Réponse :

- V1 équilibrée
- noyau robuste
- extension progressive

### 3. Données incohérentes entre étude et exécution

Réponse :

- base technique unique
- versioning DQE
- historisation des modifications

## Recommandations D'Exécution

Construire le produit dans cet ordre :

1. socle auth, rôles, layout UI
2. module chantiers
3. référentiel entreprise
4. base technique chantier
5. moteur DQE v1
6. exécution chantier
7. coûts
8. QSE
9. reporting

## Note De Licence

Le template `Simple` est pertinent pour ce produit, mais si l'application est distribuée comme un produit SaaS, il faudra vérifier et sécuriser la licence adaptée côté Coderthemes avant mise en production.

## Résultat Attendu

À l'issue de la V1, l'entreprise doit disposer d'une application web qui :

- remplace la logique du fichier Excel
- structure l'information chantier
- gère plusieurs chantiers
- génère un DQE à partir des données techniques
- pilote coûts et avancement
- produit des rapports lisibles pour la direction
