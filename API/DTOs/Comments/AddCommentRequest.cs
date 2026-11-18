using System.ComponentModel.DataAnnotations;

namespace API.DTOs.Comments;

// JSON body for POST /tickets/{id}/comments.
public record AddCommentRequest(
    [Required, StringLength(5000, MinimumLength = 1)] string Body);
