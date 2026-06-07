using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using SnapChatClone.Data;
using SnapChatClone.Models;

namespace SnapChatClone.Services.Stories
{
    public class StoryService : IStoryService
    {
        private readonly ApplicationDbContext _context;

        public StoryService(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<Story> CreateStoryAsync(int userId , string MediaUrl)
        {
            var newStory = new Story {
                UserId = userId,
                MediaUrl = MediaUrl,
                CreatedAt = DateTime.UtcNow,
                ExpiresAt = DateTime.UtcNow.AddHours(24),
                ViewCount = 0,
            };

            _context.Stories.Add(newStory);
            await _context.SaveChangesAsync();

            return newStory;
        }

        public async Task DeleteStoryAsync(int storyId , int userId)
        {
            var story = await _context.Stories.FindAsync(storyId);
            if (story == null) {
                throw new Exception("Story Not Found");
            }

            if (story.UserId != userId) {
                throw new Exception("You Cant Delete This Story");
            }

            _context.Stories.Remove(story);
            await _context.SaveChangesAsync();
        }

        public async Task<List<Story>> GetStoriesByUserAsync(int userId)
        {
            var stories = await _context.Stories
                .Where(s => s.UserId == userId && s.ExpiresAt > DateTime.UtcNow)
                .ToListAsync();

            return stories;
        }

        public async Task<List<Story>> GetAllStoriesAsync(int myId) {
            var stories = await _context.Stories
                .Where(s => s.ExpiresAt > DateTime.UtcNow)
                .ToListAsync();

            var blockedUsers = await _context.FriendRequests
                .Where(b => (b.SenderId == myId || b.ReceiverId == myId) && b.Status == FriendRequestStatus.Blocked)
                .Select(b => b.SenderId == myId ? b.ReceiverId : b.SenderId)
                .ToListAsync();

            stories = stories.Where(s => !blockedUsers.Contains(s.UserId)).ToList();

            return stories;
        }

        public async Task<Story> GetStoryAsync(int storyId) {
            var story = await _context.Stories.FindAsync(storyId);

            if (story == null) {
                throw new Exception("Story Not Found");
            }
            return story;
        }
    }
}
