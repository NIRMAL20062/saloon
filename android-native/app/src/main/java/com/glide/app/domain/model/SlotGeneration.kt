package com.glide.app.domain.model

import java.time.Instant
import java.time.LocalDate
import java.time.LocalTime
import java.time.ZoneId

/** Single-city launch, one hardcoded timezone — matches create_slot_booking's own simplification. */
val GLIDE_ZONE: ZoneId = ZoneId.of("Asia/Kolkata")

data class SlotCandidate(val date: LocalDate, val time: LocalTime, val available: Boolean)

/**
 * Client-side candidate generation for the slot picker — the server (create_slot_booking)
 * is what actually enforces opening-hours/collision safety; this is only a preview so the
 * customer doesn't have to guess-and-check against every 30-minute mark of the day.
 */
fun generateSlotCandidates(
    date: LocalDate,
    dayHours: DayHours,
    totalDurationMin: Int,
    bufferMin: Int = 5,
    intervalMin: Int = 30,
    busyWindows: List<BusyWindow> = emptyList(),
): List<SlotCandidate> {
    if (dayHours.closed) return emptyList()

    val openTime = runCatching { LocalTime.parse(dayHours.open) }.getOrNull() ?: return emptyList()
    val closeTime = runCatching { LocalTime.parse(dayHours.close) }.getOrNull() ?: return emptyList()
    if (!openTime.isBefore(closeTime)) return emptyList()

    val occupiedMinutes = totalDurationMin + bufferMin
    val slots = mutableListOf<SlotCandidate>()

    // Plain integer minute-of-day arithmetic, not LocalTime.plusMinutes() — LocalTime wraps
    // at midnight (00:00 is never "after" 23:30), so a loop bound expressed as
    // cursor.isAfter(closeTime) never terminates once the cursor wraps past 24:00. This bit
    // for real with a shop open until 23:30: it OOM'd generating slots forever.
    val openMinutes = openTime.hour * 60 + openTime.minute
    val closeMinutes = closeTime.hour * 60 + closeTime.minute
    var cursorMinutes = openMinutes

    while (cursorMinutes + occupiedMinutes <= closeMinutes) {
        val cursor = LocalTime.of(cursorMinutes / 60, cursorMinutes % 60)
        val slotEnd = LocalTime.of((cursorMinutes + occupiedMinutes) / 60, (cursorMinutes + occupiedMinutes) % 60)

        val slotStartInstant = date.atTime(cursor).atZone(GLIDE_ZONE).toInstant()
        val slotEndInstant = date.atTime(slotEnd).atZone(GLIDE_ZONE).toInstant()
        val isPast = slotStartInstant.isBefore(Instant.now())
        val overlapsBusy = busyWindows.any { busy ->
            val busyStart = runCatching { Instant.parse(busy.scheduledAt) }.getOrNull() ?: return@any false
            val busyEnd = runCatching { Instant.parse(busy.endsAt) }.getOrNull() ?: return@any false
            slotStartInstant.isBefore(busyEnd) && busyStart.isBefore(slotEndInstant)
        }

        slots += SlotCandidate(date, cursor, available = !isPast && !overlapsBusy)
        cursorMinutes += intervalMin
    }

    return slots
}

fun SlotCandidate.toIsoInstant(): String = date.atTime(time).atZone(GLIDE_ZONE).toInstant().toString()

fun LocalDate.toDayKey(): DayKey = when (dayOfWeek.value) {
    1 -> DayKey.MON
    2 -> DayKey.TUE
    3 -> DayKey.WED
    4 -> DayKey.THU
    5 -> DayKey.FRI
    6 -> DayKey.SAT
    else -> DayKey.SUN
}
