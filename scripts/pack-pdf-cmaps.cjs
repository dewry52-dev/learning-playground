const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib');
const root=path.resolve(__dirname,'../math-gallery/pdf-counter/vendor');
const chunks=[];
for(const name of fs.readdirSync(path.join(root,'cmaps')).filter(n=>n.endsWith('.bcmap')).sort()){
 const body=fs.readFileSync(path.join(root,'cmaps',name)),header=Buffer.alloc(512);
 header.write(name,0,100,'ascii');header.write('0000644\0',100,8,'ascii');
 header.write('0000000\0',108,8,'ascii');header.write('0000000\0',116,8,'ascii');
 header.write(body.length.toString(8).padStart(11,'0')+'\0',124,12,'ascii');
 header.write('00000000000\0',136,12,'ascii');header.fill(32,148,156);header[156]=48;
 header.write('ustar\0',257,6,'ascii');header.write('00',263,2,'ascii');
 const checksum=header.reduce((a,b)=>a+b,0);header.write(checksum.toString(8).padStart(6,'0')+'\0 ',148,8,'ascii');
 chunks.push(header,body,Buffer.alloc((512-body.length%512)%512));
}
chunks.push(Buffer.alloc(1024));
const archive=zlib.gzipSync(Buffer.concat(chunks),{level:9});
fs.writeFileSync(path.join(root,'cmaps.tar.gz'),archive);
console.log('Packed PDF CMaps:',archive.length,'bytes');
