<?php

return [
    // Labour & wages
    'smig_mensuel_xof' => 60000,

    // Tax & financial
    'tva_taux_standard' => 18,
    'retenue_garantie_pct' => 5,
    'avance_demarrage_pct' => 15,
    'devise' => 'XOF',

    // Holidays (Côte d'Ivoire) — jours fériés officiels fixes
    // Les fêtes islamiques (Aïd el-Fitr, Aïd el-Adha, Mouloud, Laylat al-Qadr)
    // et les fêtes chrétiennes mobiles (Pâques, Ascension, Pentecôte)
    // varient chaque année — les ajouter manuellement via 'jours_feries_annee'.
    'jours_feries' => [
        '01-01' => 'Jour de l\'an',
        '05-01' => 'Fête du travail',
        '08-07' => 'Fête de l\'Indépendance',
        '08-15' => 'Assomption',
        '11-01' => 'Toussaint',
        '11-15' => 'Fête nationale de la paix',
        '12-25' => 'Noël',
    ],

    // Fériés variables pour l'année en cours (format YYYY-MM-DD)
    // À mettre à jour chaque année. Couvre Pâques, Ascension, Pentecôte, fêtes islamiques.
    'jours_feries_annee' => [
        '2026-04-06' => 'Lundi de Pâques',
        '2026-05-14' => 'Ascension',
        '2026-05-25' => 'Lundi de Pentecôte',
        '2026-03-31' => 'Aïd el-Fitr (Korité)',
        '2026-06-07' => 'Aïd el-Adha (Tabaski)',
        '2026-08-28' => 'Mouloud',
    ],

    // Majorations heures supplémentaires (Code du travail CI)
    'majorations_heures_sup' => [
        'semaine'   => 1.25, // Heures sup jour ouvré  (25%)
        'semaine_8' => 1.50, // Heures sup > 8h jour ouvré (50%)
        'dimanche'  => 2.00, // Dimanche et jours fériés (100%)
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
