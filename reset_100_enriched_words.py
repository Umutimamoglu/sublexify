import subprocess

def reset_100_words():
    words_to_reset = []
    
    # Read the file
    try:
        with open('words_to_reset.txt', 'r') as f:
            lines = f.readlines()
            
            # Skip header lines (first 2 lines usually)
            start_parsing = False
            for line in lines:
                if '---' in line:
                    start_parsing = True
                    continue
                
                if not start_parsing:
                    continue
                    
                if not line.strip():
                    continue
                    
                if '(100 rows)' in line:
                    break
                    
                word = line.strip()
                if word and word != 'word':
                    words_to_reset.append(word)
                        
    except FileNotFoundError:
        print("File not found. Please run the fetch step first.")
        return

    if not words_to_reset:
        print("No words found to reset.")
        return

    print(f"Found {len(words_to_reset)} words to reset.")
    
    # SQL List formatting
    escaped_words = [w.replace("'", "''") for w in words_to_reset]
    sql_list = ", ".join([f"'{w}'" for w in escaped_words])
    
    query = f"UPDATE word SET definition = NULL, difficulty = NULL, is_enriched = false, is_verified = false, enriched_at = NULL, audit_notes = NULL, judge_verdict = NULL, judge_status = NULL, judge_approved_at = NULL WHERE word IN ({sql_list});"
    
    # Execute psql
    cmd = [
        '/opt/homebrew/bin/psql', '-h', '10.42.0.231', '-U', 'umut', '-d', 'sublex', '-c', query
    ]
    
    env = {'PGPASSWORD': 'umutumut'}
    
    result = subprocess.run(cmd, env=env, capture_output=True, text=True)
    
    if result.returncode != 0:
        print(f"Error resetting words: {result.stderr}")
    else:
        print(f"Success: {result.stdout.strip()}")

if __name__ == "__main__":
    reset_100_words()
