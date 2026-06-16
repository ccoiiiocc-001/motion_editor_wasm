import json, re

with open('recovered_edits.json', 'r', encoding='utf-8') as f:
    edits = json.load(f)

with open('js/retrofx.js', 'r', encoding='utf-8') as f:
    content = f.read().replace('\r\n', '\n')

def robust_parse(s):
    if isinstance(s, str) and s.startswith('\"') and s.endswith('\"'):
        try:
            # Handle double-escaped newlines and quotes
            return json.loads(s)
        except:
            # Maybe the string contains invalid control chars
            pass
    if isinstance(s, str) and s.startswith('[') and s.endswith(']'):
        try:
            return json.loads(s)
        except:
            pass
    return s

for i in range(10):
    edit = edits[i]
    chunks = [edit] if 'ReplacementContent' in edit else robust_parse(edit.get('ReplacementChunks', '[]'))
    if not isinstance(chunks, list):
        chunks = []
    
    for c, chunk in enumerate(chunks):
        target = robust_parse(chunk.get('TargetContent', '')).replace('\r\n', '\n')
        repl = robust_parse(chunk.get('ReplacementContent', '')).replace('\r\n', '\n')
        
        if target in content:
            content = content.replace(target, repl, 1)
            print(f'Applied edit {i} chunk {c}')
        else:
            print(f'FAIL edit {i} chunk {c}')

repl10 = robust_parse(edits[10]['ReplacementContent']).replace('\r\n', '\n')
pattern = r'fabric\.Image\.filters\.PuzzleShuffle = .*?(?:\n\}\);\n)'
content = re.sub(pattern, repl10 + '\n', content, flags=re.DOTALL)

with open('js/retrofx.js', 'w', encoding='utf-8') as f:
    f.write(content)
print('Restore complete!')
