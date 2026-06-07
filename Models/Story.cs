
namespace SnapChatClone.Models
{
    public class Story
    {
        public int Id { get; set; }

        public int UserId { get; set; }

        public string? MediaUrl { get; set; }

        public DateTime CreatedAt { get; set; }

        public DateTime ExpiresAt { get; set; }

        public int ViewCount { get; set; }

    }
}