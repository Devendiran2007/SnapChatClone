using System.Collections.Generic;
using System.Threading.Tasks;
using SnapChatClone.Models;

namespace SnapChatClone.Services.Stories
{
    public interface IStoryService
    {
        Task<Story> CreateStoryAsync(int userId, string mediaUrl);

        Task DeleteStoryAsync(int storyId, int userId);

        Task<List<Story>> GetAllStoriesAsync(int myId);

        Task<Story> GetStoryAsync(int storyId);

        Task<List<Story>> GetStoriesByUserAsync(int userId);
    }
}
