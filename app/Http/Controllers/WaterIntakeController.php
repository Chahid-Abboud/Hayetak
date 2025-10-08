<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Models\WaterIntake;

class WaterIntakeController extends Controller
{
    public function store(Request $request)
    {
        $data = $request->validate([
            'ml' => 'required|integer|min:10|max:5000',
        ]);

        $record = WaterIntake::firstOrCreate(
            [
                'user_id' => Auth::id(),
                'for_day' => today()->toDateString(), // <— was 'day'
            ],
            [
                'ml'       => 0,
                'drank_at' => now(), // keep a timestamp of the latest change
            ]
        );

        // bump the amount
        $record->increment('ml', $data['ml']);

        // optionally refresh drank_at so UI can show “last added at”
        $record->forceFill(['drank_at' => now()])->save();

        return back();
    }
}
