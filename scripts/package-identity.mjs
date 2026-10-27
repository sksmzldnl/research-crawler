export function assertPackageIdentity(actual,expected){
 const sourceValid=expected?.name==='zerowaste-listening-studio'&&expected?.build?.appId==='org.zerowaste.listeningstudio'&&typeof expected?.version==='string'&&expected.version.length>0;
 const packageValid=actual?.name===expected?.name&&actual?.version===expected?.version&&actual?.main==='build/desktop/main.js'&&(actual?.build===undefined||actual.build.appId===expected?.build?.appId);
 if(!sourceValid||!packageValid)throw Error('Wrong packaged project, version, app identifier or entry point.');
}
