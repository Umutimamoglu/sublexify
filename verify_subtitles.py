import re
from collections import Counter
import sys

def parse_subtitles(content):
    word_pattern = re.compile(r'\b[a-zA-Z]+\b')
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
            
        # Skip ASS/SSA metadata
        if line.startswith('[') or line.startswith(';'):
            continue
        if re.match(r'^(Format|Style|ScriptType|PlayRes|Timer):', line, re.IGNORECASE):
            continue
            
        if line.startswith('Dialogue:'):
            parts = line.split(',', 9)
            if len(parts) >= 10:
                line = parts[9]
        
        # Extract words
        line = re.sub(r'<[^>]+>', '', line).lower()
        words = word_pattern.findall(line)
        for word in words:
            word_count[word] += 1
            
    return word_count

def filter_words(word_counts):
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
        # Skip header and potential separator line
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
    srt_path = "/Users/umutimamoglu/sublex/subtitles/The.Boys.S01E03.srt"
    db_path = "/Users/umutimamoglu/sublex/backend/the_boys_s1e3_db_words.txt"
    
    with open(srt_path, 'r', encoding='utf-8', errors='ignore') as f:
        srt_content = f.read()
        
    srt_words = filter_words(parse_subtitles(srt_content))
    db_words = load_db_words(db_path)
    
    print(f"SRT unique words: {len(srt_words)}")
    print(f"DB unique words: {len(db_words)}")
    
    # Check for mismatches
    only_srt = set(srt_words.keys()) - set(db_words.keys())
    only_db = set(db_words.keys()) - set(srt_words.keys())
    
    if only_srt:
        print(f"\nWords only in SRT ({len(only_srt)}):")
        for w in sorted(list(only_srt))[:10]:
            print(f"  {w}: {srt_words[w]}")
            
    if only_db:
        print(f"\nWords only in DB ({len(only_db)}):")
        for w in sorted(list(only_db))[:10]:
            print(f"  {w}: {db_words[w]}")
            
    # Check counts
    common = set(srt_words.keys()) & set(db_words.keys())
    count_mismatch = 0
    for w in common:
        if srt_words[w] != db_words[w]:
            count_mismatch += 1
            if count_mismatch <= 5:
                print(f"Count mismatch for '{w}': SRT={srt_words[w]}, DB={db_words[w]}")

    if not only_srt and not only_db and count_mismatch == 0:
        print("\nSUCCESS: SRT and DB words match perfectly!")
    else:
        print(f"\nMismatches found: {len(only_srt)} only in SRT, {len(only_db)} only in DB, {count_mismatch} count mismatches.")
