using SnapChatClone.Models;
using SnapChatClone.DTOs;

namespace SnapChatClone.Services.Messages
{
    public interface IMessageService
    {

        Task<Message> SendMessageAsync(int senderId , SendMessageDto sendMessageDto);

        Task<List<MessageDto>> GetConversationAsync(int userId , int friendId);

        Task<List<RecentChatDto>> GetRecentChatsAsync(int userId);

        Task MarkAsSeenAsync(int messageId);

        Task MarkAsDeliveredAsync(int messageId);

        Task<List<Message>> MarkConversationAsSeenAsync(int userId , int friendId);

    }
}