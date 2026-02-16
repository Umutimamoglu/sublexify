import re
from collections import Counter
import sys

# IMPROVED regex for letters, apostrophes (standard & smart), and hyphens
# [char]+(['’\-][char]+)*
WORD_PATTERN = re.compile(r"[\u0041-\u005A\u0061-\u007A\u00C0-\u00FF\u0100-\u017F\u0180-\u024F]+(?:['’\-][\u0041-\u005A\u0061-\u007A\u00C0-\u00FF\u0100-\u017F\u0180-\u024F]+)*")
HTML_TAG_PATTERN = re.compile(r"<[^>]+>")
BRACKET_CONTENT_PATTERN = re.compile(r"\{[^}]+\}")
URL_PATTERN = re.compile(r"(?i).*(www\.|http|\.com|\.net|\.org|\.co\b|\.uk\b).*")

def parse_subtitles(content):
    word_count = Counter()
    
    lines = content.splitlines()
    for line in lines:
        line = line.strip()
        if not line:
            continue
        
        # Skip SRT sequence numbers and timestamps
        if re.match(r'^\d+$', line):
            continue
        if '-->' in line:
            continue
            
        # Aggressive URL/Ad filter
        if URL_PATTERN.match(line) or "::::::" in line:
            continue
            
        # Skip ASS/SSA metadata
        if line.startswith('[') or line.startswith(';'):
            continue
        if re.match(r'^(Format|Style|ScriptType|PlayRes|Timer|Title|Original Script):', line, re.IGNORECASE):
            continue
            
        if line.startswith('Dialogue:'):
            parts = line.split(',', 9)
            if len(parts) >= 10:
                line = parts[9]
        
        # Cleanup
        line = HTML_TAG_PATTERN.sub(" ", line)
        line = BRACKET_CONTENT_PATTERN.sub("", line)
        
        # Standardize apostrophes like in Java
        line = line.replace('’', '\'')
        
        # Locale.ENGLISH simulation
        line = line.lower()
        
        words = WORD_PATTERN.findall(line)
        for word in words:
            # Single char that is not a letter protection
            if len(word) <= 1 and not word.isalpha():
                continue
            word_count[word] += 1
            
    return word_count

def filter_words(word_counts):
    # Short word whitelist
    whitelist = {
        "a", "i", "am", "an", "as", "at", "be", "by", "do", "go", "he", "hi", "if", "in", "is", "it",
        "me", "my", "no", "of", "oh", "on", "or", "ox", "so", "to", "up", "us", "we",
        "ah", "eh", "ha", "ho", "ow", "ya", "yo"
    }
    
    filtered = {}
    for word, count in word_counts.items():
        if len(word) > 2 or word in whitelist:
            filtered[word] = count
    return filtered

def load_db_words(filename):
    db_words = {}
    with open(filename, 'r') as f:
        lines = f.readlines()
        for line in lines:
            line = line.strip()
            if '|' in line:
                parts = line.split('|')
                if len(parts) >= 2:
                    word = parts[0].strip()
                    try:
                        count = int(parts[1].strip())
                        if word and word != 'word':
                            db_words[word] = count
                    except ValueError:
                        continue
    return db_words

if __name__ == "__main__":
    # Test for S01E01 (Fresh)
    srt_path = "/Users/umutimamoglu/sublex/subtitles/The.Boys.S01E01.srt"
    db_path = "/Users/umutimamoglu/sublex/backend/the_boys_s1e1_db_words_fresh.txt"
    
    with open(srt_path, 'r', encoding='utf-8', errors='ignore') as f:
        srt_content = f.read()
        
    srt_words = filter_words(parse_subtitles(srt_content))
    db_words = load_db_words(db_path)
    
    print(f"SRT unique words (SMART Parser): {len(srt_words)}")
    print(f"DB unique words (OLD Parser): {len(db_words)}")
    
    # Check for 'hiqve' (should be gone)
    if 'hiqve' in srt_words:
        print(f"\nBUG: 'hiqve' FOUND in SRT!")
    else:
        print("\n'hiqve' correctly filtered out.")

    # Check for 'don't' and 'i' (standardized)
    contractions = ["don't", "i", "i'm", "a-train"]
    print("\nSmart Word Check:")
    for c in contractions:
        if c in srt_words:
            print(f"  '{c}' count in SRT: {srt_words[c]}")
        else:
            print(f"  '{c}' NOT FOUND")

    # Mismatch summary
    only_srt = set(srt_words.keys()) - set(db_words.keys())
    only_db = set(db_words.keys()) - set(srt_words.keys())
    
    print(f"\nUnique to SRT (SMART Parser): {len(only_srt)}")
    print(f"Unique to DB (OLD Parser): {len(only_db)}")
    
    if only_srt:
        print("\nTop 10 MISSING in DB (New Logic):")
        sorted_missing = sorted(list(only_srt), key=lambda x: srt_words[x], reverse=True)
        for word in sorted_missing[:10]:
            print(f"  - '{word}' ({srt_words[word]})")
