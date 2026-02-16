import re
from collections import Counter
import sys

WORD_PATTERN = re.compile(r"[\u0041-\u005A\u0061-\u007A\u00C0-\u00FF\u0100-\u017F\u0180-\u024F]+(?:['’\-][\u0041-\u005A\u0061-\u007A\u00C0-\u00FF\u0100-\u017F\u0180-\u024F]+)*")
HTML_TAG_PATTERN = re.compile(r"<[^>]+>")
BRACKET_CONTENT_PATTERN = re.compile(r"\{[^}]+\}")
URL_PATTERN = re.compile(r"(?i).*(www\.|http|\.com|\.net|\.org|\.co\b|\.uk\b).*")

def parse_subtitles(content):
    word_count = Counter()
    lines = content.splitlines()
    for line in lines:
        line = line.strip()
        if not line or re.match(r'^\d+$', line) or '-->' in line: continue
        if URL_PATTERN.match(line) or "::::::" in line: continue
        if line.startswith('[') or line.startswith(';') or re.match(r'^(Format|Style|ScriptType|PlayRes|Timer|Title|Original Script):', line, re.IGNORECASE): continue
        if line.startswith('Dialogue:'):
            parts = line.split(',', 9)
            if len(parts) >= 10: line = parts[9]
        line = HTML_TAG_PATTERN.sub(" ", line)
        line = BRACKET_CONTENT_PATTERN.sub("", line)
        line = line.replace('’', '\'')
        line = line.lower()
        words = WORD_PATTERN.findall(line)
        for word in words:
            if len(word) <= 1 and not word.isalpha(): continue
            word_count[word] += 1
    return word_count

def filter_words(word_counts):
    whitelist = {"a", "i", "am", "an", "as", "at", "be", "by", "do", "go", "he", "hi", "if", "in", "is", "it", "me", "my", "no", "of", "oh", "on", "or", "ox", "so", "to", "up", "us", "we", "ah", "eh", "ha", "ho", "ow", "ya", "yo"}
    return {word: count for word, count in word_counts.items() if len(word) > 2 or word in whitelist}

def load_db_words(filename):
    db_words = {}
    with open(filename, 'r') as f:
        for line in f:
            line = line.strip()
            if '|' in line:
                parts = line.split('|')
                if len(parts) >= 2:
                    word = parts[0].strip()
                    try:
                        count = int(parts[1].strip())
                        if word and word != 'word': db_words[word] = count
                    except ValueError: continue
    return db_words

def verify_episode(name, srt_path, db_path):
    print(f"\n--- VERIFYING {name} ---")
    with open(srt_path, 'r', encoding='utf-8', errors='ignore') as f:
        srt_content = f.read()
    srt_words = filter_words(parse_subtitles(srt_content))
    db_words = load_db_words(db_path)
    
    print(f"SRT unique words: {len(srt_words)}")
    print(f"DB unique words: {len(db_words)}")
    
    only_srt = set(srt_words.keys()) - set(db_words.keys())
    only_db = set(db_words.keys()) - set(srt_words.keys())
    
    print(f"Missing in DB: {len(only_srt)}")
    print(f"Extra in DB: {len(only_db)}")
    
    check_list = ["i", "don't", "i'm", "a-train"]
    for w in check_list:
        srt_c = srt_words.get(w, 0)
        db_c = db_words.get(w, 0)
        status = "✅" if srt_c == db_c else "❌"
        print(f"  '{w}': SRT={srt_c}, DB={db_c} {status}")

if __name__ == "__main__":
    verify_episode("S01E03", "/Users/umutimamoglu/sublex/subtitles/The.Boys.S01E03_api.srt", "/Users/umutimamoglu/sublex/backend/the_boys_s1e3_db_words_api.txt")
    verify_episode("S01E04", "/Users/umutimamoglu/sublex/subtitles/The.Boys.S01E04_api.srt", "/Users/umutimamoglu/sublex/backend/the_boys_s1e4_db_words_api.txt")
