const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const {execFileSync}=require('node:child_process');
// Exercise the real injector against a native scaffold with no implicit permission.
// Removing WAKE_LOCK from the injector must make this test fail.
const root=fs.mkdtempSync(path.join(os.tmpdir(),'tf-widget-permission-'));
try{
 const repo=path.join(root,'repo'),native=path.join(root,'TFAssetNative/android/app/src/main');
 fs.mkdirSync(path.join(repo,'scripts'),{recursive:true});
 fs.mkdirSync(path.join(native,'java/com/tfasset/app'),{recursive:true});
 fs.copyFileSync('scripts/inject-v1_1_2-android.cjs',path.join(repo,'scripts/inject-v1_1_2-android.cjs'));
 fs.writeFileSync(path.join(native,'java/com/tfasset/app/MainApplication.kt'),'PackageList(this).packages.apply {\n}\n');
 const manifest=path.join(native,'AndroidManifest.xml');
 fs.writeFileSync(manifest,'<manifest xmlns:android="http://schemas.android.com/apk/res/android"><application><activity android:name=".MainActivity"><intent-filter><action android:name="android.intent.action.MAIN" /><category android:name="android.intent.category.LAUNCHER" /></intent-filter></activity></application></manifest>');
 for(let pass=0;pass<2;pass++){
  execFileSync(process.execPath,[path.join(repo,'scripts/inject-v1_1_2-android.cjs')],{stdio:'pipe'});
  const xml=fs.readFileSync(manifest,'utf8');
  const permissions=[...xml.matchAll(/<uses-permission\s+android:name="([^"]+)"\s*\/>/g)].map(m=>m[1]);
  assert.equal(permissions.filter(p=>p==='android.permission.WAKE_LOCK').length,1,'Headless JS needs exactly one WAKE_LOCK declaration');
  assert.ok(xml.indexOf('android.permission.WAKE_LOCK')<xml.indexOf('<application'),'permission must be declared on manifest, not application');
  assert.ok(permissions.includes('android.permission.FOREGROUND_SERVICE_DATA_SYNC'));
  assert.equal((xml.match(/<service android:name=".TfAssetWidgetLiveService"/g)||[]).length,1);
 }
 console.log('V4.0.52 real native injection: Widget headless WAKE_LOCK + foreground permissions + idempotency PASS');
}finally{fs.rmSync(root,{recursive:true,force:true});}
