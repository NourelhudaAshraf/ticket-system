using API.Models.Enums;

namespace API.DTOs.Comments;

// One message in a ticket's conversation. The stored Comment only has AuthorId; AuthorName and
// AuthorRole are looked up from users when the ticket is shown (like Mongoose's populate).
public record CommentDto(
    string Id,
    string AuthorId,
    string AuthorName,
    UserRole AuthorRole,
    string Body,
    DateTime CreatedAt);
