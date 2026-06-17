import os

filepath = r"d:\myData\home_page\keyword_tables\motion_editor_wasm\js\image-alpha-editor.js"
with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace("effectAlpha", "imageAlpha")
content = content.replace("openEffectAlphaEditor", "openImageAlphaEditor")
content = content.replace("obj?.type === 'image'", "(obj?.type === 'image' || obj?.isVideo)")
content = content.replace("obj.type !== 'image'", "(obj.type !== 'image' && !obj.isVideo)")

with open(filepath, "w", encoding="utf-8") as f:
    f.write(content)
print("js/image-alpha-editor.js fixed")
