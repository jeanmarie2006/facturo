<?php

namespace App\Services;

class Format
{
    public static function montant(float $n, string $devise = 'XOF'): string
    {
        return match ($devise) {
            'EUR' => number_format($n, 2, ',', "\u{00A0}")."\u{00A0}€",
            'USD' => '$'.number_format($n, 2, '.', ','),
            default => number_format($n, 0, ',', "\u{00A0}")."\u{00A0}FCFA",
        };
    }
}
