<?php

namespace Database\Seeders;

use App\Models\DqeLine;
use App\Models\DqeVersion;
use App\Models\Project;
use App\Models\User;
use Illuminate\Database\Seeder;

class DqeSeeder extends Seeder
{
    public function run(): void
    {
        $director = User::whereHas('role', fn ($q) => $q->where('name', 'direction'))->first()
            ?? User::first();

        $projects = Project::all()->keyBy('code');

        // ── Villa duplex R+1 (validated) ─────────────────────────────────────
        if ($villa = $projects->get('CH-ANGRE-2024-001')) {
            $v = DqeVersion::create([
                'project_id'     => $villa->id,
                'created_by'     => $director->id,
                'version_number' => 1,
                'name'           => 'DQE Initial – Villa duplex R+1',
                'status'         => 'validated',
                'notes'          => 'Version validée par la maîtrise d\'ouvrage en novembre 2024.',
            ]);
            $this->addLines($v, $this->villaLines());
            $v->recomputeTotal();
        }

        // ── Immeuble R+4 Yopougon (validated) ────────────────────────────────
        if ($imm = $projects->get('CH-YOP-2024-002')) {
            $v = DqeVersion::create([
                'project_id'     => $imm->id,
                'created_by'     => $director->id,
                'version_number' => 1,
                'name'           => 'DQE Initial – Immeuble R+4',
                'status'         => 'validated',
                'notes'          => 'Approuvé bureau de contrôle Janvier 2025.',
            ]);
            $this->addLines($v, $this->immeubleR4Lines());
            $v->recomputeTotal();

            // Avenant suite révision prix matériaux
            $v2 = DqeVersion::create([
                'project_id'     => $imm->id,
                'created_by'     => $director->id,
                'version_number' => 2,
                'name'           => 'Avenant n°1 – Révision prix matériaux',
                'status'         => 'draft',
                'notes'          => 'Révision suite à hausse ciment +12% — mars 2025.',
            ]);
            $this->addLines($v2, $this->immeubleR4AvenantLines());
            $v2->recomputeTotal();
        }

        // ── École primaire 6 classes (validated) ─────────────────────────────
        if ($ecole = $projects->get('CH-BKE-2025-001')) {
            $v = DqeVersion::create([
                'project_id'     => $ecole->id,
                'created_by'     => $director->id,
                'version_number' => 1,
                'name'           => 'DQE – École primaire 6 classes',
                'status'         => 'validated',
                'notes'          => 'Financement DREN — validé mars 2025.',
            ]);
            $this->addLines($v, $this->ecoleLines());
            $v->recomputeTotal();
        }

        // ── Centre commercial Plateau (draft) ────────────────────────────────
        if ($cc = $projects->get('CH-PLAT-2025-001')) {
            $v = DqeVersion::create([
                'project_id'     => $cc->id,
                'created_by'     => $director->id,
                'version_number' => 1,
                'name'           => 'DQE Initial – Centre commercial 2 niveaux',
                'status'         => 'draft',
                'notes'          => 'En cours de validation par le bureau d\'études.',
            ]);
            $this->addLines($v, $this->centreCommercialLines());
            $v->recomputeTotal();
        }

        // ── Entrepôt San Pédro (draft) ────────────────────────────────────────
        if ($ent = $projects->get('CH-SAN-2025-002')) {
            $v = DqeVersion::create([
                'project_id'     => $ent->id,
                'created_by'     => $director->id,
                'version_number' => 1,
                'name'           => 'DQE – Entrepôt logistique 2 000 m²',
                'status'         => 'draft',
            ]);
            $this->addLines($v, $this->entrepotLines());
            $v->recomputeTotal();
        }
    }

    private function addLines(DqeVersion $version, array $lines): void
    {
        foreach ($lines as $i => $line) {
            DqeLine::create([
                'dqe_version_id' => $version->id,
                'lot'            => $line['lot'],
                'ouvrage'        => $line['ouvrage'],
                'unite'          => $line['unite'],
                'quantite'       => $line['quantite'],
                'prix_unitaire'  => $line['prix_unitaire'],
                'ordre'          => $line['ordre'] ?? $i,
            ]);
        }
    }

    // ── Line datasets ─────────────────────────────────────────────────────────

