package com.glide.app.domain.model

import org.junit.Assert.assertTrue
import org.junit.Test

class OpeningHoursValidationTest {

    private fun allDaysWith(hours: DayHours): Map<DayKey, DayHours> =
        DayKey.entries.associateWith { hours }

    @Test
    fun `a sane fixed schedule has no errors`() {
        val hours = allDaysWith(DayHours(closed = false, open = "09:00", close = "20:00"))
        assertTrue(validateOpeningHours(hours).isEmpty())
    }

    @Test
    fun `a closed day is never flagged regardless of its open-close values`() {
        val hours = allDaysWith(DayHours(closed = true, open = "not-a-time", close = "also-not"))
        assertTrue(validateOpeningHours(hours).isEmpty())
    }

    @Test
    fun `rejects a malformed HH-MM value`() {
        val hours = allDaysWith(DayHours(closed = false, open = "9am", close = "20:00"))
        val errors = validateOpeningHours(hours)
        assertTrue(errors.values.all { it == "Use 24-hour HH:MM, e.g. 09:00." })
        assertTrue(errors.isNotEmpty())
    }

    @Test
    fun `rejects an open time that is not before the close time`() {
        val hours = allDaysWith(DayHours(closed = false, open = "20:00", close = "09:00"))
        val errors = validateOpeningHours(hours)
        assertTrue(errors.values.all { it == "Opening time must be before closing time." })
    }
}
