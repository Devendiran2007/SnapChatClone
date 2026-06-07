using Microsoft.AspNetCore.SignalR;
using SnapChatClone.Data;
using System.Security.Claims;
using SnapChatClone.Models;
using SnapChatClone.Services.Messages;
using SnapChatClone.DTOs;
using SnapChatClone.Services.Connections;

public class ChatHub : Hub
{
    private static Dictionary<int , List<string>> _connections = new();
    private readonly ApplicationDbContext _context;
    private readonly ConnectionManager _connectionManager;
    private readonly IMessageService _messageService;

    public ChatHub(ApplicationDbContext context, ConnectionManager connectionManager , IMessageService messageService)
    {
        _context = context;
        _connectionManager = connectionManager;
        _messageService = messageService;
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

        var savedMessage = await _messageService.SendMessageAsync(senderId , new SendMessageDto { ReceiverId = receiverId , Content = content });

        if (savedMessage == null) return;

        if (_connections.ContainsKey(receiverId))
        {
            var connections = _connections[receiverId];
            foreach (var connectionId in connections)
            {
                await Clients.Client(connectionId).SendAsync("ReceiveMessage", savedMessage.SenderId, savedMessage.Content, savedMessage.SentAt);
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
                await Clients.Client(connectionId).SendAsync("ReceiveMessage", savedMessage.SenderId, savedMessage.Content, savedMessage.SentAt);
            }
        }
    }

    public async Task Typing(int receiverId)
    {
        var senderId = GetCurrentUserId();
        
        var receiverConnections = _connectionManager.GetConnections(receiverId);

        foreach(var connectionId in receiverConnections)
        {
            await Clients.Client(connectionId).SendAsync("UserTyping",senderId);
        }
    }

    public async Task StopTyping(int receiverId)
    {
        var senderId = GetCurrentUserId();

        var receiverConnections = _connectionManager.GetConnections(receiverId);

        foreach(var connectionId in receiverConnections)
        {
            await Clients.Client(connectionId).SendAsync("UserStopTyping",senderId);
        }
    }

}