    private function villaLines(): array
    {
        return [
            // Lot 01 – Installation de chantier
            ['lot' => 'Lot 01 – Installation de chantier', 'ouvrage' => 'Installation et repli de chantier', 'unite' => 'forfait', 'quantite' => 1, 'prix_unitaire' => 1_800_000],
            ['lot' => 'Lot 01 – Installation de chantier', 'ouvrage' => 'Clôture provisoire chantier (palissade)', 'unite' => 'ml', 'quantite' => 80, 'prix_unitaire' => 12_500],
            ['lot' => 'Lot 01 – Installation de chantier', 'ouvrage' => 'Baraque de chantier bureau + gardien', 'unite' => 'forfait', 'quantite' => 1, 'prix_unitaire' => 650_000],

            // Lot 02 – Terrassement & fondations
            ['lot' => 'Lot 02 – Terrassement & fondations', 'ouvrage' => 'Décapage terre végétale (20 cm)', 'unite' => 'm²', 'quantite' => 280, 'prix_unitaire' => 3_500],
            ['lot' => 'Lot 02 – Terrassement & fondations', 'ouvrage' => 'Fouilles en rigoles pour semelles', 'unite' => 'm³', 'quantite' => 95, 'prix_unitaire' => 14_000],
            ['lot' => 'Lot 02 – Terrassement & fondations', 'ouvrage' => 'Béton de propreté dosé 150 kg/m³', 'unite' => 'm³', 'quantite' => 12, 'prix_unitaire' => 95_000],
            ['lot' => 'Lot 02 – Terrassement & fondations', 'ouvrage' => 'Béton armé semelles filantes (dosé 350 kg)', 'unite' => 'm³', 'quantite' => 38, 'prix_unitaire' => 220_000],
            ['lot' => 'Lot 02 – Terrassement & fondations', 'ouvrage' => 'Remblai compacté sous dallage', 'unite' => 'm³', 'quantite' => 55, 'prix_unitaire' => 18_000],

            // Lot 03 – Gros Œuvre
            ['lot' => 'Lot 03 – Gros Œuvre', 'ouvrage' => 'Béton armé poteaux RDC (dosé 350 kg)', 'unite' => 'm³', 'quantite' => 24, 'prix_unitaire' => 235_000],
            ['lot' => 'Lot 03 – Gros Œuvre', 'ouvrage' => 'Béton armé poteaux R+1', 'unite' => 'm³', 'quantite' => 20, 'prix_unitaire' => 235_000],
            ['lot' => 'Lot 03 – Gros Œuvre', 'ouvrage' => 'Béton armé poutres et plancher RDC', 'unite' => 'm³', 'quantite' => 42, 'prix_unitaire' => 245_000],
            ['lot' => 'Lot 03 – Gros Œuvre', 'ouvrage' => 'Béton armé poutres et plancher R+1', 'unite' => 'm³', 'quantite' => 38, 'prix_unitaire' => 245_000],
            ['lot' => 'Lot 03 – Gros Œuvre', 'ouvrage' => 'Maçonnerie briques creuses 20×20×40 cm', 'unite' => 'm²', 'quantite' => 620, 'prix_unitaire' => 22_000],
            ['lot' => 'Lot 03 – Gros Œuvre', 'ouvrage' => 'Escalier béton armé (1 volée)', 'unite' => 'u', 'quantite' => 1, 'prix_unitaire' => 1_250_000],

            // Lot 04 – Charpente & toiture
            ['lot' => 'Lot 04 – Charpente & toiture', 'ouvrage' => 'Charpente métallique IPN/HEA', 'unite' => 'kg', 'quantite' => 2_800, 'prix_unitaire' => 3_200],
            ['lot' => 'Lot 04 – Charpente & toiture', 'ouvrage' => 'Couverture bac acier prélaqué e=0,6mm', 'unite' => 'm²', 'quantite' => 210, 'prix_unitaire' => 18_500],
            ['lot' => 'Lot 04 – Charpente & toiture', 'ouvrage' => 'Chéneau acier galvanisé', 'unite' => 'ml', 'quantite' => 48, 'prix_unitaire' => 9_500],
            ['lot' => 'Lot 04 – Charpente & toiture', 'ouvrage' => 'Descentes EP PVC Ø100', 'unite' => 'ml', 'quantite' => 32, 'prix_unitaire' => 6_500],

            // Lot 05 – Menuiseries
            ['lot' => 'Lot 05 – Menuiseries', 'ouvrage' => 'Porte d\'entrée aluminium double vantail vitrée', 'unite' => 'u', 'quantite' => 1, 'prix_unitaire' => 485_000],
            ['lot' => 'Lot 05 – Menuiseries', 'ouvrage' => 'Portes intérieures bois massif (chambres, salons)', 'unite' => 'u', 'quantite' => 12, 'prix_unitaire' => 145_000],
            ['lot' => 'Lot 05 – Menuiseries', 'ouvrage' => 'Fenêtres aluminium coulissantes avec moustiquaire', 'unite' => 'm²', 'quantite' => 68, 'prix_unitaire' => 95_000],
            ['lot' => 'Lot 05 – Menuiseries', 'ouvrage' => 'Garde-corps balcon acier peint', 'unite' => 'ml', 'quantite' => 22, 'prix_unitaire' => 55_000],

            // Lot 06 – Plomberie & sanitaire
            ['lot' => 'Lot 06 – Plomberie & sanitaire', 'ouvrage' => 'Réseau AEP complet (alimentation + distribution)', 'unite' => 'forfait', 'quantite' => 1, 'prix_unitaire' => 3_200_000],
            ['lot' => 'Lot 06 – Plomberie & sanitaire', 'ouvrage' => 'Réseau EU/EV complet', 'unite' => 'forfait', 'quantite' => 1, 'prix_unitaire' => 2_400_000],
            ['lot' => 'Lot 06 – Plomberie & sanitaire', 'ouvrage' => 'Appareils sanitaires (WC, lavabo, douche, évier)', 'unite' => 'forfait', 'quantite' => 1, 'prix_unitaire' => 1_850_000],
            ['lot' => 'Lot 06 – Plomberie & sanitaire', 'ouvrage' => 'Chauffe-eau électrique 200 L', 'unite' => 'u', 'quantite' => 2, 'prix_unitaire' => 285_000],

            // Lot 07 – Électricité
            ['lot' => 'Lot 07 – Électricité', 'ouvrage' => 'Tableau électrique général + disjoncteurs', 'unite' => 'forfait', 'quantite' => 1, 'prix_unitaire' => 980_000],
            ['lot' => 'Lot 07 – Électricité', 'ouvrage' => 'Câblage et appareillage électrique complet', 'unite' => 'forfait', 'quantite' => 1, 'prix_unitaire' => 2_750_000],
            ['lot' => 'Lot 07 – Électricité', 'ouvrage' => 'Groupe électrogène 20 KVA', 'unite' => 'u', 'quantite' => 1, 'prix_unitaire' => 4_200_000],
            ['lot' => 'Lot 07 – Électricité', 'ouvrage' => 'Climatisation split (5 pièces)', 'unite' => 'u', 'quantite' => 5, 'prix_unitaire' => 580_000],

            // Lot 08 – Revêtements & finitions
            ['lot' => 'Lot 08 – Revêtements & finitions', 'ouvrage' => 'Enduit ciment intérieur sur murs', 'unite' => 'm²', 'quantite' => 1_240, 'prix_unitaire' => 8_500],
            ['lot' => 'Lot 08 – Revêtements & finitions', 'ouvrage' => 'Enduit façade extérieure (tyrolien)', 'unite' => 'm²', 'quantite' => 480, 'prix_unitaire' => 12_000],
            ['lot' => 'Lot 08 – Revêtements & finitions', 'ouvrage' => 'Carrelage sol 60×60 grès cérame (séjour, chambre)', 'unite' => 'm²', 'quantite' => 320, 'prix_unitaire' => 28_000],
            ['lot' => 'Lot 08 – Revêtements & finitions', 'ouvrage' => 'Faïence murale salle de bain 30×60', 'unite' => 'm²', 'quantite' => 85, 'prix_unitaire' => 22_000],
            ['lot' => 'Lot 08 – Revêtements & finitions', 'ouvrage' => 'Peinture acrylique 2 couches intérieur', 'unite' => 'm²', 'quantite' => 1_240, 'prix_unitaire' => 4_500],
            ['lot' => 'Lot 08 – Revêtements & finitions', 'ouvrage' => 'Peinture façade extérieure', 'unite' => 'm²', 'quantite' => 480, 'prix_unitaire' => 5_500],

            // Lot 09 – VRD & espaces extérieurs
            ['lot' => 'Lot 09 – VRD & espaces extérieurs', 'ouvrage' => 'Clôture définitive parpaing + portail', 'unite' => 'ml', 'quantite' => 80, 'prix_unitaire' => 85_000],
            ['lot' => 'Lot 09 – VRD & espaces extérieurs', 'ouvrage' => 'Dallage béton allée véhicule + parking', 'unite' => 'm²', 'quantite' => 120, 'prix_unitaire' => 18_000],
            ['lot' => 'Lot 09 – VRD & espaces extérieurs', 'ouvrage' => 'Fosse septique 5 m³ + épandage', 'unite' => 'forfait', 'quantite' => 1, 'prix_unitaire' => 950_000],
        ];
    }

