import json
edits = json.load(open('recovered_edits.json', encoding='utf-8'))
content = open('js/retrofx.js', 'r', encoding='utf-8').read()
for i in range(10):
    args = edits[i]
    chunks = args.get('ReplacementChunks', [args])
    for chunk in chunks:
        target = chunk['TargetContent']
        repl = chunk['ReplacementContent']
        if target in content:
            content = content.replace(target, repl)
            print(f'Applied edit {i}')
        else:
            print(f'Failed edit {i}')
open('js/retrofx.js', 'w', encoding='utf-8').write(content)
