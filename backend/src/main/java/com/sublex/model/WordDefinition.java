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

    private Morphology morphology;

    @JsonProperty("verb_forms")
    private VerbForms verbForms;

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

    @Data
    public static class Morphology {
        private String root;
        private List<String> suffixes;
        private String explanation;
    }

    @Data
    public static class VerbForms {
        private String v1;
        private String v2;
        private String v3;
        private String ing;
    }
}
