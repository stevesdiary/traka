import { UserAddressModel } from './address.model.js';

export class AddressRepository {
  async createAddress(data: {
    user_id: string;
    label: string;
    address: string;
    city?: string;
    state?: string;
    latitude?: number;
    longitude?: number;
    is_default?: boolean;
  }): Promise<UserAddressModel> {
    return await UserAddressModel.create(data);
  }

  async findByUserId(userId: string): Promise<UserAddressModel[]> {
    return await UserAddressModel.findAll({
      where: { 
        user_id: userId,
        is_active: true 
      },
      order: [['is_default', 'DESC'], ['createdAt', 'DESC']]
    });
  }

  async findById(addressId: string, userId: string): Promise<UserAddressModel | null> {
    return await UserAddressModel.findOne({
      where: { 
        id: addressId,
        user_id: userId,
        is_active: true 
      }
    });
  }

  async updateAddress(addressId: string, userId: string, data: {
    label?: string;
    address?: string;
    city?: string;
    state?: string;
    latitude?: number;
    longitude?: number;
  }): Promise<void> {
    await UserAddressModel.update(data, {
      where: { 
        id: addressId,
        user_id: userId 
      }
    });
  }

  async setDefaultAddress(addressId: string, userId: string): Promise<void> {
    // Remove default from all user addresses
    await UserAddressModel.update(
      { is_default: false },
      { where: { user_id: userId } }
    );

    // Set new default
    await UserAddressModel.update(
      { is_default: true },
      { where: { id: addressId, user_id: userId } }
    );
  }

  async deleteAddress(addressId: string, userId: string): Promise<void> {
    await UserAddressModel.update(
      { is_active: false },
      { where: { id: addressId, user_id: userId } }
    );
  }

  async getDefaultAddress(userId: string): Promise<UserAddressModel | null> {
    return await UserAddressModel.findOne({
      where: { 
        user_id: userId,
        is_default: true,
        is_active: true 
      }
    });
  }
}