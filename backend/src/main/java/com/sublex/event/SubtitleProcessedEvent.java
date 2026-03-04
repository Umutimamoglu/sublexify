package com.sublex.event;

import org.springframework.context.ApplicationEvent;

/**
 * Published after SubtitleProcessingService finishes processing subtitles.
 * WordAnalysisService listens for this event with a debounce mechanism.
 */
public class SubtitleProcessedEvent extends ApplicationEvent {

    private final Long mediaId;

    public SubtitleProcessedEvent(Object source, Long mediaId) {
        super(source);
        this.mediaId = mediaId;
    }

    public Long getMediaId() {
        return mediaId;
    }
}
