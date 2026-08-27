<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Routing\Middleware\ThrottleRequests;

abstract class TestCase extends BaseTestCase
{
    /**
     * Feature tests hit /login many times from one IP. Keep throttle
     * off unless a test class opts in to exercise the limiter.
     */
    protected bool $disableAuthThrottle = true;

    protected function setUp(): void
    {
        parent::setUp();

        if ($this->disableAuthThrottle) {
            $this->withoutMiddleware(ThrottleRequests::class);
        }
    }
}
