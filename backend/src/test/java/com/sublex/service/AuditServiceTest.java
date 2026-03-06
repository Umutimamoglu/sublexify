package com.sublex.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.assertEquals;

@ExtendWith(MockitoExtension.class)
public class AuditServiceTest {

    @InjectMocks
    private AuditService auditService;

    @BeforeEach
    void setUp() {
        // No mock setup needed for the pure string manipulation method
    }

    @Test
    void testCleanJsonFromMarkdown_StandardJsonBlock() {
        String input = "```json\n[{\"id\": 1, \"verdict\": \"APPROVE\"}]\n```";
        String expected = "[{\"id\": 1, \"verdict\": \"APPROVE\"}]";
        
        String result = invokeCleanJson(input);
        
        assertEquals(expected, result);
    }

    @Test
    void testCleanJsonFromMarkdown_GenericCodeBlock() {
        String input = "```\n[{\"id\": 2, \"verdict\": \"REJECT\"}]\n```";
        String expected = "[{\"id\": 2, \"verdict\": \"REJECT\"}]";
        
        String result = invokeCleanJson(input);
        
        assertEquals(expected, result);
    }

    @Test
    void testCleanJsonFromMarkdown_NoCodeBlocksWithLeadingText() {
        String input = "Here is the result you requested:\n[{\"id\": 3}]";
        String expected = "[{\"id\": 3}]";
        
        String result = invokeCleanJson(input);
        
        assertEquals(expected, result);
    }
    
    @Test
    void testCleanJsonFromMarkdown_TrailingText() {
        String input = "[{\"id\": 4}]\nHope this helps!";
        String expected = "[{\"id\": 4}]";
        
        String result = invokeCleanJson(input);
        
        assertEquals(expected, result);
    }

    @Test
    void testCleanJsonFromMarkdown_EmptyOrNull() {
        assertEquals("[]", invokeCleanJson(null));
        assertEquals("", invokeCleanJson(""));
    }

    // Helper to invoke the private method
    private String invokeCleanJson(String input) {
        return ReflectionTestUtils.invokeMethod(auditService, "cleanJsonFromMarkdown", input);
    }
}
