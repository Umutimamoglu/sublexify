package com.sublex.model;

import lombok.Data;
import java.util.List;
import com.fasterxml.jackson.annotation.JsonProperty;

@Data
public class WordDefinition {
    private String word;
    private String difficulty;
    private List<Meaning> meanings;

    @JsonProperty("phrasal_verbs")
    private List<PhrasalVerb> phrasalVerbs;

    @Data
    public static class Meaning {
        private String pos;
        private String definition;
        private String example;
    }

    @Data
    public static class PhrasalVerb {
        private String phrase;
        private String definition;
        private String example;
    }
}
