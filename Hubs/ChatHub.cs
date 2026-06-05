using Microsoft.AspNetCore.SignalR;
using SnapChatClone.Data;
using System.Security.Claims;
using SnapChatClone.Models;

public class ChatHub : Hub
{
    private static Dictionary<int , List<string>> _connections = new();
    private readonly ApplicationDbContext _context;

    public ChatHub(ApplicationDbContext context)
    {
        _context = context;
    }

    public int GetCurrentUserId() {

        var userIdStr = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "";
        return int.Parse(userIdStr);
    }

    public override async Task OnConnectedAsync()
    {
        var userId = GetCurrentUserId();

        if(!_connections.ContainsKey(userId))
        {
            _connections[userId] = new List<string>();
        }
        _connections[userId].Add(Context.ConnectionId);

        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var userId = GetCurrentUserId();

        if(_connections.ContainsKey(userId))
        {
            _connections[userId].Remove(Context.ConnectionId);
        }

        if(_connections[userId].Count == 0)
        {
            _connections.Remove(userId);
        }

        await base.OnDisconnectedAsync(exception);
    }

    public async Task SendMessage(int receiverId , string content)
    {
        var senderId = GetCurrentUserId();

        var freindCheck = _context.Friendships.Any(
            s => (s.UserId == senderId && s.FriendId == receiverId)
            || (s.UserId == receiverId && s.FriendId == senderId)
        );

        if (!freindCheck) {
            return;
        }

        var message = new Message
        {
            SenderId = senderId,
            ReceiverId = receiverId,
            Content = content,
            SentAt = DateTime.UtcNow
        };

        await _context.Messages.AddAsync(message);
        await _context.SaveChangesAsync();

        if (_connections.ContainsKey(receiverId))
        {
            var connections = _connections[receiverId];
            foreach (var connectionId in connections)
            {
                await Clients.Client(connectionId).SendAsync("ReceiveMessage", senderId, content);
            }
        }

        if (_connections.ContainsKey(senderId))
        {
            foreach (var connectionId in _connections[senderId])
            {
                if (connectionId == Context.ConnectionId)
                {
                    continue; 
                }
                await Clients.Client(connectionId).SendAsync("ReceiveMessage",senderId,content);
            }
        }
    }   
}