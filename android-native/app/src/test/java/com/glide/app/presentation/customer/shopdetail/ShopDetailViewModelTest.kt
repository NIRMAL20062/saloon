package com.glide.app.presentation.customer.shopdetail

import com.glide.app.data.repository.FakeBookingRepository
import com.glide.app.data.repository.FakeShopRepository
import com.glide.app.domain.model.Barber
import com.glide.app.domain.model.GLIDE_ZONE
import com.glide.app.domain.model.Service
import com.glide.app.domain.model.Shop
import com.glide.app.testutil.MainDispatcherRule
import java.time.LocalDate
import kotlinx.coroutines.test.runTest
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import kotlinx.serialization.json.putJsonObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

class ShopDetailViewModelTest {

    @get:Rule
    val mainDispatcherRule = MainDispatcherRule()

    // Not "today" — a slot picker test shouldn't be at the mercy of what time of day (relative
    // to the shop's closing time) the test happens to run at (this is exactly what broke: a
    // late-evening CI run found zero "available today" slots and every test using .first{it.available} failed).
    private val farFutureDate: LocalDate = LocalDate.now(GLIDE_ZONE).plusDays(30)

    private val allDaysOpen = buildJsonObject {
        listOf("mon", "tue", "wed", "thu", "fri", "sat", "sun").forEach { day ->
            putJsonObject(day) {
                put("closed", false)
                put("open", "09:00")
                put("close", "20:00")
            }
        }
    }

    private fun shopRepoWith(shopId: String = "shop-1") = FakeShopRepository().apply {
        shopsToReturn = listOf(Shop(id = shopId, name = "Blade & Fade", openingHoursRaw = allDaysOpen))
        servicesToReturn = listOf(
            Service(id = "svc-1", shopId = shopId, name = "Haircut", price = 20000, durationMin = 30),
            Service(id = "svc-2", shopId = shopId, name = "Beard Trim", price = 10000, durationMin = 15),
        )
        barbersToReturn = listOf(Barber(id = "barber-1", shopId = shopId, name = "Rahul"))
    }

    @Test
    fun `loads shop, services, and barbers`() = runTest {
        val viewModel = ShopDetailViewModel(shopRepoWith(), FakeBookingRepository())
        viewModel.load("shop-1")

        val state = viewModel.uiState.value
        assertEquals("Blade & Fade", state.shop?.name)
        assertEquals(2, state.services.size)
        assertEquals(1, state.barbers.size)
        assertFalse(state.isLoading)
    }

    @Test
    fun `selecting services updates the running total`() = runTest {
        val viewModel = ShopDetailViewModel(shopRepoWith(), FakeBookingRepository())
        viewModel.load("shop-1")

        viewModel.toggleService("svc-1")
        viewModel.toggleService("svc-2")

        assertEquals(30000L, viewModel.uiState.value.totalPricePaise)
        assertEquals(45, viewModel.uiState.value.totalDurationMin)

        viewModel.toggleService("svc-2")
        assertEquals(20000L, viewModel.uiState.value.totalPricePaise)
    }

    @Test
    fun `selecting a barber and a service generates slot candidates`() = runTest {
        val viewModel = ShopDetailViewModel(shopRepoWith(), FakeBookingRepository())
        viewModel.load("shop-1")

        viewModel.toggleService("svc-1")
        viewModel.selectBarber("barber-1")
        viewModel.selectDate(farFutureDate)

        assertTrue(viewModel.uiState.value.slots.isNotEmpty())
    }

    @Test
    fun `requesting a booking with an incomplete selection is refused client-side`() = runTest {
        val bookingRepo = FakeBookingRepository()
        val viewModel = ShopDetailViewModel(shopRepoWith(), bookingRepo)
        viewModel.load("shop-1")

        viewModel.toggleService("svc-1")
        // No barber/slot selected yet.
        viewModel.requestBooking()

        assertTrue(bookingRepo.createCalls.isEmpty())
    }

    @Test
    fun `a complete selection creates a booking and reports the new id`() = runTest {
        val bookingRepo = FakeBookingRepository()
        val viewModel = ShopDetailViewModel(shopRepoWith(), bookingRepo)
        viewModel.load("shop-1")

        viewModel.toggleService("svc-1")
        viewModel.selectBarber("barber-1")
        viewModel.selectDate(farFutureDate)
        val firstAvailable = viewModel.uiState.value.slots.first { it.available }
        viewModel.selectSlot(firstAvailable)
        viewModel.requestBooking()

        assertEquals(1, bookingRepo.createCalls.size)
        assertEquals("booking-1", viewModel.uiState.value.createdBookingId)
    }

    @Test
    fun `a booking failure surfaces the server's error message`() = runTest {
        val bookingRepo = FakeBookingRepository().apply {
            createBookingError = IllegalStateException("That time was just taken by another booking — pick a different slot.")
        }
        val viewModel = ShopDetailViewModel(shopRepoWith(), bookingRepo)
        viewModel.load("shop-1")
        viewModel.toggleService("svc-1")
        viewModel.selectBarber("barber-1")
        viewModel.selectDate(farFutureDate)
        viewModel.selectSlot(viewModel.uiState.value.slots.first { it.available })

        viewModel.requestBooking()

        assertNull(viewModel.uiState.value.createdBookingId)
        assertEquals("That time was just taken by another booking — pick a different slot.", viewModel.uiState.value.error)
    }
}
