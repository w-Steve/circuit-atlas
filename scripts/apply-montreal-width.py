"""Replace the guessed14m baseline with the published FIA10m reference."""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
read=lambda p:json.loads(p.read_text('utf8'))
reference=read(ROOT/'src/circuits/americas/montreal-width-reference-2026.json')
path=ROOT/'src/circuits/generated/montreal.json';data=read(path)
assert reference['circuitId']==data['circuitId']=='montreal' and reference['season']==data['season']==2026
track=data['trackGeometry'];old=(reference['previousWidthMetres'],reference['previousWidthSource']);new=(reference['widthMetres'],reference['source'])
assert (track['widthMetres'],track['widthSource']) in [old,new],'Preserve independently edited road width'
track.update(widthMetres=new[0],widthSource=new[1])
if not any(s['url']==new[1]['url'] for s in data['dataSources']):data['dataSources'].append(new[1])
wrong='2026赛历及赛道事实；雪邦赛事名称保留巴林大奖赛，举办国为马来西亚'
correct='2026加拿大大奖赛及赛道公开事实；几何、高程及观众区另列来源。'
def correct_note(sources):
    for source in sources:
        if source['url']=='https://www.formula1.com/en/racing/2026/canada' and source.get('notes')==wrong:source['notes']=correct
correct_note(data['dataSources']);path.write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')),'utf8')
path=ROOT/'src/circuits/generated/summaries.json';summaries=read(path);summary=next(s for s in summaries if s['circuitId']=='montreal');correct_note(summary['dataSources'])
if not any(s['url']==new[1]['url'] for s in summary['dataSources']):summary['dataSources'].append(new[1])
path.write_text(json.dumps(summaries,ensure_ascii=False,separators=(',',':')),'utf8')
print('Montreal width reference and its erroneous source note corrected; centreline, elevation and zones untouched')
