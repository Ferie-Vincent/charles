<?php

namespace App\Events;

use App\Models\Invoice;
use App\Models\User;

class InvoiceValidated
{
    public function __construct(
        public readonly Invoice $invoice,
        public readonly User $validator,
    ) {}
}
