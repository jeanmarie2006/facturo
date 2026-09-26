<?php

namespace App\Http\Controllers;

use App\Models\Entreprise;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

/** Chaque inscription crée un compte et son entreprise (multi-comptes : une entreprise par compte). */
class AuthController extends Controller
{
    public function register(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'min:2', 'max:80'],
            'entreprise' => ['required', 'string', 'min:2', 'max:120'],
            'email' => ['required', 'email:rfc', 'max:120', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8', 'max:100'],
        ], ['entreprise.required' => 'Indiquez le nom de votre entreprise ou votre nom commercial.']);
        $user = DB::transaction(function () use ($data) {
            $u = User::create(['name' => $data['name'], 'email' => strtolower($data['email']), 'password' => $data['password'], 'role' => 'user']);
            Entreprise::create(['user_id' => $u->id, 'nom' => strip_tags($data['entreprise']), 'email' => strtolower($data['email'])]);

            return $u;
        });

        return $this->issue($user, 201);
    }

    public function login(Request $request): JsonResponse
    {
        $data = $request->validate(['email' => ['required', 'email'], 'password' => ['required', 'string']]);
        $user = User::where('email', strtolower($data['email']))->first();
        if (! $user || ! Hash::check($data['password'], $user->password)) {
            throw ValidationException::withMessages(['email' => ['E-mail ou mot de passe incorrect.']]);
        }

        return $this->issue($user);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json($this->payload($request->user()));
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Déconnecté.']);
    }

    private function payload(User $u): array
    {
        $e = $u->entreprise;

        return ['user' => $u, 'entreprise' => $e, 'usage' => ['documents_ce_mois' => $e->documents()->whereYear('created_at', now()->year)->whereMonth('created_at', now()->month)->count(), 'limite' => $e->limite_mensuelle]];
    }

    private function issue(User $u, int $status = 200): JsonResponse
    {
        return response()->json([...$this->payload($u), 'token' => $u->createToken('spa')->plainTextToken], $status);
    }
}
