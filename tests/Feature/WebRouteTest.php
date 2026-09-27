<?php

namespace Tests\Feature;

use Tests\TestCase;

class WebRouteTest extends TestCase
{
    public function test_root_renders_main_app_view(): void
    {
        $response = $this->get('/');
        $response->assertStatus(200);
        $response->assertSee('MotoTrack');
        $response->assertSee('id="view-login"', false);
        $response->assertSee('id="view-system"', false);
    }

    public function test_admin_route_renders_dedicated_admin_portal(): void
    {
        $response = $this->get('/admin');
        $response->assertStatus(200);
        $response->assertSee('Administrator Portal');
        $response->assertSee('Authenticate as Administrator');
    }

    public function test_legacy_index_html_redirects_to_root(): void
    {
        $response = $this->get('/index.html');
        $response->assertRedirect('/');
    }
}
