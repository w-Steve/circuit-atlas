import {readFile,readdir,mkdir,writeFile,copyFile,access} from 'node:fs/promises';
import {resolve,dirname,join} from 'node:path';
const root=process.cwd(),seen=new Set(),packages=[];
async function find(from,name){
  let folder=from;
  while(true){const candidate=join(folder,'node_modules',name);try{await access(join(candidate,'package.json'));return candidate}catch{}
    const parent=dirname(folder);if(parent===folder)return null;folder=parent;
  }
}
async function visit(folder){
  if(seen.has(folder))return;seen.add(folder);
  const info=JSON.parse(await readFile(join(folder,'package.json'),'utf8'));
  const files=(await readdir(folder,{withFileTypes:true})).filter(f=>f.isFile()&&/^(licen[sc]e|copying|notice)(\.|$|-)/i.test(f.name)).map(f=>f.name);
  let text=`${info.name}@${info.version}\nDeclared license: ${typeof info.license==='string'?info.license:JSON.stringify(info.license??'See package notice')}\n`;
  for(const name of files)text+=`\n--- ${name} ---\n${await readFile(join(folder,name),'utf8')}\n`;
  packages.push({name:info.name,text});
  for(const name of Object.keys({...info.dependencies,...info.optionalDependencies})){const child=await find(folder,name);if(child)await visit(child)}
}
const manifest=JSON.parse(await readFile(join(root,'package.json'),'utf8'));
for(const name of Object.keys(manifest.dependencies)){const folder=await find(root,name);if(folder)await visit(folder)}
const destination=resolve('public/licenses');await mkdir(destination,{recursive:true});
let text='Third-party notices for installed production dependencies. Some packages may be removed by tree shaking.\n\n';
for(const p of packages.sort((a,b)=>a.name.localeCompare(b.name)))text+='='.repeat(72)+'\n'+p.text+'\n';
text+='\nSelf-hosted Barlow Condensed font\n'+await readFile('public/fonts/BarlowCondensed-OFL.txt','utf8');
await writeFile(join(destination,'THIRD_PARTY_NOTICES.txt'),text);
await copyFile('src/data/LICENSE-circuit.md',join(destination,'circuit-MIT.txt'));
await copyFile('src/data/LICENSE-zones.md',join(destination,'shanghai-zones-ODbL.txt'));
await copyFile('src/data/LICENSE-europe.md',join(destination,'europe-zones-ODbL.txt'));
await copyFile('src/data/LICENSE-asia.md',join(destination,'asia-zones-ODbL.txt'));
await copyFile('src/data/LICENSE-americas.md',join(destination,'americas-zones-ODbL.txt'));
await copyFile('src/data/LICENSE-world.md',join(destination,'world-Natural-Earth.txt'));
await copyFile('src/data/LICENSE-atlas.md',join(destination,'atlas-F1DB.txt'));
await copyFile('artifacts/atlas-source/LICENSE.txt',join(destination,'F1DB-CC-BY-4.0.txt'));
console.log(`Retained notices for ${packages.length} installed production packages, font and geographic data.`);