    private function immeubleR4Lines(): array
    {
        return [
            ['lot' => 'Lot 01 – Installation de chantier', 'ouvrage' => 'Installation générale de chantier', 'unite' => 'forfait', 'quantite' => 1, 'prix_unitaire' => 4_500_000],
            ['lot' => 'Lot 01 – Installation de chantier', 'ouvrage' => 'Grue à tour 40m (location 18 mois)', 'unite' => 'mois', 'quantite' => 18, 'prix_unitaire' => 2_800_000],

            ['lot' => 'Lot 02 – Fondations', 'ouvrage' => 'Pieux forés diamètre 800 mm L=14m', 'unite' => 'u', 'quantite' => 32, 'prix_unitaire' => 3_200_000],
            ['lot' => 'Lot 02 – Fondations', 'ouvrage' => 'Béton armé radier général (e=40 cm)', 'unite' => 'm³', 'quantite' => 280, 'prix_unitaire' => 250_000],
            ['lot' => 'Lot 02 – Fondations', 'ouvrage' => 'Béton armé voiles sous-sol', 'unite' => 'm³', 'quantite' => 95, 'prix_unitaire' => 240_000],

            ['lot' => 'Lot 03 – Structure béton armé', 'ouvrage' => 'Béton armé poteaux (tous niveaux)', 'unite' => 'm³', 'quantite' => 185, 'prix_unitaire' => 235_000],
            ['lot' => 'Lot 03 – Structure béton armé', 'ouvrage' => 'Béton armé voiles béton porteurs', 'unite' => 'm³', 'quantite' => 220, 'prix_unitaire' => 230_000],
            ['lot' => 'Lot 03 – Structure béton armé', 'ouvrage' => 'Béton armé planchers hourdis (tous niveaux)', 'unite' => 'm²', 'quantite' => 2_400, 'prix_unitaire' => 58_000],
            ['lot' => 'Lot 03 – Structure béton armé', 'ouvrage' => 'Béton armé escaliers (4 volées)', 'unite' => 'u', 'quantite' => 4, 'prix_unitaire' => 2_800_000],
            ['lot' => 'Lot 03 – Structure béton armé', 'ouvrage' => 'Ascenseur 8 personnes (fourniture + pose)', 'unite' => 'u', 'quantite' => 1, 'prix_unitaire' => 28_000_000],

            ['lot' => 'Lot 04 – Maçonnerie & cloisons', 'ouvrage' => 'Maçonnerie briques creuses 15 cm façades', 'unite' => 'm²', 'quantite' => 1_800, 'prix_unitaire' => 22_000],
            ['lot' => 'Lot 04 – Maçonnerie & cloisons', 'ouvrage' => 'Cloisons séparatives briques 10 cm', 'unite' => 'm²', 'quantite' => 2_200, 'prix_unitaire' => 18_500],

            ['lot' => 'Lot 05 – Couverture & étanchéité', 'ouvrage' => 'Étanchéité terrasse accessible bicouche', 'unite' => 'm²', 'quantite' => 480, 'prix_unitaire' => 22_500],
            ['lot' => 'Lot 05 – Couverture & étanchéité', 'ouvrage' => 'Protection béton gravillonné sur étanchéité', 'unite' => 'm²', 'quantite' => 480, 'prix_unitaire' => 8_500],

            ['lot' => 'Lot 06 – Menuiseries extérieures', 'ouvrage' => 'Menuiseries aluminium façades (toutes ouvertures)', 'unite' => 'm²', 'quantite' => 680, 'prix_unitaire' => 95_000],
            ['lot' => 'Lot 06 – Menuiseries extérieures', 'ouvrage' => 'Garde-corps balcons acier inox', 'unite' => 'ml', 'quantite' => 220, 'prix_unitaire' => 85_000],

            ['lot' => 'Lot 07 – Plomberie & CVC', 'ouvrage' => 'Réseau AEP vertical + horizontal par niveau', 'unite' => 'forfait', 'quantite' => 1, 'prix_unitaire' => 18_500_000],
            ['lot' => 'Lot 07 – Plomberie & CVC', 'ouvrage' => 'Réseau EU/EV colonnes + branchements', 'unite' => 'forfait', 'quantite' => 1, 'prix_unitaire' => 12_000_000],
            ['lot' => 'Lot 07 – Plomberie & CVC', 'ouvrage' => 'Appareils sanitaires 16 appartements', 'unite' => 'forfait', 'quantite' => 1, 'prix_unitaire' => 22_000_000],
            ['lot' => 'Lot 07 – Plomberie & CVC', 'ouvrage' => 'Climatisation centrale VRF (16 appartements)', 'unite' => 'forfait', 'quantite' => 1, 'prix_unitaire' => 68_000_000],

            ['lot' => 'Lot 08 – Électricité TGBT', 'ouvrage' => 'TGBT + tableaux divisionnaires par niveau', 'unite' => 'forfait', 'quantite' => 1, 'prix_unitaire' => 8_500_000],
            ['lot' => 'Lot 08 – Électricité TGBT', 'ouvrage' => 'Câblage complet 16 appartements + communs', 'unite' => 'forfait', 'quantite' => 1, 'prix_unitaire' => 24_000_000],
            ['lot' => 'Lot 08 – Électricité TGBT', 'ouvrage' => 'Groupe électrogène 100 KVA', 'unite' => 'u', 'quantite' => 1, 'prix_unitaire' => 22_000_000],

            ['lot' => 'Lot 09 – Revêtements & finitions', 'ouvrage' => 'Enduit intérieur plâtre sur murs + plafonds', 'unite' => 'm²', 'quantite' => 8_800, 'prix_unitaire' => 9_500],
            ['lot' => 'Lot 09 – Revêtements & finitions', 'ouvrage' => 'Carrelage sol grès cérame 60×60', 'unite' => 'm²', 'quantite' => 2_200, 'prix_unitaire' => 30_000],
            ['lot' => 'Lot 09 – Revêtements & finitions', 'ouvrage' => 'Faïence salle de bain 30×60', 'unite' => 'm²', 'quantite' => 680, 'prix_unitaire' => 24_000],
            ['lot' => 'Lot 09 – Revêtements & finitions', 'ouvrage' => 'Peinture acrylique intérieure 2 couches', 'unite' => 'm²', 'quantite' => 8_800, 'prix_unitaire' => 4_800],
            ['lot' => 'Lot 09 – Revêtements & finitions', 'ouvrage' => 'Bardage façade composite aluminium', 'unite' => 'm²', 'quantite' => 580, 'prix_unitaire' => 65_000],
        ];
    }

