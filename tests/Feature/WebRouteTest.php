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
        foreach (['/admin', '/admin/login', '/login/admin', '/Login/Admin'] as $uri) {
            $response = $this->get($uri);
            $response->assertStatus(200);
            $response->assertSee('Administrator Portal');
            $response->assertSee('Authenticate as Administrator');
        }
    }


    public function test_legacy_index_html_redirects_to_root(): void
    {
        $response = $this->get('/index.html');
        $response->assertRedirect('/');
    }

    public function test_spa_view_routes_render_main_app_view(): void
    {
        $views = [
            'login',
            'overview',
            'Overview', // case-insensitive check
            'kanban',
            'transactions',
            'history',
            'warranty',
            'inventory',
            'reports',
            'backjobs',
            'users',
            'approvals',
            'customer',
            'customer-prev',
        ];

        foreach ($views as $view) {
            $response = $this->get('/' . $view);
            $response->assertStatus(200);
            $response->assertSee('MotoTrack');
            $response->assertSee('id="view-system"', false);
        }
    }

    public function test_unknown_spa_route_returns_404(): void
    {
        $response = $this->get('/invalid-page-does-not-exist');
        $response->assertStatus(404);
    }
}
