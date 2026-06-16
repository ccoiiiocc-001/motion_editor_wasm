import json

log_path = r'C:\Users\com\.gemini\antigravity\brain\93ec0bf4-16dd-4456-ac17-54203ad45056\.system_generated\logs\transcript.jsonl'
with open('user_prompts.txt', 'w', encoding='utf-8') as out:
    with open(log_path, 'r', encoding='utf-8') as f:
        for line in f:
            try:
                data = json.loads(line)
                if data.get('type') == 'USER_INPUT' and data.get('created_at', '') <= '2026-06-03T11:29:54Z':
                    out.write(f"\n=== {data['created_at']} ===\n")
                    out.write(data.get('content', '') + '\n')
            except Exception:
                pass
