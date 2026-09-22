package com.glide.app.presentation.partner.catalog

import com.glide.app.data.repository.FakePartnerRepository
import com.glide.app.domain.model.ServiceFormInput
import com.glide.app.testutil.MainDispatcherRule
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

class ServicesViewModelTest {

    @get:Rule
    val mainDispatcherRule = MainDispatcherRule()

    @Test
    fun `adding a valid service clears the form and appears in the list`() = runTest {
        val repo = FakePartnerRepository()
        val viewModel = ServicesViewModel(repo)
        viewModel.load("shop-1")

        viewModel.onFormChanged(ServiceFormInput(name = "Haircut", priceRupees = "199", durationMin = "30"))
        viewModel.submit("shop-1")

        val state = viewModel.uiState.value
        assertEquals(1, state.services.size)
        assertEquals("Haircut", state.services.first().name)
        assertEquals("", state.form.name)
    }

    @Test
    fun `a duration over 480 minutes is rejected as a submit error, not a crash`() = runTest {
        val repo = FakePartnerRepository()
        val viewModel = ServicesViewModel(repo)
        viewModel.load("shop-1")

        viewModel.onFormChanged(ServiceFormInput(name = "Spa Day", priceRupees = "500", durationMin = "481"))
        viewModel.submit("shop-1")

        assertTrue(viewModel.uiState.value.services.isEmpty())
        assertEquals("Duration can't be more than 480 minutes (8 hours).", viewModel.uiState.value.submitError)
    }

    @Test
    fun `toggling active applies optimistically and reverts on failure`() = runTest {
        val repo = FakePartnerRepository().apply {
            setServiceActiveError = RuntimeException("offline")
        }
        val viewModel = ServicesViewModel(repo)
        viewModel.onFormChanged(ServiceFormInput(name = "Haircut", priceRupees = "199", durationMin = "30"))
        viewModel.submit("shop-1")
        val serviceId = repo.services.first().id

        viewModel.setActive(serviceId, false)

        assertTrue("should revert to active after the failed write", viewModel.uiState.value.services.first().isActive)
    }
}
