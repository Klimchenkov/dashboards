import seedrandom from "seedrandom";
export function makeRng(seed:string){
  const rng = seedrandom(seed);
  return { int(min:number,max:number){ return Math.floor(rng()*(max-min+1))+min; }, float(min:number,max:number){ return rng()*(max-min)+min; }, pick<T>(a:T[]){ return a[Math.floor(rng()*a.length)] } };
}
