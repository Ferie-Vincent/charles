<?php

namespace App\Events;

use App\Models\Invoice;
use App\Models\User;

class InvoiceDisputee
{
    public function __construct(
        public readonly Invoice $invoice,
        public readonly User $by,
        public readonly string $from,
    ) {}
}
