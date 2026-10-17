const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib');
module.exports=function restoreCmaps(){
 const directory=path.join(__dirname,'vendor','cmaps');
 const archive=path.join(__dirname,'vendor','cmaps.tar.gz');
 if(!fs.existsSync(archive))return;
 const tar=zlib.gunzipSync(fs.readFileSync(archive),{maxOutputLength:8*1024*1024});
 fs.mkdirSync(directory,{recursive:true});
 let restored=0;
 for(let offset=0;offset+512<=tar.length;){
  const header=tar.subarray(offset,offset+512);
  if(header.every(byte=>byte===0))break;
  const name=header.subarray(0,100).toString('ascii').split('\0')[0];
  const size=parseInt(header.subarray(124,136).toString('ascii').replace(/\0/g,'').trim(),8);
  if(!/^[A-Za-z0-9_-]+\.bcmap$/.test(name)||header[156]!==48||!Number.isSafeInteger(size)||size<0||size>100000||offset+512+size>tar.length)throw Error('Invalid bundled CMap archive');
  const file=path.join(directory,name);
  if(!fs.existsSync(file)){fs.writeFileSync(file,tar.subarray(offset+512,offset+512+size));restored++;}
  offset+=512+Math.ceil(size/512)*512;
 }
 return restored;
};
if(require.main===module)console.log('Restored CMaps:',module.exports());
