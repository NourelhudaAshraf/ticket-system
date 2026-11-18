namespace API.Data;

// Typed settings for the "Mongo" configuration section (options pattern). Program.cs binds this
// class to configuration, so code asks for IOptions<MongoOptions> instead of reading raw strings.
// Real values come from user secrets in development and environment variables in production.
public class MongoOptions
{
    // Name of the configuration section this class is bound to.
    // configuration["Mongo:ConnectionString"]
    public const string SectionName = "Mongo";

    public string ConnectionString { get; set; } = string.Empty;

    public string Database { get; set; } = string.Empty;
}
