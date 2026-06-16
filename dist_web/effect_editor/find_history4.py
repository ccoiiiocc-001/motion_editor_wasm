import os

history_dir = r'C:\Users\com\AppData\Roaming\Cursor\User\History'
target = '\uace1\uc120 \uc0c1\ub2e8\uc120'
for root, dirs, files in os.walk(history_dir):
    for f in files:
        path = os.path.join(root, f)
        try:
            with open(path, 'r', encoding='utf-8') as file:
                content = file.read()
                if target in content:
                    print("Found in: " + path)
        except:
            pass
