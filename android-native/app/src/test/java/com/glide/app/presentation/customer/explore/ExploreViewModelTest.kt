package com.glide.app.presentation.customer.explore

import com.glide.app.core.location.Coordinates
import com.glide.app.core.location.FakeLocationTracker
import com.glide.app.data.repository.FakeShopRepository
import com.glide.app.domain.model.Shop
import com.glide.app.testutil.MainDispatcherRule
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

class ExploreViewModelTest {

    @get:Rule
    val mainDispatcherRule = MainDispatcherRule()

    private fun shop(id: String, name: String, lat: Double? = null, lng: Double? = null) =
        Shop(id = id, name = name, lat = lat, lng = lng)

    @Test
    fun `loads shops on init without location sorting`() = runTest {
        val shopRepo = FakeShopRepository().apply {
            shopsToReturn = listOf(shop("1", "Alpha Salon"), shop("2", "Beta Barbers"))
        }
        val viewModel = ExploreViewModel(shopRepo, FakeLocationTracker())

        assertEquals(2, viewModel.uiState.value.items.size)
        assertFalse(viewModel.uiState.value.isLoading)
        assertFalse(viewModel.uiState.value.sortedByDistance)
    }

    @Test
    fun `surfaces a repository failure instead of a shop list`() = runTest {
        val shopRepo = FakeShopRepository().apply {
            fetchShopsError = RuntimeException("network down")
        }
        val viewModel = ExploreViewModel(shopRepo, FakeLocationTracker())

        assertEquals("network down", viewModel.uiState.value.error)
        assertTrue(viewModel.uiState.value.items.isEmpty())
    }

    @Test
    fun `shows the location banner when permission is not yet granted`() = runTest {
        val shopRepo = FakeShopRepository().apply { shopsToReturn = listOf(shop("1", "Alpha")) }
        val viewModel = ExploreViewModel(shopRepo, FakeLocationTracker())

        viewModel.onScreenReady(hasPermissionAlready = false)

        assertTrue(viewModel.uiState.value.showLocationBanner)
        assertFalse(viewModel.uiState.value.sortedByDistance)
    }

    @Test
    fun `sorts shops nearest-first once permission and coordinates are available`() = runTest {
        val shopRepo = FakeShopRepository().apply {
            shopsToReturn = listOf(
                shop("far", "Far Salon", lat = 13.0, lng = 80.0),
                shop("near", "Near Salon", lat = 12.92, lng = 77.63),
                shop("no-location", "No Location Salon"),
            )
        }
        val locationTracker = FakeLocationTracker().apply {
            permissionGranted = true
            coordinatesToReturn = Coordinates(lat = 12.9716, lng = 77.5946) // Bengaluru
        }
        val viewModel = ExploreViewModel(shopRepo, locationTracker)

        viewModel.onScreenReady(hasPermissionAlready = true)

        val ids = viewModel.uiState.value.items.map { it.shop.id }
        assertEquals(listOf("near", "far", "no-location"), ids)
        assertTrue(viewModel.uiState.value.sortedByDistance)
        assertFalse(viewModel.uiState.value.showLocationBanner)
    }

    @Test
    fun `denying the permission prompt shows the banner instead of crashing`() = runTest {
        val shopRepo = FakeShopRepository().apply { shopsToReturn = listOf(shop("1", "Alpha")) }
        val viewModel = ExploreViewModel(shopRepo, FakeLocationTracker())

        viewModel.onLocationPermissionResult(granted = false)

        assertTrue(viewModel.uiState.value.showLocationBanner)
    }

    @Test
    fun `search re-fetches with the query`() = runTest {
        val shopRepo = FakeShopRepository().apply {
            shopsToReturn = listOf(shop("1", "Alpha Salon"), shop("2", "Beta Barbers"))
        }
        val viewModel = ExploreViewModel(shopRepo, FakeLocationTracker())

        viewModel.onSearchChanged("beta")

        // Initial load passes the default empty search string, not null — the repository
        // treats both the same way via isNullOrBlank(), but the fake records exactly what it received.
        assertEquals(listOf("", "beta"), shopRepo.searchesReceived)
        assertEquals(listOf("2"), viewModel.uiState.value.items.map { it.shop.id })
    }
}
