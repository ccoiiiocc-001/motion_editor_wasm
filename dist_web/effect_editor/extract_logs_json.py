import json
from datetime import datetime, timedelta, timezone

log_path = r'C:\Users\com\.gemini\antigravity\brain\93ec0bf4-16dd-4456-ac17-54203ad45056\.system_generated\logs\transcript.jsonl'
kst = timezone(timedelta(hours=9))

instructions = []
try:
    with open(log_path, 'r', encoding='utf-8') as f:
        for line in f:
            if not line.strip(): continue
            try:
                data = json.loads(line)
            except:
                continue
            
            if data.get('type') == 'USER_INPUT' and data.get('source') == 'USER_EXPLICIT':
                created_utc_str = data.get('created_at')
                if created_utc_str:
                    try:
                        dt_utc = datetime.strptime(created_utc_str, '%Y-%m-%dT%H:%M:%SZ').replace(tzinfo=timezone.utc)
                        dt_kst = dt_utc.astimezone(kst)
                        
                        content = data.get('content', '')
                        instructions.append({
                            'time': dt_kst.strftime('%Y-%m-%d %H:%M:%S'),
                            'content': content.strip(),
                            'timestamp': dt_kst.timestamp()
                        })
                    except Exception as e:
                        pass
except Exception as e:
    print('File read error:', e)

cutoff = datetime.strptime('2026-06-03 20:30:00', '%Y-%m-%d %H:%M:%S').replace(tzinfo=kst).timestamp()
filtered = [i for i in instructions if i['timestamp'] < cutoff]

with open('extracted_instructions.json', 'w', encoding='utf-8') as f:
    json.dump(filtered, f, ensure_ascii=False, indent=2)
print("Done")
