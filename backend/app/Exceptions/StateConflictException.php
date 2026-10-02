<?php

namespace App\Exceptions;

use RuntimeException;

/**
 * Levée quand une transition d'état n'a modifié aucune ligne :
 * l'entité n'était plus dans l'état attendu (requête rejouée, action concurrente).
 * Rendue en HTTP 409 — le client doit recharger l'entité, pas réessayer à l'aveugle.
 */
class StateConflictException extends RuntimeException
{
}
