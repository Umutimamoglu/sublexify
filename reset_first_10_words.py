import subprocess

def reset_first_10_words():
    # Hardcoded list of the first 10 enriched words based on previous query
    words_to_reset = [
        "exception", "sweetheart", "hands", "half", "year", 
        "saved", "staying", "costing", "awful", "hall"
    ]

    print(f"Resetting {len(words_to_reset)} words: {words_to_reset}")
    
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
    reset_first_10_words()
