package com.sublex.dto;

/** A selectable push recipient for the admin dashboard. */
public record AdminUserDTO(Long id, String name, String email, long deviceCount) {
}
