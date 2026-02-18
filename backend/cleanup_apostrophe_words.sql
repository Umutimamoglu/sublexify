DO $$
DECLARE
    r RECORD;
    root_word TEXT;
    target_word_id BIGINT;
BEGIN
    RAISE NOTICE 'Starting cleanup of apostrophe words...';

    -- Loop through all words with apostrophes
    FOR r IN SELECT id, word, language FROM word WHERE word LIKE '%''%' OR word LIKE '%’%' LOOP
        
        -- Calculate root (e.g., "we'd" -> "we")
        -- Handle both standard and curly apostrophes
        root_word := split_part(replace(r.word, '’', ''''), '''', 1);
        
        -- Check if root word exists
        SELECT id INTO target_word_id FROM word WHERE word = root_word AND language = r.language;
        
        IF target_word_id IS NOT NULL THEN
            -- Root exists. Merge logic.
            
            -- 1. MERGE user_known_word
            DELETE FROM user_known_word ukw_old
            WHERE ukw_old.word_id = r.id
              AND EXISTS (
                  SELECT 1 FROM user_known_word ukw_target 
                  WHERE ukw_target.user_id = ukw_old.user_id 
                    AND ukw_target.word_id = target_word_id
              );
            UPDATE user_known_word SET word_id = target_word_id WHERE word_id = r.id;

            -- 2. MERGE media_word
            DELETE FROM media_word mw_old
            WHERE mw_old.word_id = r.id
              AND EXISTS (
                  SELECT 1 FROM media_word mw_target 
                  WHERE mw_target.media_id = mw_old.media_id 
                    AND mw_target.word_id = target_word_id
              );
            UPDATE media_word SET word_id = target_word_id WHERE word_id = r.id;

            -- 3. MERGE word_list_words
            DELETE FROM word_list_words wlw_old
            WHERE wlw_old.word_id = r.id
              AND EXISTS (
                  SELECT 1 FROM word_list_words wlw_target 
                  WHERE wlw_target.word_list_id = wlw_old.word_list_id 
                    AND wlw_target.word_id = target_word_id
              );
            UPDATE word_list_words SET word_id = target_word_id WHERE word_id = r.id;
            
            -- 4. Now safe to delete the old word
            DELETE FROM word WHERE id = r.id;
            
        ELSE
            -- Root does not exist. Simple Update.
            -- Check for uniqueness again (just in case loop processed a similar root)
            BEGIN
                UPDATE word SET word = root_word WHERE id = r.id;
            EXCEPTION WHEN unique_violation THEN
                -- If we hit a race or logic gap, just delete the duplicate references then the word
                DELETE FROM user_known_word WHERE word_id = r.id;
                DELETE FROM media_word WHERE word_id = r.id;
                DELETE FROM word_list_words WHERE word_id = r.id;
                DELETE FROM word WHERE id = r.id;
            END;
        END IF;
        
    END LOOP;
    
    -- Final cleanup for short/empty results
    DELETE FROM media_word WHERE word_id IN (SELECT id FROM word WHERE length(word) < 2);
    DELETE FROM user_known_word WHERE word_id IN (SELECT id FROM word WHERE length(word) < 2);
    DELETE FROM word_list_words WHERE word_id IN (SELECT id FROM word WHERE length(word) < 2);
    DELETE FROM word WHERE length(word) < 2;
    
    RAISE NOTICE 'Cleanup completed.';
END $$;
