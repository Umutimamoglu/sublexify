#!/usr/bin/env python3
"""Chief Editor Audit for S04E11 Batch"""
import re
import json
import sys

JUNK_PATTERNS = [
    r'\{\\an\d\}', r'\[Events\]', r'\\N', r'style=', r'MarginL:',
    r'Format:', r'Dialogue:', r'\\pos\(', r'\\fad\(', r'\\1c',
    r'<font', r'</font', r'<i>', r'</i>', r'\\fs\d', r'\\b\d',
]

ROBOTIC_PATTERNS = [r'-[dD]ır\.', r'-[dD]ir\.', r'-[dD]ur\.', r'-[dD]ür\.']

PROPER_NOUNS = [
    'elliot', 'mr.', 'robot', 'darlene', 'angela', 'tyrell', 'whiterose',
    'fsociety', 'ecorp', 'allsafe', 'wellick', 'alderson', 'price', 'irving',
    'hank', 'eiffel', 'amazon', 'google', 'microsoft', 'facebook',
]

def check_word(word_id, word, def_json_str):
    issues = []
    
    # 1. Is it a proper noun?
    if word.lower() in PROPER_NOUNS or (len(word) > 1 and word[0].isupper() and word[1:].islower()):
        issues.append(f"PROPER_NOUN: '{word}'")
    
    # 2. Parse JSON
    try:
        def_json = json.loads(def_json_str)
    except:
        return "REJECT", "INVALID_JSON", None
    
    full_text = json.dumps(def_json, ensure_ascii=False)
    
    # 3. Technical junk check
    for pattern in JUNK_PATTERNS:
        if re.search(pattern, full_text):
            issues.append(f"JUNK: pattern '{pattern}' found")
    
    # 4. Robotic Turkish check
    for pattern in ROBOTIC_PATTERNS:
        if re.search(pattern, full_text):
            issues.append(f"ROBOTIC: pattern '{pattern}' found")
    
    # 5. Basic structure check
    if 'meanings' not in def_json or not def_json.get('meanings'):
        issues.append("MISSING: no meanings")
    
    if issues:
        return "FIX", "; ".join(issues), def_json
    else:
        return "APPROVE", "OK", def_json

# --- Main ---
approve_list = []
fix_list = []
reject_list = []

with open('/tmp/s04e11_batch1_audit.txt', 'r') as f:
    for line in f:
        line = line.strip()
        if not line:
            continue
        parts = line.split('|', 2)
        if len(parts) < 3:
            continue
        word_id, word, def_json_str = parts
        
        status, reason, def_json = check_word(word_id, word, def_json_str)
        
        if status == "APPROVE":
            approve_list.append({'id': word_id, 'word': word})
        elif status == "FIX":
            fix_list.append({'id': word_id, 'word': word, 'reason': reason})
        else:
            reject_list.append({'id': word_id, 'word': word, 'reason': reason})

print(f"\n=== CHIEF EDITOR AUDIT REPORT (S04E11 Batch 1) ===")
print(f"Total: {len(approve_list) + len(fix_list) + len(reject_list)}")
print(f"✅ APPROVED: {len(approve_list)}")
print(f"⚠️  NEEDS FIX: {len(fix_list)}")
print(f"❌ REJECTED: {len(reject_list)}")

if fix_list:
    print("\n--- WORDS NEEDING FIXES ---")
    for item in fix_list:
        print(f"  ID {item['id']} ({item['word']}): {item['reason']}")

if reject_list:
    print("\n--- REJECTED WORDS ---")
    for item in reject_list:
        print(f"  ID {item['id']} ({item['word']}): {item['reason']}")

if approve_list:
    ids = ",".join([item['id'] for item in approve_list])
    print(f"\n--- APPROVED IDs ({len(approve_list)}) ---")
    print(ids)
