namespace API.Models.Enums;

// The three roles a user can have. Stored in MongoDB as text ("Customer", "Agent", "Admin")
// by the enum-as-string convention registered in MongoDbContext, so the database stays readable.
public enum UserRole
{
    Customer,
    Agent,
    Admin
}
