package com.glide.app.presentation.partner.barbers

import com.glide.app.data.repository.FakePartnerRepository
import com.glide.app.testutil.MainDispatcherRule
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

class BarbersViewModelTest {

    @get:Rule
    val mainDispatcherRule = MainDispatcherRule()

    @Test
    fun `adding a barber clears the input and appears in the list`() = runTest {
        val repo = FakePartnerRepository()
        val viewModel = BarbersViewModel(repo)
        viewModel.load("shop-1")

        viewModel.onNameChanged("Rahul")
        viewModel.submit("shop-1")

        assertEquals(listOf("Rahul"), viewModel.uiState.value.barbers.map { it.name })
        assertEquals("", viewModel.uiState.value.nameInput)
    }

    @Test
    fun `a blank name is rejected as a submit error`() = runTest {
        val repo = FakePartnerRepository()
        val viewModel = BarbersViewModel(repo)
        viewModel.load("shop-1")

        viewModel.onNameChanged("   ")
        viewModel.submit("shop-1")

        assertTrue(viewModel.uiState.value.barbers.isEmpty())
        assertEquals("Barber name is required.", viewModel.uiState.value.submitError)
    }

    @Test
    fun `toggling active reverts on a failed write`() = runTest {
        val repo = FakePartnerRepository().apply { setBarberActiveError = RuntimeException("offline") }
        val viewModel = BarbersViewModel(repo)
        viewModel.onNameChanged("Rahul")
        viewModel.submit("shop-1")
        val barberId = repo.barbers.first().id

        viewModel.setActive(barberId, false)

        assertTrue(viewModel.uiState.value.barbers.first().isActive)
    }
}
