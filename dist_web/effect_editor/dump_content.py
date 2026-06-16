import json

log_path = r'C:\Users\com\.gemini\antigravity\brain\93ec0bf4-16dd-4456-ac17-54203ad45056\.system_generated\logs\transcript.jsonl'
found = False

with open(log_path, 'r', encoding='utf-8') as f:
    for line in f:
        try:
            data = json.loads(line)
            content = data.get('content', '')
            if content and 'fabric.Image.filters.HolePerspective' in content:
                print(f"Found in step {data.get('step_index', 0)} (source: {data.get('source', '')}, type: {data.get('type', '')})")
                found = True
        except Exception:
            pass

