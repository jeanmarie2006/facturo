<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><style>
  @page { margin: 28px 34px; }
  body { font-family: DejaVu Sans, sans-serif; font-size: 11px; color: #0f172a; }
  h1 { font-size: 26px; margin: 0; color: #1e3a8a; letter-spacing: 1px; }
  .muted { color: #64748b; } .r { text-align: right; } .b { font-weight: bold; }
  table { width: 100%; border-collapse: collapse; }
  .lignes th { background: #1e3a8a; color: #fff; text-align: left; padding: 8px; font-size: 10px; text-transform: uppercase; }
  .lignes td { padding: 8px; border-bottom: 1px solid #e2e8f0; }
  .box { border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px; }
  .totaux td { padding: 5px 8px; } .ttc td { background: #1e3a8a; color: #fff; font-size: 14px; font-weight: bold; }
  .stamp { display: inline-block; border: 3px solid #16a34a; color: #16a34a; padding: 4px 14px; font-size: 18px; font-weight: bold; transform: rotate(-6deg); }
</style></head><body>
@php $e = $d->entreprise; $c = $d->client; $titre = $d->type === 'facture' ? 'FACTURE' : 'DEVIS'; @endphp
<table><tr>
  <td style="width:55%"><h1>{{ $titre }}</h1><span class="muted">N° {{ $d->numero }}</span>
    @if($d->statut === 'payee')<br><br><span class="stamp">PAYÉE</span>@endif</td>
  <td class="r"><b style="font-size:14px">{{ $e->nom }}</b><br>{{ $e->adresse }}<br>@if($e->telephone)Tél. {{ $e->telephone }}<br>@endif{{ $e->email }}@if($e->ifu)<br>IFU : {{ $e->ifu }}@endif</td>
</tr></table>
<table style="margin-top:22px"><tr>
  <td style="width:50%;vertical-align:top" class="box"><span class="muted">FACTURÉ À</span><br><b style="font-size:13px">{{ $c->nom }}</b><br>{{ $c->adresse }}@if($c->telephone)<br>Tél. {{ $c->telephone }}@endif @if($c->ifu)<br>IFU : {{ $c->ifu }}@endif</td>
  <td style="width:4%"></td>
  <td style="vertical-align:top" class="box"><span class="muted">Date d’émission :</span> <b>{{ $d->date_emission->format('d/m/Y') }}</b><br><span class="muted">{{ $d->type === 'facture' ? 'Échéance' : 'Valable jusqu’au' }} :</span> <b>{{ $d->date_echeance->format('d/m/Y') }}</b><br><span class="muted">Devise :</span> <b>{{ $d->devise }}</b>@if($d->statut === 'payee')<br><span class="muted">Payée le :</span> <b>{{ $d->payee_le?->format('d/m/Y') }}</b>@endif</td>
</tr></table>
<table class="lignes" style="margin-top:22px"><thead><tr><th>Désignation</th><th class="r">Qté</th><th class="r">Prix unitaire</th><th class="r">Total HT</th></tr></thead><tbody>
@foreach($d->lignes as $l)<tr><td>{{ $l->designation }}</td><td class="r">{{ rtrim(rtrim(number_format($l->quantite, 2, ',', ' '), '0'), ',') }}</td><td class="r">{{ $fmt($l->prix_unitaire) }}</td><td class="r">{{ $fmt($l->quantite * $l->prix_unitaire) }}</td></tr>@endforeach
</tbody></table>
<table style="margin-top:14px"><tr><td style="width:55%;vertical-align:top">@if($d->notes)<span class="muted">Notes</span><br>{{ $d->notes }}@endif</td>
  <td><table class="totaux"><tr><td class="r muted">Total HT</td><td class="r">{{ $fmt($d->total_ht) }}</td></tr><tr><td class="r muted">TVA ({{ rtrim(rtrim(number_format($d->taux_tva, 2, ',', ''), '0'), ',') }} %)</td><td class="r">{{ $fmt($d->total_tva) }}</td></tr><tr class="ttc"><td class="r">TOTAL TTC</td><td class="r">{{ $fmt($d->total_ttc) }}</td></tr></table></td></tr></table>
@if($e->mentions)<p class="muted" style="margin-top:30px;border-top:1px solid #e2e8f0;padding-top:10px">{{ $e->mentions }}</p>@endif
</body></html>
