using System.Security.Cryptography;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

var app = builder.Build();

const string HOOKDECK_SIGNATURE_HEADER = "X-Hookdeck-Signature";
const string HOOKDECK_WEBHOOK_SECRET_CONFIG_KEY = "inbound:HookdeckWebhookSecret";

string WEBHOOK_SECRET = builder.Configuration[HOOKDECK_WEBHOOK_SECRET_CONFIG_KEY] ?? string.Empty;

static bool VerifyHmacWebhookSignature(HttpContext context, string webhookSecret, string rawBody)
{
    if(string.IsNullOrEmpty(webhookSecret))
    {
        Console.WriteLine("WARNING: Missing webhook secret. Skipping verification.");
        return true;
    }

    string? hmacHeader = context.Request.Headers[HOOKDECK_SIGNATURE_HEADER].FirstOrDefault();

    if (string.IsNullOrEmpty(hmacHeader))
    {
        Console.WriteLine("Missing HMAC headers");
        return false;
    }
    HMACSHA256 hmac = new(Encoding.UTF8.GetBytes(webhookSecret));
    string hash = Convert.ToBase64String(hmac.ComputeHash(Encoding.UTF8.GetBytes(rawBody)));

    return hash.Equals(hmacHeader);
}

app.MapPost("/{**path}", async (string? path, HttpContext context) =>
{
    using StreamReader reader = new StreamReader(context.Request.Body);
    string rawBody = await reader.ReadToEndAsync();
    
    bool verified = VerifyHmacWebhookSignature(context, WEBHOOK_SECRET, rawBody);
    if(!verified)
    {
        return Results.Unauthorized();
    }

    Console.WriteLine(new
    {
        webhook_received = DateTime.UtcNow.ToString("o"),
        body = rawBody
    });
    
    return Results.Json(new {
        STATUS = "ACCEPTED"
    });
});

app.UseRouting();

app.Run();
