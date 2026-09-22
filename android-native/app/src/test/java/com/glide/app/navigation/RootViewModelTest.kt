package com.glide.app.navigation

import com.glide.app.data.repository.FakeAuthRepository
import com.glide.app.domain.model.Profile
import com.glide.app.domain.model.UserRole
import com.glide.app.testutil.MainDispatcherRule
import io.github.jan.supabase.auth.status.SessionStatus
import io.github.jan.supabase.auth.user.UserInfo
import io.github.jan.supabase.auth.user.UserSession
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

class RootViewModelTest {

    @get:Rule
    val mainDispatcherRule = MainDispatcherRule()

    private fun authenticatedStatus(userId: String) = SessionStatus.Authenticated(
        session = UserSession(
            accessToken = "access",
            refreshToken = "refresh",
            expiresIn = 3600,
            tokenType = "bearer",
            user = UserInfo(aud = "authenticated", id = userId),
        ),
    )

    @Test
    fun `starts logged out when the repository has no session`() = runTest {
        val repo = FakeAuthRepository()
        val viewModel = RootViewModel(repo)

        assertEquals(RootUiState.LoggedOut, viewModel.uiState.value)
    }

    @Test
    fun `routes to onboarding when authenticated but no profiles row exists yet`() = runTest {
        val repo = FakeAuthRepository().apply { profileToReturn = null }
        val viewModel = RootViewModel(repo)

        repo.emit(authenticatedStatus("user-1"))

        assertTrue(viewModel.uiState.value is RootUiState.NeedsOnboarding)
    }

    @Test
    fun `routes to the customer home when the profile role is customer`() = runTest {
        val repo = FakeAuthRepository().apply {
            profileToReturn = Profile(id = "user-1", role = UserRole.CUSTOMER)
        }
        val viewModel = RootViewModel(repo)

        repo.emit(authenticatedStatus("user-1"))

        assertEquals(RootUiState.LoggedIn(UserRole.CUSTOMER), viewModel.uiState.value)
    }

    @Test
    fun `routes to the partner home when the profile role is partner`() = runTest {
        val repo = FakeAuthRepository().apply {
            profileToReturn = Profile(id = "user-1", role = UserRole.PARTNER)
        }
        val viewModel = RootViewModel(repo)

        repo.emit(authenticatedStatus("user-1"))

        assertEquals(RootUiState.LoggedIn(UserRole.PARTNER), viewModel.uiState.value)
    }

    @Test
    fun `signOut delegates to the repository`() = runTest {
        val repo = FakeAuthRepository()
        val viewModel = RootViewModel(repo)

        viewModel.signOut()

        assertTrue(repo.signOutCalled)
    }
}
