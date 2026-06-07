
using System.Collections.Generic;
using System.Threading.Tasks;
using SnapChatClone.Models;
using SnapChatClone.DTOs;

namespace SnapChatClone.Services.Friends
{
    public interface IFriendsService
    {
        Task<List<User>> GetFriends(int userId);

        Task SendFriendRequest(int senderId, SendFriendRequestDto sendFriendRequestDto);

        Task AcceptFriendRequest(int userId, int requestId);

        Task RejectFriendRequest(int userId, int requestId);

        Task BlockFriend(int senderId , int receiverId);

        Task UnblockFriend(int senderId, int receiverId);

        Task<List<User>> GetBlockedUsers(int userId);

        Task<List<object>> GetPendingRequest(int userId);
    }
}
