package com.glide.app.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable

/**
 * Placeholder theme for Phase 0. The real Customer/Partner fixed palettes
 * (docs/THEME_AND_ROLES_COLOR_GUIDE.md) land in Phase 1 — this only exists
 * to prove the "no dark mode, ever" rule from the very first screen.
 *
 * Deliberately ignores [isSystemInDarkTheme] — GLIDE never has a dark variant.
 */
@Composable
fun GlideTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = lightColorScheme(),
        content = content,
    )
}
