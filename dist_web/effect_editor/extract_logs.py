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
                # 2026-06-03T11:15:23Z
                if created_utc_str:
                    try:
                        dt_utc = datetime.strptime(created_utc_str, '%Y-%m-%dT%H:%M:%SZ').replace(tzinfo=timezone.utc)
                        dt_kst = dt_utc.astimezone(kst)
                        
                        content = data.get('content', '')
                        instructions.append({
                            'time': dt_kst.strftime('%Y-%m-%d %H:%M:%S'),
                            'raw_time': dt_kst,
                            'content': content.strip()
                        })
                    except Exception as e:
                        print('Date parse error:', e)
                        pass
except Exception as e:
    print('File read error:', e)

# Filter up to 20:29:59 KST
cutoff = datetime.strptime('2026-06-03 20:30:00', '%Y-%m-%d %H:%M:%S').replace(tzinfo=kst)
filtered = [i for i in instructions if i['raw_time'] < cutoff]

print(f"Total extracted: {len(filtered)}")
for idx, i in enumerate(filtered):
    print(f"[{idx+1}] {i['time']}")
    print(f"{i['content']}")
    print("-" * 40)
