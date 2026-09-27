package com.strangerchat.core;

import java.util.EnumSet;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/**
 * How a user feels right now. Used to pair people whose moods fit together
 * (e.g. someone who needs to vent with someone happy to listen).
 */
public enum Mood {
    /** No preference: fits with everyone. */
    ANY,
    /** 🥳 Hyped — wants fun, energy, laughs. */
    HYPED,
    /** 😴 Bored — anything to pass the time. */
    BORED,
    /** 😮‍💨 Needs to vent. */
    VENT,
    /** 👂 Happy to listen. */
    LISTEN,
    /** 🤔 Up for deep talk. */
    DEEP;

    /**
     * Symmetric "good fit" table. ANY is handled separately (fits everyone).
     * Deliberately NOT: VENT–VENT (two people unloading, nobody listening),
     * HYPED–VENT (energy clash), LISTEN–LISTEN (two quiet listeners).
     */
    private static final Map<Mood, Set<Mood>> FITS = Map.of(
            HYPED, EnumSet.of(HYPED, BORED),
            BORED, EnumSet.of(HYPED, BORED, DEEP, LISTEN),
            VENT, EnumSet.of(LISTEN),
            LISTEN, EnumSet.of(VENT, DEEP, BORED),
            DEEP, EnumSet.of(DEEP, LISTEN, BORED));

    public boolean fits(Mood other) {
        if (this == ANY || other == ANY) return true;
        return FITS.get(this).contains(other);
    }

    /** The ideal pairing (shown as a special "perfect match" message). */
    public boolean isPerfectWith(Mood other) {
        return (this == VENT && other == LISTEN) || (this == LISTEN && other == VENT)
                || (this != ANY && this != VENT && this != LISTEN && this == other);
    }

    public String key() {
        return name().toLowerCase(Locale.ROOT);
    }

    /** Lenient parse: unknown / missing values become {@link #ANY}. */
    public static Mood parse(String raw) {
        if (raw == null || raw.isBlank()) return ANY;
        try {
            return Mood.valueOf(raw.strip().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            return ANY;
        }
    }
}
