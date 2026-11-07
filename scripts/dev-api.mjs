// Local-only test service. Does not use production credentials or data.
import {createApi} from '../tests/helpers.js';
const {mf}=await createApi({host:'127.0.0.1',port:8787});
await mf.ready;
console.log('Local test API: http://127.0.0.1:8787 (temporary test database)');
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,async()=>{await mf.dispose();process.exit(0);});
