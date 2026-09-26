<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\CompteController;
use App\Http\Controllers\DocumentController;
use App\Http\Controllers\TableauController;
use Illuminate\Support\Facades\Route;

Route::post('/auth/register', [AuthController::class, 'register'])->middleware('throttle:10,1');
Route::post('/auth/login', [AuthController::class, 'login'])->middleware('throttle:10,1');

// Page publique de paiement (lien reçu par e-mail)
Route::get('/public/{token}', [TableauController::class, 'publique']);
Route::get('/public/{token}/pdf', [TableauController::class, 'pdfPublic']);
Route::post('/public/{token}/payer', [TableauController::class, 'payerEnLigne'])->middleware('throttle:10,1');

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);

    Route::get('/dashboard', TableauController::class);

    Route::get('/entreprise', [CompteController::class, 'entreprise']);
    Route::put('/entreprise', [CompteController::class, 'majEntreprise']);
    Route::post('/abonnement/pro', [CompteController::class, 'passerPro']);
    Route::post('/abonnement/gratuit', [CompteController::class, 'repasserGratuit']);
    Route::get('/emails', [CompteController::class, 'emails']);

    Route::get('/clients', [CompteController::class, 'clients']);
    Route::post('/clients', [CompteController::class, 'creerClient']);
    Route::put('/clients/{id}', [CompteController::class, 'majClient'])->whereNumber('id');
    Route::delete('/clients/{id}', [CompteController::class, 'supprimerClient'])->whereNumber('id');

    Route::get('/documents', [DocumentController::class, 'index']);
    Route::post('/documents', [DocumentController::class, 'store']);
    Route::post('/relances', [DocumentController::class, 'relancerTout']);
    Route::get('/export/csv', [DocumentController::class, 'csv']);
    Route::prefix('/documents/{id}')->whereNumber('id')->group(function () {
        Route::get('/', [DocumentController::class, 'show']);
        Route::put('/', [DocumentController::class, 'update']);
        Route::delete('/', [DocumentController::class, 'destroy']);
        Route::get('/pdf', [DocumentController::class, 'pdf']);
        Route::post('/envoyer', [DocumentController::class, 'envoyer']);
        Route::post('/payer', [DocumentController::class, 'payer']);
        Route::post('/decision', [DocumentController::class, 'decision']);
        Route::post('/convertir', [DocumentController::class, 'convertir']);
        Route::post('/relancer', [DocumentController::class, 'relancer']);
    });
});
