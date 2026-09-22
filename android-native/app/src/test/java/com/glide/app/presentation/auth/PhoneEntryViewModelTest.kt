package com.glide.app.presentation.auth

import com.glide.app.data.repository.FakeAuthRepository
import com.glide.app.testutil.MainDispatcherRule
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

class PhoneEntryViewModelTest {

    @get:Rule
    val mainDispatcherRule = MainDispatcherRule()

    @Test
    fun `strips non-digits and caps input at 10 digits`() = runTest {
        val viewModel = PhoneEntryViewModel(FakeAuthRepository())

        viewModel.onLocalNumberChanged("98a76-543210999")

        assertEquals("9876543210", viewModel.uiState.value.localNumber)
    }

    @Test
    fun `rejects a too-short number without calling the repository`() = runTest {
        val repo = FakeAuthRepository()
        val viewModel = PhoneEntryViewModel(repo)

        viewModel.onLocalNumberChanged("98765")
        viewModel.sendOtp()

        assertTrue(repo.sentOtpTo.isEmpty())
        assertEquals("Enter a valid 10-digit mobile number", viewModel.uiState.value.error)
    }

    @Test
    fun `sends the OTP to the +91-prefixed number and records where it went`() = runTest {
        val repo = FakeAuthRepository()
        val viewModel = PhoneEntryViewModel(repo)

        viewModel.onLocalNumberChanged("9876543210")
        viewModel.sendOtp()

        assertEquals(listOf("+919876543210"), repo.sentOtpTo)
        assertEquals("+919876543210", viewModel.uiState.value.otpSentTo)
        assertFalse(viewModel.uiState.value.isLoading)
    }

    @Test
    fun `surfaces a repository failure as a UI error instead of otpSentTo`() = runTest {
        val repo = FakeAuthRepository().apply {
            sendOtpError = RuntimeException("rate limited")
        }
        val viewModel = PhoneEntryViewModel(repo)

        viewModel.onLocalNumberChanged("9876543210")
        viewModel.sendOtp()

        assertNull(viewModel.uiState.value.otpSentTo)
        assertEquals("rate limited", viewModel.uiState.value.error)
    }

    @Test
    fun `dev sign-in delegates to the repository with the account's credentials`() = runTest {
        val repo = FakeAuthRepository()
        val viewModel = PhoneEntryViewModel(repo)

        viewModel.signInWithDevAccount(DevAccount("Dev: Customer", "dev-customer@glide.test", "dev-testing-only"))

        assertEquals(listOf("dev-customer@glide.test" to "dev-testing-only"), repo.passwordSignIns)
        assertNull(viewModel.uiState.value.error)
    }

    @Test
    fun `a failed dev sign-in surfaces as a UI error`() = runTest {
        val repo = FakeAuthRepository().apply { passwordSignInError = RuntimeException("invalid credentials") }
        val viewModel = PhoneEntryViewModel(repo)

        viewModel.signInWithDevAccount(DevAccount("Dev: Partner", "dev-partner@glide.test", "dev-testing-only"))

        assertEquals("invalid credentials", viewModel.uiState.value.error)
    }
}
