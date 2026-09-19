from pathlib import Path
import json, urllib.request
rows=json.loads(Path('public/invitali-originales.json').read_text(encoding='utf-8'))
for r in rows:
 if r.get('localPath'):continue
 name=r['filename'].split('/')[-1]
 dest=Path('Iconos INVITALI')/name
 if dest.exists():continue
 try:
  request=urllib.request.Request(r['url'],headers={'User-Agent':'Mozilla/5.0','Referer':'https://invitali.com/'})
  with urllib.request.urlopen(request,timeout=25) as response: data=response.read()
  if name.endswith('.json'):
   parsed=json.loads(data)
   assert 'layers' in parsed
  else: assert data[:3]==b'ID3' or data[0]==255
  dest.write_bytes(data)
  print('Archivado:',name,len(data))
 except Exception as e: print('Pendiente:',name,str(e))
