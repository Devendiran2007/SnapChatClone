using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using SnapChatClone.Models;
using SnapChatClone.Data;
using SnapChatClone.DTOs;
using Microsoft.EntityFrameworkCore;

namespace SnapChatClone.Services.Friends
{
    public class FriendService : IFriendsService
    {
        private readonly ApplicationDbContext _context;

        public FriendService(ApplicationDbContext context)
        {
            _context = context;
        }

        private async Task<bool> freindCheck(int userId , int freindId) {
            return await _context.Friendships.AnyAsync(
                s => (s.UserId == userId && s.FriendId == freindId) 
                || (s.UserId == freindId && s.FriendId == userId)
            );
        }

        public async Task<List<User>> GetFriends(int userId)
        {
            var friends = 
                from friendship in _context.Friendships
                join user in _context.Users 
                    on friendship.FriendId equals user.Id
                where friendship.UserId == userId
                select user;

            return await friends.ToListAsync();
        }

        public async Task SendFriendRequest(int senderId, SendFriendRequestDto sendFriendRequestDto) 
        {
            var friend = await _context.Users.FindAsync(sendFriendRequestDto.ReceiverId);
            if (friend == null)
            {
                throw new Exception("User Not Found");
            }

            if (senderId == sendFriendRequestDto.ReceiverId)
            {
                throw new Exception("You Cant Send Request to Yourself");
            }

            var checkRequest = await _context.FriendRequests.FirstOrDefaultAsync(
                s => s.SenderId == senderId
                && s.ReceiverId == sendFriendRequestDto.ReceiverId
            );

            if (checkRequest != null)
            {
                throw new Exception("Request Already Sent");
            }

            var reverseRequest = await _context.FriendRequests.FirstOrDefaultAsync(
                s => s.SenderId == sendFriendRequestDto.ReceiverId
                && s.ReceiverId == senderId
                && s.Status == FriendRequestStatus.Pending
            );

            if (reverseRequest != null)
            {
                reverseRequest.Status = FriendRequestStatus.Accepted;
                await _context.SaveChangesAsync();
                return;
            }

            var newRequest = new FriendRequest
            {
                SenderId = senderId,
                ReceiverId = sendFriendRequestDto.ReceiverId,
                Status = FriendRequestStatus.Pending,
                CreatedAt = DateTime.UtcNow,
            };

            _context.FriendRequests.Add(newRequest);
            await _context.SaveChangesAsync();
        }

        public async Task AcceptFriendRequest(int userId, int requestId)
        {
            var request = await _context.FriendRequests.FindAsync(requestId);
            if (request == null)
            {
                throw new Exception("Request Not Found");
            }

            if (request.ReceiverId != userId)
            {
                throw new Exception("You Cant Accept This Request");
            }

            if (request.Status != FriendRequestStatus.Pending)
            {
                throw new Exception("Request is Already Accepted Or Rejected");
            }

            request.Status = FriendRequestStatus.Accepted;

            var friendship1 = new Friendship
            {
                UserId = userId,
                FriendId = request.SenderId,
                CreatedAt = DateTime.UtcNow
            };

            var friendship2 = new Friendship
            {
                UserId = request.SenderId,
                FriendId = userId,
                CreatedAt = DateTime.UtcNow
            };

            _context.Friendships.Add(friendship1);
            _context.Friendships.Add(friendship2);
            await _context.SaveChangesAsync();
        }

        public async Task RejectFriendRequest(int userId, int requestId)
        {
            var request = await _context.FriendRequests.FindAsync(requestId);
            if (request == null)
            {
                throw new Exception("Request Not Found");
            }

            if (request.ReceiverId != userId)
            {
                throw new Exception("You Cant Reject This Request");
            }

            if (request.Status != FriendRequestStatus.Pending)
            {
                throw new Exception("Request is Already Accepted Or Rejected");
            }

            request.Status = FriendRequestStatus.Rejected;
            await _context.SaveChangesAsync();
        }

        public async Task<List<object>> GetPendingRequest(int userId)
        {
            var pendingRequest = await _context.FriendRequests
                .Where(s => s.ReceiverId == userId && s.Status == FriendRequestStatus.Pending)
                .ToListAsync();

            var pendingRequestDetals = new List<object>();

            foreach (var request in pendingRequest)
            {
                var sender = await _context.Users.FindAsync(request.SenderId);
                if (sender?.Username != null)
                {
                    pendingRequestDetals.Add(new {
                        RequestId = request.Id,
                        SenderUsername = sender.Username
                    });
                }
            }

            return pendingRequestDetals;
        }

        public async Task BlockFriend(int senderId, int receiverId)
        {
            var checkFriend = await freindCheck(senderId, receiverId);

            if (checkFriend == false) {
                throw new Exception("Users are not friends Cannot Block them");
            }

            var checkBlock = await _context.FriendRequests.FirstOrDefaultAsync(
                s => (s.SenderId == senderId && s.ReceiverId == receiverId
                || s.SenderId == receiverId && s.ReceiverId == senderId)
                && s.Status == FriendRequestStatus.Blocked
            );

            if (checkBlock != null)
            {
                throw new Exception("Already Blocked");
            }

            var requestToBlock = await _context.FriendRequests.FirstOrDefaultAsync(
                s => (s.SenderId == senderId && s.ReceiverId == receiverId
                || s.SenderId == receiverId && s.ReceiverId == senderId)
                && s.Status == FriendRequestStatus.Accepted
            );

            if (requestToBlock != null)
            {
                requestToBlock.SenderId = senderId;
                requestToBlock.ReceiverId = receiverId;
                requestToBlock.Status = FriendRequestStatus.Blocked;
            }
            else
            {
                var newBlock = new FriendRequest
                {
                    SenderId = senderId,
                    ReceiverId = receiverId,
                    Status = FriendRequestStatus.Blocked,
                    CreatedAt = DateTime.UtcNow
                };
                _context.FriendRequests.Add(newBlock);
            }

            var friendships = await _context.Friendships.Where(
                f => (f.UserId == senderId && f.FriendId == receiverId)
                || (f.UserId == receiverId && f.FriendId == senderId)
            ).ToListAsync();

            _context.Friendships.RemoveRange(friendships);
            await _context.SaveChangesAsync();
        }

        public async Task UnblockFriend(int senderId, int receiverId)
        {
            var checkBlock = await _context.FriendRequests.FirstOrDefaultAsync(
                s => s.SenderId == senderId && s.ReceiverId == receiverId
                && s.Status == FriendRequestStatus.Blocked
            );

            if (checkBlock == null)
            {
                throw new Exception("You have not blocked this user");
            }

            _context.FriendRequests.Remove(checkBlock);
            await _context.SaveChangesAsync();
        }

        public async Task<List<User>> GetBlockedUsers(int userId)
        {
            var blockedIds = await _context.FriendRequests
                .Where(s => s.SenderId == userId && s.Status == FriendRequestStatus.Blocked)
                .Select(s => s.ReceiverId)
                .ToListAsync();

            return await _context.Users
                .Where(u => blockedIds.Contains(u.Id))
                .ToListAsync();
        }
    }
}
