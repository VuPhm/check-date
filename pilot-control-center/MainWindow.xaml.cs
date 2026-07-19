using System.IO;
using System.Net.Http;
using System.ServiceProcess;
using System.Text.Json;
using System.Windows;
using Microsoft.Win32;

namespace CoopFoodPilot.ControlCenter;

public partial class MainWindow : Window
{
    private const string ServiceName = "CoopFoodPilotService";
    private const string ConfigPath = @"C:\ProgramData\CoopFoodPilot\runtime.json";
    private readonly HttpClient _http = new() { Timeout = TimeSpan.FromSeconds(5) };

    public MainWindow()
    {
        InitializeComponent();
        Loaded += async (_, _) => await RefreshAsync();
    }

    private async Task<RuntimeConfig?> ReadConfigAsync()
    {
        if (!File.Exists(ConfigPath)) return null;
        await using var stream = File.OpenRead(ConfigPath);
        return await JsonSerializer.DeserializeAsync<RuntimeConfig>(stream, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
    }

    private async Task RefreshAsync()
    {
        var config = await ReadConfigAsync();
        LinkText.Text = $"Link: {config?.PublicUrl ?? "Chưa cấu hình"}";
        try
        {
            using var service = new ServiceController(ServiceName);
            service.Refresh();
            var running = service.Status == ServiceControllerStatus.Running;
            var runtimeStatus = await ReadStatusAsync(config);
            StatusText.Text = running ? RuntimeStatusText(runtimeStatus?.State) : "Đã dừng";
            StartButton.IsEnabled = !running;
            StopButton.IsEnabled = running;
            BackupButton.IsEnabled = running && config is not null;
            if (running && config is not null)
            {
                var health = await GetSystemAsync("/v1/system/health", config);
                BackupText.Text = health.Ok ? $"{runtimeStatus?.Detail ?? "Host healthy · Backup có thể thực hiện"}" : "Host đang khởi động hoặc cần kiểm tra";
            }
            else BackupText.Text = "Backup gần nhất: xem lịch sử sau khi Host được cấu hình";
        }
        catch (Exception error)
        {
            StatusText.Text = "Cần hoàn tất setup";
            DetailText.Text = error.Message;
            StartButton.IsEnabled = StopButton.IsEnabled = BackupButton.IsEnabled = false;
        }
    }

    private static string RuntimeStatusText(string? state) => state switch
    {
        "starting-host" => "Đang khởi động cụm…",
        "starting-tunnel" => "Đang kết nối link công khai…",
        "running" => "Đang chạy",
        "degraded" => "Đang chạy, tunnel cần kết nối lại",
        "stopping" => "Đang dừng cụm…",
        "error" => "Cụm cần kiểm tra",
        _ => "Đang chạy",
    };

    private static async Task<ClusterStatus?> ReadStatusAsync(RuntimeConfig? config)
    {
        var path = config?.StatusFile ?? @"C:\ProgramData\CoopFoodPilot\cluster-status.json";
        if (!File.Exists(path)) return null;
        await using var stream = File.OpenRead(path);
        return await JsonSerializer.DeserializeAsync<ClusterStatus>(stream, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
    }

    private async Task<ApiResult> GetSystemAsync(string path, RuntimeConfig config, HttpMethod? method = null)
    {
        using var request = new HttpRequestMessage(method ?? HttpMethod.Get, $"http://127.0.0.1:{config.HostPort ?? 8787}/api{path}");
        request.Headers.Add("x-pilot-system-token", config.SystemAdminToken);
        using var response = await _http.SendAsync(request);
        return new ApiResult(response.IsSuccessStatusCode);
    }

    private async Task BackupAsync(bool showResult)
    {
        var config = await ReadConfigAsync();
        if (config is null) throw new InvalidOperationException("Chưa có cấu hình runtime.");
        var result = await GetSystemAsync("/v1/system/backups", config, HttpMethod.Post);
        if (!result.Ok) throw new InvalidOperationException("Không thể tạo backup.");
        if (showResult) MessageBox.Show("Đã tạo backup nhất quán.", "Pilot Control Center", MessageBoxButton.OK, MessageBoxImage.Information);
    }

    private async void StartCluster_Click(object sender, RoutedEventArgs e)
    {
        try
        {
            using var service = new ServiceController(ServiceName);
            service.Start();
            service.WaitForStatus(ServiceControllerStatus.Running, TimeSpan.FromSeconds(30));
            await RefreshAsync();
        }
        catch (Exception error) { MessageBox.Show(error.Message, "Không thể bật cụm", MessageBoxButton.OK, MessageBoxImage.Error); }
    }

    private async void StopCluster_Click(object sender, RoutedEventArgs e)
    {
        try
        {
            try { await BackupAsync(false); }
            catch when (MessageBox.Show("Backup thất bại. Vẫn dừng cụm?", "Xác nhận", MessageBoxButton.YesNo, MessageBoxImage.Warning) == MessageBoxResult.Yes) { }
            using var service = new ServiceController(ServiceName);
            service.Stop();
            service.WaitForStatus(ServiceControllerStatus.Stopped, TimeSpan.FromSeconds(30));
            await RefreshAsync();
        }
        catch (Exception error) { MessageBox.Show(error.Message, "Không thể dừng cụm", MessageBoxButton.OK, MessageBoxImage.Error); }
    }

    private async void Backup_Click(object sender, RoutedEventArgs e)
    {
        try { await BackupAsync(true); await RefreshAsync(); }
        catch (Exception error) { MessageBox.Show(error.Message, "Backup thất bại", MessageBoxButton.OK, MessageBoxImage.Error); }
    }

    private async void Restore_Click(object sender, RoutedEventArgs e)
    {
        try
        {
            using (var service = new ServiceController(ServiceName))
            {
                service.Refresh();
                if (service.Status != ServiceControllerStatus.Stopped) throw new InvalidOperationException("Dừng cụm trước khi khôi phục backup.");
            }
            var config = await ReadConfigAsync();
            if (config?.DatabaseFile is null) throw new InvalidOperationException("Chưa có cấu hình runtime.");
            var picker = new OpenFileDialog { Filter = "SQLite backup (*.sqlite)|*.sqlite|Tất cả file (*.*)|*.*", Title = "Chọn file backup để khôi phục" };
            if (picker.ShowDialog() != true) return;
            if (MessageBox.Show("Dữ liệu hiện tại sẽ được thay bằng backup đã chọn. Bạn có chắc chắn?", "Khôi phục backup", MessageBoxButton.YesNo, MessageBoxImage.Warning) != MessageBoxResult.Yes) return;
            Directory.CreateDirectory(Path.GetDirectoryName(config.DatabaseFile)!);
            var temporary = $"{config.DatabaseFile}.restore";
            File.Copy(picker.FileName, temporary, true);
            File.Move(temporary, config.DatabaseFile, true);
            MessageBox.Show("Đã khôi phục backup. Bấm Bật cụm để kiểm tra.", "Pilot Control Center", MessageBoxButton.OK, MessageBoxImage.Information);
        }
        catch (Exception error) { MessageBox.Show(error.Message, "Không thể khôi phục backup", MessageBoxButton.OK, MessageBoxImage.Error); }
    }

    private async void Refresh_Click(object sender, RoutedEventArgs e) => await RefreshAsync();

    private async void SetupCluster_Click(object sender, RoutedEventArgs e)
    {
        var setup = new SetupWindow { Owner = this };
        if (setup.ShowDialog() == true) await RefreshAsync();
    }

    private sealed record RuntimeConfig(string? DatabaseFile, string? PublicUrl, string? SystemAdminToken, int? HostPort, string? StatusFile);
    private sealed record ClusterStatus(string? State, string? Detail, DateTimeOffset? UpdatedAt);
    private sealed record ApiResult(bool Ok);
}
