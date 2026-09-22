package com.glide.app.domain.model

import java.time.LocalDate
import java.time.LocalTime
import java.time.ZonedDateTime
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class SlotGenerationTest {

    private val farFutureDate: LocalDate = LocalDate.now(GLIDE_ZONE).plusDays(30)
    private val nineToEight = DayHours(closed = false, open = "09:00", close = "20:00")

    @Test
    fun `a closed day produces no slots`() {
        val slots = generateSlotCandidates(farFutureDate, DayHours(closed = true, open = "09:00", close = "20:00"), totalDurationMin = 30)
        assertTrue(slots.isEmpty())
    }

    @Test
    fun `generates 30-minute slots across the open window, none past closing`() {
        val slots = generateSlotCandidates(farFutureDate, nineToEight, totalDurationMin = 30, bufferMin = 0, intervalMin = 30)
        assertEquals(LocalTime.of(9, 0), slots.first().time)
        assertTrue(slots.all { it.time.plusMinutes(30) <= LocalTime.of(20, 0) })
    }

    @Test
    fun `a service long enough to run past closing is never offered`() {
        val slots = generateSlotCandidates(farFutureDate, nineToEight, totalDurationMin = 700, bufferMin = 0, intervalMin = 30)
        assertTrue(slots.isEmpty())
    }

    @Test
    fun `a slot overlapping a busy window is marked unavailable, not dropped`() {
        val busyStart = farFutureDate.atTime(10, 0).atZone(GLIDE_ZONE)
        val busyEnd = farFutureDate.atTime(10, 35).atZone(GLIDE_ZONE)
        val busyWindows = listOf(BusyWindow(barberId = "b1", scheduledAt = busyStart.toInstant().toString(), endsAt = busyEnd.toInstant().toString()))

        val slots = generateSlotCandidates(farFutureDate, nineToEight, totalDurationMin = 30, bufferMin = 0, intervalMin = 30, busyWindows = busyWindows)

        val tenAm = slots.first { it.time == LocalTime.of(10, 0) }
        assertFalse(tenAm.available)
        val nineAm = slots.first { it.time == LocalTime.of(9, 0) }
        assertTrue(nineAm.available)
    }

    @Test
    fun `a slot in the past is marked unavailable`() {
        val today = LocalDate.now(GLIDE_ZONE)
        val currentHourInKolkata = ZonedDateTime.now(GLIDE_ZONE).hour
        val hours = DayHours(closed = false, open = "00:00", close = "23:30")

        val slots = generateSlotCandidates(today, hours, totalDurationMin = 30, bufferMin = 0, intervalMin = 30)

        val earlyMorningSlot = slots.firstOrNull { it.time == LocalTime.of(0, 0) }
        if (currentHourInKolkata > 0) {
            assertFalse("a midnight slot on 'today' should be in the past", earlyMorningSlot?.available ?: true)
        }
    }
}
