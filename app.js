import {simulate} from './solver.mjs';
const $=id=>document.getElementById(id);
const samples=[0,.001,.002,.005,.01,.02,.05,.1,...Array.from({length:600},(_,i)=>(i+1)/10)].filter((v,i,a)=>!i||v>a[i-1]);
let params;
function update() {
  const rampMode=document.querySelector('input[name=type]:checked').value==='ramp';
  $('ramp').disabled=!rampMode;
  if(!$('controls').checkValidity()) {
    $('status').textContent='Enter a reactivity from −0.20 to +0.20 dollars and, for ramps, a whole duration from 1 to 30 seconds. Chart retains the last valid result.';
    return;
  }
  try {
    const dollars=$('dollars').valueAsNumber, ramp=rampMode?$('ramp').valueAsNumber:0, generation=Number($('generation').value);
    const values=simulate(params,dollars,ramp,generation,samples).map(y=>y[0]);
    const max=Math.max(1,...values)*1.08, x=t=>52+t/60*610, y=n=>282-n/max*245;
    let lines='';
    for(let i=0;i<=4;i++) {const v=max*i/4;lines+=`<line class="grid" x1="52" x2="662" y1="${y(v)}" y2="${y(v)}"/><text x="43" y="${y(v)+4}" text-anchor="end">${v.toFixed(2)}</text>`;}
    for(let t=0;t<=60;t+=10) lines+=`<text x="${x(t)}" y="304" text-anchor="middle">${t}</text>`;
    const description=`${rampMode?`${ramp}-second ramp`:'Step'} to ${dollars.toFixed(2)} dollars, generation time ${generation*1e6} microseconds. Power starts at 1 and reaches ${values.at(-1).toFixed(4)} at 60 seconds.`;
    $('chart').innerHTML=`<title id="chart-title">Illustrative power over 60 seconds</title><desc id="chart-desc">${description}</desc>${lines}<line class="baseline" x1="52" x2="662" y1="${y(1)}" y2="${y(1)}"/><path class="curve" d="${values.map((v,i)=>`${i?'L':'M'}${x(samples[i]).toFixed(2)},${y(v).toFixed(2)}`).join(' ')}"/><text x="357" y="326" text-anchor="middle">Time (s)</text><text x="52" y="18">P/P₀</text>`;
    $('scenario').textContent=`${dollars>=0?'+':''}${dollars.toFixed(2)} $ · ${rampMode?`${ramp} s ramp`:'step'} · Λ = ${generation*1e6} µs`;
    $('final-power').textContent=values.at(-1).toFixed(4);
    $('samples').innerHTML=[.01,.1,10,30].map(t=>`<span>${t} s <b>${values[samples.indexOf(t)].toFixed(4)}</b></span>`).join('');
    $('status').textContent='Updated. '+description;
    $('status').classList.add('sr-status');
  } catch(error) {$('status').classList.remove('sr-status');$('status').textContent=error.message;}
}
$('controls').addEventListener('submit',e=>e.preventDefault());
$('controls').addEventListener('input',()=>{$('status').classList.remove('sr-status');if(params)update();});
try {
  const response=await fetch('./data/kinetics-params.json');
  if(!response.ok)throw new Error('Parameter file unavailable.');
  params=await response.json();
  if(params.groups?.length!==6||Math.abs(params.groups.reduce((s,g)=>s+g.beta,0)-params.beta)>1e-12||params.groups.some(g=>!Number.isFinite(g.beta)||g.beta<=0||!Number.isFinite(g.lambda)||g.lambda<=0))throw new Error('Invalid parameter file.');
  for(const id of ['input-type','dollars','generation'])$(id).disabled=false;
  update();
} catch(error) {$('status').textContent=`Sandbox unavailable: ${error.message} Serve this folder over HTTP; the report and static results are still available.`;}