    private function immeubleR4AvenantLines(): array
    {
        return [
            ['lot' => 'Lot 03 – Structure béton armé', 'ouvrage' => 'Complément béton armé poteaux (révision qté réelle)', 'unite' => 'm³', 'quantite' => 12, 'prix_unitaire' => 245_000],
            ['lot' => 'Lot 03 – Structure béton armé', 'ouvrage' => 'Acier HA sup. ferraillage (hausse cours)', 'unite' => 't', 'quantite' => 8, 'prix_unitaire' => 950_000],
            ['lot' => 'Lot 07 – Plomberie & CVC', 'ouvrage' => 'Révision prix climatisation suite hausse composants', 'unite' => 'forfait', 'quantite' => 1, 'prix_unitaire' => 4_500_000],
            ['lot' => 'Lot 09 – Revêtements & finitions', 'ouvrage' => 'Carrelage haut de gamme hall d\'entrée (changement spec)', 'unite' => 'm²', 'quantite' => 120, 'prix_unitaire' => 48_000],
        ];
    }

    private function ecoleLines(): array
    {
        return [
            ['lot' => 'Lot 01 – Installation de chantier', 'ouvrage' => 'Installation et repli chantier', 'unite' => 'forfait', 'quantite' => 1, 'prix_unitaire' => 2_200_000],

            ['lot' => 'Lot 02 – Terrassement général', 'ouvrage' => 'Décapage et débroussaillage terrain', 'unite' => 'm²', 'quantite' => 3_500, 'prix_unitaire' => 2_800],
            ['lot' => 'Lot 02 – Terrassement général', 'ouvrage' => 'Fouilles générales mécaniques', 'unite' => 'm³', 'quantite' => 320, 'prix_unitaire' => 12_000],
            ['lot' => 'Lot 02 – Terrassement général', 'ouvrage' => 'Remblai sélectionné compacté', 'unite' => 'm³', 'quantite' => 180, 'prix_unitaire' => 15_500],

            ['lot' => 'Lot 03 – Fondations & structure', 'ouvrage' => 'Béton de propreté 150 kg/m³', 'unite' => 'm³', 'quantite' => 28, 'prix_unitaire' => 92_000],
            ['lot' => 'Lot 03 – Fondations & structure', 'ouvrage' => 'Béton armé semelles isolées (dosé 350 kg)', 'unite' => 'm³', 'quantite' => 72, 'prix_unitaire' => 215_000],
            ['lot' => 'Lot 03 – Fondations & structure', 'ouvrage' => 'Béton armé longrines', 'unite' => 'm³', 'quantite' => 45, 'prix_unitaire' => 225_000],
            ['lot' => 'Lot 03 – Fondations & structure', 'ouvrage' => 'Béton armé poteaux et poutres', 'unite' => 'm³', 'quantite' => 88, 'prix_unitaire' => 228_000],
            ['lot' => 'Lot 03 – Fondations & structure', 'ouvrage' => 'Charpente métallique (portée 8m, 6 travées)', 'unite' => 'kg', 'quantite' => 18_500, 'prix_unitaire' => 3_100],

            ['lot' => 'Lot 04 – Maçonnerie & cloisons', 'ouvrage' => 'Maçonnerie briques creuses 20 cm', 'unite' => 'm²', 'quantite' => 1_420, 'prix_unitaire' => 21_500],
            ['lot' => 'Lot 04 – Maçonnerie & cloisons', 'ouvrage' => 'Cloisons légères 10 cm inter-salles', 'unite' => 'm²', 'quantite' => 680, 'prix_unitaire' => 18_000],

            ['lot' => 'Lot 05 – Couverture', 'ouvrage' => 'Couverture tôle ondulée prélaquée e=0,7mm', 'unite' => 'm²', 'quantite' => 1_080, 'prix_unitaire' => 16_500],
            ['lot' => 'Lot 05 – Couverture', 'ouvrage' => 'Chéneau béton armé', 'unite' => 'ml', 'quantite' => 180, 'prix_unitaire' => 28_000],
            ['lot' => 'Lot 05 – Couverture', 'ouvrage' => 'Descentes EP PVC Ø100 + regards béton', 'unite' => 'u', 'quantite' => 24, 'prix_unitaire' => 45_000],

            ['lot' => 'Lot 06 – Menuiseries', 'ouvrage' => 'Portes d\'accès salles acier galvanisé 2 vantaux', 'unite' => 'u', 'quantite' => 12, 'prix_unitaire' => 185_000],
            ['lot' => 'Lot 06 – Menuiseries', 'ouvrage' => 'Fenêtres aluminium abattant avec grilles', 'unite' => 'm²', 'quantite' => 340, 'prix_unitaire' => 75_000],
            ['lot' => 'Lot 06 – Menuiseries', 'ouvrage' => 'Tableau noir ardoise (6 salles)', 'unite' => 'u', 'quantite' => 12, 'prix_unitaire' => 45_000],

            ['lot' => 'Lot 07 – Plomberie & sanitaires', 'ouvrage' => 'Blocs sanitaires (6 WC garçons + 6 filles)', 'unite' => 'forfait', 'quantite' => 1, 'prix_unitaire' => 8_500_000],
            ['lot' => 'Lot 07 – Plomberie & sanitaires', 'ouvrage' => 'Réseau AEP alimentation depuis château d\'eau', 'unite' => 'forfait', 'quantite' => 1, 'prix_unitaire' => 2_800_000],
            ['lot' => 'Lot 07 – Plomberie & sanitaires', 'ouvrage' => 'Château d\'eau métallique 10 m³ h=6m', 'unite' => 'u', 'quantite' => 1, 'prix_unitaire' => 4_200_000],

            ['lot' => 'Lot 08 – Électricité', 'ouvrage' => 'Tableau général + éclairage 6 salles + communs', 'unite' => 'forfait', 'quantite' => 1, 'prix_unitaire' => 3_800_000],
            ['lot' => 'Lot 08 – Électricité', 'ouvrage' => 'Panneaux solaires 10 kWc + batteries', 'unite' => 'forfait', 'quantite' => 1, 'prix_unitaire' => 12_500_000],

            ['lot' => 'Lot 09 – Revêtements & finitions', 'ouvrage' => 'Enduit ciment intérieur murs + plafonds', 'unite' => 'm²', 'quantite' => 3_400, 'prix_unitaire' => 8_000],
            ['lot' => 'Lot 09 – Revêtements & finitions', 'ouvrage' => 'Carrelage sol grès antidérapant 40×40', 'unite' => 'm²', 'quantite' => 1_020, 'prix_unitaire' => 22_000],
            ['lot' => 'Lot 09 – Revêtements & finitions', 'ouvrage' => 'Peinture acrylique intérieur 2 couches', 'unite' => 'm²', 'quantite' => 3_400, 'prix_unitaire' => 4_200],
            ['lot' => 'Lot 09 – Revêtements & finitions', 'ouvrage' => 'Peinture façades extérieures couleurs vives', 'unite' => 'm²', 'quantite' => 1_400, 'prix_unitaire' => 5_800],

            ['lot' => 'Lot 10 – VRD & aménagements ext.', 'ouvrage' => 'Clôture grillagée galvanisée H=2m sur muret', 'unite' => 'ml', 'quantite' => 380, 'prix_unitaire' => 62_000],
            ['lot' => 'Lot 10 – VRD & aménagements ext.', 'ouvrage' => 'Portail métallique d\'entrée 5m', 'unite' => 'u', 'quantite' => 1, 'prix_unitaire' => 680_000],
            ['lot' => 'Lot 10 – VRD & aménagements ext.', 'ouvrage' => 'Aire de jeux béton + pelouse synthétique', 'unite' => 'm²', 'quantite' => 800, 'prix_unitaire' => 12_000],
            ['lot' => 'Lot 10 – VRD & aménagements ext.', 'ouvrage' => 'Fosse septique toutes eaux 20 m³', 'unite' => 'forfait', 'quantite' => 1, 'prix_unitaire' => 3_200_000],
        ];
    }

