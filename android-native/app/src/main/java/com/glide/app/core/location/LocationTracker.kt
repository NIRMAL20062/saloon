package com.glide.app.core.location

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.content.pm.PackageManager
import androidx.core.content.ContextCompat
import com.google.android.gms.location.CurrentLocationRequest
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.suspendCancellableCoroutine
import javax.inject.Inject
import javax.inject.Singleton
import kotlin.coroutines.resume

interface LocationTracker {
    fun hasLocationPermission(): Boolean

    /**
     * Never throws — a customer who denies the permission (or whose position can't be
     * read) still sees the shop list, just unsorted by distance. Mirrors
     * features/shops/geo.ts's getCurrentCoordinates() exactly.
     */
    suspend fun getCurrentCoordinates(): Coordinates?
}

@Singleton
class FusedLocationTracker @Inject constructor(
    @ApplicationContext private val context: Context,
) : LocationTracker {

    private val client = LocationServices.getFusedLocationProviderClient(context)

    override fun hasLocationPermission(): Boolean =
        ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) ==
            PackageManager.PERMISSION_GRANTED ||
            ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION) ==
            PackageManager.PERMISSION_GRANTED

    @SuppressLint("MissingPermission")
    override suspend fun getCurrentCoordinates(): Coordinates? {
        if (!hasLocationPermission()) return null

        return runCatching {
            suspendCancellableCoroutine { continuation ->
                val request = CurrentLocationRequest.Builder()
                    .setPriority(Priority.PRIORITY_BALANCED_POWER_ACCURACY)
                    .build()

                client.getCurrentLocation(request, null)
                    .addOnSuccessListener { location ->
                        val coordinates = location?.let { Coordinates(it.latitude, it.longitude) }
                        if (continuation.isActive) continuation.resume(coordinates)
                    }
                    .addOnFailureListener {
                        if (continuation.isActive) continuation.resume(null)
                    }
            }
        }.getOrNull()
    }
}
