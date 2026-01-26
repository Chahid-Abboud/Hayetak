<?php

namespace App\Services\Ai\Plan\Validation;

use RuntimeException;

class ValidationException extends RuntimeException
{
    public function __construct(
        public readonly array $errors,
        string $message = 'AI plan validation failed',
        int $code = 422
    ) {
        parent::__construct($message, $code);
    }
}
