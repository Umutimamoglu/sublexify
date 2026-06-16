package com.sublex.service;

import com.sublex.event.MediaRequestApprovedEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * Turns domain events into push notifications.
 * Decoupled from the services that publish the events.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class NotificationEventListener {

    private final PushNotificationService pushNotificationService;

    @EventListener
    public void onMediaRequestApproved(MediaRequestApprovedEvent event) {
        String title = "İsteğin onaylandı 🎉";
        String body = event.getMediaTitle() + " artık Sublexify'da! Hemen çalışmaya başla.";
        Map<String, String> data = Map.of(
                "type", "media_request_approved",
                "url", "library"
        );
        pushNotificationService.sendToUser(event.getUserId(), title, body, data, null);
        log.info("Queued media-request-approved push for user {}.", event.getUserId());
    }
}
