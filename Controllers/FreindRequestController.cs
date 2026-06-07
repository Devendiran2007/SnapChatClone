using Microsoft.AspNetCore.Mvc;
using SnapChatClone.DTOs;
using SnapChatClone.Data;
using System.Security.Claims;
using SnapChatClone.Models;
using Microsoft.AspNetCore.Authorization;
using SnapChatClone.Services.Connections;
using SnapChatClone.Services.Friends;

namespace SnapChatClone.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class FriendRequestController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly ConnectionManager _connectionManager;
    private readonly IFriendsService _friendsService;

    public FriendRequestController(ApplicationDbContext context , ConnectionManager connectionManager , IFriendsService friendsService)
    {
        _context = context;
        _connectionManager = connectionManager;
        _friendsService = friendsService;
    }

    [HttpPost("send-request")]
    public async Task<IActionResult> SendRequest(SendFriendRequestDto sendFriendRequestDto)
    {
        var senderId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        
        if (senderId == null)
        {
            return Unauthorized();
        }

        var senderIdInt = int.Parse(senderId);

        try
        {
            await _friendsService.SendFriendRequest(senderIdInt , sendFriendRequestDto);
            return Ok("Request Sent");
        }
        catch (Exception ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpGet("pending")]
    public async Task<IActionResult> GetPendingRequests()
    {
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userIdStr == null)
        {
            return Unauthorized();
        }
        var userID = int.Parse(userIdStr);

        try
        {
            var pendingRequests = await _friendsService.GetPendingRequest(userID);
            return Ok(pendingRequests);
        }
        catch (Exception ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpPost("accept")]
    public async Task<IActionResult> AcceptRequest(FriendRequestActionDto friendRequestDto)
    {
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userIdStr == null)
        {
            return Unauthorized();
        }
        var userId = int.Parse(userIdStr);

        try
        {
            await _friendsService.AcceptFriendRequest(userId , friendRequestDto.RequestId);
            return Ok("Request Accepted");
        }
        catch (Exception ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpPost("reject")]
    public async Task<IActionResult> RejectRequest(FriendRequestActionDto friendRequestDto)
    {
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userIdStr == null)
        {
            return Unauthorized();
        }
        var userId = int.Parse(userIdStr);

        try
        {
            await _friendsService.RejectFriendRequest(userId , friendRequestDto.RequestId);
            return Ok("Request Rejected");
        }
        catch (Exception ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpPost("block")]
    public async Task<IActionResult> BlockUser(BlockUserDto blockUserDto)
    {
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userIdStr == null)
        {
            return Unauthorized();
        }
        var userId = int.Parse(userIdStr);

        try
        {
            await _friendsService.BlockFriend(userId, blockUserDto.ReceiverId);
            return Ok("User Blocked");
        }
        catch (Exception ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpPost("unblock")]
    public async Task<IActionResult> UnblockUser(BlockUserDto unblockUserDto)
    {
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userIdStr == null)
        {
            return Unauthorized();
        }
        var userId = int.Parse(userIdStr);

        try
        {
            await _friendsService.UnblockFriend(userId, unblockUserDto.ReceiverId);
            return Ok("User Unblocked");
        }
        catch (Exception ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpGet("friends")]
    public async Task<IActionResult> GetFriends()
    {
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userIdStr == null)
        {
            return Unauthorized();
        }
        var userId = int.Parse(userIdStr);

        var result = await _friendsService.GetFriends(userId);

        return Ok(result);
    }

    [HttpGet("blocked")]
    public async Task<IActionResult> GetBlockedUsers()
    {
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userIdStr == null)
        {
            return Unauthorized();
        }
        var userId = int.Parse(userIdStr);

        try
        {
            var blocked = await _friendsService.GetBlockedUsers(userId);
            return Ok(blocked);
        }
        catch (Exception ex)
        {
            return BadRequest(ex.Message);
        }
    }
}