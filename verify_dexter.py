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

            # Stemming for apostrophes (we'd -> we)
            if "'" in word:
                word = word.split("'")[0]

            if not word:
                continue

            # Single char filtering ("a" and "i" only)
            if len(word) == 1 and word not in ["a", "i"]:
                continue

            word_count[word] += 1
            
    return word_count

def load_db_words(filename):
    db_words = {}
    with open(filename, 'r') as f:
        # Check if file has header or just data? usually psql csv has no header with just data if copy query
        # But wait, did I use CSV header? No, just copy query.
        lines = f.readlines()
        for line in lines:
            line = line.strip()
            if '|' in line: # using pipe limiter in psql command
                parts = line.split('|')
                if len(parts) >= 2:
                    word = parts[0].strip()
                    try:
                        count = int(parts[1].strip())
                        if word and word != 'word':
                            db_words[word] = count
                    except ValueError:
                        continue
            elif ',' in line: # if comma separated
                 parts = line.split(',')
                 if len(parts) >= 2:
                    word = parts[0].strip()
                    try:
                        count = int(parts[1].strip())
                        if word:
                            db_words[word] = count
                    except ValueError:
                        continue
    return db_words

if __name__ == "__main__":
    srt_path = "/Users/umutimamoglu/sublex/subtitles/dexter.s07e12.bdrip.xvid-demand.srt"
    db_path = "dexter_s7e12_db_words.csv"
    
    print(f"Analyzing SRT: {srt_path}")
    print(f"Comparing with DB Dump: {db_path}")

    try:
        with open(srt_path, 'r', encoding='utf-8', errors='ignore') as f:
            srt_content = f.read()
    except FileNotFoundError:
        print(f"Error: SRT file not found at {srt_path}")
        sys.exit(1)
        
    srt_words = parse_subtitles(srt_content)
    db_words = load_db_words(db_path)
    
    print(f"SRT unique words found: {len(srt_words)}")
    print(f"DB unique words found: {len(db_words)}")
    
    # Check for mismatches
    only_srt = set(srt_words.keys()) - set(db_words.keys())
    only_db = set(db_words.keys()) - set(srt_words.keys())
    
    print(f"\nUnique to SRT (Missing in DB): {len(only_srt)}")
    if only_srt:
        print("Top 10 missing in DB:")
        sorted_missing = sorted(list(only_srt), key=lambda x: srt_words[x], reverse=True)
        for w in sorted_missing[:10]:
            print(f"  - '{w}' (count: {srt_words[w]})")
            
    print(f"\nUnique to DB (Extra in DB): {len(only_db)}")
    if only_db:
         print("Top 10 extra in DB:")
         sorted_extra = sorted(list(only_db), key=lambda x: db_words[x], reverse=True)
         for w in sorted_extra[:10]:
             print(f"  - '{w}' (count: {db_words[w]})")

    # Check counts
    common = set(srt_words.keys()) & set(db_words.keys())
    count_mismatch = 0
    print("\nCount Mismatches (Top 10):")
    mismatches = []
    for w in common:
        if srt_words[w] != db_words[w]:
            mismatches.append((w, srt_words[w], db_words[w]))
    
    mismatches.sort(key=lambda x: abs(x[1] - x[2]), reverse=True)
    for w, s, d in mismatches[:10]:
        print(f"  - '{w}': SRT={s}, DB={d}")
        
    if not only_srt and not only_db and not mismatches:
        print("\nSUCCESS: Perfect Match!")
    else:
        print("\nDone. Check results above.")
