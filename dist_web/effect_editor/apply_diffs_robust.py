import json

log_path = r'C:\Users\com\.gemini\antigravity\brain\93ec0bf4-16dd-4456-ac17-54203ad45056\.system_generated\logs\transcript.jsonl'
target_steps = [23, 32, 41, 58, 64, 88, 127, 147, 153]

# Read the base file
with open('js/retrofx.js', 'r', encoding='utf-8') as f:
    file_content = f.read()

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
                    diff_text = content[diff_start:diff_end].strip('\r\n')
                    diff_text = diff_text.replace('\r\n', '\n')
                    diffs[idx] = diff_text
        except Exception:
            pass

def apply_diff_to_content(content, diff_text):
    # Split by @@ ... @@
    import re
    blocks = re.split(r'(?m)^@@[^\n]+@@\n', diff_text)
    if not blocks[0].strip():
        blocks = blocks[1:]
    
    new_content = content
    for block in blocks:
        if not block.strip(): continue
        # Reconstruct TargetContent and ReplacementContent
        target_lines = []
        replace_lines = []
        for line in block.split('\n'):
            if line.startswith('-'):
                target_lines.append(line[1:])
            elif line.startswith('+'):
                replace_lines.append(line[1:])
            elif line.startswith(' '):
                target_lines.append(line[1:])
                replace_lines.append(line[1:])
            else:
                target_lines.append(line)
                replace_lines.append(line)
                
        target_str = '\n'.join(target_lines)
        replace_str = '\n'.join(replace_lines)
        
        # Try to find and replace
        # We might need to handle slight whitespace mismatches at the end of lines
        if target_str in new_content:
            new_content = new_content.replace(target_str, replace_str, 1)
        else:
            print("Failed to match block:\n", target_str[:100], "...")
            # Try matching without trailing whitespace
            import string
            def normalize(s):
                return '\n'.join([l.rstrip() for l in s.split('\n')])
            
            norm_target = normalize(target_str)
            if norm_target in normalize(new_content):
                print("Matched normalized!")
                # To actually replace, we need a regex
            else:
                print("Failed completely.")
    return new_content

# Start from base
import shutil
shutil.copy(r'C:\Users\com\AppData\Roaming\Cursor\User\History\3ccaf77f\kLg8.js', 'js/retrofx_base.js')

with open('js/retrofx_base.js', 'r', encoding='utf-8') as f:
    content = f.read()

for step in target_steps:
    print(f"Applying step {step}")
    content = apply_diff_to_content(content, diffs[step])

with open('js/retrofx_restored.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("Done!")
