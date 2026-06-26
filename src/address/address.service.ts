import { AddressRepository } from './address.repository.js';

export class AddressService {
  private addressRepository = new AddressRepository();

  async createAddress(userId: string, data: {
    label: string;
    address: string;
    city?: string;
    state?: string;
    latitude?: number;
    longitude?: number;
    is_default?: boolean;
  }): Promise<any> {
    if (data.is_default) {
      await this.addressRepository.clearDefaultAddresses(userId);
    }

    return await this.addressRepository.createAddress({
      user_id: userId,
      ...data
    });
  }

  async getUserAddresses(userId: string): Promise<any[]> {
    return await this.addressRepository.findByUserId(userId);
  }

  async getAddressById(addressId: string, userId: string): Promise<any> {
    return await this.addressRepository.findById(addressId, userId);
  }

  async updateAddress(addressId: string, userId: string, data: {
    label?: string;
    address?: string;
    city?: string;
    state?: string;
    latitude?: number;
    longitude?: number;
  }): Promise<void> {
    const address = await this.addressRepository.findById(addressId, userId);
    if (!address) {
      throw new Error('Address not found');
    }

    await this.addressRepository.updateAddress(addressId, userId, data);
  }

  async setDefaultAddress(addressId: string, userId: string): Promise<void> {
    const address = await this.addressRepository.findById(addressId, userId);
    if (!address) {
      throw new Error('Address not found');
    }

    await this.addressRepository.setDefaultAddress(addressId, userId);
  }

  async deleteAddress(addressId: string, userId: string): Promise<void> {
    const address = await this.addressRepository.findById(addressId, userId);
    if (!address) {
      throw new Error('Address not found');
    }

    await this.addressRepository.deleteAddress(addressId, userId);
  }

  async getDefaultAddress(userId: string): Promise<any> {
    return await this.addressRepository.getDefaultAddress(userId);
  }
}