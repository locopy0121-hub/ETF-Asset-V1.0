const fs=require('fs');
const path=require('path');

const repoRoot=path.resolve(__dirname,'..');
const nativeRoot=path.resolve(repoRoot,'..','TFAssetNative');
const mainPath=path.join(nativeRoot,'android/app/src/main/java/com/tfasset/app/MainApplication.kt');
const manifestPath=path.join(nativeRoot,'android/app/src/main/AndroidManifest.xml');

let main=fs.readFileSync(mainPath,'utf8');
const packageNeedle='PackageList(this).packages.apply {';
if(!main.includes('add(TfAssetPackage())')){
  if(!main.includes(packageNeedle))throw new Error('MainApplication package hook not found');
  main=main.replace(packageNeedle,packageNeedle+'\n              add(TfAssetPackage())');
  fs.writeFileSync(mainPath,main);
}

let manifest=fs.readFileSync(manifestPath,'utf8');
if(!manifest.includes('android.permission.SYSTEM_ALERT_WINDOW')){
  if(!manifest.includes('<application'))throw new Error('Android manifest application tag not found');
  manifest=manifest.replace(
    '<application',
    '<uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW" />\n  <application'
  );
}

if(!manifest.includes('TfAssetWidgetProvider')){
  const nativeComponents=[
    '    <receiver android:name=".TfAssetWidgetProvider" android:exported="true">',
    '      <intent-filter>',
    '        <action android:name="android.appwidget.action.APPWIDGET_UPDATE" />',
    '      </intent-filter>',
    '      <meta-data android:name="android.appwidget.provider" android:resource="@xml/tf_asset_widget_info" />',
    '    </receiver>',
    '    <service android:name=".TfAssetOverlayService" android:exported="false" />'
  ].join('\n');
  manifest=manifest.replace('</application>',nativeComponents+'\n  </application>');
}

manifest=manifest.replace(
  /\s*<intent-filter>\s*<action android:name="android\.intent\.action\.MAIN"\s*\/>\s*<category android:name="android\.intent\.category\.LAUNCHER"\s*\/>\s*<\/intent-filter>/,
  ''
);

if(!manifest.includes('android:name=".Icon01"')){
  const aliases=[];
  for(let i=1;i<=10;i++){
    const key=String(i).padStart(2,'0');
    const enabled=i===1?'true':'false';
    aliases.push([
      '    <activity-alias',
      `      android:name=".Icon${key}"`,
      `      android:enabled="${enabled}"`,
      '      android:exported="true"',
      `      android:icon="@drawable/tf_icon_${key}"`,
      '      android:label="TF Asset 資產管家"',
      '      android:targetActivity=".MainActivity">',
      '      <intent-filter>',
      '        <action android:name="android.intent.action.MAIN" />',
      '        <category android:name="android.intent.category.LAUNCHER" />',
      '      </intent-filter>',
      '    </activity-alias>'
    ].join('\n'));
  }
  manifest=manifest.replace('</application>',aliases.join('\n')+'\n  </application>');
}

const aliasCount=(manifest.match(/<activity-alias\b/g)||[]).length;
if(aliasCount!==10)throw new Error(`Expected 10 launcher aliases, found ${aliasCount}`);
for(const key of ['01','10']){
  if(!manifest.includes(`android:name=".Icon${key}"`))throw new Error(`Launcher alias Icon${key} missing`);
}
fs.writeFileSync(manifestPath,manifest);
console.log('V1.1.2 Android native injection: PASS');
