<?php

namespace App\Notifications;

use App\Models\AppUser;
use Illuminate\Notifications\Notification;

class PasswordResetRequested extends Notification
{
    public function __construct(
        private readonly AppUser $customer,
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    /**
     * Stored as JSON in the notifications table and served to the
     * bell dropdown in the frontend.
     */
    public function toDatabase(object $notifiable): array
    {
        return [
            'type' => 'password_reset',
            'user_id' => $this->customer->id,
            'username' => $this->customer->username,
            'message' => "{$this->customer->username} requested a password reset. Set a new password at the counter.",
        ];
    }
}
