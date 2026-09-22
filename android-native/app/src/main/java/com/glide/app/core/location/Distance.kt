package com.glide.app.core.location

import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.sin
import kotlin.math.sqrt

data class Coordinates(val lat: Double, val lng: Double)

private const val EARTH_RADIUS_KM = 6371.0

/**
 * Great-circle distance in kilometers. Direct port of features/shops/geo.ts's
 * distanceKm — same formula, same fine-at-this-scale reasoning (no PostGIS needed
 * for a client-side sort over a city's worth of shops).
 */
fun distanceKm(a: Coordinates, b: Coordinates): Double {
    val dLat = Math.toRadians(b.lat - a.lat)
    val dLng = Math.toRadians(b.lng - a.lng)
    val lat1 = Math.toRadians(a.lat)
    val lat2 = Math.toRadians(b.lat)

    val sinDLat = sin(dLat / 2)
    val sinDLng = sin(dLng / 2)
    val h = sinDLat * sinDLat + cos(lat1) * cos(lat2) * sinDLng * sinDLng
    val c = 2 * atan2(sqrt(h), sqrt(1 - h))

    return EARTH_RADIUS_KM * c
}
