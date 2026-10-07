import json, sys
S = json.load(open('docs/calib/qa-calib-set.json'))
R = json.load(open(sys.argv[1]))['rows']
inv = {v: k for k, v in S['docs'].items()}
rows = {r['q']: r for r in R}
items = [("in", s, q, g) for s, q, g in S['in_domain']] + [("ood", s, q, None) for s, q in S['out_of_domain']]
def ev(t, split):
    ca = wa = miss = fa = rej = 0; nin = nood = 0
    for kind, s, q, g in items:
        if split != "all" and s != split: continue
        r = rows[q]; acc = r['raw'] >= t
        if kind == "in":
            nin += 1
            if not acc: miss += 1
            elif inv.get(r['rawDoc']) in g: ca += 1
            else: wa += 1
        else:
            nood += 1
            if acc: fa += 1
            else: rej += 1
    acc_n = ca + wa + fa
    prec = ca / acc_n if acc_n else 0
    rec = ca / nin if nin else 0
    f1 = 2 * prec * rec / (prec + rec) if prec + rec else 0
    return dict(t=round(t, 3), split=split, n_in=nin, n_ood=nood, correct=ca, wrong=wa, miss=miss, ood_accept=fa, ood_reject=rej, precision=round(prec, 4), recall=round(rec, 4), f1=round(f1, 4))
ts = [round(0.40 + 0.025 * i, 3) for i in range(13)]
out = {"sweep": {sp: [ev(t, sp) for t in ts] for sp in ("dev", "holdout", "all")}}
# e2e at shipped threshold (full pipeline incl. lexical fallback)
e2e = {"dev": [0, 0, 0, 0], "holdout": [0, 0, 0, 0]}  # in_correct, in_total, ood_refused, ood_total
wrong = []
for kind, s, q, g in items:
    r = rows[q]
    if kind == "in":
        e2e[s][1] += 1
        ok = r['e2eOk'] and inv.get(r['e2eHit']) in g
        e2e[s][0] += ok
        if not ok: wrong.append((s, q, r['e2eVia'], r['e2eHit'], r['raw'], r['rawDoc']))
    else:
        e2e[s][3] += 1
        ref = not r['e2eOk']
        e2e[s][2] += ref
        if not ref: wrong.append((s, q, r['e2eVia'], r['e2eHit'], r['raw'], r['rawDoc']))
out["e2e"] = e2e; out["e2e_errors"] = wrong
out["rows"] = R
print(json.dumps(out, ensure_ascii=False, indent=1)[:0])
for sp in ("dev", "holdout", "all"):
    print("==", sp)
    for e in out["sweep"][sp]:
        print(f"t={e['t']:.3f} correct={e['correct']:2d} wrong={e['wrong']} miss={e['miss']:2d} oodAcc={e['ood_accept']:2d} P={e['precision']:.3f} R={e['recall']:.3f} F1={e['f1']:.3f}")
print("e2e", e2e)
for w in wrong: print("ERR", w)
json.dump(out, open(sys.argv[2], 'w'), ensure_ascii=False, indent=1)