    private function centreCommercialLines(): array
    {
        return [
            ['lot' => 'Lot 01 – Installation de chantier', 'ouvrage' => 'Installation générale chantier + sécurisation', 'unite' => 'forfait', 'quantite' => 1, 'prix_unitaire' => 12_000_000],

            ['lot' => 'Lot 02 – Fondations profondes', 'ouvrage' => 'Pieux forés D1000 mm L=18m', 'unite' => 'u', 'quantite' => 48, 'prix_unitaire' => 5_200_000],
            ['lot' => 'Lot 02 – Fondations profondes', 'ouvrage' => 'Béton armé chapiteaux et longrines', 'unite' => 'm³', 'quantite' => 420, 'prix_unitaire' => 250_000],

            ['lot' => 'Lot 03 – Structure métallique', 'ouvrage' => 'Charpente métallique principale HEA/HEB', 'unite' => 't', 'quantite' => 185, 'prix_unitaire' => 1_250_000],
            ['lot' => 'Lot 03 – Structure métallique', 'ouvrage' => 'Plancher collaborant dalle béton 12 cm', 'unite' => 'm²', 'quantite' => 4_800, 'prix_unitaire' => 48_000],
            ['lot' => 'Lot 03 – Structure béton armé', 'ouvrage' => 'Béton armé noyaux rigides (escaliers, ascenseurs)', 'unite' => 'm³', 'quantite' => 280, 'prix_unitaire' => 245_000],
            ['lot' => 'Lot 03 – Structure béton armé', 'ouvrage' => '2 ascenseurs panoramiques 13 personnes', 'unite' => 'u', 'quantite' => 2, 'prix_unitaire' => 45_000_000],

            ['lot' => 'Lot 04 – Façades & couverture', 'ouvrage' => 'Façade rideau aluminium + vitrage 8+8 feuilleté', 'unite' => 'm²', 'quantite' => 2_200, 'prix_unitaire' => 185_000],
            ['lot' => 'Lot 04 – Façades & couverture', 'ouvrage' => 'Étanchéité toiture terrasse végétalisée', 'unite' => 'm²', 'quantite' => 2_400, 'prix_unitaire' => 38_000],

            ['lot' => 'Lot 05 – Cloisonnement intérieur', 'ouvrage' => 'Cloisons distributives plâtre (boutiques)', 'unite' => 'm²', 'quantite' => 3_600, 'prix_unitaire' => 28_500],
            ['lot' => 'Lot 05 – Cloisonnement intérieur', 'ouvrage' => 'Faux plafond dalles minérales', 'unite' => 'm²', 'quantite' => 3_800, 'prix_unitaire' => 18_500],

            ['lot' => 'Lot 06 – CVC', 'ouvrage' => 'Climatisation centrale traitement d\'air (2 niveaux)', 'unite' => 'forfait', 'quantite' => 1, 'prix_unitaire' => 185_000_000],
            ['lot' => 'Lot 06 – CVC', 'ouvrage' => 'Désenfumage mécanique (ERP cat. M)', 'unite' => 'forfait', 'quantite' => 1, 'prix_unitaire' => 28_000_000],

            ['lot' => 'Lot 07 – Plomberie & sprinkler', 'ouvrage' => 'Réseau AEP + EU/EV complet', 'unite' => 'forfait', 'quantite' => 1, 'prix_unitaire' => 42_000_000],
            ['lot' => 'Lot 07 – Plomberie & sprinkler', 'ouvrage' => 'Réseau sprinkler protection incendie', 'unite' => 'forfait', 'quantite' => 1, 'prix_unitaire' => 55_000_000],

            ['lot' => 'Lot 08 – Électricité HTA/BT', 'ouvrage' => 'Poste de transformation HTA 630 KVA', 'unite' => 'u', 'quantite' => 1, 'prix_unitaire' => 85_000_000],
            ['lot' => 'Lot 08 – Électricité HTA/BT', 'ouvrage' => 'TGBT + câblage distribution + éclairage', 'unite' => 'forfait', 'quantite' => 1, 'prix_unitaire' => 120_000_000],
            ['lot' => 'Lot 08 – Électricité HTA/BT', 'ouvrage' => 'Groupe électrogène secours 500 KVA', 'unite' => 'u', 'quantite' => 1, 'prix_unitaire' => 95_000_000],

            ['lot' => 'Lot 09 – Finitions', 'ouvrage' => 'Revêtement sol marbre poli halls + circulations', 'unite' => 'm²', 'quantite' => 1_200, 'prix_unitaire' => 85_000],
            ['lot' => 'Lot 09 – Finitions', 'ouvrage' => 'Carrelage grès cérame grandes surfaces boutiques', 'unite' => 'm²', 'quantite' => 2_800, 'prix_unitaire' => 35_000],
            ['lot' => 'Lot 09 – Finitions', 'ouvrage' => 'Signalétique et décoration intérieure', 'unite' => 'forfait', 'quantite' => 1, 'prix_unitaire' => 18_000_000],

            ['lot' => 'Lot 10 – VRD & parking', 'ouvrage' => 'Parking souterrain 120 places (terrassement + dallage)', 'unite' => 'forfait', 'quantite' => 1, 'prix_unitaire' => 280_000_000],
            ['lot' => 'Lot 10 – VRD & parking', 'ouvrage' => 'Voirie accès et aménagements extérieurs', 'unite' => 'forfait', 'quantite' => 1, 'prix_unitaire' => 45_000_000],
        ];
    }

