package com.glide.app.core.location

class FakeLocationTracker : LocationTracker {
    var permissionGranted: Boolean = false
    var coordinatesToReturn: Coordinates? = null

    override fun hasLocationPermission(): Boolean = permissionGranted

    override suspend fun getCurrentCoordinates(): Coordinates? = coordinatesToReturn
}
