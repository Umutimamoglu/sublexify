import subprocess
import sys

def reset_words():
    words_to_reset = []
    
    # Read the report file
    try:
        with open('enriched_words_report.txt', 'r') as f:
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
                    
                # Extract word from first column
                if '|' in line:
                    parts = line.split('|')
                    word = parts[0].strip()
                    if word and word != 'word':
                        words_to_reset.append(word)
                        
    except FileNotFoundError:
        print("Report file not found. Please run the fetch step first.")
        return

    if not words_to_reset:
        print("No words found to reset.")
        return

    print(f"Found {len(words_to_reset)} words to reset.")
    
    # chunks of 50 to avoid massive query string
    chunk_size = 50
    for i in range(0, len(words_to_reset), chunk_size):
        chunk = words_to_reset[i:i + chunk_size]
        
        # SQL List formatting
        escaped_words = [w.replace("'", "''") for w in chunk]
        sql_list = ", ".join([f"'{w}'" for w in escaped_words])
        
        query = f"UPDATE word SET definition = NULL, difficulty = NULL, is_enriched = false, is_verified = false, enriched_at = NULL, audit_notes = NULL, judge_verdict = NULL, judge_status = NULL, judge_approved_at = NULL WHERE word IN ({sql_list});"
        
        # Execute psql
        cmd = [
            '/opt/homebrew/bin/psql', '-h', '10.42.0.231', '-U', 'umut', '-d', 'sublex', '-c', query
        ]
        
        env = {'PGPASSWORD': 'umutumut'}
        
        print(f"Resetting batch {i//chunk_size + 1}...")
        result = subprocess.run(cmd, env=env, capture_output=True, text=True)
        
        if result.returncode != 0:
            print(f"Error resetting batch: {result.stderr}")
        else:
            print(f"Success: {result.stdout.strip()}")

if __name__ == "__main__":
    reset_words()
