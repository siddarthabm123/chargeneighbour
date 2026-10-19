export function sessionEstimate(power:number,hours:number,rate:number) {
  const energy=Math.round(power*hours*0.9*10)/10;
  return {energy,total:Math.round(energy*rate)};
}
export function hostEstimate(hours:number,days:number,rate=16,electricity=8,power=7.2,commission=0.15) {
  const energy=power*hours*days*0.9,gross=energy*rate;
  return {energy,gross,fee:gross*commission,cost:energy*electricity,net:gross*(1-commission)-energy*electricity};
}
export const todayIST=()=>new Date(Date.now()+330*60000).toISOString().slice(0,10);
export const tomorrowIST=()=>new Date(Date.now()+330*60000+86400000).toISOString().slice(0,10);
