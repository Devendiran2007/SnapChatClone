namespace SnapChatClone.DTOs
{
    public class RecentChatDto
    {
        public int UserId { get; set; }

        public string Username { get; set; }

        public string LastMessage { get; set; }

        public DateTime LastMessageTime { get; set; }

        public bool IsOnline { get; set; }
        
    }
}