    private function entrepotLines(): array
    {
        return [
            ['lot' => 'Lot 01 – Installation de chantier', 'ouvrage' => 'Installation et repli chantier', 'unite' => 'forfait', 'quantite' => 1, 'prix_unitaire' => 3_500_000],

            ['lot' => 'Lot 02 – Terrassement & VRD', 'ouvrage' => 'Terrassement général + décapage', 'unite' => 'm³', 'quantite' => 1_200, 'prix_unitaire' => 11_000],
            ['lot' => 'Lot 02 – Terrassement & VRD', 'ouvrage' => 'Couche de forme GNT 0/31,5 (e=20cm)', 'unite' => 'm²', 'quantite' => 2_200, 'prix_unitaire' => 8_500],
            ['lot' => 'Lot 02 – Terrassement & VRD', 'ouvrage' => 'Voirie accès béton armé (aire manœuvre PL)', 'unite' => 'm²', 'quantite' => 1_800, 'prix_unitaire' => 28_000],

            ['lot' => 'Lot 03 – Fondations', 'ouvrage' => 'Béton de propreté 150 kg/m³', 'unite' => 'm³', 'quantite' => 35, 'prix_unitaire' => 90_000],
            ['lot' => 'Lot 03 – Fondations', 'ouvrage' => 'Béton armé semelles isolées poteaux', 'unite' => 'm³', 'quantite' => 95, 'prix_unitaire' => 215_000],
            ['lot' => 'Lot 03 – Fondations', 'ouvrage' => 'Dallage industriel armé fibre 20cm (charge 5t/m²)', 'unite' => 'm²', 'quantite' => 2_000, 'prix_unitaire' => 42_000],

            ['lot' => 'Lot 04 – Charpente métallique', 'ouvrage' => 'Charpente portique acier portée 40m', 'unite' => 't', 'quantite' => 95, 'prix_unitaire' => 1_150_000],
            ['lot' => 'Lot 04 – Charpente métallique', 'ouvrage' => 'Bardage bac acier isolé parois latérales', 'unite' => 'm²', 'quantite' => 2_400, 'prix_unitaire' => 22_000],
            ['lot' => 'Lot 04 – Charpente métallique', 'ouvrage' => 'Couverture bac acier isolé (e=10cm LDV)', 'unite' => 'm²', 'quantite' => 2_200, 'prix_unitaire' => 28_000],
            ['lot' => 'Lot 04 – Charpente métallique', 'ouvrage' => 'Lanterneaux désenfumage NF (1/200 surface)', 'unite' => 'm²', 'quantite' => 120, 'prix_unitaire' => 85_000],

            ['lot' => 'Lot 05 – Portes & menuiseries', 'ouvrage' => 'Portes sectionnelles industrielles H5×L4m', 'unite' => 'u', 'quantite' => 6, 'prix_unitaire' => 2_800_000],
            ['lot' => 'Lot 05 – Portes & menuiseries', 'ouvrage' => 'Portes piétonnes coupe-feu EI60 2h', 'unite' => 'u', 'quantite' => 8, 'prix_unitaire' => 380_000],
            ['lot' => 'Lot 05 – Portes & menuiseries', 'ouvrage' => 'Quais de chargement avec niveleurs hydrauliques', 'unite' => 'u', 'quantite' => 4, 'prix_unitaire' => 4_500_000],

            ['lot' => 'Lot 06 – Sprinkler & incendie', 'ouvrage' => 'Réseau sprinkler ESFR (risque ordinaire M4)', 'unite' => 'forfait', 'quantite' => 1, 'prix_unitaire' => 48_000_000],
            ['lot' => 'Lot 06 – Sprinkler & incendie', 'ouvrage' => 'RIA + extincteurs + détection incendie', 'unite' => 'forfait', 'quantite' => 1, 'prix_unitaire' => 12_000_000],

            ['lot' => 'Lot 07 – Électricité', 'ouvrage' => 'TGBT + éclairage LED haute-baie (200 lux)', 'unite' => 'forfait', 'quantite' => 1, 'prix_unitaire' => 28_000_000],
            ['lot' => 'Lot 07 – Électricité', 'ouvrage' => 'Groupe électrogène 200 KVA', 'unite' => 'u', 'quantite' => 1, 'prix_unitaire' => 42_000_000],
            ['lot' => 'Lot 07 – Électricité', 'ouvrage' => 'Panneaux photovoltaïques toiture 50 kWc', 'unite' => 'forfait', 'quantite' => 1, 'prix_unitaire' => 35_000_000],

            ['lot' => 'Lot 08 – Bureaux & sanitaires', 'ouvrage' => 'Construction bureau 200 m² RDC (clé en main)', 'unite' => 'forfait', 'quantite' => 1, 'prix_unitaire' => 55_000_000],
            ['lot' => 'Lot 08 – Bureaux & sanitaires', 'ouvrage' => 'Sanitaires vestiaires personnel (WC + douches)', 'unite' => 'forfait', 'quantite' => 1, 'prix_unitaire' => 8_500_000],

            ['lot' => 'Lot 09 – Clôture & sécurité', 'ouvrage' => 'Clôture périmétrique H=3m béton + grillage rigide', 'unite' => 'ml', 'quantite' => 480, 'prix_unitaire' => 95_000],
            ['lot' => 'Lot 09 – Clôture & sécurité', 'ouvrage' => 'Portail coulissant motorisé H=3m L=10m', 'unite' => 'u', 'quantite' => 2, 'prix_unitaire' => 3_200_000],
            ['lot' => 'Lot 09 – Clôture & sécurité', 'ouvrage' => 'Vidéosurveillance 24 caméras + contrôle accès', 'unite' => 'forfait', 'quantite' => 1, 'prix_unitaire' => 22_000_000],
        ];
    }
}
