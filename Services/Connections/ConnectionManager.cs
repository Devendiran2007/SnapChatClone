using System.Security.Claims;

namespace SnapChatClone.Services.Connections
{
public class ConnectionManager
{
    private readonly Dictionary<int, List<string>> _connections = new();

    public void AddConnection(int userId , string connectionId)
    {
        if(!_connections.ContainsKey(userId))
        {
            _connections[userId] = new List<string>();
        }
        _connections[userId].Add(connectionId);
    }

    public void RemoveConnection(int userId , string connectionId)
    {
        if(!_connections.ContainsKey(userId))
        {
            return;
        }
        
        _connections[userId].Remove(connectionId);

        if(_connections[userId].Count == 0)
        {
            _connections.Remove(userId);
        }
    }

    public bool IsOnline(int userId)
    {
        return _connections.ContainsKey(userId);
    }

    public List<string>? GetConnections(int userId)
    {
        if(_connections.ContainsKey(userId))
        {
            return _connections[userId];
        }
        return null;
    }



}
}