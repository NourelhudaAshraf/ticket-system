namespace API.DTOs.Categories;

// What the API returns for a category. Deleted categories are never returned. Customers only need
// Id and Name to pick a category, so CategoryService leaves the agent fields null for them.
// DefaultAgentName and AgentCount are not stored; they are looked up from users when listing.
public record CategoryDto(
    string Id,
    string Name,
    string? DefaultAgentId,
    string? DefaultAgentName,
    int? AgentCount);
