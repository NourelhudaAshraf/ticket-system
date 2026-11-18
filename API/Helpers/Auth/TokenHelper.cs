using System.Buffers.Text;
using System.Security.Cryptography;
using System.Text;

namespace API.Helpers.Auth;

// Tokens for emailed links (verify email, reset password, invitation). The raw token goes only into
// the email; the database keeps its SHA-256 hash, so someone who reads the database still cannot
// build a working link (research R7).
public static class TokenHelper
{
    // 32 random bytes from the OS's secure generator, written in URL-safe Base64 (no + / =),
    // so the token can sit in a query string without escaping.
    public static string GenerateToken() => Base64Url.EncodeToString(RandomNumberGenerator.GetBytes(32));

    // The value stored on the user. SHA-256 without a salt is fine here: the token is already
    // 256 bits of randomness, so there is nothing to guess (unlike passwords, which need PBKDF2).
    public static string Hash(string token) =>
        Convert.ToHexStringLower(SHA256.HashData(Encoding.UTF8.GetBytes(token)));

    // FixedTimeEquals takes the same time whether the first or the last character differs, so an
    // attacker cannot learn the hash one character at a time by measuring response times.
    public static bool Matches(string token, string storedHash) =>
        CryptographicOperations.FixedTimeEquals(
            Encoding.UTF8.GetBytes(Hash(token)),
            Encoding.UTF8.GetBytes(storedHash));
}
