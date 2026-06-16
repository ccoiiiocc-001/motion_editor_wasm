import json
import re

log_path = r'C:\Users\com\.gemini\antigravity\brain\93ec0bf4-16dd-4456-ac17-54203ad45056\.system_generated\logs\transcript.jsonl'
target_steps = [23, 32, 41, 58, 64, 88, 127, 147, 153]

diffs = {}
with open(log_path, 'r', encoding='utf-8') as f:
    for line in f:
        try:
            data = json.loads(line)
            idx = data.get('step_index')
            if idx in target_steps:
                content = data.get('content', '')
                if '[diff_block_start]' in content:
                    diff_start = content.find('[diff_block_start]') + len('[diff_block_start]\n')
                    diff_end = content.find('[diff_block_end]')
                    diff_content = content[diff_start:diff_end].strip()
                    
                    # Fix the header of the diff to be standard format for git apply
                    # The LLM unified diffs sometimes lack the standard headers.
                    # Usually it starts with @@ ...
                    # We need to prepend standard headers.
                    diff_content = f"--- a/js/retrofx.js\n+++ b/js/retrofx.js\n" + diff_content
                    diffs[idx] = diff_content
        except Exception as e:
            pass

for i, step in enumerate(target_steps):
    with open(f'patch_{i}.patch', 'w', encoding='utf-8') as f:
        f.write(diffs[step] + '\n')

print(f"Generated {len(diffs)} patches.")
