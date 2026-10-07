import json, urllib.request, sys
S = json.load(open('/workspace/cmit-ganfeng/docs/calib/qa-calib-set.json'))
qs = [q[1] for q in S['in_domain']] + [q[1] for q in S['out_of_domain']]
js = """(async()=>{const a=window.__gfAgent; a.warmup(); for(let k=0;k<180 && a.status!=="ready";k++) await new Promise(r=>setTimeout(r,1000));
const QS=%s; const o=[];
for(const q of QS){ const r=await a.byVector(q); const raw=a.lastRawBest, doc=a.lastRawDoc; a.lastQ=""; const e=await a.ask(q,[],undefined); a.lastQ="";
 o.push({q, raw:+raw.toFixed(4), rawDoc:doc, e2eVia:e.via, e2eHit:e.hitTitle||"", e2eOk:e.ok}); }
return JSON.stringify({status:a.status, rows:o});})()""" % json.dumps(qs, ensure_ascii=False)
req = urllib.request.Request('http://127.0.0.1:9400/ev', data=js.encode('utf-8'), method='POST')
out = urllib.request.urlopen(req, timeout=1800).read().decode('utf-8')
open('/tmp/calib-raw.json','w').write(out)
print(out[:300])
