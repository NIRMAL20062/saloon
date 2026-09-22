package com.glide.app.presentation.partner

import com.glide.app.core.location.FakeLocationTracker
import com.glide.app.data.repository.FakeAuthRepository
import com.glide.app.data.repository.FakePartnerRepository
import com.glide.app.domain.model.OwnShop
import com.glide.app.testutil.MainDispatcherRule
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

class PartnerViewModelTest {

    @get:Rule
    val mainDispatcherRule = MainDispatcherRule()

    @Test
    fun `shows NoShop when the owner has no shop yet`() = runTest {
        val partnerRepo = FakePartnerRepository()
        val authRepo = FakeAuthRepository().apply { userIdToReturn = "owner-1" }
        val viewModel = PartnerViewModel(partnerRepo, authRepo, FakeLocationTracker())

        assertTrue(viewModel.uiState.value is PartnerUiState.NoShop)
    }

    @Test
    fun `shows Ready with the existing shop`() = runTest {
        val partnerRepo = FakePartnerRepository().apply {
            shop = OwnShop(id = "shop-1", ownerId = "owner-1", name = "Blade & Fade")
        }
        val authRepo = FakeAuthRepository().apply { userIdToReturn = "owner-1" }
        val viewModel = PartnerViewModel(partnerRepo, authRepo, FakeLocationTracker())

        val state = viewModel.uiState.value
        assertTrue(state is PartnerUiState.Ready)
        assertEquals("Blade & Fade", (state as PartnerUiState.Ready).shop.name)
    }

    @Test
    fun `creating a shop transitions to Ready`() = runTest {
        val partnerRepo = FakePartnerRepository()
        val authRepo = FakeAuthRepository().apply { userIdToReturn = "owner-1" }
        val viewModel = PartnerViewModel(partnerRepo, authRepo, FakeLocationTracker())

        viewModel.createShop(name = "Blade & Fade", address = "12 Main St")

        val state = viewModel.uiState.value
        assertTrue(state is PartnerUiState.Ready)
        assertEquals("Blade & Fade", (state as PartnerUiState.Ready).shop.name)
    }

    @Test
    fun `an empty shop name is rejected without calling the repository`() = runTest {
        val partnerRepo = FakePartnerRepository()
        val authRepo = FakeAuthRepository().apply { userIdToReturn = "owner-1" }
        val viewModel = PartnerViewModel(partnerRepo, authRepo, FakeLocationTracker())

        viewModel.createShop(name = "  ", address = "")

        val state = viewModel.uiState.value
        assertTrue(state is PartnerUiState.NoShop)
        assertEquals("Shop name is required.", (state as PartnerUiState.NoShop).error)
    }

    @Test
    fun `toggling open applies optimistically and reverts if the write fails`() = runTest {
        val partnerRepo = FakePartnerRepository().apply {
            shop = OwnShop(id = "shop-1", ownerId = "owner-1", name = "Blade & Fade", isOpen = true)
            setShopOpenError = RuntimeException("network error")
        }
        val authRepo = FakeAuthRepository().apply { userIdToReturn = "owner-1" }
        val viewModel = PartnerViewModel(partnerRepo, authRepo, FakeLocationTracker())

        viewModel.setOpen(false)

        val state = viewModel.uiState.value as PartnerUiState.Ready
        assertTrue("should have reverted back to open after the failed write", state.shop.isOpen)
        assertEquals(listOf(false), partnerRepo.setOpenCalls)
    }
}
