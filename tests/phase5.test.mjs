import test from 'node:test';
import assert from 'node:assert/strict';
import { INITIAL_PHASE5, aggregateAvds, archiveEligibility, auditInRange, phase5Reducer } from '../src/phase5.js';

test('AVDS aggregation preserves missing buckets rather than inventing zero',()=>{
 const rows=aggregateAvds([{timestamp:'2026-01-01T00:00:00Z',speed:null,volume:null,occupancy:null}],5);
 assert.equal(rows[0].speed,null);assert.equal(rows[0].volume,null);assert.equal(rows[0].occupancy,null);
});
test('AVDS volume sums while speed and occupancy average',()=>{
 const rows=aggregateAvds([{timestamp:'2026-01-01T00:01:00Z',speed:40,volume:2,occupancy:20},{timestamp:'2026-01-01T00:04:00Z',speed:60,volume:3,occupancy:40}],5);
 assert.deepEqual([rows[0].speed,rows[0].volume,rows[0].occupancy],[50,5,30]);
});
test('maintenance requires remarks and actions',()=>{const s=phase5Reducer(INITIAL_PHASE5,{type:'MAINTENANCE_SAVE',now:1,actorId:'A',record:{locationId:'L',assetId:'D',remarks:'',actions:'',status:'Open'}});assert.equal(s.maintenance.length,0);assert.match(s.feedback,/required/);});
test('operational retention is two years and CCTV is 30 days',()=>{const now=Date.parse('2026-01-01T00:00:00Z'), records=[{category:'Operational',timestamp:'2023-01-01T00:00:00Z'},{category:'CCTV',timestamp:'2025-11-01T00:00:00Z'}];assert.equal(archiveEligibility(records,'Operational',now).eligible.length,1);assert.equal(archiveEligibility(records,'CCTV',now).eligible.length,1);});
test('configuration records are never automatically archive eligible',()=>{const x=archiveEligibility([{category:'Configuration',timestamp:'2020-01-01'}],'Configuration',Date.now());assert.equal(x.eligible.length,0);assert.match(x.reason,/authorized/);});
test('duplicate archive request is blocked',()=>{const a={type:'ARCHIVE_QUEUE',actorId:'A',now:1,snapshot:{locationId:'L',category:'Operational',cutoff:'x',eligibleCount:2}};let s=phase5Reducer(INITIAL_PHASE5,a);s=phase5Reducer(s,{...a,now:2});assert.equal(s.archiveJobs.length,1);});
test('audit boundaries are inclusive',()=>{const row={timestamp:'2026-01-01T10:00:00'};assert.equal(auditInRange(row,'2026-01-01T10:00:00','2026-01-01T10:00:00'),true);assert.equal(auditInRange(row,'2026-01-01T10:00:01',''),false);});
