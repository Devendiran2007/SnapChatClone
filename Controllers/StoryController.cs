using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using SnapChatClone.Services.Stories;
using SnapChatClone.Models;
using System.Security.Claims;
using System.Threading.Tasks;
using System.Collections.Generic;

namespace SnapChatClone.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class StoryController : ControllerBase
    {
        private readonly IStoryService _storyService;

        public StoryController(IStoryService storyService)
        {
            _storyService = storyService;
        }

        [HttpPost]
        public async Task<IActionResult> CreateStory([FromBody] CreateStoryDto dto)
        {
            var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (userIdStr == null)
            {
                return Unauthorized();
            }
            var userId = int.Parse(userIdStr);

            try
            {
                var story = await _storyService.CreateStoryAsync(userId, dto.MediaUrl);
                return Ok(story);
            }
            catch (System.Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpGet]
        public async Task<IActionResult> GetAllStories()
        {
            var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (userIdStr == null)
            {
                return Unauthorized();
            }
            var userId = int.Parse(userIdStr);

            try
            {
                var stories = await _storyService.GetAllStoriesAsync(userId);
                return Ok(stories);
            }
            catch (System.Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpGet("{storyId}")]
        public async Task<IActionResult> GetStory(int storyId)
        {
            try
            {
                var story = await _storyService.GetStoryAsync(storyId);
                return Ok(story);
            }
            catch (System.Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpGet("user/{userId}")]
        public async Task<IActionResult> GetStoriesByUser(int userId)
        {
            try
            {
                var stories = await _storyService.GetStoriesByUserAsync(userId);
                return Ok(stories);
            }
            catch (System.Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpDelete("{storyId}")]
        public async Task<IActionResult> DeleteStory(int storyId)
        {
            var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (userIdStr == null)
            {
                return Unauthorized();
            }
            var userId = int.Parse(userIdStr);

            try
            {
                await _storyService.DeleteStoryAsync(storyId, userId);
                return Ok("Story Deleted");
            }
            catch (System.Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }
    }

    public class CreateStoryDto
    {
        public required string MediaUrl { get; set; }
    }
}
