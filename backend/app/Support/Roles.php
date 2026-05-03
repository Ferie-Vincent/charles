<?php

namespace App\Support;

class Roles
{
    // ── Slugs individuels ─────────────────────────────────────────────────────
    const DIRECTION_SLUG           = 'direction';
    const DIRECTEUR_TECHNIQUE_SLUG = 'directeur-technique';
    const CONDUCTEUR_TRAVAUX_SLUG  = 'conducteur-travaux';
    const CHEF_CHANTIER_SLUG       = 'chef-chantier';
    const METREUR_ECONOMISTE_SLUG  = 'metreur-economiste';
    const COMPTABLE_SLUG           = 'comptable';
    const MOYENS_GENERAUX_SLUG     = 'moyens-generaux';
    const LECTURE_SEULE_SLUG       = 'lecture-seule';

    // ── Groupes fonctionnels ──────────────────────────────────────────────────

    /** Direction générale : approbation, validation, annulation exceptionnelle */
    const MANAGEMENT = ['direction', 'directeur-technique'];

    /** Terrain : conducteur de travaux, chef de chantier */
    const TERRAIN = ['chef-chantier', 'conducteur-travaux'];

    /** Finance : comptable + direction */
    const FINANCE = ['comptable', 'direction', 'directeur-technique'];

    /** Logistique terrain */
    const LOGISTICS = ['moyens-generaux'];

    /** Peut créer/modifier des BDC */
    const BDC_CREATORS = [
        'conducteur-travaux', 'chef-chantier', 'metreur-economiste',
        'moyens-generaux', 'direction', 'directeur-technique',
    ];

    /** Peut soumettre un DQE pour validation */
    const DQE_SUBMITTERS = ['metreur-economiste', 'conducteur-travaux', 'directeur-technique'];

    /** Peut consulter DQE / situation de travaux */
    const DQE_VIEWERS = ['direction', 'directeur-technique', 'conducteur-travaux', 'metreur-economiste'];

    /** Tous les rôles avec droits d'écriture (hors lecture-seule) */
    const ALL_WRITE = [
        'conducteur-travaux', 'chef-chantier', 'metreur-economiste',
        'comptable', 'moyens-generaux', 'direction', 'directeur-technique',
    ];

    /** Rôles dont les permissions sont non-configurables (toujours accès complet) */
    const LOCKED = ['direction', 'directeur-technique'];
}
