<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class TwoFactorRecoveryCodesMail extends Mailable
{
    use Queueable, SerializesModels;

    /**
     * @param array<int, string> $codes
     */
    public function __construct(
        public string $displayName,
        public array $codes
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Your 2FA Recovery Codes'
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.two-factor-recovery-codes'
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
