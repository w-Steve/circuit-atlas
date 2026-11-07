"""Migrate the generic width to the sourced FIA reference, guarding user edits."""
import json
from pathlib import Path
root=Path(__file__).resolve().parents[1]
reference=json.loads((root/'src/circuits/europe/monaco-width-reference.json').read_text('utf8'))
p=root/'src/circuits/generated/monaco.json';data=json.loads(p.read_text('utf8'));track=data['trackGeometry']
old=(reference['previousWidthMetres'],reference['previousWidthSource'])
new=(reference['widthMetres'],reference['source'])
if (track['widthMetres'],track['widthSource']) not in [old,new]:raise ValueError('Width changed outside this migration; review before overwriting')
track.update(widthMetres=new[0],widthSource=new[1])
if not any(s['url']==new[1]['url'] for s in data['dataSources']):data['dataSources'].append(new[1])
p.write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')),'utf8')
