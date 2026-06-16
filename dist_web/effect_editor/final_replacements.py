import json
res = json.load(open('recovered_edits.json', encoding='utf-8'))
for i, name in [(4, 'HolePerspective'), (7, 'ImageTear'), (8, 'BrushFill'), (10, 'PuzzleShuffle')]:
    edit = res[i]
    if 'ReplacementContent' in edit:
        content = edit['ReplacementContent']
    else:
        chunks = edit.get('ReplacementChunks')
        if isinstance(chunks, str):
            chunks = json.loads(chunks)
        content = chunks[0]['ReplacementContent'] if chunks else ''
    open(f'final_{name}.js', 'w', encoding='utf-8').write(content)
