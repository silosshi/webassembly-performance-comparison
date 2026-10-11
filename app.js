'use strict';
const $ = id => document.getElementById(id);
const SIZES = [64, 128, 256];
const BUILD = 'Clang 15.0.7 / LLD 15.0.7; --target=wasm32 -O3 -ffp-contract=off -nostdlib; SIMD/threads yok';
let moduleInstance, raw = [], runInfo;
const fmt = n => n.toLocaleString('tr-TR', {minimumFractionDigits:3, maximumFractionDigits:3});
const pause = () => new Promise(resolve => setTimeout(resolve, 0));
function multiplyJS(a, b, result, n) {
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      let sum = 0;
      for (let k = 0; k < n; k++) sum += a[i*n+k] * b[k*n+j];
      result[i*n+j] = sum;
    }
  }
}
function inputs(n) {
  const a = new Float64Array(n*n), b = new Float64Array(n*n);
  for (let i = 0; i < a.length; i++) {
    a[i] = ((i*17+3)%101-50)/50;
    b[i] = ((i*31+7)%103-51)/51;
  }
  return {a, b};
}
function compare(a, b) {
  let maxError = 0;
  for (let i=0; i<a.length; i++) {
    if (!Number.isFinite(a[i]) || !Number.isFinite(b[i])) throw new Error('Sonuçta sonlu olmayan değer var.');
    const error = Math.abs(a[i]-b[i]);
    maxError = Math.max(maxError,error);
    if (error > 1e-10 * Math.max(1,Math.abs(a[i]),Math.abs(b[i]))) throw new Error('Hesaplama sonuçları eşleşmiyor: eleman '+i);
  }
  return maxError;
}
function median(values) {
  const sorted = [...values].sort((a,b)=>a-b), m = sorted.length>>1;
  return sorted.length%2 ? sorted[m] : (sorted[m-1]+sorted[m])/2;
}
function measure(fn) { const start = performance.now(); fn(); return performance.now()-start; }
function status(message, error=false) { $('status').textContent=message; $('status').classList.toggle('error',error); }
const environment = {userAgent:navigator.userAgent, platform:navigator.platform, logicalProcessors:navigator.hardwareConcurrency??null, build:BUILD, algorithm:'i-j-k, Float64/double, tek iş parçacığı', scope:'yalnız hesaplama; Wasm çağrı geçişi dahil'};
async function initialize() {
  try {
    const started=performance.now();
    const response=await fetch('matrix.wasm');
    if(!response.ok)throw new Error('matrix.wasm bulunamadı (HTTP '+response.status+').');
    const bytes=await response.arrayBuffer();
    const compiled=await WebAssembly.instantiate(bytes, {});
    moduleInstance=compiled.instance.exports;
    environment.modulePreparationMs=performance.now()-started;
    $('environment').textContent=JSON.stringify(environment,null,2);
    $('environment').style.whiteSpace='pre-wrap';
    status('Hazır. Karşılaştırmayı başlatabilirsin.'); $('run').disabled=false;
  } catch(e) { status('Modül yüklenemedi: '+e.message+' — BASLAT.bat ile açmayı dene.',true); }
}
$('run').addEventListener('click', async () => {
  const warmup=Number($('warmup').value), trials=Number($('trials').value);
  if (!Number.isInteger(warmup)||warmup<1||warmup>30||!Number.isInteger(trials)||trials<5||trials>100) {
    status('Isınma 1–30, tekrar 5–100 arasında tam sayı olmalı.',true); return;
  }
  $('run').disabled=true; $('csv').disabled=true; $('warmup').disabled=true; $('trials').disabled=true;
  raw=[]; $('results').textContent=''; $('chart').textContent='';
  runInfo={...environment, warmup, trials, timestamp:new Date().toISOString()};
  let hidden=false;
  const onVisibility=()=>{if(document.hidden)hidden=true;};
  document.addEventListener('visibilitychange',onVisibility);
  try {
    if(document.hidden)throw new Error('Ölçüm sekmesi görünür olmalı.');
    for (const n of SIZES) {
      const {a,b}=inputs(n), jsResult=new Float64Array(n*n), bytes=n*n*8;
      let pa=0,pb=0,pr=0;
      try {
        // C yığını ve statik alanın ardından 8 bayta hizalı üç tampon.
        pa=Math.ceil(Number(moduleInstance.__heap_base.value)/8)*8;pb=pa+bytes;pr=pb+bytes;
        const required=pr+bytes;
        if(required>moduleInstance.memory.buffer.byteLength) {
          moduleInstance.memory.grow(Math.ceil((required-moduleInstance.memory.buffer.byteLength)/65536));
        }
        const heap=new Float64Array(moduleInstance.memory.buffer);
        heap.set(a,pa/8);heap.set(b,pb/8);
        const js=()=>multiplyJS(a,b,jsResult,n);
        const wasm=()=>moduleInstance.matrix_multiply(pa,pb,pr,n);
        const validate=()=>compare(jsResult, new Float64Array(moduleInstance.memory.buffer).subarray(pr/8,pr/8+n*n));
        status(`${n}×${n}: ısınma turları…`); await pause();
        for(let i=0;i<warmup;i++) {if(i%2){wasm();js();}else{js();wasm();}validate();}
        const jsTimes=[],wasmTimes=[]; let maxError=0;
        for(let i=0;i<trials;i++) {
          status(`${n}×${n}: ölçüm ${i+1}/${trials}`); await pause();
          if(hidden||document.hidden)throw new Error('Sekme arka plana geçti. Ölçümü bu sekme açıkken yeniden başlat.');
          let tj,tw;
          if(i%2){tw=measure(wasm);tj=measure(js);}else{tj=measure(js);tw=measure(wasm);}
          const error=validate();maxError=Math.max(maxError,error);
          jsTimes.push(tj);wasmTimes.push(tw);
          raw.push({n,trial:i+1,order:i%2?'Wasm-JS':'JS-Wasm',jsMs:tj,wasmMs:tw,maxAbsError:error});
        }
        const tj=median(jsTimes),tw=median(wasmTimes),ratio=tw>0?tj/tw:NaN;
        const row=document.createElement('tr');
        for(const value of [`${n} × ${n}`,fmt(tj),fmt(tw),Number.isFinite(ratio)?fmt(ratio)+'×':'Ölçülemedi','Eşleşti']) {
          const cell=document.createElement('td');cell.textContent=value;row.append(cell);
        }
        $('results').append(row);
        const chart=document.createElement('div'), title=document.createElement('h3');title.textContent=`${n} × ${n}`;chart.append(title);
        const scale=Math.max(tj,tw);
        for(const [name,time,cls]of[['JS',tj,'js'],['Wasm',tw,'wasm']]){
          const bar=document.createElement('div');bar.className='bar';const label=document.createElement('span');label.textContent=name;
          const track=document.createElement('div');track.style.width='100%';const fill=document.createElement('i');fill.className=cls;fill.style.width=(scale?time/scale*100:0)+'%';track.append(fill);bar.append(label,track);chart.append(bar);
        }
        $('chart').append(chart);
      } finally { /* Sonraki boyutta aynı üç bellek alanı yeniden kullanılır. */ }
    }
    if(hidden)throw new Error('Sekme ölçüm sırasında arka plana geçti; ölçümü tekrarla.');
    status('Tamamlandı. Tüm sonuçlar eşleşti. Rapor için ölçümleri CSV olarak indirebilirsin.');
    $('csv').disabled=false;
  } catch(e) {status('Ölçüm tamamlanamadı: '+e.message,true);}
  finally {document.removeEventListener('visibilitychange',onVisibility);$('run').disabled=false;$('warmup').disabled=false;$('trials').disabled=false;}
});
$('csv').addEventListener('click',()=>{
  const escape=value=>'"'+String(value??'').replaceAll('"','""')+'"';
  const header=['timestamp','matrix_n','trial','order','js_ms','wasm_ms','max_abs_error','warmup','trials','module_preparation_ms','user_agent','platform','logical_processors','build','timing_scope'];
  const rows=raw.map(r=>[runInfo.timestamp,r.n,r.trial,r.order,r.jsMs,r.wasmMs,r.maxAbsError,runInfo.warmup,runInfo.trials,runInfo.modulePreparationMs,runInfo.userAgent,runInfo.platform,runInfo.logicalProcessors,runInfo.build,runInfo.scope]);
  const csv='\uFEFF'+[header,...rows].map(row=>row.map(escape).join(',')).join('\r\n');
  const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
  const link=document.createElement('a');link.href=url;link.download='wasm-hiz-olcumleri.csv';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
});
initialize();
