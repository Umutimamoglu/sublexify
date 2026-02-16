import re
import sys

# NEW regex logic
WORD_PATTERN = re.compile(r"[\u0041-\u005A\u0061-\u007A\u00C0-\u00FF\u0100-\u017F\u0180-\u024F]+(?:['\-][\u0041-\u005A\u0061-\u007A\u00C0-\u00FF\u0100-\u017F\u0180-\u024F]+)*")

def analyze_parser_accuracy(srt_path):
    with open(srt_path, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()

    # Basic cleanup like in Java
    content = re.sub(r'<[^>]+>', ' ', content)
    content = re.sub(r'\{[^}]+\}', '', content)
    # Remove timestamps/indices to focus on text
    lines = content.splitlines()
    text_content = ""
    for line in lines:
        if re.match(r'^\d+$', line) or '-->' in line:
            continue
        text_content += line + " "

    text_content = text_content.lower()

    # Find what our regex catches
    matches = WORD_PATTERN.findall(text_content)
    parsed_set = set(matches)
    total_tokens = len(matches)

    # Check specific examples the user mentioned
    examples = ["a-train", "jean-paul", "smart-ass", "well-known", "state-of-the-art", "mother-in-law"]
    print(f"Total words caught: {total_tokens}")
    print(f"Unique words caught: {len(parsed_set)}")
    
    print("\nSpecific Examples Check:")
    for ex in examples:
        found = [m for m in matches if m == ex]
        if found:
            print(f"  '{ex}' -> FOUND ({len(found)} times)")
        else:
            # Check if it was split
            parts = re.findall(r'[a-z]+', ex)
            all_parts_found = all(p in parsed_set for p in parts)
            if all_parts_found:
                print(f"  '{ex}' -> NOT FOUND (likely split into {parts})")
            else:
                print(f"  '{ex}' -> NOT FOUND")

if __name__ == "__main__":
    analyze_parser_accuracy("/Users/umutimamoglu/sublex/subtitles/The.Boys.S01E04.srt")
