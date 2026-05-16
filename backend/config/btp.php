<?php

return [
    // Labour & wages
    'smig_mensuel_xof' => 60000,

    // Tax & financial
    'tva_taux_standard' => 18,
    'retenue_garantie_pct' => 5,
    'avance_demarrage_pct' => 15,
    'devise' => 'XOF',

    // Holidays (Côte d'Ivoire)
    'jours_feries' => [
        '01-01' => 'Jour de l\'an',
        '05-01' => 'Fête du travail',
        '08-07' => 'Fête d\'Indépendance',
        '11-01' => 'Toussaint',
        '12-25' => 'Noël',
    ],

    // BTP Trades
    'trades_btp' => [
        'macon' => 'Maçon',
        'coffreur' => 'Coffreur',
        'ferrailleur' => 'Ferrailleur',
        'charpentier' => 'Charpentier',
        'menuisier' => 'Menuisier',
        'plombier' => 'Plombier',
        'electricien' => 'Électricien',
        'carreleur' => 'Carreleur',
        'peintre' => 'Peintre',
        'soudeur' => 'Soudeur',
        'grutier' => 'Grutier',
        'conducteur_engins' => 'Conducteur d\'engins',
        'chauffeur' => 'Chauffeur',
        'manoeuvre' => 'Manœuvre',
        'chef_equipe' => 'Chef d\'équipe',
        'contremaître' => 'Contremaître',
        'autre' => 'Autre',
    ],

    // BDC (Bon De Commande) approval thresholds by role
    'bdc_seuils_validation' => [
        500_000 => 'chef-chantier',        // <= 500K XOF → chef-chantier
        5_000_000 => 'conducteur-travaux', // <= 5M XOF → conducteur-travaux
        50_000_000 => 'directeur-technique', // <= 50M XOF → directeur-technique
        PHP_INT_MAX => 'direction',        // > 50M XOF → direction (directeur-general)
    ],
];
