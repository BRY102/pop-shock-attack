<?php

namespace App\Notifications;

use App\Models\InventoryItem;
use Illuminate\Notifications\Notification;

/**
 * Objective 2.4: warn the shop when logging a job's parts pushes a
 * consumable to its alert level, so a service is never held up by stock
 * nobody noticed running out.
 */
class LowStockDetected extends Notification
{
    public function __construct(
        private readonly InventoryItem $item,
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
        $stock = (int) $this->item->stock;

        return [
            'type' => 'low_stock',
            'item_id' => $this->item->id,
            'item_name' => $this->item->name,
            'stock' => $stock,
            'threshold' => (int) $this->item->threshold,
            'message' => $stock === 0
                ? "{$this->item->name} is out of stock. It has to be restocked before it can be logged on another job."
                : "{$this->item->name} is down to {$stock} left (alert level {$this->item->threshold}). Restock it soon.",
        ];
    }
}
