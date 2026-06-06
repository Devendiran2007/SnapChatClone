using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;
using SnapChatClone.Models;
using SnapChatClone.DTOs;
using SnapChatClone.Data;
using SnapChatClone.Services.Messages;
using Microsoft.AspNetCore.SignalR;
using SnapChatClone.Services.Connections;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class MessageController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly IMessageService _messageService;
    private readonly IHubContext<ChatHub> _hubContext;
    private readonly ConnectionManager _connectionManager;

    public MessageController(ApplicationDbContext context, IMessageService messageService, IHubContext<ChatHub> hubContext, ConnectionManager connectionManager) {
        _context = context;
        _messageService = messageService;
        _hubContext = hubContext;
        _connectionManager = connectionManager;
    }

    private int GetCurrentUserId()
    {
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return int.Parse(userIdStr);
    }

    [HttpPost("send")]
    public IActionResult SendMessage(SendMessageDto sendMessageDto)
    {
        var userId = GetCurrentUserId();
        
        if (userId == sendMessageDto.ReceiverId) {
            return BadRequest("Cant Send Message to Yourself!");
        }

        var reciever = _context.Users.FirstOrDefault(s => s.Id == sendMessageDto.ReceiverId);

        if (reciever == null) {
            return BadRequest("No User Found");
        }

        var freindExist = _context.Friendships.FirstOrDefault(
            s => s.UserId == userId 
            && s.FriendId == sendMessageDto.ReceiverId
        );

        if (freindExist == null) {
            return BadRequest("Your Not Freinds");
        } 

        var newMessage = new Message {
            SenderId = userId,
            ReceiverId = sendMessageDto.ReceiverId,
            Content = sendMessageDto.Content,
            SentAt = DateTime.UtcNow,
            IsDelivered = false,
            IsSeen = false
        };

        _context.Messages.Add(newMessage);
        _context.SaveChanges();

        return Ok("Message Sent");
    }

    [HttpGet("conversation/{id}")]
    public async Task<IActionResult> GetConversation(int id)
    {
        var userId = GetCurrentUserId();

        var seenMessages = await _messageService.MarkConversationAsSeenAsync(userId , id);

        foreach (var message in seenMessages)
        {
            var senderConnections = _connectionManager.GetConnections(message.SenderId);

            foreach (var connectionId in senderConnections) {
                await _hubContext.Clients.Client(connectionId).SendAsync("MessageSeen", message);
            }
        }

        var getconversation = await _messageService.GetConversationAsync(userId , id);

        return Ok(getconversation);
    }




}