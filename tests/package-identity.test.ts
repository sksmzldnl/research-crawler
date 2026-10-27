import {it,expect} from 'vitest';
import {assertPackageIdentity} from '../scripts/package-identity.mjs';
const expected={name:'zerowaste-listening-studio',version:'0.5.0',main:'build/desktop/main.js',build:{appId:'org.zerowaste.listeningstudio'}};
it('accepts the matching Electron package identity',()=>{expect(()=>assertPackageIdentity({...expected},expected)).not.toThrow();});
it.each([{name:'other-project'},{version:'0.4.0'},{main:'build/desktop/test-api.js'},{main:'build/desktop/main.js,build/desktop/test-api.js'},{build:{appId:'org.other.app'}}])('rejects a different project/version/entry point/app ID: %j',changed=>{expect(()=>assertPackageIdentity({...expected,...changed},expected)).toThrow(/Wrong packaged/);});
it('rejects absent manifests and unexpected source identities',()=>{expect(()=>assertPackageIdentity(undefined,expected)).toThrow();expect(()=>assertPackageIdentity({...expected,name:'other'},{...expected,name:'other'})).toThrow();});

it('accepts electron-builder manifests with build metadata stripped; the native bundle ID is checked separately',()=>{const {build,...packaged}=expected;expect(()=>assertPackageIdentity(packaged,expected)).not.toThrow();});
