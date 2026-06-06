using Microsoft.AspNetCore.Mvc;
using SnapChatClone.DTOs;
using SnapChatClone.Data;
using System.Security.Claims;
using SnapChatClone.Models;
using Microsoft.AspNetCore.Authorization;
using SnapChatClone.Services.Connections;

namespace SnapChatClone.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class FriendRequestController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly ConnectionManager _connectionManager;

    public FriendRequestController(ApplicationDbContext context , ConnectionManager connectionManager)
    {
        _context = context;
        _connectionManager = connectionManager;
    }

    [HttpPost("send-request")]
    public IActionResult SendRequest(SendFriendRequestDto sendFriendRequestDto)
    {
        var senderId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (senderId == null)
        {
            return Unauthorized();
        }

        var senderIdInt = int.Parse(senderId);

        var friend = _context.Users.Find(sendFriendRequestDto.ReceiverId);
        if (friend == null)
        {
            return BadRequest("User Not Found");
        }

        if (senderIdInt == sendFriendRequestDto.ReceiverId)
        {
            return BadRequest("You Cant Send Request to Yourself");
        }

        var checkRequest = _context.FriendRequests.FirstOrDefault(
            s => s.SenderId == senderIdInt
            && s.ReceiverId == sendFriendRequestDto.ReceiverId
        );

        if (checkRequest != null)
        {
            return BadRequest("Request Already Sent");
        }

        var reverseRequest = _context.FriendRequests.FirstOrDefault(
            s => s.SenderId == sendFriendRequestDto.ReceiverId
            && s.ReceiverId == senderIdInt
            && s.Status == FriendRequestStatus.Pending
        );

        if (reverseRequest != null)
        {
            reverseRequest.Status = FriendRequestStatus.Accepted;
            _context.SaveChanges();
            return Ok("Request Accepted");
        }

        var newRequest = new FriendRequest
        {
            SenderId = senderIdInt,
            ReceiverId = sendFriendRequestDto.ReceiverId,
            Status = FriendRequestStatus.Pending,
            CreatedAt = DateTime.UtcNow,
        };

        _context.FriendRequests.Add(newRequest);
        _context.SaveChanges();

        return Ok("Request Sent");
    }

    [HttpGet("pending")]
    public IActionResult GetPendingRequests()
    {
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userIdStr == null)
        {
            return Unauthorized();
        }
        var userID = int.Parse(userIdStr);

        var pendingRequests = _context.FriendRequests
            .Where(f => f.ReceiverId == userID
            && f.Status == FriendRequestStatus.Pending).ToList();

        var pendingRequestDetails = new List<object>();

        foreach (var request in pendingRequests)
        {
            var user = _context.Users.Find(request.SenderId);
            if (user?.Username != null)
            {
                pendingRequestDetails.Add(new {
                    RequestId = request.Id,
                    SenderUsername = user.Username
                });
            }
        }
        return Ok(pendingRequestDetails);
    }

    [HttpPost("accept")]
    public IActionResult AcceptRequest(FriendRequestActionDto friendRequestDto)
    {
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userIdStr == null)
        {
            return Unauthorized();
        }
        var userId = int.Parse(userIdStr);

        var request = _context.FriendRequests.Find(friendRequestDto.RequestId);
        if (request == null)
        {
            return BadRequest("Request Not Found");
        }

        if (request.ReceiverId != userId)
        {
            return BadRequest("You Cant Accept This Request");
        }

        if (request.Status != FriendRequestStatus.Pending)
        {
            return BadRequest("Request is Already Accepted Or Rejected");
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
        _context.SaveChanges();

        return Ok("Request Accepted");
    }

    [HttpPost("reject")]
    public IActionResult RejectRequest(FriendRequestActionDto friendRequestDto)
    {
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userIdStr == null)
        {
            return Unauthorized();
        }
        var userId = int.Parse(userIdStr);

        var request = _context.FriendRequests.Find(friendRequestDto.RequestId);
        if (request == null)
        {
            return BadRequest("Request Not Found");
        }

        if (request.ReceiverId != userId)
        {
            return BadRequest("You Cant Reject This Request");
        }

        if (request.Status != FriendRequestStatus.Pending)
        {
            return BadRequest("Request is Already Accepted Or Rejected");
        }

        request.Status = FriendRequestStatus.Rejected;
        _context.SaveChanges();

        return Ok("Request Rejected");
    }

    [HttpGet("friends")]
    public IActionResult GetFriends()
    {
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userIdStr == null)
        {
            return Unauthorized();
        }
        var userId = int.Parse(userIdStr);

        var friends =
            (from friendship in _context.Friendships
             join user in _context.Users
                 on friendship.FriendId equals user.Id
             where friendship.UserId == userId
             select new
             {
                 user.Id,
                 user.Username
             }).ToList();

        var result = friends.Select(f => new {
            Id = f.Id,
            Username = f.Username,
            IsOnline = _connectionManager.IsOnline(f.Id)
        });

        return Ok(result);
    }
}