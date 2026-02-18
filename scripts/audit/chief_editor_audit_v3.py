
import json
import re

def is_technical_junk(text):
    # Precise patterns for subtitle junk
    junk_patterns = [
        r"\{\\an\d\}", # ASS alignment tags
        r"\[Script Info\]", r"\[V4\+ Styles\]", r"\[Events\]", # SSA/ASS headers
        r"line-height:", r"font-size:", r"font-family:", 
        r"style=", r"MarginL:", r"MarginR:", r"Vertical:"
    ]
    for pattern in junk_patterns:
        if re.search(pattern, text, re.IGNORECASE):
            return True
    return False

def check_word(word, definition_str):
    try:
        def_json = json.loads(definition_str)
    except:
        return "ERROR", "JSON Parsing Error", None

    issues = []
    
    # 1. Proper Noun check (ignore common words even if capitalized in subtitles)
    # Most words in this batch are lowercase in DB search, but let's be safe.
    if word[0].isupper() and word[1:].islower() and word.lower() != "i":
        if word not in ["Eiffel Tower", "Hank"]:
            issues.append(f"Proper noun candidate: {word}")
            
    # 2. Junk Check (search in meanings, examples, etc.)
    full_text = str(def_json)
    if is_technical_junk(full_text):
        issues.append("Technical junk detected (ASS/SSA tags or CSS)")
        
    # 3. Robotic Turkish Check
    for m in def_json.get("meanings", []):
        d = m.get("definition", "").lower()
        if d in ["-dır", "-dir", "-dur", "-dür"]:
            issues.append(f"Robotic definition: {d}")

    if issues:
        return "FIX", "; ".join(issues), def_json
    else:
        return "APPROVE", "Perfect", def_json

with open("backend/words_batch_100.txt", "r") as f:
    lines = f.readlines()

results = []
for line in lines:
    if "|" not in line or "word | definition" in line or "---" in line:
        continue
    
    parts = line.split("|")
    if len(parts) < 3:
        continue
        
    id_val = parts[0].strip()
    word = parts[1].strip()
    definition_str = "|".join(parts[2:]).strip()
    
    status, reason, def_json = check_word(word, definition_str)
    results.append({
        "id": id_val,
        "word": word,
        "status": status,
        "reason": reason,
        "def_json": def_json
    })

fix_list = [r for r in results if r["status"] == "FIX"]
approve_list = [r for r in results if r["status"] == "APPROVE"]

print(f"TOTAL AUDITED: {len(results)}")
print(f"APPROVED: {len(approve_list)}")
print(f"NEED FIX: {len(fix_list)}")

if fix_list:
    print("\n--- PROPOSED CHANGES ---")
    for item in fix_list:
        print(f"ID {item['id']} ({item['word']}): {item['reason']}")
else:
    print("\nAll words in this batch are perfect!")
