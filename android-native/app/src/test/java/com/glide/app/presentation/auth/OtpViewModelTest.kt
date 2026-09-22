package com.glide.app.presentation.auth

import com.glide.app.data.repository.FakeAuthRepository
import com.glide.app.testutil.MainDispatcherRule
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Rule
import org.junit.Test

class OtpViewModelTest {

    @get:Rule
    val mainDispatcherRule = MainDispatcherRule()

    @Test
    fun `rejects a too-short code without calling the repository`() = runTest {
        val repo = FakeAuthRepository()
        val viewModel = OtpViewModel(repo)

        viewModel.onCodeChanged("12")
        viewModel.verify(phone = "+919876543210")

        assertEquals(emptyList<Pair<String, String>>(), repo.verifiedCodes)
        assertEquals("Enter the code you received", viewModel.uiState.value.error)
    }

    @Test
    fun `verifies a well-formed code against the given phone`() = runTest {
        val repo = FakeAuthRepository()
        val viewModel = OtpViewModel(repo)

        viewModel.onCodeChanged("123456")
        viewModel.verify(phone = "+919876543210")

        assertEquals(listOf("+919876543210" to "123456"), repo.verifiedCodes)
        assertEquals(null, viewModel.uiState.value.error)
    }

    @Test
    fun `surfaces an invalid-code repository error to the UI`() = runTest {
        val repo = FakeAuthRepository().apply {
            verifyOtpError = RuntimeException("invalid or expired code")
        }
        val viewModel = OtpViewModel(repo)

        viewModel.onCodeChanged("123456")
        viewModel.verify(phone = "+919876543210")

        assertEquals("invalid or expired code", viewModel.uiState.value.error)
    }
}
