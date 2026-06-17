import os

filepath = r"d:\myData\home_page\keyword_tables\motion_editor_wasm\js\editor-ui.js"
with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

target = "if (obj.isVideo) {\n            document.querySelectorAll('.prop-media').forEach(el => el.style.display = el.classList.contains('flex-row-center') ? 'flex' : 'block');\n            if (obj.getElement()) propVolume.value = Math.round((obj.baseVolume !== undefined ? obj.baseVolume : obj.getElement().volume) * 100);"
replacement = "if (obj.isVideo) {\n            document.querySelectorAll('.prop-media').forEach(el => el.style.display = el.classList.contains('flex-row-center') ? 'flex' : 'block');\n            document.querySelectorAll('.prop-image-mask').forEach(el => el.style.display = 'block');\n            if (obj.getElement()) propVolume.value = Math.round((obj.baseVolume !== undefined ? obj.baseVolume : obj.getElement().volume) * 100);"

if target in content:
    content = content.replace(target, replacement)
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)
    print("js/editor-ui.js updated successfully")
else:
    print("Target string not found in js/editor-ui.js")
