using SnapChatClone.Data;
using SnapChatClone.Models;
using SnapChatClone.DTOs;
using SnapChatClone.Services.Connections;
using Microsoft.EntityFrameworkCore;

namespace SnapChatClone.Services.Messages
{
public class MessageService : IMessageService
{
    private readonly ApplicationDbContext _context;
    private readonly ConnectionManager _connectionManager;

    public MessageService(ApplicationDbContext context , ConnectionManager connectionManager)
    {
        _context = context;
        _connectionManager = connectionManager;
    }

    private async Task<bool> freindCheck(int userId , int freindId) {
        return await _context.Friendships.AnyAsync(
            s => (s.UserId == userId && s.FriendId == freindId) 
            || (s.UserId == freindId && s.FriendId == userId)
        );
    }

    private async Task<bool> blockCheck(int userId , int freindId) {
        var checkBlock = await _context.FriendRequests.FirstOrDefaultAsync(
            s => (s.SenderId == userId && s.ReceiverId == freindId
            || s.SenderId == freindId && s.ReceiverId == userId) && s.Status == FriendRequestStatus.Blocked
        );
        return checkBlock != null;
    }

    public async Task<Message> SendMessageAsync(int senderId , SendMessageDto sendMessageDto) 
    {
        var blocked = await blockCheck(senderId , sendMessageDto.ReceiverId);
        if (blocked == true) {
            throw new Exception("You have Blocked this user");
        }
        if (!await freindCheck(senderId , sendMessageDto.ReceiverId)) {
            throw new Exception("Users are Not Freinds");
        }

        var message = new Message
        {
            SenderId = senderId,
            ReceiverId = sendMessageDto.ReceiverId,
            Content = sendMessageDto.Content,
            SentAt = DateTime.UtcNow,
            IsDelivered = false,
            IsSeen = false
        };

        _context.Messages.Add(message);
        await _context.SaveChangesAsync();

        return message;
    }

    public async Task<List<MessageDto>> GetConversationAsync(int userId , int freindId)
    {
        if (!await freindCheck(userId , freindId)) {
            throw new Exception("Users are Not Freinds");
        }

        var conversation = await _context.Messages
        .Where(m => (m.SenderId == userId && m.ReceiverId == freindId)
        || (m.SenderId == freindId && m.ReceiverId == userId))
        .OrderBy(m => m.SentAt)
        .Select(m => new MessageDto {
            SenderId = m.SenderId,
            Content = m.Content,
            SentAt = m.SentAt
        })
        .ToListAsync();

        return conversation;
    }
    
    public async Task<List<RecentChatDto>> GetRecentChatsAsync(int userId) {
        var messages = await _context.Messages
            .Where(m => m.SenderId == userId || m.ReceiverId == userId)
            .ToListAsync();

        var grouped = messages
            .GroupBy(m => m.SenderId == userId ? m.ReceiverId : m.SenderId)
            .Select(g => new {
                FriendId = g.Key,
                LastMsg = g.OrderByDescending(m => m.SentAt).First()
            })
            .ToList();


        var friendIds = grouped.Select(x => x.FriendId).ToList();
        var friends = await _context.Users
            .Where(u => friendIds.Contains(u.Id))
            .ToDictionaryAsync(u => u.Id, u => u.Username);


        var recentChats = grouped.Select(x => new RecentChatDto {
            UserId = x.FriendId,
            Username = friends.ContainsKey(x.FriendId) ? friends[x.FriendId] : "Unknown",
            LastMessage = x.LastMsg.Content,
            LastMessageTime = x.LastMsg.SentAt,
            IsOnline = _connectionManager.IsOnline(x.FriendId)
        })
        .OrderByDescending(rc => rc.LastMessageTime)
        .ToList();

        return recentChats;
    }
    
    public async Task MarkAsSeenAsync(int messageId)
    {
        var message = await _context.Messages.FindAsync(messageId);

        if(message != null) {
            message.IsSeen = true;
            await _context.SaveChangesAsync();
        }
        
    }

    public async Task MarkAsDeliveredAsync(int messageId)
    {
        var message = await _context.Messages.FindAsync(messageId);

        if(message != null) {
            message.IsDelivered = true;
            await _context.SaveChangesAsync();
        }
    }

    public async Task<List<Message>> MarkConversationAsSeenAsync(int senderId , int receiverId)
    {
        var Mark = await _context.Messages.Where(m => m.SenderId == senderId && m.ReceiverId == receiverId && m.IsSeen == false).ToListAsync();
        
        foreach(var message in Mark)
        {
            message.IsSeen = true;
        }

        await _context.SaveChangesAsync();

        return Mark;
    }
}
}