package com.glide.app.presentation.auth

import com.glide.app.data.repository.FakeAuthRepository
import com.glide.app.testutil.MainDispatcherRule
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

class PhoneEntryViewModelTest {

    @get:Rule
    val mainDispatcherRule = MainDispatcherRule()

    @Test
    fun `rejects an obviously malformed phone number without calling the repository`() = runTest {
        val repo = FakeAuthRepository()
        val viewModel = PhoneEntryViewModel(repo)

        viewModel.onPhoneChanged("12345")
        viewModel.sendOtp()

        assertTrue(repo.sentOtpTo.isEmpty())
        assertEquals("Enter a valid phone number, e.g. +919876543210", viewModel.uiState.value.error)
    }

    @Test
    fun `sends the OTP and flags otpSent on a valid E164 number`() = runTest {
        val repo = FakeAuthRepository()
        val viewModel = PhoneEntryViewModel(repo)

        viewModel.onPhoneChanged("+919876543210")
        viewModel.sendOtp()

        assertEquals(listOf("+919876543210"), repo.sentOtpTo)
        assertTrue(viewModel.uiState.value.otpSent)
        assertFalse(viewModel.uiState.value.isLoading)
    }

    @Test
    fun `surfaces a repository failure as a UI error instead of otpSent`() = runTest {
        val repo = FakeAuthRepository().apply {
            sendOtpError = RuntimeException("rate limited")
        }
        val viewModel = PhoneEntryViewModel(repo)

        viewModel.onPhoneChanged("+919876543210")
        viewModel.sendOtp()

        assertFalse(viewModel.uiState.value.otpSent)
        assertEquals("rate limited", viewModel.uiState.value.error)
    }
}
