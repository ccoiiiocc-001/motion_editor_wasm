import json

with open('final_PuzzleShuffle.txt', 'r', encoding='utf-16') as f:
    s = f.read().strip()

# If it's a stringified JSON string with literal newlines, we can evaluate it using eval
# But ast.literal_eval handles strings well.
import ast
try:
    s_val = ast.literal_eval(s)
except Exception as e:
    # If ast fails, just strip the outer quotes manually
    if s.startswith('"') and s.endswith('"'):
        s_val = s[1:-1].replace('\\n', '\n').replace('\\"', '"')
    else:
        s_val = s

with open('puzzle.js', 'w', encoding='utf-8') as f:
    f.write(s_val)
