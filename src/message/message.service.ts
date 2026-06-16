import { MessageModel } from './message.model.js';
import { PackageModel } from '../package/package.model.js';
import { UserModel } from '../user/user.model.js';
import { Op } from 'sequelize';

export class MessageService {
  async sendMessage(packageId: string, senderId: string, message: string) {
    const pkg = await PackageModel.findByPk(packageId);
    if (!pkg) throw new Error('Package not found');

    return await MessageModel.create({
      package_id: packageId,
      sender_id: senderId,
      message
    });
  }

  async getMessages(packageId: string, userId: string) {
    const pkg = await PackageModel.findByPk(packageId);
    
    if (!pkg) throw new Error('Package not found');
    
    const isAuthorized = pkg.sender_id === userId || pkg.rider_id === userId;
    
    if (!isAuthorized) throw new Error('Unauthorized');

    const messages = await MessageModel.findAll({
      where: { package_id: packageId },
      include: [{ 
        model: UserModel, 
        as: 'sender',
        attributes: ['id', 'first_name', 'surname', 'email']
      }],
      order: [['created_at', 'ASC']]
    });

    await MessageModel.update(
      { is_read: true },
      { where: { package_id: packageId, sender_id: { [Op.ne]: userId } } }
    );

    return messages;
  }

  async getUnreadCount(packageId: string, userId: string) {
    return await MessageModel.count({
      where: {
        package_id: packageId,
        sender_id: { [Op.ne]: userId },
        is_read: false
      }
    });
  }
}

export default new MessageService();
