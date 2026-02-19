package com.sublex.model;

import lombok.Data;
import java.util.List;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class WordDefinition {
    private String word;
    private String difficulty;
    private List<Meaning> meanings;

    @JsonProperty("phrasal_verbs")
    private List<PhrasalVerb> phrasalVerbs;

    @JsonProperty("verb_forms")
    private VerbForms verbForms;

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Meaning {
        @com.fasterxml.jackson.annotation.JsonAlias({ "partOfSpeech", "type" })
        private String pos;
        private String definition;
        private String example;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class PhrasalVerb {
        private String phrase;
        private String definition;
        private String example;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class VerbForms {
        private String v1;
        private String v2;
        private String v3;
        private String ing;
    }
}
