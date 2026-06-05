using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;
using SnapChatClone.Models;
using SnapChatClone.DTOs;
using SnapChatClone.Data;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class MessageController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public MessageController(ApplicationDbContext context) {
        _context = context;
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
            SentAt = DateTime.UtcNow
        };

        _context.Messages.Add(newMessage);
        _context.SaveChanges();

        return Ok("Message Sent");
    }

    [HttpGet("conversation/{id}")]
    public IActionResult GetConversation(int id)
    {
        var userId = GetCurrentUserId();

        var friendCheck = _context.Friendships.Any(
            s => s.UserId == userId 
            && s.FriendId == id
        );

        if (!friendCheck) {
            return BadRequest("Your Not Freinds with the User");
        }

        var conversation = _context.Messages
        .Where(m => (m.SenderId == userId && m.ReceiverId == id) || (m.SenderId == id && m.ReceiverId == userId)).OrderBy(m => m.SentAt)
        .Select(m => new {
            m.SenderId,
            m.Content,
            m.SentAt
        })
        .ToList();

        return Ok(conversation);
    }




}