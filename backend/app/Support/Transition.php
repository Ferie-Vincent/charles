<?php

namespace App\Support;

use App\Exceptions\StateConflictException;
use Illuminate\Database\Eloquent\Model;

/**
 * Transition d'état atomique : UPDATE … WHERE id = ? AND status IN (…).
 *
 * Le test « est-ce que je suis dans le bon état ? » est fait PAR la base, dans la même
 * instruction que l'écriture. Deux requêtes identiques arrivant à quelques millisecondes
 * d'intervalle (retry PWA sur 3G, double clic) : la première gagne, la seconde ne touche
 * aucune ligne et lève StateConflictException (→ 409). Aucun événement n'est émis deux fois.
 *
 * Contrairement à un `if ($model->status !== 'x') abort(422)` suivi d'un `update()`,
 * il n'y a pas de fenêtre entre la lecture et l'écriture.
 */
final class Transition
{
    /**
     * @param  string|string[]  $from     État(s) source acceptés.
     * @param  array<string, mixed>  $updates  Colonnes à écrire (doit inclure le nouveau statut).
     *
     * @throws StateConflictException si aucune ligne n'a été modifiée.
     */
    public static function apply(Model $model, string|array $from, array $updates, string $column = 'status'): void
    {
        $from = (array) $from;

        if ($model->usesTimestamps() && ! array_key_exists($model->getUpdatedAtColumn(), $updates)) {
            $updates[$model->getUpdatedAtColumn()] = $model->freshTimestamp();
        }

        $affected = $model->newQueryWithoutScopes()
            ->whereKey($model->getKey())
            ->whereIn($column, $from)
            ->toBase()
            ->update($updates);

        if ($affected === 0) {
            $current = $model->newQueryWithoutScopes()->whereKey($model->getKey())->value($column);

            throw new StateConflictException(sprintf(
                "%s #%s : état attendu « %s », état actuel « %s ». L'action a probablement déjà été effectuée.",
                class_basename($model),
                $model->getKey(),
                implode(' | ', $from),
                $current ?? 'inconnu'
            ));
        }

        $model->refresh();
    }
}
