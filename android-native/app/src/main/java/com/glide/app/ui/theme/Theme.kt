package com.glide.app.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable

/**
 * Two fixed, light-only role themes. Neither ever reads
 * isSystemInDarkTheme() — GLIDE has no dark mode, by design
 * (docs/THEME_AND_ROLES_COLOR_GUIDE.md).
 */

private val CustomerColorScheme = lightColorScheme(
    background = CustomerColors.Background,
    surface = CustomerColors.Surface,
    primary = CustomerColors.Ink,
    onPrimary = CustomerColors.Surface,
    secondary = CustomerColors.Accent,
    secondaryContainer = CustomerColors.AccentSurface,
    error = CustomerColors.UrgentCoral,
    onBackground = CustomerColors.Ink,
    onSurface = CustomerColors.Ink,
    outline = CustomerColors.HairlineBorder,
)

private val PartnerColorScheme = lightColorScheme(
    background = PartnerColors.Background,
    surface = PartnerColors.CardSurface,
    primary = PartnerColors.PrimaryBrand,
    onPrimary = PartnerColors.CardSurface,
    secondaryContainer = PartnerColors.MintSurface,
    error = PartnerColors.Danger,
    errorContainer = PartnerColors.DangerSurface,
    onBackground = PartnerColors.TextPrimary,
    onSurface = PartnerColors.TextPrimary,
    outline = PartnerColors.CardBorder,
)

@Composable
fun CustomerTheme(content: @Composable () -> Unit) {
    MaterialTheme(colorScheme = CustomerColorScheme, content = content)
}

@Composable
fun PartnerTheme(content: @Composable () -> Unit) {
    MaterialTheme(colorScheme = PartnerColorScheme, content = content)
}

/** Used only before a role is known (phone entry, OTP, onboarding). */
@Composable
fun GlideTheme(content: @Composable () -> Unit) {
    CustomerTheme(content)
}
