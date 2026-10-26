// Optional real PostgreSQL multi-connection proof. Never reads DATABASE_URL/.env.
// Supply LOCAL_POSTGRES_BIN for disposable binaries; this test creates its own
// private Unix socket, no TCP listener, fixture identities and temporary cluster.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,readdir,rm} from 'node:fs/promises';
import {execFileSync,spawn} from 'node:child_process';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {databaseBootstrapSQL,seed,ids} from './database.mjs';
const binary=process.env.LOCAL_POSTGRES_BIN;
test('independent PostgreSQL connections serialize competing bookings, overlapping participants and last-admin removal', {skip:!binary,timeout:60000},async()=>{
 const dir=await mkdtemp(join(tmpdir(),'shikkha-concurrency-'));const data=join(dir,'data');
 const args=['-X','-v','ON_ERROR_STOP=1','-h',dir,'-U','shikkha_test','-d','postgres','-Atq'];
 const execute=sql=>execFileSync('psql',args,{input:sql,encoding:'utf8',stdio:['pipe','pipe','pipe']}).trim();
 const literal=value=>value===null?'NULL':typeof value==='number'?String(value):"'"+String(value).replaceAll("'","''")+"'";
 const adapter={exec:async sql=>execute(sql),query:async(sql,params=[])=>execute(sql.replace(/\$(\d+)/g,(_,n)=>literal(params[+n-1])))};
 const userSQL=(id,sql)=>`SET LOCAL ROLE authenticated;SELECT set_config('request.jwt.claim.sub','${id}',true);${sql}`;
 async function compete(first,second,isolation='READ COMMITTED'){
  const run=(sql,hold)=>new Promise(resolve=>{const p=spawn('psql',args);let output='';p.stdout.on('data',d=>{output+=d;});p.stderr.on('data',d=>{output+=d;});p.on('close',code=>resolve({code,output}));p.stdin.end(`BEGIN ISOLATION LEVEL ${isolation};${sql};${hold?'SELECT pg_sleep(0.3);':''}COMMIT;`);});
  return Promise.all([run(first,true),run(second,false)]);
 }
 let started=false;
 try{
  execFileSync(join(binary,'initdb'),['-D',data,'-A','trust','--no-locale','-E','UTF8','-U','shikkha_test'],{stdio:'pipe'});
  execFileSync(join(binary,'pg_ctl'),['-D',data,'-l',join(dir,'server.log'),'-o',`-k ${dir} -h '' -c wal_level=logical`,'-w','start'],{stdio:'pipe'});started=true;
  execute(databaseBootstrapSQL);
  for(const file of (await readdir('supabase/migrations')).sort())if(file.endsWith('.sql')&&!file.startsWith('20260308214544'))execute(await readFile(join('supabase/migrations',file),'utf8'));
  await seed(adapter);
  const makeSlot=(teacher,days)=>execute(`BEGIN;${userSQL(teacher,`SELECT id FROM save_tutor_slot(NULL,'Concurrent SQL',date_trunc('day',now())+interval '${days} days 10 hours',60,'UTC',1)`)};COMMIT;`).split('\n').at(-1);
  const makeRequest=(slot,student)=>execute(`BEGIN;${userSQL(student,`SELECT id FROM request_tutoring('${slot}','Concurrent booking test')`)};COMMIT;`).split('\n').at(-1);
  const s=makeSlot(ids.teacher,2),a=makeRequest(s,ids.student),b=makeRequest(s,ids.other);
  const same=await compete(userSQL(ids.teacher,`SELECT decide_tutoring('${a}','approve','https://example.test/a',NULL)`),userSQL(ids.teacher,`SELECT decide_tutoring('${b}','approve','https://example.test/b',NULL)`));
  assert.equal(same.filter(r=>r.code===0).length,1,JSON.stringify(same));
  assert.equal(execute(`SELECT count(*) FROM tutoring_requests WHERE slot_id='${s}' AND status='approved'`),'1');
  const t1=makeSlot(ids.teacher,3),t2=makeSlot(ids.other,3),r1=makeRequest(t1,ids.student),r2=makeRequest(t2,ids.student);
  const overlap=await compete(userSQL(ids.teacher,`SELECT decide_tutoring('${r1}','approve','https://example.test/one',NULL)`),userSQL(ids.other,`SELECT decide_tutoring('${r2}','approve','https://example.test/two',NULL)`));
  assert.equal(overlap.filter(r=>r.code===0).length,1,JSON.stringify(overlap));
  execute(`BEGIN;${userSQL(ids.admin,`SELECT admin_set_role('${ids.other}','admin',true,'Disposable race setup')`)};COMMIT;`);
  const roles=await compete(userSQL(ids.admin,`SELECT admin_set_role('${ids.other}','admin',false,'Concurrent removal')`),userSQL(ids.other,`SELECT admin_set_role('${ids.admin}','admin',false,'Concurrent removal')`));
  assert.equal(roles.filter(r=>r.code===0).length,1,JSON.stringify(roles));
  assert.equal(execute("SELECT count(*) FROM user_roles WHERE role='admin'"),'1');
  // Recreate the two-admin case and establish stale snapshots before the lock.
  execute(`INSERT INTO user_roles(user_id,role) VALUES('${ids.admin}','admin'),('${ids.other}','admin') ON CONFLICT DO NOTHING;`);
  const staleA=`SELECT count(*) FROM user_roles;${userSQL(ids.admin,`SELECT admin_set_role('${ids.other}','admin',false,'Snapshot removal')`)}`;
  const staleB=`SELECT count(*) FROM user_roles;${userSQL(ids.other,`SELECT admin_set_role('${ids.admin}','admin',false,'Snapshot removal')`)}`;
  const snapshots=await compete(staleA,staleB,'REPEATABLE READ');
  assert.equal(snapshots.filter(r=>r.code===0).length,1,JSON.stringify(snapshots));
  assert.equal(execute("SELECT count(*) FROM user_roles WHERE role='admin'"),'1');
  console.log('PostgreSQL version:',execute('SHOW server_version'),'; 4 independent-connection races passed; no TCP listener/provider services.');
 }finally{
  if(started)execFileSync(join(binary,'pg_ctl'),['-D',data,'-m','immediate','-w','stop'],{stdio:'pipe'});
  await rm(dir,{recursive:true,force:true});
 }
});
