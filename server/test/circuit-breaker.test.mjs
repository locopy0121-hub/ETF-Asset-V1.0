import test from 'node:test';
import assert from 'node:assert/strict';
import {CircuitBreaker,CircuitOpenError,SourceError} from '../src/circuitBreaker.mjs';

test('three consecutive provider failures open circuit for five minutes',async()=>{
  const breaker=new CircuitBreaker('FUGLE',{threshold:3,cooldownMs:300_000});
  let calls=0;
  const fail=()=>{calls++;throw new SourceError('RATE_LIMIT','429',{status:429});};
  const t=Date.parse('2026-10-01T11:00:00+08:00');
  for(let i=0;i<3;i++)await assert.rejects(
    breaker.execute(async()=>fail(),{now:t+i*1000}),SourceError);
  assert.equal(breaker.health(t+3000).state,'OPEN');
  await assert.rejects(
    breaker.execute(async()=>{calls++;return 1;},{now:t+4000}),
    CircuitOpenError,
  );
  assert.equal(calls,3,'OPEN circuit must not hit provider');
  const value=await breaker.execute(async()=>{calls++;return 9;},{now:t+303_000});
  assert.equal(value,9);
  assert.equal(breaker.health(t+303_000).state,'CLOSED');
  assert.equal(calls,4);
});

test('non-operational no-data error does not poison breaker',async()=>{
  const breaker=new CircuitBreaker('MIS',{threshold:3,cooldownMs:300_000});
  for(let i=0;i<5;i++)await assert.rejects(
    breaker.execute(async()=>{throw new SourceError('NO_DATA','no quote',{breakerFailure:false});}),
    SourceError,
  );
  assert.equal(breaker.health().state,'CLOSED');
});
