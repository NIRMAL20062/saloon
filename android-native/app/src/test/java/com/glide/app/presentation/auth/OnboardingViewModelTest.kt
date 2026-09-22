package com.glide.app.presentation.auth

import com.glide.app.data.repository.FakeAuthRepository
import com.glide.app.domain.model.UserRole
import com.glide.app.testutil.MainDispatcherRule
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Rule
import org.junit.Test

class OnboardingViewModelTest {

    @get:Rule
    val mainDispatcherRule = MainDispatcherRule()

    @Test
    fun `rejects an empty name without inserting a profile`() = runTest {
        val repo = FakeAuthRepository()
        val viewModel = OnboardingViewModel(repo)
        var completedWith: UserRole? = null

        viewModel.submit(phone = "+919876543210") { completedWith = it }

        assertEquals(true, repo.createdProfiles.isEmpty())
        assertNull(completedWith)
        assertEquals("Please enter your full name.", viewModel.uiState.value.error)
    }

    @Test
    fun `creates a profile with the selected role and reports completion`() = runTest {
        val repo = FakeAuthRepository().apply { userIdToReturn = "user-42" }
        val viewModel = OnboardingViewModel(repo)
        var completedWith: UserRole? = null

        viewModel.onFullNameChanged("Rohan Sharma")
        viewModel.onRoleSelected(UserRole.PARTNER)
        viewModel.submit(phone = "+919876543210") { completedWith = it }

        assertEquals(listOf("user-42" to UserRole.PARTNER), repo.createdProfiles)
        assertEquals(UserRole.PARTNER, completedWith)
        assertNull(viewModel.uiState.value.error)
    }

    @Test
    fun `surfaces an insert failure instead of reporting completion`() = runTest {
        val repo = FakeAuthRepository().apply {
            createProfileError = RuntimeException("insert failed")
        }
        val viewModel = OnboardingViewModel(repo)
        var completedWith: UserRole? = null

        viewModel.onFullNameChanged("Rohan Sharma")
        viewModel.submit(phone = "+919876543210") { completedWith = it }

        assertNull(completedWith)
        assertEquals("insert failed", viewModel.uiState.value.error)
    }
}
