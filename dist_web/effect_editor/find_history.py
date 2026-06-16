# -*- coding: utf-8 -*-
import os

history_dir = r'C:\Users\com\AppData\Roaming\Cursor\User\History'
for root, dirs, files in os.walk(history_dir):
    for f in files:
        path = os.path.join(root, f)
        try:
            with open(path, 'r', encoding='utf-8') as file:
                content = file.read()
                if "»ó´Ü¼±" in content:
                    print(f"Found in: {path}")
        except:
            pass
