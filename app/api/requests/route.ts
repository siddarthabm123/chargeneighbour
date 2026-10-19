import { listRequests, createRequest, cancelRequest } from '../../../db/request-store';
import { getCurrentUser } from '../../auth/server';
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function GET() {
 const user=await getCurrentUser();
 if(!user)return json({error:'Sign in to see your activity.'},401);
 try {
  const rows=await listRequests(user.userId);
  return json({requests:rows.map(({userId,email,...row})=>({...row,payload:JSON.parse(row.payload)}))});
 }catch{return json({error:'Your activity is temporarily unavailable. Please try again.'},503);}
}
export async function POST(request:Request) {
 const user=await getCurrentUser();
 if(!user)return json({error:'Please sign in to save your request.'},401);
 if(request.headers.get('origin')!==new URL(request.url).origin)return json({error:'Invalid request origin.'},403);
 const raw=await request.text();
 if(raw.length>6000)return json({error:'Request is too large.'},413);
 let body;try{body=JSON.parse(raw);}catch{return json({error:'Invalid request.'},400);}
 if(!body||typeof body!=='object')return json({error:'Invalid request.'},400);
 const {kind}=body; let payload:Record<string,unknown>;
 const clean=(v:unknown,max=180)=>typeof v==='string'?v.trim().slice(0,max):'';
 if(kind==='booking') {
  return json({error:'Reservations are not enabled until participating hosts and operators are verified. Use the station’s Google Maps page to contact its operator.'},409);
 }else if(kind==='host') {
  const name=clean(body.name,80),area=clean(body.area,80),access=clean(body.access,100),power=clean(body.power,10);
  if(name.length<2||area.length<2||!['3.3','7.2','11','22'].includes(power)||!['Independent driveway','Commercial parking','Apartment with written permission'].includes(access)||body.permission!==true)return json({error:'Complete all fields and confirm your right to offer access.'},400);
  payload={name,area,access,power,connector:'Type 2 AC',permission:true};
 }else if(kind==='interest') {
  const area=clean(body.area,80),role=clean(body.role,20);
  if(!area||!['driver','host','partner'].includes(role)||body.consent!==true)return json({error:'Choose your area and role, and confirm contact consent.'},400);
  payload={area,role,consent:true};
 }else return json({error:'Unsupported request.'},400);
 try {
  const recent=(await listRequests(user.userId)).filter(r=>r.kind===kind);
  if(recent[0]&&Date.now()-new Date(recent[0].createdAt).getTime()<10000)return json({error:'Your previous request was saved. Please wait a few seconds before submitting again.'},429);
  const id=crypto.randomUUID();
  await createRequest({id,userId:user.userId,email:user.email,kind,payload:JSON.stringify(payload),status:kind==='host'?'pending_review':'registered',createdAt:new Date().toISOString()});
  return json({id,status:'submitted'},201);
 }catch{return json({error:'We could not save your request. Please retry; nothing has been confirmed or charged.'},503);}
}
export async function PATCH(request:Request) {
 const user=await getCurrentUser();if(!user)return json({error:'Please sign in.'},401);
 if(request.headers.get('origin')!==new URL(request.url).origin)return json({error:'Invalid request origin.'},403);
 let body;try{body=await request.json() as {id?:string};}catch{return json({error:'Invalid request.'},400);}
 if(!body||typeof body.id!=='string'||body.id.length>80)return json({error:'Invalid record.'},400);
 try{
  return await cancelRequest(user.userId,body.id)?json({ok:true}):json({error:'Record not found.'},404);
 }catch{return json({error:'Could not cancel. Please try again.'},503);}
}
