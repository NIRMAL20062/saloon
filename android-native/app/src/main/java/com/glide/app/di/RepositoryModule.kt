package com.glide.app.di

import com.glide.app.core.location.FusedLocationTracker
import com.glide.app.core.location.LocationTracker
import com.glide.app.data.repository.SupabaseAuthRepository
import com.glide.app.data.repository.SupabaseBookingRepository
import com.glide.app.data.repository.SupabasePartnerRepository
import com.glide.app.data.repository.SupabaseShopRepository
import com.glide.app.domain.repository.AuthRepository
import com.glide.app.domain.repository.BookingRepository
import com.glide.app.domain.repository.PartnerRepository
import com.glide.app.domain.repository.ShopRepository
import dagger.Binds
import dagger.Module
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
abstract class RepositoryModule {

    @Binds
    @Singleton
    abstract fun bindAuthRepository(impl: SupabaseAuthRepository): AuthRepository

    @Binds
    @Singleton
    abstract fun bindShopRepository(impl: SupabaseShopRepository): ShopRepository

    @Binds
    @Singleton
    abstract fun bindLocationTracker(impl: FusedLocationTracker): LocationTracker

    @Binds
    @Singleton
    abstract fun bindPartnerRepository(impl: SupabasePartnerRepository): PartnerRepository

    @Binds
    @Singleton
    abstract fun bindBookingRepository(impl: SupabaseBookingRepository): BookingRepository
}
