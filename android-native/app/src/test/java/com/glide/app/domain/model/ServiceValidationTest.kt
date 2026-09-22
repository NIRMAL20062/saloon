package com.glide.app.domain.model

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertThrows
import org.junit.Test

class ServiceValidationTest {

    @Test
    fun `parses a valid rupee price into paise`() {
        val parsed = parseServiceInput(ServiceFormInput(name = "Haircut", priceRupees = "199.5", durationMin = "30"))
        assertEquals("Haircut", parsed.name)
        assertEquals(19950L, parsed.priceCentsOrPaise)
        assertEquals(30, parsed.durationMin)
    }

    @Test
    fun `rejects a blank name`() {
        assertThrows(IllegalArgumentException::class.java) {
            parseServiceInput(ServiceFormInput(name = "  ", priceRupees = "100", durationMin = "30"))
        }
    }

    @Test
    fun `rejects a non-positive price`() {
        assertThrows(IllegalArgumentException::class.java) {
            parseServiceInput(ServiceFormInput(name = "Haircut", priceRupees = "0", durationMin = "30"))
        }
    }

    @Test
    fun `rejects a duration over 480 minutes, matching migration 0004's check constraint`() {
        assertThrows(IllegalArgumentException::class.java) {
            parseServiceInput(ServiceFormInput(name = "Spa Day", priceRupees = "500", durationMin = "481"))
        }
    }

    @Test
    fun `field validation does not flag an untouched empty field`() {
        val errors = validateServiceInput(ServiceFormInput(name = "", priceRupees = "", durationMin = ""))
        assertNull(errors.priceRupees)
        assertNull(errors.durationMin)
    }

    @Test
    fun `field validation flags an invalid price without throwing`() {
        val errors = validateServiceInput(ServiceFormInput(name = "Haircut", priceRupees = "-5", durationMin = "30"))
        assertEquals("Enter a positive price.", errors.priceRupees)
    }

    @Test
    fun `field validation flags a too-long duration without throwing`() {
        val errors = validateServiceInput(ServiceFormInput(name = "Haircut", priceRupees = "100", durationMin = "500"))
        assertEquals("Can't be more than 480 min (8 hours).", errors.durationMin)
    }
}
