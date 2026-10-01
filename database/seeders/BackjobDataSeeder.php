<?php

namespace Database\Seeders;

use App\Models\AppUser;
use App\Models\Expense;
use App\Models\ServiceJob;
use App\Services\BillingService;
use App\Services\InventoryDeductionService;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

class BackjobDataSeeder extends Seeder
{
    /**
     * Seeds the 25 customer records with both their First Job and Back Job / Warranty Claim.
     */
    public function run(): void
    {
        $billing = new BillingService();
        $inventory = new InventoryDeductionService();

        // Lead mechanic dictionary
        $mechanicMap = [
            'John' => 'John Hendrix',
            'Dhax' => 'Dhax Allen',
            'Vin'  => 'Vince Sael',
        ];

        // 25 records transcribed directly from the shop spreadsheet log
        $records = [
            [
                'customer' => 'Jerome Zammora',
                'username' => 'jerome_zammora',
                'moto' => 'Yamaha Sniper 155',
                'basePrice' => 1500,
                'plate' => 'ND-7182',
                'firstDate' => '2026-04-25',
                'claimDate' => '2026-08-25',
                'issue' => 'Retune',
                'claimComplaint' => 'Warranty Claim: Rebound too harsh / front fork re-tuning requested',
                'firstMech' => 'John',
                'claimMech' => 'John',
                'oil' => 'Touring Oil',
                'viscosity' => '15W',
                'rating' => 5,
                'comment' => 'Re-tuning fixed the stiff rebound. Sobrang swabe na sa lubak!',
            ],
            [
                'customer' => 'Ryhdz Lesoudra',
                'username' => 'ryhdz_lesoudra',
                'moto' => 'Honda ADV 160',
                'basePrice' => 1500,
                'plate' => 'ND-4590',
                'firstDate' => '2026-03-11',
                'claimDate' => '2026-08-25',
                'issue' => 'Leak',
                'claimComplaint' => 'Warranty Claim: Left fork oil seal leaking / oil seepage on stanchion',
                'firstMech' => 'Dhax',
                'claimMech' => 'John',
                'oil' => 'Touring Oil',
                'viscosity' => '15W',
                'rating' => 5,
                'comment' => 'Pinalitan agad yung leaking seal nang libre sa warranty. Salamat!',
            ],
            [
                'customer' => 'Rowel Sanchez',
                'username' => 'rowel_sanchez',
                'moto' => 'Honda PCX 160',
                'basePrice' => 1500,
                'plate' => 'ND-6231',
                'firstDate' => '2026-05-28',
                'claimDate' => '2026-08-26',
                'issue' => 'Leak',
                'claimComplaint' => 'Warranty Claim: Fork oil leak detected around dust seal',
                'firstMech' => 'Dhax',
                'claimMech' => 'Vin',
                'oil' => 'Daily Oil',
                'viscosity' => '10W',
                'rating' => 4,
                'comment' => 'Ayos na, wala nang tagas na langis sa fork.',
            ],
            [
                'customer' => 'William Soriano',
                'username' => 'william_soriano',
                'moto' => 'Yamaha Aerox 155',
                'basePrice' => 1500,
                'plate' => 'ND-9145',
                'firstDate' => '2026-04-28',
                'claimDate' => '2026-08-27',
                'issue' => 'Leak',
                'claimComplaint' => 'Warranty Claim: Right fork oil seal leak after rough road ride',
                'firstMech' => 'Dhax',
                'claimMech' => 'John',
                'oil' => 'Touring Oil',
                'viscosity' => '15W',
                'rating' => 5,
                'comment' => 'Good service and responsive warranty claim.',
            ],
            [
                'customer' => 'Cedric Nutilla',
                'username' => 'cedric_nutilla',
                'moto' => 'Honda PCX 160',
                'basePrice' => 1500,
                'plate' => 'ND-3082',
                'firstDate' => '2026-08-15',
                'claimDate' => '2026-08-28',
                'issue' => 'Leak',
                'claimComplaint' => 'Warranty Claim: Fork seal weeping oil, replacement needed under warranty',
                'firstMech' => 'John',
                'claimMech' => 'John',
                'oil' => 'Touring Oil',
                'viscosity' => '10W',
                'rating' => 5,
                'comment' => 'Mabilis ang gawa ni John, walang bayad sa back job.',
            ],
            [
                'customer' => 'Harod Gui',
                'username' => 'harod_gui',
                'moto' => 'Honda Click 125',
                'basePrice' => 1200,
                'plate' => 'ND-7514',
                'firstDate' => '2026-08-15',
                'claimDate' => '2026-09-02',
                'issue' => 'Leak',
                'claimComplaint' => 'Warranty Claim: Oil leaking onto brake caliper from left fork',
                'firstMech' => 'John',
                'claimMech' => 'John',
                'oil' => 'Daily Oil',
                'viscosity' => '10W',
                'rating' => 4,
                'comment' => 'Nawala na yung tumatagas sa brake caliper.',
            ],
            [
                'customer' => 'Johanes Bergatin',
                'username' => 'johanes_bergatin',
                'moto' => 'Honda Click 125',
                'basePrice' => 1200,
                'plate' => 'ND-4826',
                'firstDate' => '2026-08-25',
                'claimDate' => '2026-09-05',
                'issue' => 'Adjust',
                'claimComplaint' => 'Warranty Claim: Fork preload / height adjustment requested',
                'firstMech' => 'Dhax',
                'claimMech' => 'Dhax',
                'oil' => 'Daily Oil',
                'viscosity' => '10W',
                'rating' => 5,
                'comment' => 'Swabe na yung height adjustment, sakto sa tangkad ko.',
            ],
            [
                'customer' => 'Troy Millari',
                'username' => 'troy_millari',
                'moto' => 'Honda Click 125',
                'basePrice' => 1200,
                'plate' => 'ND-9361',
                'firstDate' => '2026-09-05',
                'claimDate' => '2026-09-09',
                'issue' => 'Leak',
                'claimComplaint' => 'Warranty Claim: Front fork seal leak observed after 4 days',
                'firstMech' => 'Vin',
                'claimMech' => 'Vin',
                'oil' => 'Daily Oil',
                'viscosity' => '10W',
                'rating' => 5,
                'comment' => '4 days after napansin may tagas, binalik ko at pinalitan agad.',
            ],
            [
                'customer' => 'Aryls Nemis',
                'username' => 'aryls_nemis',
                'moto' => 'Yamaha Sniper 150',
                'basePrice' => 1500,
                'plate' => 'ND-2748',
                'firstDate' => '2026-04-12',
                'claimDate' => '2026-09-09',
                'issue' => 'Leak',
                'claimComplaint' => 'Warranty Claim: Both fork seals leaking oil under heavy braking',
                'firstMech' => 'Vin',
                'claimMech' => 'Vin',
                'oil' => 'Touring Oil',
                'viscosity' => '15W',
                'rating' => 4,
                'comment' => 'Solid ang kapit sa preno ngayon, walang tagas.',
            ],
            [
                'customer' => 'Mark Trosa',
                'username' => 'mark_trosa',
                'moto' => 'Honda Click 125',
                'basePrice' => 1200,
                'plate' => 'ND-5183',
                'firstDate' => '2026-09-02',
                'claimDate' => '2026-09-10',
                'issue' => 'Leak',
                'claimComplaint' => 'Warranty Claim: Oil ring forming on fork inner tube',
                'firstMech' => 'John',
                'claimMech' => 'John',
                'oil' => 'Daily Oil',
                'viscosity' => '10W',
                'rating' => 5,
                'comment' => 'Very accommodating staff and mechanics.',
            ],
            [
                'customer' => 'Joseph Reforma',
                'username' => 'joseph_reforma',
                'moto' => 'Yamaha Aerox 155',
                'basePrice' => 1500,
                'plate' => 'ND-8430',
                'firstDate' => '2026-05-05',
                'claimDate' => '2026-09-11',
                'issue' => 'Leak',
                'claimComplaint' => 'Warranty Claim: Right fork oil seal damaged / leaking oil',
                'firstMech' => 'John',
                'claimMech' => 'John',
                'oil' => 'Touring Oil',
                'viscosity' => '15W',
                'rating' => 5,
                'comment' => 'Bilis naayos ni John, recommended shop.',
            ],
            [
                'customer' => 'Joseph Eduvane',
                'username' => 'joseph_eduvane',
                'moto' => 'Yamaha Aerox 155',
                'basePrice' => 1500,
                'plate' => 'ND-1652',
                'firstDate' => '2026-05-02',
                'claimDate' => '2026-09-11',
                'issue' => 'Leak',
                'claimComplaint' => 'Warranty Claim: Fork seal weeping oil, needs warranty replacement',
                'firstMech' => 'Vin',
                'claimMech' => 'Vin',
                'oil' => 'Touring Oil',
                'viscosity' => '15W',
                'rating' => 4,
                'comment' => 'All good, no more oil leak.',
            ],
            [
                'customer' => 'Cris Felidaro',
                'username' => 'cris_felidaro',
                'moto' => 'Yamaha Aerox 155',
                'basePrice' => 1500,
                'plate' => 'ND-3927',
                'firstDate' => '2026-05-13',
                'claimDate' => '2026-09-12',
                'issue' => 'Leak',
                'claimComplaint' => 'Warranty Claim: Front suspension oil leak after pothole hit',
                'firstMech' => 'Vin',
                'claimMech' => 'Vin',
                'oil' => 'Touring Oil',
                'viscosity' => '15W',
                'rating' => 5,
                'comment' => 'Smooth transaction sa warranty.',
            ],
            [
                'customer' => 'John Mark Yue',
                'username' => 'johnmark_yue',
                'moto' => 'Yamaha Mio i 125',
                'basePrice' => 1200,
                'plate' => 'ND-7019',
                'firstDate' => '2026-05-03',
                'claimDate' => '2026-09-13',
                'issue' => 'Retune',
                'claimComplaint' => 'Warranty Claim: Ride too soft / bottoms out, requested re-tuning',
                'firstMech' => 'Vin',
                'claimMech' => 'Vin',
                'oil' => 'Touring Oil',
                'viscosity' => '15W',
                'rating' => 5,
                'comment' => 'Hindi na lumulubog sa humps pag may angkas.',
            ],
            [
                'customer' => 'John Rey Ukob',
                'username' => 'johnrey_ukob',
                'moto' => 'Honda Click 125',
                'basePrice' => 1200,
                'plate' => 'ND-8294',
                'firstDate' => '2026-05-27',
                'claimDate' => '2026-09-14',
                'issue' => 'Leak',
                'claimComplaint' => 'Warranty Claim: Fork oil leaking from inner tube',
                'firstMech' => 'Vin',
                'claimMech' => 'Vin',
                'oil' => 'Daily Oil',
                'viscosity' => '10W',
                'rating' => 4,
                'comment' => 'Okay na ulit fork ko.',
            ],
            [
                'customer' => 'John Lyod Tenorio',
                'username' => 'johnlyod_tenorio',
                'moto' => 'Honda Click 125',
                'basePrice' => 1200,
                'plate' => 'ND-6451',
                'firstDate' => '2026-05-02',
                'claimDate' => '2026-09-18',
                'issue' => 'Leak',
                'claimComplaint' => 'Warranty Claim: Left fork seal failure, oil leaking down lower leg',
                'firstMech' => 'John',
                'claimMech' => 'John',
                'oil' => 'Daily Oil',
                'viscosity' => '10W',
                'rating' => 5,
                'comment' => 'Linis ng gawa at mababait ang mechanics.',
            ],
            [
                'customer' => 'Ramon Hermina',
                'username' => 'ramon_hermina',
                'moto' => 'Honda Click 125',
                'basePrice' => 1200,
                'plate' => 'ND-5128',
                'firstDate' => '2026-08-16',
                'claimDate' => '2026-09-18',
                'issue' => 'Leak',
                'claimComplaint' => 'Warranty Claim: Fork seal leaking oil after daily commuting',
                'firstMech' => 'Vin',
                'claimMech' => 'Vin',
                'oil' => 'Daily Oil',
                'viscosity' => '10W',
                'rating' => 4,
                'comment' => 'Reliable warranty service.',
            ],
            [
                'customer' => 'Kien Mark',
                'username' => 'kien_mark',
                'moto' => 'Yamaha NMAX 155',
                'basePrice' => 1500,
                'plate' => 'ND-9683',
                'firstDate' => '2026-04-15',
                'claimDate' => '2026-09-18',
                'issue' => 'Leak',
                'claimComplaint' => 'Warranty Claim: Both fork seals leaking oil, front end feels bouncy',
                'firstMech' => 'Dhax',
                'claimMech' => 'Dhax',
                'oil' => 'Touring Oil',
                'viscosity' => '15W',
                'rating' => 5,
                'comment' => 'Pinalitan both seals ni Dhax nang libre.',
            ],
            [
                'customer' => 'Alvin Alias',
                'username' => 'alvin_alias',
                'moto' => 'Honda Wave 125',
                'basePrice' => 1200,
                'plate' => 'ND-3816',
                'firstDate' => '2026-06-28',
                'claimDate' => '2026-09-19',
                'issue' => 'Leak',
                'claimComplaint' => 'Warranty Claim: Fork oil leaking past seal onto wheel rim',
                'firstMech' => 'Dhax',
                'claimMech' => 'Dhax',
                'oil' => 'Daily Oil',
                'viscosity' => '10W',
                'rating' => 4,
                'comment' => 'Nawala na yung tagas sa rim.',
            ],
            [
                'customer' => 'Dante Resuelto',
                'username' => 'dante_resuelto',
                'moto' => 'Yamaha NMAX 155',
                'basePrice' => 1500,
                'plate' => 'ND-7245',
                'firstDate' => '2026-09-06',
                'claimDate' => '2026-09-20',
                'issue' => 'Leak',
                'claimComplaint' => 'Warranty Claim: Right fork seal leaking after 2 weeks',
                'firstMech' => 'Vin',
                'claimMech' => 'Vin',
                'oil' => 'Touring Oil',
                'viscosity' => '15W',
                'rating' => 5,
                'comment' => 'Walang tanong-tanong pinalitan agad seal.',
            ],
            [
                'customer' => 'Jayson Composano',
                'username' => 'jayson_composano',
                'moto' => 'Honda ADV 160',
                'basePrice' => 1500,
                'plate' => 'ND-6159',
                'firstDate' => '2026-06-11',
                'claimDate' => '2026-09-20',
                'issue' => 'Retune',
                'claimComplaint' => 'Warranty Claim: Rebound dampening too aggressive / re-tune requested',
                'firstMech' => 'John',
                'claimMech' => 'John',
                'oil' => 'Touring Oil',
                'viscosity' => '15W',
                'rating' => 5,
                'comment' => 'Tamang-tama na dampening sa ADV ko.',
            ],
            [
                'customer' => 'Cielo Rojo',
                'username' => 'cielo_rojo',
                'moto' => 'Yamaha Sniper 150',
                'basePrice' => 1500,
                'plate' => 'ND-4072',
                'firstDate' => '2026-04-14',
                'claimDate' => '2026-09-23',
                'issue' => 'Leak',
                'claimComplaint' => 'Warranty Claim: Fork oil seal weeping oil on right fork leg',
                'firstMech' => 'Vin',
                'claimMech' => 'Vin',
                'oil' => 'Touring Oil',
                'viscosity' => '15W',
                'rating' => 4,
                'comment' => 'Good job Vince, dry na yung stanchion.',
            ],
            [
                'customer' => 'Janrey Bacara',
                'username' => 'janrey_bacara',
                'moto' => 'Honda Click 125',
                'basePrice' => 1200,
                'plate' => 'ND-8531',
                'firstDate' => '2026-05-27',
                'claimDate' => '2026-09-26',
                'issue' => 'Leak',
                'claimComplaint' => 'Warranty Claim: Oil leaking past oil seal, dirty fork tubes',
                'firstMech' => 'John',
                'claimMech' => 'John',
                'oil' => 'Daily Oil',
                'viscosity' => '10W',
                'rating' => 5,
                'comment' => 'Pops Shock Attack the best sa suspension!',
            ],
            [
                'customer' => 'Jharen Rufo',
                'username' => 'jharen_rufo',
                'moto' => 'Honda Giorno+ 125',
                'basePrice' => 1200,
                'plate' => 'ND-9214',
                'firstDate' => '2026-09-18',
                'claimDate' => '2026-09-27',
                'issue' => 'Leak',
                'claimComplaint' => 'Warranty Claim: Fresh fork oil leak detected around dust seal',
                'firstMech' => 'John',
                'claimMech' => 'John',
                'oil' => 'Daily Oil',
                'viscosity' => '10W',
                'rating' => 5,
                'comment' => 'Bilis naaksyunan, closed agad claim.',
            ],
            [
                'customer' => 'JD Tiapon',
                'username' => 'jd_tiapon',
                'moto' => 'Honda Beat 110',
                'basePrice' => 1200,
                'plate' => 'ND-1385',
                'firstDate' => '2026-09-05',
                'claimDate' => '2026-09-28',
                'issue' => 'Leak',
                'claimComplaint' => 'Warranty Claim: Left fork seal leaking oil onto front fender',
                'firstMech' => 'Vin',
                'claimMech' => 'Vin',
                'oil' => 'Daily Oil',
                'viscosity' => '10W',
                'rating' => 5,
                'comment' => 'Galing ni Vince, ayos na Beat ko.',
            ],
        ];

        foreach ($records as $row) {
            // 1. Ensure Customer AppUser exists
            $user = AppUser::firstOrCreate(
                ['username' => $row['username']],
                [
                    'password' => 'pass1234',
                    'role' => 'customer',
                    'status' => 'approved',
                ]
            );

            $firstMechName = $mechanicMap[$row['firstMech']] ?? $row['firstMech'];
            $claimMechName = $mechanicMap[$row['claimMech']] ?? $row['claimMech'];

            // Determine seal size based on displacement
            $sealSize = ($row['basePrice'] >= 1500) ? 'Oil Seal 15x35x10' : 'Oil Seal 12x31x10.5';

            // Clean previous records for this plate if re-running
            ServiceJob::where('plate_number', $row['plate'])->delete();

            // ----------------------------------------------------
            // 2. Insert First Job (Original Visit)
            // ----------------------------------------------------
            $firstDateIn = Carbon::parse($row['firstDate']);
            $firstReleasedAt = $firstDateIn->copy();
            $warrantyExpiresAt = $firstReleasedAt->copy()->addMonths((int) config('shop.warranty_months', 6));

            $firstBill = $billing->breakdown(
                enginePrice: $row['basePrice'],
                isWarrantyClaim: false,
                oil: $row['oil'],
                oilSealSize: $sealSize,
                oilSealQty: 2,
                dustSealSize: 'None',
                dustSealQty: 0,
                springs: 'None',
            );

            $firstConsumables = $inventory->consumablesFor(
                oil: $row['oil'],
                oilSealSize: $sealSize,
                oilSealQty: 2,
                dustSealSize: 'None',
                dustSealQty: 0,
                springs: 'None',
            );

            $firstJob = new ServiceJob();
            $firstJob->customer = $row['customer'];
            $firstJob->app_user_id = $user->id;
            $firstJob->moto_model = $row['moto'];
            $firstJob->plate_number = $row['plate'];
            $firstJob->stage = 'Release';
            $firstJob->date_in = $firstDateIn->toDateString();
            $firstJob->time_in = '09:15';
            $firstJob->released_at = $firstReleasedAt->toDateString();
            $firstJob->paid_at = $firstReleasedAt->copy()->setTime(14, 30);
            $firstJob->released_by = 'staff';
            $firstJob->mechanic_name = $firstMechName;
            $firstJob->is_warranty_claim = false;
            $firstJob->complaint = 'Standard Front Fork Maintenance & Suspension Tuning';
            $firstJob->oil_viscosity = $row['viscosity'];
            $firstJob->suspension_brand = 'Stock / OEM';
            $firstJob->suspension_type = 'Telescopic Fork';
            $firstJob->warranty_expires_at = $warrantyExpiresAt;
            $firstJob->payment_method = 'Cash';
            $firstJob->amount_paid = (float) $firstBill['total'];
            $firstJob->change_amount = 0.00;
            $firstJob->rating = 5;
            $firstJob->rating_comment = 'Maayos ang gawa at maganda ang laro ng suspension.';
            $firstJob->rated_at = $firstReleasedAt->copy()->setTime(16, 0);

            $firstJob->specs = [
                'enginePrice' => $row['basePrice'],
                'totalBill' => $firstBill['total'],
                'oil' => $row['oil'],
                'oilSeal' => "{$sealSize} (2 - Both)",
                'dustSeal' => 'None',
                'springs' => 'None',
                'consumables' => $firstConsumables,
                'partsCost' => $inventory->costOf($firstConsumables),
                'billLines' => $firstBill['lines'],
                'billSubtotal' => $firstBill['subtotal'],
                'billCovered' => false,
                'payment' => [
                    'method' => 'Cash',
                    'amountPaid' => (float) $firstBill['total'],
                    'change' => 0.0,
                    'referenceNo' => null,
                    'notes' => 'Original service completed and paid in full.',
                    'releasedBy' => 'staff',
                    'releasedAt' => $firstReleasedAt->toDateString() . ' 14:30:00',
                ],
            ];

            $firstJob->save();

            // ----------------------------------------------------
            // 3. Insert Back Job (Warranty Claim Visit)
            // ----------------------------------------------------
            $claimDateIn = Carbon::parse($row['claimDate']);
            $claimReleasedAt = $claimDateIn->copy();

            $claimSeal = ($row['issue'] === 'Leak') ? $sealSize : 'None';
            $claimSealQty = ($row['issue'] === 'Leak') ? 2 : 0;
            $claimOil = ($row['issue'] === 'Adjust') ? 'None' : $row['oil'];

            $claimBill = $billing->breakdown(
                enginePrice: $row['basePrice'],
                isWarrantyClaim: true,
                oil: $claimOil,
                oilSealSize: $claimSeal,
                oilSealQty: $claimSealQty,
                dustSealSize: 'None',
                dustSealQty: 0,
                springs: 'None',
            );

            $claimConsumables = $inventory->consumablesFor(
                oil: $claimOil,
                oilSealSize: $claimSeal,
                oilSealQty: $claimSealQty,
                dustSealSize: 'None',
                dustSealQty: 0,
                springs: 'None',
            );

            $backJob = new ServiceJob();
            $backJob->customer = $row['customer'];
            $backJob->app_user_id = $user->id;
            $backJob->moto_model = $row['moto'];
            $backJob->plate_number = $row['plate']; // Same plate matches warranty!
            $backJob->stage = 'Release';
            $backJob->date_in = $claimDateIn->toDateString();
            $backJob->time_in = '10:30';
            $backJob->released_at = $claimReleasedAt->toDateString();
            $backJob->paid_at = $claimReleasedAt->copy()->setTime(15, 45);
            $backJob->released_by = 'staff';
            $backJob->mechanic_name = $claimMechName;
            $backJob->is_warranty_claim = true;
            $backJob->complaint = $row['claimComplaint'];
            $backJob->oil_viscosity = $row['viscosity'];
            $backJob->suspension_brand = 'Stock / OEM';
            $backJob->suspension_type = 'Telescopic Fork';
            $backJob->warranty_expires_at = $warrantyExpiresAt; // Inherits active warranty window
            $backJob->payment_method = 'Warranty Claim';
            $backJob->amount_paid = 0.00;
            $backJob->change_amount = 0.00;
            $backJob->rating = $row['rating'];
            $backJob->rating_comment = $row['comment'];
            $backJob->rated_at = $claimReleasedAt->copy()->setTime(17, 15);

            $backJob->specs = [
                'enginePrice' => $row['basePrice'],
                'totalBill' => 0,
                'oil' => $claimOil,
                'oilSeal' => $claimSeal === 'None' ? 'None' : "{$claimSeal} ({$claimSealQty} - Both)",
                'dustSeal' => 'None',
                'springs' => 'None',
                'consumables' => $claimConsumables,
                'partsCost' => $inventory->costOf($claimConsumables),
                'billLines' => $claimBill['lines'],
                'billSubtotal' => $claimBill['subtotal'],
                'billCovered' => true,
                'payment' => [
                    'method' => 'Warranty Claim',
                    'amountPaid' => 0.0,
                    'change' => 0.0,
                    'referenceNo' => null,
                    'notes' => 'Parts and labor 100% covered under 6-month shop warranty.',
                    'releasedBy' => 'staff',
                    'releasedAt' => $claimReleasedAt->toDateString() . ' 15:45:00',
                ],
            ];

            $backJob->save();
        }

        // ----------------------------------------------------
        // 4. Generate Monthly Expenses from Items Used on Motorcycles
        // ----------------------------------------------------
        Expense::where('description', 'like', 'Consumables & parts used on motorcycles%')->delete();

        $allReleased = ServiceJob::where('stage', 'Release')->get();
        $monthlyAgg = [];

        foreach ($allReleased as $job) {
            $m = substr($job->date_in, 0, 7);
            if (!isset($monthlyAgg[$m])) {
                $monthlyAgg[$m] = [
                    'cost' => 0.0,
                    'items' => [],
                ];
            }
            $monthlyAgg[$m]['cost'] += (float) ($job->specs['partsCost'] ?? 0);
            foreach (($job->specs['consumables'] ?? []) as $c) {
                $name = $c['name'];
                $qty = (int) $c['qty'];
                $monthlyAgg[$m]['items'][$name] = ($monthlyAgg[$m]['items'][$name] ?? 0) + $qty;
            }
        }

        ksort($monthlyAgg);

        foreach ($monthlyAgg as $monthKey => $data) {
            if ($data['cost'] <= 0) {
                continue;
            }

            $dateObj = Carbon::createFromFormat('Y-m', $monthKey);
            $monthLabel = $dateObj->format('M Y');
            $expenseDate = $dateObj->copy()->endOfMonth()->toDateString();

            $itemStrings = [];
            foreach ($data['items'] as $itemName => $qty) {
                $itemStrings[] = "{$qty}x {$itemName}";
            }
            $itemsList = implode(', ', $itemStrings);

            Expense::create([
                'category' => 'Inventory Restock',
                'payment_method' => 'Cash',
                'description' => "Consumables & parts used on motorcycles - {$monthLabel} ({$itemsList})",
                'amount' => round($data['cost'], 2),
                'date' => $expenseDate,
            ]);
        }
    }
}
