import {test} from 'node:test';
import assert from 'node:assert/strict';
import QRCode from 'qrcode';
import jsQR from 'jsqr';
import {PNG} from 'pngjs';
import {validateRecord,qrUrl,csvCell,escapeHtml,AIRBNB_LOGO_PATH} from '../src/shared.js';
test('names support Arabic and normalized whitespace; mobile is optional',()=>{
 assert.deepEqual(validateRecord({name:'  أمير   محمد  '}),{name:'أمير محمد',mobile:''});
 assert.deepEqual(validateRecord({name:'Alex',mobile:'+20 (100) 123-4567'}),{name:'Alex',mobile:'+20 (100) 123-4567'});
});
test('invalid records are rejected',()=>{for(const value of [{name:'   '},{name:'a'.repeat(101)},{name:'A',mobile:'text'},{name:'A',mobile:'123'},{name:'A',mobile:'1'.repeat(16)}])assert.throws(()=>validateRecord(value));});
test('CSV prevents spreadsheet formulas and quotes fields safely',()=>{assert.equal(csvCell('=1+1'),'"\'=1+1"');assert.equal(csvCell(' +201001234567'),'"\' +201001234567"');assert.equal(csvCell('a"b'),'"a""b"');});
test('untrusted content cannot become HTML',()=>{assert.equal(escapeHtml('<img onerror="x">'),'&lt;img onerror=&quot;x&quot;&gt;');});
test('QR works under a GitHub repository path and decodes independently',async()=>{
 const url=qrUrl('https://example.github.io/cairo-and-current/?discard=yes','a'.repeat(48));
 assert.equal(url,'https://example.github.io/cairo-and-current/#/tours/'+'a'.repeat(48));
 const png=PNG.sync.read(await QRCode.toBuffer(url,{width:600,margin:4,errorCorrectionLevel:'M'}));
 assert.equal(jsQR(new Uint8ClampedArray(png.data),png.width,png.height).data,url);
 assert.ok(!url.includes('mobile'));
});
test('QR code with center logo occlusion decodes accurately with error correction level H',async()=>{
 assert.ok(AIRBNB_LOGO_PATH && AIRBNB_LOGO_PATH.startsWith('M12.001'));
 const url=qrUrl('https://mohamedemad7299.github.io/cairo-and-current/','token_1234567890abcdef');
 const width=480;
 const png=PNG.sync.read(await QRCode.toBuffer(url,{width,margin:4,errorCorrectionLevel:'H',color:{dark:'#152e2b',light:'#ffffff'}}));
 const centerSize=Math.round(width*0.22);
 const cx=Math.round((width-centerSize)/2);
 const cy=Math.round((width-centerSize)/2);
 const radius=Math.round(centerSize*0.22);
 for(let y=cy;y<cy+centerSize;y++){
  for(let x=cx;x<cx+centerSize;x++){
   const dx=Math.max(0,Math.max(cx+radius-x,x-(cx+centerSize-radius)));
   const dy=Math.max(0,Math.max(cy+radius-y,y-(cy+centerSize-radius)));
   if(dx*dx+dy*dy<=radius*radius){
    const idx=(y*width+x)*4;
    png.data[idx]=255;png.data[idx+1]=255;png.data[idx+2]=255;png.data[idx+3]=255;
   }
  }
 }
 const decoded=jsQR(new Uint8ClampedArray(png.data),width,width);
 assert.ok(decoded);
 assert.equal(decoded.data,url);
});
