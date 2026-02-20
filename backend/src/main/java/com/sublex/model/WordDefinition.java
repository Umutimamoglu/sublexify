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
    private List<Meaning> meanings = new java.util.ArrayList<>();

    @JsonProperty("phrasal_verbs")
    private List<PhrasalVerb> phrasalVerbs = new java.util.ArrayList<>();

    @JsonProperty("verb_forms")
    private VerbForms verbForms;

    public void setMeanings(List<Meaning> meanings) {
        this.meanings = meanings != null ? meanings : new java.util.ArrayList<>();
    }

    public void setPhrasalVerbs(List<PhrasalVerb> phrasalVerbs) {
        this.phrasalVerbs = phrasalVerbs != null ? phrasalVerbs : new java.util.ArrayList<>();
    }

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
