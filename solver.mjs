// Seven states: normalized power and each precursor divided by its equilibrium value.
// L-stable SDIRK2; each implicit stage solves the arrowhead matrix directly.
export function simulate(p, dollars, ramp, generation, samples) {
  if (!Number.isFinite(dollars) || dollars < -.2 || dollars > .2 ||
      !Number.isFinite(ramp) || (ramp !== 0 && (ramp < 1 || ramp > 30)) ||
      !p.generationTimes.includes(generation) || samples.length < 2 || samples[0] !== 0 ||
      samples.some((t,i) => !Number.isFinite(t) || t > 60 || (i && t <= samples[i-1])))
    throw new Error('Use −0.20 to +0.20 dollars, a 1–30 s ramp, and a supported generation time.');
  const b=p.groups.map(g=>g.beta/generation), l=p.groups.map(g=>g.lambda);
  const gamma=1-1/Math.sqrt(2);
  const a=t=>(p.beta*dollars*(ramp ? Math.min(t/ramp,1) : 1)-p.beta)/generation;
  function stage(r,s,t) {
    let numerator=r[0], denominator=1-s*a(t);
    for(let i=0;i<6;i++) {
      numerator+=s*b[i]*r[i+1]/(1+s*l[i]);
      denominator-=s*s*b[i]*l[i]/(1+s*l[i]);
    }
    const n=numerator/denominator;
    return [n,...l.map((v,i)=>(r[i+1]+s*v*n)/(1+s*v))];
  }
  let y=Array(7).fill(1), t=0;
  const result=[y.slice()];
  for(const target of samples.slice(1)) {
    while(t < target-1e-12) {
      // Resolve the initial prompt adjustment; cap later steps at 10 ms.
      const h=Math.min(.01,Math.max(.000001,t*.03),target-t,ramp>t ? ramp-t : Infinity);
      const first=stage(y,gamma*h,t+gamma*h);
      const rhs=y.map((v,i)=>v+(1-gamma)/gamma*(first[i]-v));
      y=stage(rhs,gamma*h,t+h); t+=h;
    }
    if(y.some(v=>!Number.isFinite(v)||v<=0)) throw new Error('The numerical solution failed.');
    result.push(y.slice());
  }
  return result;
}
