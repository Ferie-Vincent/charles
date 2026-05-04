<?php

namespace App\Events;

use App\Models\StockItem;

class StockBelowThreshold
{
    public function __construct(
        public readonly StockItem $item,
        public readonly ?int $projectId = null,
    ) {}
}
