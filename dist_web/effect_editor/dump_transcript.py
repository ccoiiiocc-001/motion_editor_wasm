import json
import os

log_path = r'C:\Users\com\.gemini\antigravity\brain\93ec0bf4-16dd-4456-ac17-54203ad45056\.system_generated\logs\transcript.jsonl'
edits = []

with open(log_path, 'r', encoding='utf-8') as f:
    for line in f:
        try:
            data = json.loads(line)
            if 'tool_calls' in data:
                for tc in data['tool_calls']:
                    if tc.get('name') in ['multi_replace_file_content', 'replace_file_content']:
                        args = tc.get('arguments', {})
                        target = args.get('TargetFile', '')
                        if 'retrofx.js' in target:
                            edits.append({
                                'step': data.get('step_index', 0),
                                'type': tc.get('name'),
                                'args': args
                            })
        except Exception:
            pass

with open('edits.json', 'w', encoding='utf-8') as f:
    json.dump(edits, f, indent=2, ensure_ascii=False)
