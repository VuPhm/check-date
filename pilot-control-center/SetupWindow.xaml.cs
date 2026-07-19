using System.IO;
using System.Security.Cryptography;
using System.Text.Json;
using System.Windows;

namespace CoopFoodPilot.ControlCenter;

public partial class SetupWindow : Window
{
    private const string ConfigPath = @"C:\ProgramData\CoopFoodPilot\runtime.json";
    public SetupWindow() => InitializeComponent();

    private async void Save_Click(object sender, RoutedEventArgs e)
    {
        if (!Uri.TryCreate(PublicUrl.Text.Trim(), UriKind.Absolute, out var publicUrl) || publicUrl.Scheme != Uri.UriSchemeHttps)
        { ValidationText.Text = "Link công khai phải bắt đầu bằng https://."; return; }
        if (string.IsNullOrWhiteSpace(DatabaseFile.Text) || string.IsNullOrWhiteSpace(BackupDirectory.Text) || string.IsNullOrWhiteSpace(TunnelToken.Password))
        { ValidationText.Text = "Nhập đủ đường dẫn dữ liệu, backup và tunnel token."; return; }
        try
        {
            Directory.CreateDirectory(Path.GetDirectoryName(ConfigPath)!);
            Directory.CreateDirectory(Path.GetDirectoryName(DatabaseFile.Text.Trim())!);
            Directory.CreateDirectory(BackupDirectory.Text.Trim());
            var config = new {
                databaseFile = DatabaseFile.Text.Trim(), backupDirectory = BackupDirectory.Text.Trim(),
                distDirectory = @"C:\Program Files\CoopFood Pilot\runtime\dist", publicUrl = publicUrl.ToString().TrimEnd('/'), hostPort = 8787,
                statusFile = @"C:\ProgramData\CoopFoodPilot\cluster-status.json",
                systemAdminToken = Convert.ToBase64String(RandomNumberGenerator.GetBytes(32)).TrimEnd('=').Replace('+', '-').Replace('/', '_'), tunnelToken = TunnelToken.Password.Trim(),
            };
            await using var output = File.Create(ConfigPath);
            await JsonSerializer.SerializeAsync(output, config, new JsonSerializerOptions { WriteIndented = true });
            DialogResult = true;
        }
        catch (Exception error) { ValidationText.Text = error.Message; }
    }
}
