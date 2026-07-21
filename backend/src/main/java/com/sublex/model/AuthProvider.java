package com.sublex.model;

/**
 * How a user authenticates. LOCAL = email + password. The others are social
 * sign-in providers whose tokens are verified server-side before we mint our
 * own JWT. All social providers flow through the same POST /api/auth/social.
 */
public enum AuthProvider {
    LOCAL,
    GOOGLE,
    APPLE,
    FACEBOOK
}
