package com.sublex.event;

import org.springframework.context.ApplicationEvent;

/**
 * Published when an admin approves a user's media request.
 * NotificationEventListener reacts by pushing a notification to the requesting user.
 */
public class MediaRequestApprovedEvent extends ApplicationEvent {

    private final Long userId;
    private final String mediaTitle;

    public MediaRequestApprovedEvent(Object source, Long userId, String mediaTitle) {
        super(source);
        this.userId = userId;
        this.mediaTitle = mediaTitle;
    }

    public Long getUserId() {
        return userId;
    }

    public String getMediaTitle() {
        return mediaTitle;
    }
}
