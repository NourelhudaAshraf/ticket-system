namespace API.DTOs.Users;

// One agent for the reassign and default-agent pickers: name plus the (non-deleted) categories
// they belong to, so the user can pick the agent and then one of that agent's categories.
// Serialized as { id, name, categories: [{ id, name }] }.
public record AgentDto(string Id, string Name, IReadOnlyList<AgentDto.CategoryRef> Categories)
{
    public record CategoryRef(string Id, string Name);
}
