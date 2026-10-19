import assert from 'node:assert/strict';
import { availableConnectors, connectorName, directionsUrl, distanceKm, freshAvailability, matchesStation, stationFromGoogle, validPoint } from '../app/lib/stations.ts';

const now=Date.now(),point={latitude:12.97,longitude:77.59};
assert.ok(validPoint(point));
for(const invalid of [{latitude:null,longitude:0},{latitude:91,longitude:0},{latitude:0,longitude:Infinity},null])assert.equal(validPoint(invalid),false);
assert.equal(distanceKm(point,point),0);
assert.ok(Math.abs(distanceKm({latitude:0,longitude:0},{latitude:0,longitude:1})-111.195)<0.01);
const c={type:'EV_CONNECTOR_TYPE_CCS_COMBO_2',maxChargeRateKw:60,count:2,availableCount:1,availabilityLastUpdateTime:new Date(now-60000).toISOString()};
const station=stationFromGoogle({id:'test',displayName:{text:'Synthetic unit-test station'},formattedAddress:'Synthetic address',googleMapsUri:'https://maps.google.com/?cid=test',location:point,evChargeOptions:{connectorCount:2,connectorAggregation:[c]},currentOpeningHours:{openNow:true},photos:[{name:'places/test/photos/photo',authorAttributions:[{displayName:'Test photographer',uri:'https://maps.google.com/contrib/test'}]}],googleMapsLinks:{photosUri:'https://maps.google.com/photos/test'}});
assert.equal(station.connectors[0].maxChargeRateKw,60);
assert.equal(station.photos[0].authors[0].name,'Test photographer');
assert.equal(availableConnectors(station,c.type,50,now),1);
assert.equal(availableConnectors(station,'EV_CONNECTOR_TYPE_TYPE_2',0,now),0);
assert.equal(matchesStation(station,c.type,100),false);
assert.equal(matchesStation(station,c.type,50),true);
assert.equal(connectorName(c.type),'CCS2');
assert.equal(availableConnectors({...station,openNow:false},'',0,now),0);
assert.equal(availableConnectors({...station,status:'CLOSED_TEMPORARILY'},'',0,now),0);
assert.equal(freshAvailability({...c,availabilityLastUpdateTime:undefined},now),false);
assert.equal(freshAvailability({...c,availabilityLastUpdateTime:new Date(now-16*60000).toISOString()},now),false);
assert.equal(freshAvailability({...c,availabilityLastUpdateTime:new Date(now+5*60000).toISOString()},now),false);
assert.equal(freshAvailability({...c,availableCount:undefined},now),false);
assert.equal(freshAvailability({...c,availableCount:0},now),true);
assert.equal(stationFromGoogle({id:'x',googleMapsUri:'https://untrusted.example/'}),null);
const link=new URL(directionsUrl(station,point));
assert.equal(link.searchParams.get('origin'),'12.97,77.59');
assert.equal(link.searchParams.get('destination_place_id'),'test');
assert.equal(new URL(directionsUrl(station)).searchParams.has('origin'),false);
console.log('PASS: location validation, distances, connector compatibility, fresh versus stale availability, closed stations, photo attribution and driving directions.');

if(process.env.CHECK_BASE_URL){
 const base=new URL(process.env.CHECK_BASE_URL);assert.ok(['localhost','127.0.0.1'].includes(base.hostname));
 const url=new URL('/api/chargers',base);
 const send=(body,origin=base.origin)=>fetch(url,{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify(body)});
 assert.equal((await send(point,'https://other.example')).status,403);
 assert.equal((await send({latitude:200,longitude:77})).status,400);
 assert.equal((await send({latitude:'12',longitude:77})).status,400);
 assert.equal((await send({...point,extra:'x'.repeat(600)})).status,413);
 assert.equal((await send(point)).status,503);
 assert.equal((await fetch(new URL('/api/chargers/photo?name=../secret',base))).status,400);
 const photo=await fetch(new URL('/api/chargers/photo?name=places/test/photos/photo',base));
 assert.equal(photo.status,503);assert.match(photo.headers.get('cache-control'),/no-store/);
 console.log('PASS: location endpoint origin checks, bounded valid coordinates, absent API configuration and protected photo references.');
}
