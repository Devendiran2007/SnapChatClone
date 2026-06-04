namespace SnapChatClone.Models
{
    public class FriendRequest
    {
        public int Id { get; set; }

        public int SenderId { get; set; }

        public int ReceiverId { get; set; }

        public FriendRequestStatus Status { get; set; }

        public DateTime CreatedAt { get; set; }
    }

    public enum FriendRequestStatus
    {
        Pending,
        Accepted,
        Rejected,
        Blocked
    }
}